using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;

namespace HMS.Services;

public class TableService
{
    private readonly SpService _spService;

    public TableService(SpService spService)
    {
        _spService = spService;
    }

    public async Task<List<TableResponseDto>> GetTablesAsync(string? section = null, string? status = null)
    {
        var parameters = new Dictionary<string, object?>
        {
            { "p_section", section },
            { "p_status", status }
        };

        return await _spService.ExecuteQueryAsync("sp_GetTables", MapFromReader, parameters);
    }

    public async Task<TableSummaryDto> GetTableSummaryAsync()
    {
        var summaries = await _spService.ExecuteQueryAsync("sp_GetTableSummary", reader =>
        {
            int totalTables = Convert.ToInt32(reader["total_tables"]);
            int totalChairs = Convert.ToInt32(reader["total_chairs"]);
            int occupiedChairs = Convert.ToInt32(reader["occupied_chairs"]);
            int availableChairs = totalChairs - occupiedChairs;

            return new TableSummaryDto
            {
                TotalTables = totalTables,
                TotalChairs = totalChairs,
                OccupiedChairs = occupiedChairs,
                AvailableChairs = availableChairs > 0 ? availableChairs : 0
            };
        });

        return summaries.Count > 0 ? summaries[0] : new TableSummaryDto();
    }

    public async Task<TableResponseDto?> GetTableByIdAsync(long id)
    {
        var parameters = new Dictionary<string, object?> { { "p_table_id", id } };
        var list = await _spService.ExecuteQueryAsync("sp_GetTableById", MapFromReader, parameters);
        return list.Count > 0 ? list[0] : null;
    }

    public async Task<TableResponseDto> CreateTableAsync(CreateTableDto dto)
    {
        var parameters = new Dictionary<string, object?>
        {
            { "p_table_name", dto.TableName.Trim() },
            { "p_section_area", dto.SectionArea.Trim() },
            { "p_capacity_chairs", dto.CapacityChairs },
            { "p_assigned_server_id", dto.AssignedServerId }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreateTable", parameters);
        return (await GetTableByIdAsync(id))!;
    }

    public async Task<TableResponseDto?> UpdateTableAsync(long id, UpdateTableDto dto)
    {
        var existing = await GetTableByIdAsync(id);
        if (existing == null) return null;

        var parameters = new Dictionary<string, object?>
        {
            { "p_table_id", id },
            { "p_table_name", dto.TableName.Trim() },
            { "p_section_area", dto.SectionArea.Trim() },
            { "p_capacity_chairs", dto.CapacityChairs },
            { "p_occupied_chairs", dto.OccupiedChairs },
            { "p_status", dto.Status.Trim().ToUpper() },
            { "p_assigned_server_id", dto.AssignedServerId }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateTable", parameters);
        return await GetTableByIdAsync(id);
    }

    public async Task<bool> DeleteTableAsync(long id)
    {
        var existing = await GetTableByIdAsync(id);
        if (existing == null) return false;

        var parameters = new Dictionary<string, object?> { { "p_table_id", id } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteTable", parameters);
        return true;
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
        var serverIdOrd = reader.GetOrdinal("assigned_server_id");
        var serverNameOrd = reader.GetOrdinal("server_name");
        var serverRoleOrd = reader.GetOrdinal("server_role");

        return new TableResponseDto
        {
            TableId = reader.GetInt64(reader.GetOrdinal("table_id")),
            TableName = reader.GetString(reader.GetOrdinal("table_name")),
            SectionArea = reader.GetString(reader.GetOrdinal("section_area")),
            CapacityChairs = reader.GetInt32(reader.GetOrdinal("capacity_chairs")),
            OccupiedChairs = reader.GetInt32(reader.GetOrdinal("occupied_chairs")),
            Status = reader.GetString(reader.GetOrdinal("status")),
            AssignedServerId = reader.IsDBNull(serverIdOrd) ? null : reader.GetInt64(serverIdOrd),
            AssignedServerName = reader.IsDBNull(serverNameOrd) ? null : reader.GetString(serverNameOrd),
            AssignedServerRole = reader.IsDBNull(serverRoleOrd) ? null : reader.GetString(serverRoleOrd),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }
}
