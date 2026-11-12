using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/accounting")]
[AllowAnonymous]
[Tags("Accounting & Audit")]
public class AccountingController : ControllerBase
{
    private readonly AccountingService _accountingService;
    private readonly ExportService _exportService;
    private readonly ILogger<AccountingController> _logger;

    public AccountingController(
        AccountingService accountingService,
        ExportService exportService,
        ILogger<AccountingController> logger)
    {
        _accountingService = accountingService;
        _exportService = exportService;
        _logger = logger;
    }

    // ============================================================
    // 1. DAILY BALANCES (DAILY CASH & BANK REGISTER)
    // ============================================================

    /// <summary>
    /// Daily Cash &amp; Bank Register for a specific business date (defaults to Today).
    /// Returns Opening Balance (Cash Float &amp; Bank), Real-Time Inflows (Sales Receipts &amp; JV),
    /// Outflows (Purchases, Payroll &amp; Petty Expenses), Closing Balances, Physical Cash Reconciliation, and Day Transactions.
    /// </summary>
    [HttpGet("daily-balances")]
    public async Task<IActionResult> GetDailyBalance([FromQuery] DateTime? date)
    {
        try
        {
            var data = await _accountingService.GetDailyBalanceAsync(date);
            return Ok(new
            {
                success = true,
                message = "Daily Cash & Bank Register retrieved successfully.",
                data
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving daily cash & bank register for date={Date}", date);
            return StatusCode(500, new { success = false, message = "Failed to retrieve daily balance register.", error = ex.Message });
        }
    }

    /// <summary>
    /// Multi-day Daily Cash &amp; Bank Register timeline &amp; shift history (?fromDate=&amp;toDate=&amp;status=Open|Closed).
    /// </summary>
    [HttpGet("daily-balances/history")]
    public async Task<IActionResult> GetDailyBalanceHistory(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status)
    {
        try
        {
            var (fromStr, toStr, items) = await _accountingService.GetDailyBalanceHistoryAsync(fromDate, toDate, status);
            return Ok(new
            {
                success = true,
                message = "Daily balance history retrieved successfully.",
                fromDate = fromStr,
                toDate = toStr,
                count = items.Count,
                data = items
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving daily balance history");
            return StatusCode(500, new { success = false, message = "Failed to retrieve daily balance history.", error = ex.Message });
        }
    }

    /// <summary>
    /// Opens or updates a Daily Register Shift with Opening Cash Float &amp; Opening Bank Balance.
    /// </summary>
    [HttpPost("daily-balances/open")]
    public async Task<IActionResult> OpenOrUpdateDailyShift([FromBody] OpenDailyRegisterRequestDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Request payload is required." });

        try
        {
            var data = await _accountingService.OpenOrUpdateDailyShiftAsync(dto);
            return Ok(new
            {
                success = true,
                message = $"Daily register shift opened for {data.BusinessDate}.",
                data
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error opening/updating daily shift");
            return StatusCode(500, new { success = false, message = "Failed to open daily register shift.", error = ex.Message });
        }
    }

    /// <summary>
    /// Records Physical Cash Count (total or currency denominations), computes Cash Variance, and optionally closes the shift.
    /// </summary>
    [HttpPost("daily-balances/reconcile")]
    public async Task<IActionResult> ReconcileDailyShift([FromBody] ReconcileDailyRegisterRequestDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Reconciliation payload is required." });

        try
        {
            var data = await _accountingService.ReconcileDailyShiftAsync(dto);
            return Ok(new
            {
                success = true,
                message = data.ShiftStatus == "Closed"
                    ? $"Daily register closed and reconciled for {data.BusinessDate}."
                    : $"Physical cash count saved for {data.BusinessDate}.",
                data
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconciling daily cash register");
            return StatusCode(500, new { success = false, message = "Failed to reconcile daily register.", error = ex.Message });
        }
    }

    /// <summary>
    /// Reopens a previously closed daily cash &amp; bank register shift.
    /// </summary>
    [HttpPost("daily-balances/reopen")]
    public async Task<IActionResult> ReopenDailyShift([FromBody] ReopenDailyRegisterRequestDto? dto)
    {
        try
        {
            var data = await _accountingService.ReopenDailyShiftAsync(dto ?? new ReopenDailyRegisterRequestDto());
            return Ok(new
            {
                success = true,
                message = $"Daily register shift reopened for {data.BusinessDate}.",
                data
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reopening daily cash register shift");
            return StatusCode(500, new { success = false, message = "Failed to reopen shift.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports Daily Cash &amp; Bank Register (single date or history date range) as CSV or XLSX.
    /// </summary>
    [HttpGet("daily-balances/export")]
    public async Task<IActionResult> ExportDailyBalance(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _accountingService.GenerateDailyBalanceExportAsync(date, fromDate, toDate);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting daily balance register");
            return StatusCode(500, new { success = false, message = "Failed to export daily register.", error = ex.Message });
        }
    }

    // ============================================================
    // 2. CHART OF ACCOUNTS (COA)
    // ============================================================

    /// <summary>
    /// Lists Standard 5-Group Chart of Accounts with live balances and group counts
    /// (?group=All|Assets|Liabilities|Equity|Income|Expenses&amp;search=&amp;includeInactive=false).
    /// </summary>
    [HttpGet("chart-of-accounts")]
    public async Task<IActionResult> GetChartOfAccounts(
        [FromQuery] string? group,
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false)
    {
        try
        {
            var result = await _accountingService.GetChartOfAccountsAsync(group, search, includeInactive);
            return Ok(new
            {
                success = true,
                message = "Chart of Accounts retrieved successfully.",
                count = result.Accounts.Count,
                groupCounts = result.GroupCounts,
                metadata = result.Metadata,
                data = result.Accounts
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Chart of Accounts");
            return StatusCode(500, new { success = false, message = "Failed to retrieve Chart of Accounts.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single Chart of Accounts master record with live Debit/Credit/Net balance.
    /// </summary>
    [HttpGet("chart-of-accounts/{id:long}")]
    public async Task<IActionResult> GetChartOfAccountById(long id)
    {
        try
        {
            var account = await _accountingService.GetChartOfAccountByIdAsync(id);
            if (account == null)
                return NotFound(new { success = false, message = $"Ledger account with ID {id} not found." });

            return Ok(new { success = true, data = account });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Chart of Account {AccountId}", id);
            return StatusCode(500, new { success = false, message = "Failed to retrieve ledger account.", error = ex.Message });
        }
    }

    /// <summary>
    /// Creates a new ledger account under one of the 5 standard accounting groups (+ Add Ledger Account).
    /// </summary>
    [HttpPost("chart-of-accounts")]
    public async Task<IActionResult> CreateChartOfAccount([FromBody] CreateChartOfAccountDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Account payload is required." });

        try
        {
            var created = await _accountingService.CreateChartOfAccountAsync(dto);
            return StatusCode(201, new
            {
                success = true,
                message = $"Ledger account '{created.Code} • {created.AccountName}' created successfully.",
                data = created
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Chart of Account");
            return StatusCode(500, new { success = false, message = "Failed to create ledger account.", error = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing Chart of Accounts master entry.
    /// </summary>
    [HttpPut("chart-of-accounts/{id:long}")]
    public async Task<IActionResult> UpdateChartOfAccount(long id, [FromBody] UpdateChartOfAccountDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Update payload is required." });

        try
        {
            var updated = await _accountingService.UpdateChartOfAccountAsync(id, dto);
            if (updated == null)
                return NotFound(new { success = false, message = $"Ledger account with ID {id} not found." });

            return Ok(new
            {
                success = true,
                message = $"Ledger account '{updated.Code} • {updated.AccountName}' updated successfully.",
                data = updated
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating Chart of Account {AccountId}", id);
            return StatusCode(500, new { success = false, message = "Failed to update ledger account.", error = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a non-system Chart of Accounts entry if it has no posted journal voucher lines.
    /// </summary>
    [HttpDelete("chart-of-accounts/{id:long}")]
    public async Task<IActionResult> DeleteChartOfAccount(long id)
    {
        try
        {
            var (deleted, message) = await _accountingService.DeleteChartOfAccountAsync(id);
            if (!deleted)
                return NotFound(new { success = false, message });

            return Ok(new { success = true, message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Chart of Account {AccountId}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete ledger account.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports Chart of Accounts master schedule with live balances as CSV or XLSX.
    /// </summary>
    [HttpGet("chart-of-accounts/export")]
    public async Task<IActionResult> ExportChartOfAccounts(
        [FromQuery] string? group,
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _accountingService.GenerateChartOfAccountsExportAsync(group, search, includeInactive);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting Chart of Accounts");
            return StatusCode(500, new { success = false, message = "Failed to export Chart of Accounts.", error = ex.Message });
        }
    }

    // ============================================================
    // 3. GENERAL LEDGER (GL) & TRIAL BALANCE
    // ============================================================

    /// <summary>
    /// Account-level General Ledger (GL) drill-down displaying period Debits, Credits, Net Closing Balance,
    /// chronological audit postings with running balances, and account selector options.
    /// Supports ?accountId=&amp;accountCode=1001&amp;fromDate=&amp;toDate=&amp;search=.
    /// </summary>
    [HttpGet("general-ledger")]
    public async Task<IActionResult> GetGeneralLedger(
        [FromQuery] long? accountId,
        [FromQuery] string? accountCode,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search)
    {
        try
        {
            var data = await _accountingService.GetGeneralLedgerAsync(accountId, accountCode, fromDate, toDate, search);
            return Ok(new
            {
                success = true,
                message = "General Ledger account drill-down retrieved successfully.",
                count = data.Entries.Count,
                data
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving General Ledger");
            return StatusCode(500, new { success = false, message = "Failed to retrieve General Ledger.", error = ex.Message });
        }
    }

    /// <summary>
    /// Consolidated Trial Balance verifying double-entry equality across all COA accounts for a date range.
    /// </summary>
    [HttpGet("general-ledger/trial-balance")]
    public async Task<IActionResult> GetTrialBalance(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        try
        {
            var data = await _accountingService.GetTrialBalanceAsync(fromDate, toDate);
            return Ok(new
            {
                success = true,
                message = "Trial Balance calculated successfully.",
                count = data.Accounts.Count,
                data
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Trial Balance");
            return StatusCode(500, new { success = false, message = "Failed to calculate Trial Balance.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports the inspected General Ledger account audit trail as CSV or XLSX.
    /// </summary>
    [HttpGet("general-ledger/export")]
    public async Task<IActionResult> ExportGeneralLedger(
        [FromQuery] long? accountId,
        [FromQuery] string? accountCode,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _accountingService.GenerateGeneralLedgerExportAsync(accountId, accountCode, fromDate, toDate, search);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting General Ledger");
            return StatusCode(500, new { success = false, message = "Failed to export General Ledger.", error = ex.Message });
        }
    }

    // ============================================================
    // 4. JOURNAL ENTRIES (JV) — DOUBLE-ENTRY VOUCHERS
    // ============================================================

    /// <summary>
    /// Lists manual Double-Entry Journal Vouchers (JV) with debit/credit line items
    /// (?search=&amp;fromDate=&amp;toDate=&amp;voucherType=&amp;status=Posted|Void|All).
    /// </summary>
    [HttpGet("journal-entries")]
    public async Task<IActionResult> GetJournalEntries(
        [FromQuery] string? search,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? voucherType,
        [FromQuery] string? status)
    {
        try
        {
            var (totalVouchers, totalVolume, vouchers) =
                await _accountingService.GetJournalEntriesAsync(search, fromDate, toDate, voucherType, status);

            return Ok(new
            {
                success = true,
                message = "Journal Vouchers retrieved successfully.",
                totalVouchers,
                totalVolume,
                count = vouchers.Count,
                data = vouchers
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Journal Entries");
            return StatusCode(500, new { success = false, message = "Failed to retrieve Journal Vouchers.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single Journal Voucher with its Debit/Credit line details.
    /// </summary>
    [HttpGet("journal-entries/{id:long}")]
    public async Task<IActionResult> GetJournalEntryById(long id)
    {
        try
        {
            var voucher = await _accountingService.GetJournalEntryByIdAsync(id);
            if (voucher == null)
                return NotFound(new { success = false, message = $"Journal voucher with ID {id} not found." });

            return Ok(new { success = true, data = voucher });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Journal Voucher {VoucherId}", id);
            return StatusCode(500, new { success = false, message = "Failed to retrieve Journal Voucher.", error = ex.Message });
        }
    }

    /// <summary>
    /// Creates and posts a balanced Double-Entry Journal Voucher (+ New Journal Voucher).
    /// Enforces Sum(Debit) == Sum(Credit) &gt; 0 across valid COA ledger accounts.
    /// </summary>
    [HttpPost("journal-entries")]
    public async Task<IActionResult> CreateJournalVoucher([FromBody] CreateJournalVoucherRequestDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Journal voucher payload is required." });

        try
        {
            var created = await _accountingService.CreateJournalVoucherAsync(dto);
            return StatusCode(201, new
            {
                success = true,
                message = $"Journal Voucher '{created.VoucherNumber}' posted successfully.",
                data = created
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Journal Voucher");
            return StatusCode(500, new { success = false, message = "Failed to post Journal Voucher.", error = ex.Message });
        }
    }

    /// <summary>
    /// Voids a posted Journal Voucher while preserving the immutable voucher number and audit history.
    /// </summary>
    [HttpPost("journal-entries/{id:long}/void")]
    public async Task<IActionResult> VoidJournalVoucher(long id, [FromBody] VoidJournalVoucherRequestDto? dto)
    {
        try
        {
            var updated = await _accountingService.VoidJournalVoucherAsync(id, dto);
            if (updated == null)
                return NotFound(new { success = false, message = $"Journal voucher with ID {id} not found." });

            return Ok(new
            {
                success = true,
                message = $"Journal Voucher '{updated.VoucherNumber}' marked as Void.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error voiding Journal Voucher {VoucherId}", id);
            return StatusCode(500, new { success = false, message = "Failed to void Journal Voucher.", error = ex.Message });
        }
    }

    /// <summary>
    /// Permanently removes a Journal Voucher and its lines from the database.
    /// </summary>
    [HttpDelete("journal-entries/{id:long}")]
    public async Task<IActionResult> DeleteJournalVoucher(long id)
    {
        try
        {
            bool deleted = await _accountingService.DeleteJournalVoucherAsync(id);
            if (!deleted)
                return NotFound(new { success = false, message = $"Journal voucher with ID {id} not found." });

            return Ok(new { success = true, message = $"Journal voucher {id} deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Journal Voucher {VoucherId}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete Journal Voucher.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports Journal Vouchers (flattened double-entry line register) as CSV or XLSX.
    /// </summary>
    [HttpGet("journal-entries/export")]
    public async Task<IActionResult> ExportJournalEntries(
        [FromQuery] string? search,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? voucherType,
        [FromQuery] string? status,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _accountingService.GenerateJournalEntriesExportAsync(search, fromDate, toDate, voucherType, status);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting Journal Vouchers");
            return StatusCode(500, new { success = false, message = "Failed to export Journal Vouchers.", error = ex.Message });
        }
    }
}
