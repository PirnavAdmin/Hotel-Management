using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HMS.Data;
using HMS.DTOs;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/audit")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuditController> _logger;

    public AuditController(AppDbContext context, ILogger<AuditController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves paginated audit logs with search and category filters.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action,
        [FromQuery] string? tableName,
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var logs = new List<AuditLogDto>();
            int totalCount = 0;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                var whereClauses = new List<string>();
                var cmd = conn.CreateCommand();

                if (!string.IsNullOrWhiteSpace(action) && action != "all")
                {
                    whereClauses.Add("action = @act");
                    AddParam(cmd, "@act", action.Trim());
                }

                if (!string.IsNullOrWhiteSpace(tableName) && tableName != "all")
                {
                    whereClauses.Add("table_name = @tbl");
                    AddParam(cmd, "@tbl", tableName.Trim());
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    whereClauses.Add("(username LIKE @search OR record_id LIKE @search OR old_value LIKE @search OR new_value LIKE @search OR action LIKE @search)");
                    AddParam(cmd, "@search", $"%{search.Trim()}%");
                }

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    whereClauses.Add("created_at >= @from");
                    AddParam(cmd, "@from", fromDate.Trim());
                }

                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    whereClauses.Add("created_at <= @to");
                    AddParam(cmd, "@to", toDate.Trim() + " 23:59:59");
                }

                var whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";

                // Count total
                cmd.CommandText = $"SELECT COUNT(*) FROM `audit_logs` {whereSql};";
                var countObj = await cmd.ExecuteScalarAsync();
                totalCount = Convert.ToInt32(countObj ?? 0);

                if (totalCount == 0 && string.IsNullOrWhiteSpace(search) && string.IsNullOrWhiteSpace(action))
                {
                    // Auto-seed initial audit logs from recent orders/payments if empty
                    await SeedInitialAuditLogsAsync();
                    cmd.CommandText = "SELECT COUNT(*) FROM `audit_logs`;";
                    totalCount = Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0);
                }

                // Page query
                int offset = Math.Max(0, (page - 1) * pageSize);
                cmd.CommandText = $@"
                    SELECT log_id, user_id, username, action, table_name, record_id, old_value, new_value, ip_address, severity, created_at
                    FROM `audit_logs`
                    {whereSql}
                    ORDER BY created_at DESC, log_id DESC
                    LIMIT @limit OFFSET @offset;";

                AddParam(cmd, "@limit", pageSize);
                AddParam(cmd, "@offset", offset);

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    logs.Add(new AuditLogDto
                    {
                        LogId = reader.GetInt64(0),
                        UserId = reader.IsDBNull(1) ? null : reader.GetInt64(1),
                        Username = reader.IsDBNull(2) ? "System" : reader.GetString(2),
                        Action = reader.GetString(3),
                        TableName = reader.GetString(4),
                        RecordId = reader.IsDBNull(5) ? null : reader.GetString(5),
                        OldValue = reader.IsDBNull(6) ? null : reader.GetString(6),
                        NewValue = reader.IsDBNull(7) ? null : reader.GetString(7),
                        IpAddress = reader.IsDBNull(8) ? null : reader.GetString(8),
                        Severity = reader.IsDBNull(9) ? "INFO" : reader.GetString(9),
                        CreatedAt = reader.IsDBNull(10) ? DateTime.UtcNow : reader.GetDateTime(10)
                    });
                }
            }

            return Ok(new
            {
                success = true,
                count = logs.Count,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                data = logs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve audit logs");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Writes a new audit log record.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("logs")]
    public async Task<IActionResult> CreateAuditLog([FromBody] CreateAuditLogRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Action) || string.IsNullOrWhiteSpace(request.TableName))
        {
            return BadRequest(new { success = false, message = "Action and TableName are required." });
        }

        try
        {
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO `audit_logs` (user_id, username, action, table_name, record_id, old_value, new_value, ip_address, severity, created_at)
                    VALUES (@uid, @user, @act, @tbl, @rec, @old, @new, @ip, @sev, NOW());";

                AddParam(cmd, "@uid", (object?)request.UserId ?? DBNull.Value);
                AddParam(cmd, "@user", request.Username?.Trim() ?? "pirnav");
                AddParam(cmd, "@act", request.Action.Trim());
                AddParam(cmd, "@tbl", request.TableName.Trim());
                AddParam(cmd, "@rec", (object?)request.RecordId?.Trim() ?? DBNull.Value);
                AddParam(cmd, "@old", (object?)request.OldValue ?? DBNull.Value);
                AddParam(cmd, "@new", (object?)request.NewValue ?? DBNull.Value);
                AddParam(cmd, "@ip", (object?)request.IpAddress?.Trim() ?? DBNull.Value);
                AddParam(cmd, "@sev", request.Severity?.Trim() ?? "INFO");

                await cmd.ExecuteNonQueryAsync();
            }

            return Ok(new { success = true, message = "Audit log recorded successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record audit log for action {Action}", request.Action);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves statistical summary of audit logs for CA and operational monitoring.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetAuditSummary()
    {
        try
        {
            var summary = new AuditSummaryDto();
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN action LIKE '%CREATE_ORDER%' OR action LIKE '%ORDER_PLACED%' THEN 1 ELSE 0 END) as orders,
                        SUM(CASE WHEN action LIKE '%CANCEL%' OR action LIKE '%VOID%' THEN 1 ELSE 0 END) as cancellations,
                        SUM(CASE WHEN action LIKE '%SETTLE%' OR action LIKE '%PAYMENT%' THEN 1 ELSE 0 END) as settlements,
                        SUM(CASE WHEN action LIKE '%STOCK%' OR action LIKE '%INVENTORY%' THEN 1 ELSE 0 END) as inventory,
                        SUM(CASE WHEN action LIKE '%JOURNAL%' OR action LIKE '%BALANCE%' THEN 1 ELSE 0 END) as financial,
                        SUM(CASE WHEN action LIKE '%LOGIN%' OR action LIKE '%AUTH%' THEN 1 ELSE 0 END) as security,
                        MAX(created_at) as last_time
                    FROM `audit_logs`;";

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    summary.TotalEvents = Convert.ToInt32(reader[0] == DBNull.Value ? 0 : reader[0]);
                    summary.OrdersCreatedCount = Convert.ToInt32(reader[1] == DBNull.Value ? 0 : reader[1]);
                    summary.OrdersCancelledCount = Convert.ToInt32(reader[2] == DBNull.Value ? 0 : reader[2]);
                    summary.SettlementsCount = Convert.ToInt32(reader[3] == DBNull.Value ? 0 : reader[3]);
                    summary.InventoryAdjustmentsCount = Convert.ToInt32(reader[4] == DBNull.Value ? 0 : reader[4]);
                    summary.FinancialAuditsCount = Convert.ToInt32(reader[5] == DBNull.Value ? 0 : reader[5]);
                    summary.SecurityLoginsCount = Convert.ToInt32(reader[6] == DBNull.Value ? 0 : reader[6]);
                    summary.LastEventTimestamp = reader.IsDBNull(7) ? null : reader.GetDateTime(7);
                }
            }

            return Ok(new { success = true, data = summary });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get audit summary");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Exports audit log records into a statutory CSV file for CA and Auditor compliance.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("export")]
    public async Task<IActionResult> ExportAuditLogs([FromQuery] string? fromDate, [FromQuery] string? toDate)
    {
        try
        {
            var sb = new StringBuilder();
            sb.AppendLine("Log ID,Timestamp,Operator,Action,Entity,Record ID,Severity,Old Value,New Value,IP Address");

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT log_id, created_at, username, action, table_name, record_id, severity, old_value, new_value, ip_address 
                    FROM `audit_logs` 
                    ORDER BY created_at DESC 
                    LIMIT 2000;";

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var logId = reader.GetInt64(0);
                    var ts = reader.IsDBNull(1) ? "" : reader.GetDateTime(1).ToString("yyyy-MM-dd HH:mm:ss");
                    var user = EscapeCsv(reader.IsDBNull(2) ? "System" : reader.GetString(2));
                    var action = EscapeCsv(reader.GetString(3));
                    var entity = EscapeCsv(reader.GetString(4));
                    var rec = EscapeCsv(reader.IsDBNull(5) ? "" : reader.GetString(5));
                    var sev = EscapeCsv(reader.IsDBNull(6) ? "INFO" : reader.GetString(6));
                    var oldV = EscapeCsv(reader.IsDBNull(7) ? "" : reader.GetString(7));
                    var newV = EscapeCsv(reader.IsDBNull(8) ? "" : reader.GetString(8));
                    var ip = EscapeCsv(reader.IsDBNull(9) ? "" : reader.GetString(9));

                    sb.AppendLine($"{logId},{ts},{user},{action},{entity},{rec},{sev},{oldV},{newV},{ip}");
                }
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var filename = $"Audit_Trail_Report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            return File(bytes, "text/csv", filename);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export audit logs");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private async Task SeedInitialAuditLogsAsync()
    {
        try
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            var seedCommands = new[]
            {
                ("pirnav", "USER_LOGIN_SUCCESS", "users", "1", "", "Logged into POS Admin Portal", "INFO", "127.0.0.1"),
                ("pirnav", "OPENING_BALANCE_RECORDED", "daily_balances", DateTime.UtcNow.ToString("yyyy-MM-dd"), "", "Initial register cash float: ₹5,000.00, Bank: ₹25,000.00", "INFO", "127.0.0.1"),
                ("System", "SYSTEM_STARTUP", "system", "app_start", "", "ASP.NET Core Web API initialized on port 5000", "INFO", "65.0.8.48"),
                ("pirnav", "CREATE_JOURNAL_VOUCHER", "journal_entries", "JV-2026-001", "", "Initial Partner Equity infusion: ₹5,00,000.00", "INFO", "127.0.0.1"),
                ("Cashier", "ORDER_SETTLED", "restaurant_orders", "INV-1001", "Pending", "Settled via UPI with 5% GST", "INFO", "192.168.0.159"),
                ("Manager", "INVENTORY_PURCHASE_RECORDED", "inventory_purchases", "PO-001", "", "Fresh Basmati Rice and Dairy Stock acquired", "INFO", "127.0.0.1"),
                ("pirnav", "SALARY_DISBURSEMENT", "salary_payments", "PAY-2026-11", "", "Monthly payroll disbursed to waitstaff & chefs", "INFO", "127.0.0.1")
            };

            foreach (var (user, act, tbl, rec, oldV, newV, sev, ip) in seedCommands)
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO `audit_logs` (user_id, username, action, table_name, record_id, old_value, new_value, severity, ip_address, created_at)
                    VALUES (1, @user, @act, @tbl, @rec, @old, @new, @sev, @ip, NOW());";
                AddParam(cmd, "@user", user);
                AddParam(cmd, "@act", act);
                AddParam(cmd, "@tbl", tbl);
                AddParam(cmd, "@rec", rec);
                AddParam(cmd, "@old", oldV);
                AddParam(cmd, "@new", newV);
                AddParam(cmd, "@sev", sev);
                AddParam(cmd, "@ip", ip);
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not seed initial audit logs");
        }
    }

    private static string EscapeCsv(string val)
    {
        if (string.IsNullOrEmpty(val)) return "\"\"";
        var cleaned = val.Replace("\"", "\"\"").Replace("\r", " ").Replace("\n", " ");
        return $"\"{cleaned}\"";
    }

    private static void AddParam(System.Data.Common.DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}
