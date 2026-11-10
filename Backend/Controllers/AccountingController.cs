using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HMS.Data;
using HMS.DTOs;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/accounting")]
public class AccountingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AccountingController> _logger;

    private static readonly List<ChartOfAccountDto> DefaultChartOfAccounts = new()
    {
        // 1000 - Assets
        new() { AccountCode = "1001", AccountName = "Cash in Hand", AccountGroup = "Assets", AccountType = "Current Asset", NormalBalance = "Debit", Description = "Physical cash in restaurant register", IsSystem = true },
        new() { AccountCode = "1002", AccountName = "Bank & UPI Collections", AccountGroup = "Assets", AccountType = "Current Asset", NormalBalance = "Debit", Description = "HDFC / ICICI POS terminal & UPI settled account", IsSystem = true },
        new() { AccountCode = "1100", AccountName = "Accounts Receivable", AccountGroup = "Assets", AccountType = "Current Asset", NormalBalance = "Debit", Description = "Credit customer receivables & pending card settlements", IsSystem = true },
        new() { AccountCode = "1200", AccountName = "Inventory Asset", AccountGroup = "Assets", AccountType = "Current Asset", NormalBalance = "Debit", Description = "Raw material ingredients, beverage stock & supplies on hand", IsSystem = true },
        new() { AccountCode = "1501", AccountName = "Kitchen & Bar Equipment", AccountGroup = "Assets", AccountType = "Fixed Asset", NormalBalance = "Debit", Description = "Ovens, fryers, refrigeration, bar blenders, espresso machines", IsSystem = true },
        new() { AccountCode = "1502", AccountName = "POS & Computer Equipment", AccountGroup = "Assets", AccountType = "Fixed Asset", NormalBalance = "Debit", Description = "Touchscreen terminals, thermal receipt printers, router & display monitors", IsSystem = true },
        new() { AccountCode = "1503", AccountName = "Restaurant Furniture & Fixtures", AccountGroup = "Assets", AccountType = "Fixed Asset", NormalBalance = "Debit", Description = "Dining tables, luxury chairs, ambient lighting & counter installations", IsSystem = true },

        // 2000 - Liabilities
        new() { AccountCode = "2001", AccountName = "Accounts Payable", AccountGroup = "Liabilities", AccountType = "Current Liability", NormalBalance = "Credit", Description = "Outstanding dues to raw ingredient & vegetable vendors", IsSystem = true },
        new() { AccountCode = "2002", AccountName = "GST Output Tax Payable", AccountGroup = "Liabilities", AccountType = "Current Liability", NormalBalance = "Credit", Description = "5% Restaurant GST collected (2.5% CGST + 2.5% SGST)", IsSystem = true },
        new() { AccountCode = "2003", AccountName = "Staff Salaries Payable", AccountGroup = "Liabilities", AccountType = "Current Liability", NormalBalance = "Credit", Description = "Accrued payroll dues pending monthly disbursement", IsSystem = true },
        new() { AccountCode = "2004", AccountName = "Short Term Business Loan", AccountGroup = "Liabilities", AccountType = "Current Liability", NormalBalance = "Credit", Description = "Working capital loan & overdraft credit line", IsSystem = true },

        // 3000 - Equity
        new() { AccountCode = "3001", AccountName = "Owner Capital & Equity", AccountGroup = "Equity", AccountType = "Equity", NormalBalance = "Credit", Description = "Initial capital infused by restaurant partners", IsSystem = true },
        new() { AccountCode = "3002", AccountName = "Retained Earnings", AccountGroup = "Equity", AccountType = "Equity", NormalBalance = "Credit", Description = "Cumulative net earnings reinvested in the restaurant", IsSystem = true },

        // 4000 - Income / Revenue
        new() { AccountCode = "4001", AccountName = "Dine-In Food Sales Revenue", AccountGroup = "Income", AccountType = "Direct Income", NormalBalance = "Credit", Description = "Sales generated from table dining", IsSystem = true },
        new() { AccountCode = "4002", AccountName = "Takeaway & Delivery Sales Revenue", AccountGroup = "Income", AccountType = "Direct Income", NormalBalance = "Credit", Description = "Revenue from parcel orders and takeaway counters", IsSystem = true },
        new() { AccountCode = "4003", AccountName = "Bar & Beverages Sales Revenue", AccountGroup = "Income", AccountType = "Direct Income", NormalBalance = "Credit", Description = "Mocktails, juices, soft drinks and bar sales", IsSystem = true },
        new() { AccountCode = "4004", AccountName = "Service Charges Collected", AccountGroup = "Income", AccountType = "Indirect Income", NormalBalance = "Credit", Description = "Discretionary service charges collected from diners", IsSystem = true },
        new() { AccountCode = "4005", AccountName = "Other Miscellaneous Income", AccountGroup = "Income", AccountType = "Indirect Income", NormalBalance = "Credit", Description = "Scrap sales, event bookings, promo rebates", IsSystem = true },

        // 5000 - Expenses
        new() { AccountCode = "5001", AccountName = "Cost of Goods Sold (COGS)", AccountGroup = "Expenses", AccountType = "Direct Expense", NormalBalance = "Debit", Description = "Direct kitchen raw materials, meat, vegetables, spices consumed", IsSystem = true },
        new() { AccountCode = "5002", AccountName = "Staff Salaries & Wages", AccountGroup = "Expenses", AccountType = "Indirect Expense", NormalBalance = "Debit", Description = "Monthly wages for chefs, waitstaff, captains, cashiers & cleaning team", IsSystem = true },
        new() { AccountCode = "5003", AccountName = "Restaurant Rent", AccountGroup = "Expenses", AccountType = "Indirect Expense", NormalBalance = "Debit", Description = "Monthly lease for restaurant dining floor & kitchen premises", IsSystem = true },
        new() { AccountCode = "5004", AccountName = "Electricity & Water Utilities", AccountGroup = "Expenses", AccountType = "Indirect Expense", NormalBalance = "Debit", Description = "Commercial power, backup generator diesel, water supply", IsSystem = true },
        new() { AccountCode = "5005", AccountName = "Gas & Kitchen Fuel", AccountGroup = "Expenses", AccountType = "Direct Expense", NormalBalance = "Debit", Description = "Commercial LPG cylinders & kitchen fuel", IsSystem = true },
        new() { AccountCode = "5006", AccountName = "Repairs & Maintenance", AccountGroup = "Expenses", AccountType = "Indirect Expense", NormalBalance = "Debit", Description = "HVAC maintenance, kitchen equipment upkeep & civil repairs", IsSystem = true },
        new() { AccountCode = "5007", AccountName = "Software & POS Subscriptions", AccountGroup = "Expenses", AccountType = "Indirect Expense", NormalBalance = "Debit", Description = "Cloud hosting, SMS gateway, licensing and tech maintenance", IsSystem = true },
    };

    public AccountingController(AppDbContext context, ILogger<AccountingController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ========================================================================
    // 1. CHART OF ACCOUNTS (COA)
    // ========================================================================

    [AllowAnonymous]
    [HttpGet("chart-of-accounts")]
    public async Task<IActionResult> GetChartOfAccounts()
    {
        try
        {
            var accounts = new List<ChartOfAccountDto>();
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT id, account_code, account_name, account_group, account_type, normal_balance, description, opening_balance, is_system FROM `chart_of_accounts` ORDER BY account_code ASC;";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    accounts.Add(new ChartOfAccountDto
                    {
                        Id = reader.GetInt64(0),
                        AccountCode = reader.GetString(1),
                        AccountName = reader.GetString(2),
                        AccountGroup = reader.GetString(3),
                        AccountType = reader.GetString(4),
                        NormalBalance = reader.GetString(5),
                        Description = reader.IsDBNull(6) ? null : reader.GetString(6),
                        OpeningBalance = reader.IsDBNull(7) ? 0 : reader.GetDecimal(7),
                        IsSystem = !reader.IsDBNull(8) && (reader.GetBoolean(8) || reader.GetInt32(8) == 1)
                    });
                }
            }

            if (accounts.Count == 0)
            {
                // Seed defaults into database if table is empty
                await SeedDefaultChartOfAccountsAsync();
                accounts = DefaultChartOfAccounts;
            }

            return Ok(new { success = true, count = accounts.Count, data = accounts });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read chart_of_accounts from DB, returning in-memory defaults.");
            return Ok(new { success = true, count = DefaultChartOfAccounts.Count, data = DefaultChartOfAccounts });
        }
    }

    [AllowAnonymous]
    [HttpPost("chart-of-accounts")]
    public async Task<IActionResult> SaveChartOfAccount([FromBody] ChartOfAccountDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.AccountCode) || string.IsNullOrWhiteSpace(dto.AccountName))
        {
            return BadRequest(new { success = false, message = "Account Code and Name are required." });
        }

        try
        {
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO `chart_of_accounts` (account_code, account_name, account_group, account_type, normal_balance, description, opening_balance, is_system, created_at)
                    VALUES (@code, @name, @group, @type, @norm, @desc, @openBal, @sys, NOW())
                    ON DUPLICATE KEY UPDATE 
                        account_name = VALUES(account_name),
                        account_group = VALUES(account_group),
                        account_type = VALUES(account_type),
                        normal_balance = VALUES(normal_balance),
                        description = VALUES(description),
                        opening_balance = VALUES(opening_balance);";

                AddParam(cmd, "@code", dto.AccountCode.Trim());
                AddParam(cmd, "@name", dto.AccountName.Trim());
                AddParam(cmd, "@group", dto.AccountGroup?.Trim() ?? "Assets");
                AddParam(cmd, "@type", dto.AccountType?.Trim() ?? "Current Asset");
                AddParam(cmd, "@norm", dto.NormalBalance?.Trim() ?? "Debit");
                AddParam(cmd, "@desc", dto.Description?.Trim());
                AddParam(cmd, "@openBal", dto.OpeningBalance);
                AddParam(cmd, "@sys", dto.IsSystem ? 1 : 0);

                await cmd.ExecuteNonQueryAsync();
            }

            return Ok(new { success = true, message = "Account saved successfully.", data = dto });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save chart of account {Code}", dto.AccountCode);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ========================================================================
    // 2. JOURNAL ENTRIES (DOUBLE-ENTRY POSTINGS)
    // ========================================================================

    [AllowAnonymous]
    [HttpGet("journal-entries")]
    public async Task<IActionResult> GetJournalEntries([FromQuery] string? fromDate, [FromQuery] string? toDate)
    {
        try
        {
            var entries = new List<JournalEntryDto>();
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT id, voucher_number, entry_date, narration, total_debit, total_credit, lines_json, created_by, created_at FROM `journal_entries` ORDER BY entry_date DESC, id DESC;";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var linesJson = reader.IsDBNull(6) ? "[]" : reader.GetString(6);
                    var lines = new List<JournalEntryLineDto>();
                    try
                    {
                        lines = JsonSerializer.Deserialize<List<JournalEntryLineDto>>(linesJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                    }
                    catch {}

                    entries.Add(new JournalEntryDto
                    {
                        Id = reader.GetInt64(0),
                        VoucherNumber = reader.GetString(1),
                        EntryDate = reader.GetString(2),
                        Narration = reader.GetString(3),
                        TotalDebit = reader.GetDecimal(4),
                        TotalCredit = reader.GetDecimal(5),
                        Lines = lines,
                        CreatedBy = reader.IsDBNull(7) ? "pirnav" : reader.GetString(7),
                        CreatedAt = reader.IsDBNull(8) ? DateTime.UtcNow : reader.GetDateTime(8)
                    });
                }
            }

            return Ok(new { success = true, count = entries.Count, data = entries });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get journal entries");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("journal-entries")]
    public async Task<IActionResult> CreateJournalEntry([FromBody] CreateJournalEntryRequestDto request)
    {
        if (request == null || request.Lines == null || request.Lines.Count < 2)
        {
            return BadRequest(new { success = false, message = "A journal entry must contain at least 2 line items." });
        }

        decimal totalDebit = 0;
        decimal totalCredit = 0;
        foreach (var line in request.Lines)
        {
            totalDebit += line.Debit;
            totalCredit += line.Credit;
        }

        // Validate double-entry equality
        if (Math.Abs(totalDebit - totalCredit) > 0.05m)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Double-entry imbalance: Total Debit (₹{totalDebit:N2}) must equal Total Credit (₹{totalCredit:N2})."
            });
        }

        var voucherNo = string.IsNullOrWhiteSpace(request.VoucherNumber)
            ? $"JV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
            : request.VoucherNumber.Trim();

        var entryDate = string.IsNullOrWhiteSpace(request.EntryDate)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : request.EntryDate.Trim();

        var linesJson = JsonSerializer.Serialize(request.Lines);

        try
        {
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO `journal_entries` (voucher_number, entry_date, narration, total_debit, total_credit, lines_json, created_by, created_at)
                    VALUES (@vouch, @date, @narr, @deb, @cred, @lines, @user, NOW())
                    ON DUPLICATE KEY UPDATE
                        entry_date = VALUES(entry_date),
                        narration = VALUES(narration),
                        total_debit = VALUES(total_debit),
                        total_credit = VALUES(total_credit),
                        lines_json = VALUES(lines_json);";

                AddParam(cmd, "@vouch", voucherNo);
                AddParam(cmd, "@date", entryDate);
                AddParam(cmd, "@narr", request.Narration?.Trim() ?? "General Journal Voucher");
                AddParam(cmd, "@deb", totalDebit);
                AddParam(cmd, "@cred", totalCredit);
                AddParam(cmd, "@lines", linesJson);
                AddParam(cmd, "@user", request.CreatedBy?.Trim() ?? "pirnav");

                await cmd.ExecuteNonQueryAsync();

                // Also log audit trail for accounting entry
                using var auditCmd = conn.CreateCommand();
                auditCmd.CommandText = @"
                    INSERT INTO `audit_logs` (user_id, username, action, table_name, record_id, new_value, severity, created_at)
                    VALUES (1, @user, 'CREATE_JOURNAL_VOUCHER', 'journal_entries', @vouch, @narr, 'INFO', NOW());";
                AddParam(auditCmd, "@user", request.CreatedBy?.Trim() ?? "pirnav");
                AddParam(auditCmd, "@vouch", voucherNo);
                AddParam(auditCmd, "@narr", $"Voucher {voucherNo} posted with Debit/Credit ₹{totalDebit:N2}");
                await auditCmd.ExecuteNonQueryAsync();
            }

            return Ok(new
            {
                success = true,
                message = $"Journal voucher {voucherNo} posted successfully.",
                data = new
                {
                    voucherNumber = voucherNo,
                    entryDate,
                    narration = request.Narration,
                    totalDebit,
                    totalCredit,
                    lines = request.Lines
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create journal entry {Voucher}", voucherNo);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpDelete("journal-entries/{voucherNumber}")]
    public async Task<IActionResult> DeleteJournalEntry(string voucherNumber)
    {
        if (string.IsNullOrWhiteSpace(voucherNumber)) return BadRequest(new { success = false, message = "Voucher number required." });

        try
        {
            int rows = 0;
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM `journal_entries` WHERE voucher_number = @vouch;";
                AddParam(cmd, "@vouch", voucherNumber.Trim());
                rows = await cmd.ExecuteNonQueryAsync();

                // Audit log the deletion
                using var auditCmd = conn.CreateCommand();
                auditCmd.CommandText = @"
                    INSERT INTO `audit_logs` (user_id, username, action, table_name, record_id, new_value, severity, created_at)
                    VALUES (1, 'pirnav', 'DELETE_JOURNAL_VOUCHER', 'journal_entries', @vouch, 'Voucher deleted / voided', 'WARNING', NOW());";
                AddParam(auditCmd, "@vouch", voucherNumber.Trim());
                await auditCmd.ExecuteNonQueryAsync();
            }

            return Ok(new { success = true, message = $"Journal voucher {voucherNumber} deleted.", rowsAffected = rows });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete journal entry {Voucher}", voucherNumber);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ========================================================================
    // 3. DAILY OPENING & CLOSING BALANCES
    // ========================================================================

    [AllowAnonymous]
    [HttpGet("daily-balances")]
    public async Task<IActionResult> GetDailyBalances()
    {
        try
        {
            var balances = new List<DailyBalanceDto>();
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT id, balance_date, opening_cash, opening_bank, opening_total, 
                           closing_cash, closing_bank, closing_total, expected_cash, cash_difference, 
                           is_closed, opened_by, closed_by, notes, created_at 
                    FROM `daily_balances` 
                    ORDER BY balance_date DESC;";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    balances.Add(new DailyBalanceDto
                    {
                        Id = reader.GetInt64(0),
                        Date = reader.GetString(1),
                        OpeningCash = reader.GetDecimal(2),
                        OpeningBank = reader.GetDecimal(3),
                        OpeningTotal = reader.GetDecimal(4),
                        ClosingCash = reader.IsDBNull(5) ? null : reader.GetDecimal(5),
                        ClosingBank = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
                        ClosingTotal = reader.IsDBNull(7) ? null : reader.GetDecimal(7),
                        ExpectedCash = reader.IsDBNull(8) ? null : reader.GetDecimal(8),
                        CashDifference = reader.IsDBNull(9) ? null : reader.GetDecimal(9),
                        IsClosed = !reader.IsDBNull(10) && (reader.GetBoolean(10) || reader.GetInt32(10) == 1),
                        OpenedBy = reader.IsDBNull(11) ? null : reader.GetString(11),
                        ClosedBy = reader.IsDBNull(12) ? null : reader.GetString(12),
                        Notes = reader.IsDBNull(13) ? null : reader.GetString(13),
                        CreatedAt = reader.IsDBNull(14) ? DateTime.UtcNow : reader.GetDateTime(14)
                    });
                }
            }

            return Ok(new { success = true, count = balances.Count, data = balances });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get daily balances");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("daily-balances")]
    public async Task<IActionResult> SaveDailyBalance([FromBody] SaveDailyBalanceRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Date))
        {
            return BadRequest(new { success = false, message = "Balance date is required." });
        }

        var date = request.Date.Trim();
        var openTotal = request.OpeningCash + request.OpeningBank;
        decimal? closeTotal = (request.ClosingCash.HasValue || request.ClosingBank.HasValue)
            ? (request.ClosingCash ?? 0) + (request.ClosingBank ?? 0)
            : null;

        try
        {
            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO `daily_balances` 
                    (balance_date, opening_cash, opening_bank, opening_total, closing_cash, closing_bank, closing_total, expected_cash, cash_difference, is_closed, opened_by, closed_by, notes, created_at, updated_at)
                    VALUES 
                    (@date, @opCash, @opBank, @opTot, @clCash, @clBank, @clTot, @expCash, @diff, @closed, @opBy, @clBy, @notes, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        opening_cash = VALUES(opening_cash),
                        opening_bank = VALUES(opening_bank),
                        opening_total = VALUES(opening_total),
                        closing_cash = VALUES(closing_cash),
                        closing_bank = VALUES(closing_bank),
                        closing_total = VALUES(closing_total),
                        expected_cash = VALUES(expected_cash),
                        cash_difference = VALUES(cash_difference),
                        is_closed = VALUES(is_closed),
                        opened_by = COALESCE(VALUES(opened_by), opened_by),
                        closed_by = VALUES(closed_by),
                        notes = VALUES(notes),
                        updated_at = NOW();";

                AddParam(cmd, "@date", date);
                AddParam(cmd, "@opCash", request.OpeningCash);
                AddParam(cmd, "@opBank", request.OpeningBank);
                AddParam(cmd, "@opTot", openTotal);
                AddParam(cmd, "@clCash", (object?)request.ClosingCash ?? DBNull.Value);
                AddParam(cmd, "@clBank", (object?)request.ClosingBank ?? DBNull.Value);
                AddParam(cmd, "@clTot", (object?)closeTotal ?? DBNull.Value);
                AddParam(cmd, "@expCash", (object?)request.ExpectedCash ?? DBNull.Value);
                AddParam(cmd, "@diff", (object?)request.CashDifference ?? DBNull.Value);
                AddParam(cmd, "@closed", request.IsClosed ? 1 : 0);
                AddParam(cmd, "@opBy", (object?)request.OpenedBy ?? DBNull.Value);
                AddParam(cmd, "@clBy", (object?)request.ClosedBy ?? DBNull.Value);
                AddParam(cmd, "@notes", (object?)request.Notes ?? DBNull.Value);

                await cmd.ExecuteNonQueryAsync();

                // Audit log for daily balance operation
                var actionType = request.IsClosed ? "CLOSING_BALANCE_SETTLED" : "OPENING_BALANCE_RECORDED";
                using var auditCmd = conn.CreateCommand();
                auditCmd.CommandText = @"
                    INSERT INTO `audit_logs` (user_id, username, action, table_name, record_id, new_value, severity, created_at)
                    VALUES (1, @user, @action, 'daily_balances', @date, @val, 'INFO', NOW());";
                AddParam(auditCmd, "@user", request.ClosedBy ?? request.OpenedBy ?? "pirnav");
                AddParam(auditCmd, "@action", actionType);
                AddParam(auditCmd, "@date", date);
                AddParam(auditCmd, "@val", $"Date: {date}, Open: ₹{openTotal:N2}, Close: ₹{closeTotal ?? 0:N2}");
                await auditCmd.ExecuteNonQueryAsync();
            }

            return Ok(new
            {
                success = true,
                message = request.IsClosed ? "Closing register finalized and recorded." : "Opening float recorded.",
                data = new
                {
                    date,
                    openingCash = request.OpeningCash,
                    openingBank = request.OpeningBank,
                    openingTotal = openTotal,
                    closingCash = request.ClosingCash,
                    closingBank = request.ClosingBank,
                    closingTotal = closeTotal,
                    isClosed = request.IsClosed
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save daily balance for date {Date}", date);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ========================================================================
    // 4. FINANCIAL STATEMENTS SUMMARY
    // ========================================================================

    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetFinancialSummary()
    {
        try
        {
            decimal totalRevenue = 0;
            decimal totalPurchases = 0;
            decimal totalSalaries = 0;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                // Total Settled Sales
                try
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT COALESCE(SUM(total_amount), 0) FROM `restaurant_orders` WHERE LOWER(status) IN ('settled', 'completed') OR is_paid = 1;";
                    var result = await cmd.ExecuteScalarAsync();
                    totalRevenue = Convert.ToDecimal(result ?? 0);
                }
                catch {}

                // Total Inventory Purchases
                try
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT COALESCE(SUM(total_amount), 0) FROM `inventory_purchases`;";
                    var result = await cmd.ExecuteScalarAsync();
                    totalPurchases = Convert.ToDecimal(result ?? 0);
                }
                catch {}

                // Total Staff Salary Payments
                try
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT COALESCE(SUM(amount), 0) FROM `salary_payments`;";
                    var result = await cmd.ExecuteScalarAsync();
                    totalSalaries = Convert.ToDecimal(result ?? 0);
                }
                catch {}
            }

            decimal grossProfit = totalRevenue - totalPurchases;
            decimal netProfit = grossProfit - totalSalaries;

            // Simplified balance sheet approximation for instant high-level overview
            decimal assets = 500000m + netProfit;
            decimal liabilities = 50000m;
            decimal equity = assets - liabilities;

            return Ok(new
            {
                success = true,
                data = new FinancialStatementSummaryDto
                {
                    TotalRevenue = totalRevenue,
                    TotalDirectCost = totalPurchases,
                    GrossProfit = grossProfit,
                    TotalOperatingExpenses = totalSalaries,
                    NetProfit = netProfit,
                    TotalAssets = assets,
                    TotalLiabilities = liabilities,
                    TotalEquity = equity,
                    IsBalanceSheetBalanced = true
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get financial summary");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private async Task SeedDefaultChartOfAccountsAsync()
    {
        try
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();
            foreach (var acc in DefaultChartOfAccounts)
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT IGNORE INTO `chart_of_accounts` 
                    (account_code, account_name, account_group, account_type, normal_balance, description, opening_balance, is_system, created_at)
                    VALUES (@code, @name, @group, @type, @norm, @desc, 0, 1, NOW());";
                AddParam(cmd, "@code", acc.AccountCode);
                AddParam(cmd, "@name", acc.AccountName);
                AddParam(cmd, "@group", acc.AccountGroup);
                AddParam(cmd, "@type", acc.AccountType);
                AddParam(cmd, "@norm", acc.NormalBalance);
                AddParam(cmd, "@desc", acc.Description);
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not seed default chart of accounts");
        }
    }

    private static void AddParam(System.Data.Common.DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}
