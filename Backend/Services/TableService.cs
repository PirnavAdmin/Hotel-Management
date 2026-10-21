using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class TableService
{
    private readonly SpService _spService;
    private readonly ILogger<TableService> _logger;

    public TableService(SpService spService, ILogger<TableService> logger)
    {
        _spService = spService;
        _logger = logger;
    }

    public async Task<List<TableResponseDto>> GetTablesAsync(string? section = null, string? status = null, long? branchId = null)
    {
        long targetBranch = branchId.HasValue && branchId.Value > 0 ? branchId.Value : 1;
        _logger.LogInformation("GetTablesAsync executing: BranchId={BranchId}, Section={Section}, Status={Status}", targetBranch, section, status);

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "GET_BY_BRANCH" },
            { "p_table_id", null },
            { "p_branch_id", targetBranch },
            { "p_table_number", null },
            { "p_capacity", null },
            { "p_location", null },
            { "p_qr_code_url", null },
            { "p_status", null },
            { "p_assigned_server_id", null }
        };

        var tables = await _spService.ExecuteQueryAsync("sp_manage_restaurant_tables", MapFromReader, parameters);

        if (!string.IsNullOrWhiteSpace(section))
        {
            tables = tables.Where(t => 
                t.SectionArea.Equals(section, StringComparison.OrdinalIgnoreCase) ||
                t.Location.Equals(section, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            tables = tables.Where(t => t.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        _logger.LogInformation("GetTablesAsync returned {Count} tables for branch {BranchId}", tables.Count, targetBranch);
        return tables;
    }

    public async Task<TableSummaryDto> GetTableSummaryAsync(long? branchId = null)
    {
        long targetBranch = branchId.HasValue && branchId.Value > 0 ? branchId.Value : 1;
        var tables = await GetTablesAsync(branchId: targetBranch);

        int totalTables = tables.Count;
        int totalChairs = tables.Sum(t => t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity);
        int occupiedChairs = tables
            .Where(t => t.Status.Equals("occupied", StringComparison.OrdinalIgnoreCase))
            .Sum(t => t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity);
        int availableChairs = totalChairs - occupiedChairs;

        return new TableSummaryDto
        {
            TotalTables = totalTables,
            TotalChairs = totalChairs,
            OccupiedChairs = occupiedChairs,
            AvailableChairs = availableChairs > 0 ? availableChairs : 0
        };
    }

    public async Task<TableResponseDto?> GetTableByIdAsync(long id, long? branchId = null)
    {
        long targetBranch = branchId.HasValue && branchId.Value > 0 ? branchId.Value : 1;
        var tables = await GetTablesAsync(branchId: targetBranch);
        var found = tables.FirstOrDefault(t => t.TableId == id);
        if (found != null) return found;

        var direct = await _spService.ExecuteSqlQueryAsync(
            "SELECT t.*, (SELECT o.order_number FROM orders o WHERE o.table_id = t.table_id AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'served') ORDER BY o.order_id DESC LIMIT 1) AS active_order_number FROM restaurant_tables t WHERE t.table_id = @id AND t.deleted_at IS NULL",
            MapFromReader,
            new Dictionary<string, object?> { { "id", id } });

        return direct.Count > 0 ? direct[0] : null;
    }

    public async Task<TableResponseDto> CreateTableAsync(CreateTableDto dto)
    {
        var resolvedNumber = !string.IsNullOrWhiteSpace(dto.TableNumber) 
            ? dto.TableNumber.Trim() 
            : (!string.IsNullOrWhiteSpace(dto.TableName) ? dto.TableName.Trim() : (dto.Name?.Trim() ?? string.Empty));

        if (string.IsNullOrWhiteSpace(resolvedNumber))
        {
            _logger.LogWarning("CreateTableAsync rejected: Table Number is required and cannot be empty.");
            throw new ArgumentException("Table Number / Identifier is required and cannot be empty.");
        }

        if (resolvedNumber.Length > 10)
        {
            _logger.LogWarning("CreateTableAsync rejected: Table Number '{TableNumber}' exceeds 10 characters.", resolvedNumber);
            throw new ArgumentException("Table Number / Identifier must not exceed 10 characters.");
        }

        long branchId = dto.BranchId.HasValue && dto.BranchId.Value > 0 ? dto.BranchId.Value : 1;

        // Validate Branch existence in database
        var branchCount = await _spService.ExecuteSqlScalarAsync<long>(
            "SELECT COUNT(*) FROM branches WHERE branch_id = @bid",
            new Dictionary<string, object?> { { "bid", branchId } });
        if (branchCount == 0)
        {
            _logger.LogWarning("CreateTableAsync rejected: BranchId {BranchId} does not exist in branches table.", branchId);
            throw new ArgumentException($"Branch with ID {branchId} does not exist.");
        }

        // Resolve Assigned Server
        long? resolvedServerId = null;
        if (dto.AssignedServerId.HasValue && dto.AssignedServerId.Value > 0)
        {
            var serverCount = await _spService.ExecuteSqlScalarAsync<long>(
                "SELECT COUNT(*) FROM staff_persons WHERE staff_id = @sid AND deleted_at IS NULL",
                new Dictionary<string, object?> { { "sid", dto.AssignedServerId.Value } });
            if (serverCount > 0)
            {
                resolvedServerId = dto.AssignedServerId.Value;
            }
            else
            {
                _logger.LogWarning("CreateTableAsync rejected: Assigned server ID {ServerId} does not exist in staff_persons.", dto.AssignedServerId.Value);
                throw new ArgumentException($"Assigned server with ID {dto.AssignedServerId.Value} does not exist.");
            }
        }
        else
        {
            var serverName = !string.IsNullOrWhiteSpace(dto.Server) ? dto.Server.Trim() : (!string.IsNullOrWhiteSpace(dto.AssignedServerName) ? dto.AssignedServerName.Trim() : null);
            if (!string.IsNullOrWhiteSpace(serverName))
            {
                var foundIds = await _spService.ExecuteSqlQueryAsync(
                    "SELECT staff_id FROM staff_persons WHERE LOWER(full_name) = LOWER(@name) AND deleted_at IS NULL LIMIT 1",
                    r => Convert.ToInt64(r["staff_id"]),
                    new Dictionary<string, object?> { { "name", serverName } });
                if (foundIds.Count > 0)
                {
                    resolvedServerId = foundIds[0];
                }
            }
        }

        int capacity = dto.Capacity > 0 ? dto.Capacity : (dto.CapacityChairs > 0 ? dto.CapacityChairs : 4);
        string location = !string.IsNullOrWhiteSpace(dto.Location) 
            ? dto.Location.Trim() 
            : (!string.IsNullOrWhiteSpace(dto.SectionArea) ? dto.SectionArea.Trim() : "Main Hall");
        string status = !string.IsNullOrWhiteSpace(dto.Status) ? dto.Status.Trim().ToLower() : "available";

        _logger.LogInformation("CreateTableAsync initiating: TableNumber='{TableNumber}', TableName='{TableName}', BranchId={BranchId}, Capacity={Capacity}, Location='{Location}', Status='{Status}', AssignedServerId={AssignedServerId}",
            resolvedNumber, dto.TableName, branchId, capacity, location, status, resolvedServerId);

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "CREATE" },
            { "p_table_id", null },
            { "p_branch_id", branchId },
            { "p_table_number", resolvedNumber },
            { "p_capacity", capacity },
            { "p_location", location },
            { "p_qr_code_url", dto.QrCodeUrl },
            { "p_status", status },
            { "p_assigned_server_id", resolvedServerId }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_restaurant_tables", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        if (result != null && result.StatusCode == 409)
        {
            _logger.LogWarning("CreateTableAsync duplicate detected: {Message}", result.Message);
            throw new DuplicateTableException(result.Message);
        }

        if (result != null && result.DataId.HasValue && (result.StatusCode == 201 || result.StatusCode == 200))
        {
            _logger.LogInformation("CreateTableAsync successful: DataId={DataId}, Message='{Message}'", result.DataId.Value, result.Message);

            try
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "INSERT INTO dining_tables (dining_table_id, section_id, table_number, seating_capacity, status, is_active, is_deleted, created_at, updated_at, branch_id, outlet_id) VALUES (@tid, 1, @tnum, @cap, @stat, 1, 0, NOW(), NOW(), @bid, 1) ON DUPLICATE KEY UPDATE table_number = VALUES(table_number), seating_capacity = VALUES(seating_capacity), status = VALUES(status);",
                    new Dictionary<string, object?> { { "tid", result.DataId.Value }, { "tnum", resolvedNumber }, { "cap", capacity }, { "stat", status }, { "bid", branchId } });
            }
            catch { }

            var created = await GetTableByIdAsync(result.DataId.Value, branchId);
            if (created != null) return created;
        }

        _logger.LogError("CreateTableAsync failed: StatusCode={StatusCode}, Message='{Message}'", result?.StatusCode, result?.Message);
        throw new InvalidOperationException(result?.Message ?? "Failed to create table in database.");
    }

    public async Task<TableResponseDto?> UpdateTableAsync(long id, UpdateTableDto dto)
    {
        var existing = await GetTableByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("UpdateTableAsync: Table with ID {TableId} not found.", id);
            return null;
        }

        var resolvedNumber = !string.IsNullOrWhiteSpace(dto.TableNumber) 
            ? dto.TableNumber.Trim() 
            : (!string.IsNullOrWhiteSpace(dto.TableName) ? dto.TableName.Trim() : existing.TableNumber);

        if (resolvedNumber.Length > 10)
        {
            _logger.LogWarning("UpdateTableAsync rejected: Table Number '{TableNumber}' exceeds 10 characters.", resolvedNumber);
            throw new ArgumentException("Table Number / Identifier must not exceed 10 characters.");
        }

        long branchId = dto.BranchId.HasValue && dto.BranchId.Value > 0 ? dto.BranchId.Value : existing.BranchId;

        // Validate Branch existence if passed
        if (dto.BranchId.HasValue && dto.BranchId.Value > 0)
        {
            var branchCount = await _spService.ExecuteSqlScalarAsync<long>(
                "SELECT COUNT(*) FROM branches WHERE branch_id = @bid",
                new Dictionary<string, object?> { { "bid", branchId } });
            if (branchCount == 0)
            {
                throw new ArgumentException($"Branch with ID {branchId} does not exist.");
            }
        }

        // Resolve Assigned Server
        long? resolvedServerId = dto.AssignedServerId.HasValue && dto.AssignedServerId.Value > 0 ? dto.AssignedServerId.Value : existing.AssignedServerId;
        if (dto.AssignedServerId.HasValue && dto.AssignedServerId.Value > 0)
        {
            var serverCount = await _spService.ExecuteSqlScalarAsync<long>(
                "SELECT COUNT(*) FROM staff_persons WHERE staff_id = @sid AND deleted_at IS NULL",
                new Dictionary<string, object?> { { "sid", dto.AssignedServerId.Value } });
            if (serverCount > 0)
            {
                resolvedServerId = dto.AssignedServerId.Value;
            }
            else
            {
                throw new ArgumentException($"Assigned server with ID {dto.AssignedServerId.Value} does not exist.");
            }
        }
        else if (!string.IsNullOrWhiteSpace(dto.Server) || !string.IsNullOrWhiteSpace(dto.AssignedServerName))
        {
            var serverName = !string.IsNullOrWhiteSpace(dto.Server) ? dto.Server.Trim() : dto.AssignedServerName!.Trim();
            var foundIds = await _spService.ExecuteSqlQueryAsync(
                "SELECT staff_id FROM staff_persons WHERE LOWER(full_name) = LOWER(@name) AND deleted_at IS NULL LIMIT 1",
                r => Convert.ToInt64(r["staff_id"]),
                new Dictionary<string, object?> { { "name", serverName } });
            if (foundIds.Count > 0)
            {
                resolvedServerId = foundIds[0];
            }
        }

        int capacity = dto.Capacity > 0 ? dto.Capacity : (dto.CapacityChairs > 0 ? dto.CapacityChairs : existing.CapacityChairs);
        string location = !string.IsNullOrWhiteSpace(dto.Location) ? dto.Location.Trim() : (!string.IsNullOrWhiteSpace(dto.SectionArea) ? dto.SectionArea.Trim() : existing.SectionArea);

        _logger.LogInformation("UpdateTableAsync initiating: TableId={TableId}, TableNumber='{TableNumber}', BranchId={BranchId}, Capacity={Capacity}, Location='{Location}', AssignedServerId={AssignedServerId}",
            id, resolvedNumber, branchId, capacity, location, resolvedServerId);

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "UPDATE_DETAILS" },
            { "p_table_id", id },
            { "p_branch_id", branchId },
            { "p_table_number", resolvedNumber },
            { "p_capacity", capacity },
            { "p_location", location },
            { "p_qr_code_url", dto.QrCodeUrl },
            { "p_status", null },
            { "p_assigned_server_id", resolvedServerId }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_restaurant_tables", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        if (result != null && result.StatusCode == 409)
        {
            _logger.LogWarning("UpdateTableAsync duplicate detected: {Message}", result.Message);
            throw new DuplicateTableException(result.Message);
        }

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE dining_tables SET table_number = @tnum, seating_capacity = @cap, updated_at = NOW() WHERE dining_table_id = @tid;",
                new Dictionary<string, object?> { { "tnum", resolvedNumber }, { "cap", capacity }, { "tid", id } });
        }
        catch { }

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            await UpdateTableStatusAsync(id, dto.Status);
        }

        return await GetTableByIdAsync(id);
    }

    public async Task<TableResponseDto?> UpdateTableStatusAsync(long id, string status)
    {
        _logger.LogInformation("UpdateTableStatusAsync: TableId={TableId}, Status='{Status}'", id, status);
        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "UPDATE_STATUS" },
            { "p_table_id", id },
            { "p_branch_id", null },
            { "p_table_number", null },
            { "p_capacity", null },
            { "p_location", null },
            { "p_qr_code_url", null },
            { "p_status", status.Trim().ToLower() },
            { "p_assigned_server_id", null }
        };

        await _spService.ExecuteQueryAsync("sp_manage_restaurant_tables", MapSpOperationResult, parameters);
        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE dining_tables SET status = @stat, updated_at = NOW() WHERE dining_table_id = @tid;",
                new Dictionary<string, object?> { { "stat", status.Trim().ToLower() }, { "tid", id } });
        }
        catch { }

        return await GetTableByIdAsync(id);
    }

    public async Task<bool> DeleteTableAsync(long id)
    {
        _logger.LogInformation("DeleteTableAsync initiating: TableId={TableId}", id);
        var existing = await GetTableByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("DeleteTableAsync: TableId={TableId} not found.", id);
            return false;
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "DELETE" },
            { "p_table_id", id },
            { "p_branch_id", null },
            { "p_table_number", null },
            { "p_capacity", null },
            { "p_location", null },
            { "p_qr_code_url", null },
            { "p_status", null },
            { "p_assigned_server_id", null }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_restaurant_tables", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;
        _logger.LogInformation("DeleteTableAsync completed: TableId={TableId}, StatusCode={StatusCode}", id, result?.StatusCode);
        if (result != null && result.StatusCode == 200)
        {
            try
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "UPDATE dining_tables SET is_deleted = 1, is_active = 0, updated_at = NOW() WHERE dining_table_id = @tid;",
                    new Dictionary<string, object?> { { "tid", id } });
            }
            catch { }
            return true;
        }
        return false;
    }

    public async Task<TableResponseDto?> GetTableByIdOrIdentifierAsync(string identifier, long? branchId = null)
    {
        if (string.IsNullOrWhiteSpace(identifier)) return null;
        long targetBranch = branchId.HasValue && branchId.Value > 0 ? branchId.Value : 1;

        // 1. If numeric, check if table exists with table_id = numericId
        if (long.TryParse(identifier, out var numericId) && numericId > 0)
        {
            var byId = await GetTableByIdAsync(numericId, targetBranch);
            if (byId != null) return byId;
        }

        // 2. Look up by table_number or table_name
        var cleanIdentifier = identifier.Trim();
        var allTables = await GetTablesAsync(branchId: targetBranch);
        return allTables.FirstOrDefault(t => 
            t.TableNumber.Equals(cleanIdentifier, StringComparison.OrdinalIgnoreCase) ||
            t.TableName.Equals(cleanIdentifier, StringComparison.OrdinalIgnoreCase) ||
            cleanIdentifier.Equals($"Table {t.TableNumber}", StringComparison.OrdinalIgnoreCase) ||
            cleanIdentifier.Equals($"T-{t.TableNumber}", StringComparison.OrdinalIgnoreCase) ||
            t.TableNumber.Equals(cleanIdentifier.Replace("Table ", "").Trim(), StringComparison.OrdinalIgnoreCase) ||
            t.TableNumber.Equals(cleanIdentifier.Replace("T-", "").Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> DeleteTableByIdOrIdentifierAsync(string identifier, long? branchId = null)
    {
        var match = await GetTableByIdOrIdentifierAsync(identifier, branchId);
        if (match != null)
        {
            return await DeleteTableAsync(match.TableId);
        }

        return false;
    }

    public async Task<(bool Success, string Message)> TransferTableAsync(long sourceTableId, long targetTableId)
    {
        if (sourceTableId == targetTableId)
        {
            return (false, "Source and target table cannot be the same.");
        }

        try
        {
            var parameters = new Dictionary<string, object?>
            {
                { "p_source_table_id", sourceTableId },
                { "p_target_table_id", targetTableId }
            };

            await _spService.ExecuteNonQueryAsync("sp_TransferTable", parameters);
            return (true, $"Order successfully transferred from Table {sourceTableId} to Table {targetTableId}.");
        }
        catch (Exception ex)
        {
            return (false, $"Failed to transfer table: {ex.Message}");
        }
    }

    private static TableResponseDto MapFromReader(DbDataReader reader)
    {
        var serverIdOrd = HasColumn(reader, "assigned_server_id") ? reader.GetOrdinal("assigned_server_id") : -1;
        var serverNameOrd = HasColumn(reader, "server_name") ? reader.GetOrdinal("server_name") : -1;
        var serverRoleOrd = HasColumn(reader, "server_role") ? reader.GetOrdinal("server_role") : -1;
        var branchIdOrd = HasColumn(reader, "branch_id") ? reader.GetOrdinal("branch_id") : -1;
        var tableNumOrd = HasColumn(reader, "table_number") ? reader.GetOrdinal("table_number") : -1;
        var locationOrd = HasColumn(reader, "location") ? reader.GetOrdinal("location") : -1;
        var qrCodeOrd = HasColumn(reader, "qr_code_url") ? reader.GetOrdinal("qr_code_url") : -1;
        var activeOrd = HasColumn(reader, "active_order_number") ? reader.GetOrdinal("active_order_number") : -1;
        var capacityOrd = HasColumn(reader, "capacity") ? reader.GetOrdinal("capacity") : -1;
        var capacityChairsOrd = HasColumn(reader, "capacity_chairs") ? reader.GetOrdinal("capacity_chairs") : -1;
        var occupiedChairsOrd = HasColumn(reader, "occupied_chairs") ? reader.GetOrdinal("occupied_chairs") : -1;

        var tableId = Convert.ToInt64(reader["table_id"]);

        var rawTableNum = tableNumOrd >= 0 && !reader.IsDBNull(tableNumOrd) ? reader.GetString(tableNumOrd).Trim() : string.Empty;
        var rawTableName = HasColumn(reader, "table_name") && !reader.IsDBNull(reader.GetOrdinal("table_name")) ? reader.GetString(reader.GetOrdinal("table_name")).Trim() : string.Empty;

        var tableNumber = !string.IsNullOrWhiteSpace(rawTableNum) ? rawTableNum : (!string.IsNullOrWhiteSpace(rawTableName) ? rawTableName : $"T-{tableId}");
        var tableName = !string.IsNullOrWhiteSpace(rawTableNum) ? rawTableNum : (!string.IsNullOrWhiteSpace(rawTableName) ? rawTableName : tableNumber);

        var sectionArea = HasColumn(reader, "section_area") && !reader.IsDBNull(reader.GetOrdinal("section_area"))
            ? reader.GetString(reader.GetOrdinal("section_area"))
            : (locationOrd >= 0 && !reader.IsDBNull(locationOrd) ? reader.GetString(locationOrd) : "Main Hall");

        var location = locationOrd >= 0 && !reader.IsDBNull(locationOrd)
            ? reader.GetString(locationOrd)
            : sectionArea;

        int capacity = capacityOrd >= 0 && !reader.IsDBNull(capacityOrd)
            ? Convert.ToInt32(reader[capacityOrd])
            : (capacityChairsOrd >= 0 && !reader.IsDBNull(capacityChairsOrd) ? Convert.ToInt32(reader[capacityChairsOrd]) : 4);

        int capacityChairs = capacityChairsOrd >= 0 && !reader.IsDBNull(capacityChairsOrd)
            ? Convert.ToInt32(reader[capacityChairsOrd])
            : capacity;

        return new TableResponseDto
        {
            TableId = tableId,
            BranchId = branchIdOrd >= 0 && !reader.IsDBNull(branchIdOrd) ? Convert.ToInt64(reader[branchIdOrd]) : 1,
            TableName = tableName,
            TableNumber = tableNumber,
            SectionArea = sectionArea,
            Location = location,
            Capacity = capacity,
            CapacityChairs = capacityChairs,
            OccupiedChairs = occupiedChairsOrd >= 0 && !reader.IsDBNull(occupiedChairsOrd) ? Convert.ToInt32(reader[occupiedChairsOrd]) : 0,
            Status = reader["status"]?.ToString() ?? "available",
            QrCodeUrl = qrCodeOrd >= 0 && !reader.IsDBNull(qrCodeOrd) ? reader.GetString(qrCodeOrd) : null,
            ActiveOrderNumber = activeOrd >= 0 && !reader.IsDBNull(activeOrd) ? reader.GetString(activeOrd) : null,
            AssignedServerId = serverIdOrd >= 0 && !reader.IsDBNull(serverIdOrd) ? Convert.ToInt64(reader[serverIdOrd]) : null,
            AssignedServerName = serverNameOrd >= 0 && !reader.IsDBNull(serverNameOrd) ? reader.GetString(serverNameOrd) : null,
            AssignedServerRole = serverRoleOrd >= 0 && !reader.IsDBNull(serverRoleOrd) ? reader.GetString(serverRoleOrd) : null,
            CreatedAt = reader["created_at"] is DateTime dt ? dt : DateTime.UtcNow
        };
    }

    private static SpOperationResult MapSpOperationResult(DbDataReader reader)
    {
        return new SpOperationResult
        {
            Status = reader["status"]?.ToString() ?? "ERROR",
            StatusCode = Convert.ToInt32(reader["status_code"]),
            Message = reader["message"]?.ToString() ?? string.Empty,
            DataId = reader["data_id"] != DBNull.Value ? Convert.ToInt64(reader["data_id"]) : null
        };
    }

    private static bool HasColumn(DbDataReader reader, string columnName)
    {
        for (int i = 0; i < reader.FieldCount; i++)
        {
            if (reader.GetName(i).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}
