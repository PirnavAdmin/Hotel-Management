using HMS.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/invoices")]
[Tags("Invoices", "Admin")]
public class InvoicesController : ControllerBase
{
    private const string InvoiceBillingRoles = "Admin,Super Admin,SuperAdmin,Manager,Branch Manager,Cashier,POS Cashier,User POS";
    private const string InvoiceInquiryRoles = "Admin,Super Admin,SuperAdmin,Manager,Branch Manager,Cashier,POS Cashier,User POS,Waiter";
    private const string InvoiceAdminOnlyRoles = "Admin,Super Admin,SuperAdmin,Manager,Branch Manager";

    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(
        AppDbContext context,
        SpService spService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        IRealtimeSyncService realtimeSync,
        ILogger<InvoicesController> logger)
    {
        _context = context;
        _spService = spService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _realtimeSync = realtimeSync;
        _logger = logger;
    }

    private async Task<(bool Allowed, long? BranchId, int StatusCode, string? ErrorMessage)> ResolveAuthorizedBranchFilterAsync(long? requestedBranchId)
    {
        if (User?.Identity?.IsAuthenticated != true)
        {
            return (false, null, 401, "Authentication is required.");
        }

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        User? dbUser = null;
        if (long.TryParse(userIdClaim, out var numericUserId))
        {
            dbUser = await _context.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == numericUserId);
        }

        var roleName = dbUser?.Role?.RoleName ?? User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? "User";
        var normalizedRole = roleName.Trim().ToLowerInvariant();

        var branchClaim = User.FindFirstValue("branchId") ?? User.FindFirstValue("BranchId");
        long? claimBranchId = long.TryParse(branchClaim, out var parsedClaimBranch) && parsedClaimBranch > 0 ? parsedClaimBranch : null;
        long? userDbBranch = dbUser?.BranchId ?? claimBranchId;

        bool isGlobalAdmin = (normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "super admin") &&
                             (!userDbBranch.HasValue || userDbBranch.Value <= 0);

        if (isGlobalAdmin)
        {
            return (true, requestedBranchId.HasValue && requestedBranchId.Value > 0 ? requestedBranchId.Value : null, 200, null);
        }

        if (!userDbBranch.HasValue || userDbBranch.Value <= 0)
        {
            return (false, null, 403, "Authenticated user account is not associated with any restaurant branch.");
        }

        if (requestedBranchId.HasValue && requestedBranchId.Value > 0 && requestedBranchId.Value != userDbBranch.Value)
        {
            return (false, null, 403, "Cross-branch access forbidden. Your account is not authorized for this branch.");
        }

        return (true, userDbBranch.Value, 200, null);
    }

    private async Task<(bool Allowed, int StatusCode, string? ErrorMessage)> EnsureInvoiceBranchAccessAsync(long? invoiceBranchId, long orderId)
    {
        var (allowed, authorizedBranchId, statusCode, errorMessage) = await ResolveAuthorizedBranchFilterAsync(null);
        if (!allowed)
        {
            return (false, statusCode, errorMessage);
        }

        if (!authorizedBranchId.HasValue)
        {
            return (true, 200, null);
        }

        long? effectiveBranchId = invoiceBranchId;
        if (!effectiveBranchId.HasValue && orderId > 0)
        {
            var ord = await _context.Orders.AsNoTracking()
                .Where(o => o.Id == orderId)
                .Select(o => new { o.BranchId, o.OutletId })
                .FirstOrDefaultAsync();
            if (ord != null)
            {
                effectiveBranchId = ord.BranchId ?? (ord.OutletId > 0 ? ord.OutletId : (long?)null);
            }
        }

        if (effectiveBranchId.HasValue && effectiveBranchId.Value != authorizedBranchId.Value)
        {
            return (false, 403, "Cross-branch access forbidden. Your account is not authorized for this branch.");
        }

        return (true, 200, null);
    }

    private static string NormalizeOrderTypeFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return value.Trim().Replace("-", "").Replace("_", "").Replace(" ", "").ToLowerInvariant();
    }

    private static void NormalizeInvoicePaymentsAndStatus(Invoice inv)
    {
        var paymentsList = inv.Payments?.OrderBy(p => p.PaidAt).ToList() ?? new List<InvoicePayment>();
        decimal totalPaid = paymentsList.Count > 0
            ? paymentsList.Sum(p => p.Amount)
            : (inv.PaidAmount > 0 ? inv.PaidAmount : inv.AmountPaid);

        inv.PaidAmount = totalPaid;
        inv.AmountPaid = totalPaid;
        inv.Payments = paymentsList;
        inv.PaymentMethod = paymentsList.LastOrDefault()?.PaymentMode ?? "CASH";

        if (!string.Equals(inv.Status, "VOID", StringComparison.OrdinalIgnoreCase))
        {
            if (totalPaid >= inv.TotalAmount && inv.TotalAmount > 0)
            {
                inv.Status = "PAID";
            }
            else if (totalPaid > 0)
            {
                inv.Status = "PARTIAL";
            }
        }

        inv.PaymentStatus = inv.Status?.ToUpperInvariant() switch
        {
            "PAID" => "Paid",
            "PARTIAL" => "Partial",
            "VOID" => "Void",
            "REFUNDED" => "Refunded",
            _ => "Unpaid"
        };
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpGet]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] long? branchId = null,
        [FromQuery] string? orderType = null,
        [FromQuery] string? paymentMethod = null,
        [FromQuery] string? paymentStatus = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 0)
    {
        try
        {
            var (allowed, authorizedBranchId, statusCode, branchError) = await ResolveAuthorizedBranchFilterAsync(branchId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            _logger.LogInformation("Fetching invoices with status={Status}, branch={BranchId}, fromDate={FromDate}, toDate={ToDate}",
                status, authorizedBranchId, fromDate, toDate);

            var query = _context.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .AsQueryable();

            if (authorizedBranchId.HasValue)
            {
                var targetBranch = authorizedBranchId.Value;
                query = query.Where(i =>
                    i.BranchId == targetBranch ||
                    (i.BranchId == null && _context.Orders.Any(o =>
                        o.Id == i.OrderId &&
                        (o.BranchId == targetBranch || (o.BranchId == null && o.OutletId == targetBranch)))));
            }

            if (fromDate.HasValue)
            {
                var start = fromDate.Value.Date;
                query = query.Where(i => i.CreatedAt >= start);
            }

            if (toDate.HasValue)
            {
                var endExclusive = toDate.Value.TimeOfDay == TimeSpan.Zero
                    ? toDate.Value.Date.AddDays(1)
                    : toDate.Value.AddTicks(1);
                query = query.Where(i => i.CreatedAt < endExclusive);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var upperStatus = status.Trim().ToUpper();
                query = query.Where(i => i.Status.ToUpper() == upperStatus);
            }

            var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();

            foreach (var inv in invoices)
            {
                NormalizeInvoicePaymentsAndStatus(inv);
            }

            await EnrichInvoicesAsync(invoices);

            IEnumerable<Invoice> filtered = invoices;

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                var targetPayStatus = paymentStatus.Trim();
                filtered = filtered.Where(i =>
                    string.Equals(i.PaymentStatus, targetPayStatus, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(i.Status, targetPayStatus, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(orderType))
            {
                var normType = NormalizeOrderTypeFilter(orderType);
                filtered = filtered.Where(i => NormalizeOrderTypeFilter(i.OrderType) == normType);
            }

            if (!string.IsNullOrWhiteSpace(paymentMethod))
            {
                var targetMethod = paymentMethod.Trim();
                filtered = filtered.Where(i =>
                    string.Equals(i.PaymentMethod, targetMethod, StringComparison.OrdinalIgnoreCase) ||
                    (i.Payments != null && i.Payments.Any(p =>
                        string.Equals(p.PaymentMode, targetMethod, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(p.PaymentMethod, targetMethod, StringComparison.OrdinalIgnoreCase))));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                filtered = filtered.Where(i =>
                    (!string.IsNullOrEmpty(i.InvoiceNumber) && i.InvoiceNumber.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.OrderNumber) && i.OrderNumber.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.TableName) && i.TableName.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.CustomerName) && i.CustomerName.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.CustomerPhone) && i.CustomerPhone.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    i.OrderId.ToString().Contains(term, StringComparison.OrdinalIgnoreCase));
            }

            var resultList = filtered.ToList();
            var totalCount = resultList.Count;

            if (pageSize > 0)
            {
                if (page < 1) page = 1;
                resultList = resultList.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            }

            return Ok(new
            {
                success = true,
                message = "Invoices retrieved successfully.",
                count = resultList.Count,
                totalCount,
                data = resultList
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching invoices.");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving invoices: " + ex.Message });
        }
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetInvoiceById(long id)
    {
        try
        {
            _logger.LogInformation("Fetching invoice {InvoiceId}", id);
            var invoice = await GetInvoiceByIdObject(id);

            if (invoice == null)
            {
                _logger.LogWarning("Invoice {InvoiceId} not found.", id);
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            return Ok(new { success = true, data = invoice });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching invoice {InvoiceId}", id);
            return StatusCode(500, new { success = false, message = $"An error occurred while fetching invoice {id}: " + ex.Message });
        }
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpPost]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        if (request == null || request.OrderId <= 0 || request.Subtotal <= 0)
        {
            return BadRequest(new { success = false, message = "Valid Order ID and positive subtotal are required." });
        }

        try
        {
            _logger.LogInformation("Creating invoice for Order ID {OrderId}", request.OrderId);

            var order = await _context.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == request.OrderId);
            long? orderBranchId = order != null ? (order.BranchId ?? (order.OutletId > 0 ? order.OutletId : (long?)null)) : null;

            var (allowed, authorizedBranchId, statusCode, branchError) = await ResolveAuthorizedBranchFilterAsync(orderBranchId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            var existingInvoice = await _context.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.OrderId == request.OrderId);
            if (existingInvoice != null)
            {
                NormalizeInvoicePaymentsAndStatus(existingInvoice);
                await PopulateInvoiceMetadataAsync(existingInvoice);
                return Conflict(new
                {
                    success = false,
                    message = $"An invoice already exists for Order ID {request.OrderId}.",
                    data = existingInvoice
                });
            }

            var isSelfService = order != null && string.Equals(order.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase);
            var subtotal = request.Subtotal;
            var taxableAmount = request.TaxableAmount > 0 ? request.TaxableAmount : (subtotal - request.DiscountAmount);
            taxableAmount = Math.Max(0, taxableAmount);

            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            var taxAmount = request.TaxAmount >= 0 ? request.TaxAmount : (taxableAmount * 0.05m);
            var cgstAmount = Math.Round(taxAmount / 2m, 2);
            var sgstAmount = taxAmount - cgstAmount;
            var serviceChargeAmount = isSelfService ? 0m : (order?.ServiceCharge ?? 0m);
            var totalAmount = Math.Max(0, taxableAmount + taxAmount + serviceChargeAmount);
            var resolvedBranchId = orderBranchId ?? authorizedBranchId ?? 1;

            var invoice = new Invoice
            {
                OrderId = request.OrderId,
                OrderNumber = order?.OrderNumber,
                BranchId = resolvedBranchId,
                OrderType = order?.OrderType,
                CustomerName = order?.CustomerName,
                CustomerPhone = order?.CustomerPhone,
                InvoiceNumber = invoiceNumber,
                Subtotal = subtotal,
                TaxableAmount = taxableAmount,
                GstPercent = order?.TaxPercent ?? 5m,
                CgstAmount = cgstAmount,
                SgstAmount = sgstAmount,
                TaxAmount = taxAmount,
                DiscountAmount = request.DiscountAmount,
                ServiceChargePercent = isSelfService ? 0m : (order?.ServiceChargePercent ?? 0m),
                ServiceChargeAmount = serviceChargeAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0.00m,
                AmountPaid = 0.00m,
                PaymentStatus = "Unpaid",
                Status = "UNPAID",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            var populated = await GetInvoiceByIdObject(invoice.InvoiceId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:created",
                Module = "Invoices",
                Action = "created",
                BranchId = resolvedBranchId,
                RecordId = invoice.InvoiceId.ToString(),
                Data = populated
            });

            return CreatedAtAction(nameof(GetInvoiceById), new { id = invoice.InvoiceId }, new
            {
                success = true,
                message = "Invoice created successfully.",
                data = populated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice for Order ID {OrderId}", request.OrderId);
            return StatusCode(500, new { success = false, message = "An error occurred while creating the invoice: " + ex.Message });
        }
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpPost("{id:long}/payments")]
    public async Task<IActionResult> RecordPayment(long id, [FromBody] RecordPaymentRequest request)
    {
        if (request == null || request.Amount <= 0)
        {
            return BadRequest(new { success = false, message = "Payment amount must be greater than zero." });
        }

        try
        {
            _logger.LogInformation("Recording payment of {Amount} for Invoice ID {InvoiceId}", request.Amount, id);

            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.InvoiceId == id);

            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            if (string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(invoice.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(invoice.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = $"Cannot record payment for a {invoice.Status} invoice." });
            }

            var mode = string.IsNullOrWhiteSpace(request.PaymentMode) ? "CASH" : request.PaymentMode.Trim().ToUpper();
            var paymentMethod = mode.ToLower() switch
            {
                "cash" => "cash",
                "card" => "card",
                "upi" => "upi",
                "wallet" => "wallet",
                "netbanking" or "net_banking" => "netbanking",
                _ => "cash"
            };

            var payment = new InvoicePayment
            {
                InvoiceId = id,
                Amount = request.Amount,
                AmountPaid = request.Amount,
                PaymentMode = mode,
                PaymentMethod = paymentMethod,
                TransactionReference = request.TransactionReference,
                TxnReference = request.TransactionReference,
                PaymentStatus = "success",
                PaidAt = DateTime.UtcNow
            };

            _context.InvoicePayments.Add(payment);

            var totalPaid = invoice.Payments.Sum(p => p.Amount) + request.Amount;
            invoice.PaidAmount = totalPaid;
            invoice.AmountPaid = totalPaid;
            invoice.Status = totalPaid >= invoice.TotalAmount ? "PAID" : "PARTIAL";
            invoice.PaymentStatus = totalPaid >= invoice.TotalAmount ? "Paid" : "Partial";
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await GetInvoiceByIdObject(id);
            var eventBranchId = updated?.BranchId ?? invoice.BranchId ?? 1;

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "payment:completed",
                Module = "Payments",
                Action = "completed",
                BranchId = eventBranchId,
                RecordId = payment.PaymentId.ToString(),
                Data = new
                {
                    paymentId = payment.PaymentId,
                    invoiceId = id,
                    orderId = invoice.OrderId,
                    amount = request.Amount,
                    paymentMode = mode,
                    paymentMethod = paymentMethod,
                    status = invoice.Status,
                    totalPaid = totalPaid,
                    totalAmount = invoice.TotalAmount
                }
            });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:updated",
                Module = "Invoices",
                Action = "paymentRecorded",
                BranchId = eventBranchId,
                RecordId = id.ToString(),
                Data = updated
            });

            return Ok(new
            {
                success = true,
                message = "Payment recorded successfully.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording payment for Invoice ID {InvoiceId}", id);
            return StatusCode(500, new { success = false, message = "An error occurred while recording payment: " + ex.Message });
        }
    }

    [Authorize(Roles = InvoiceInquiryRoles)]
    [HttpGet("by-order/{orderId:long}")]
    public async Task<IActionResult> GetInvoiceByOrderId(long orderId)
    {
        try
        {
            _logger.LogInformation("Retrieving latest invoice for Order ID {OrderId}", orderId);

            // Directly query invoices table filtered by order_id, sorted by created_at DESC to always pick
            // the latest invoice, with associated invoice_payments eagerly loaded.
            var invoice = await _context.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Where(i => i.OrderId == orderId)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (invoice == null)
            {
                _logger.LogInformation("No invoice found for Order ID {OrderId}", orderId);
                return NotFound(new
                {
                    success = false,
                    message = $"Invoice for Order ID {orderId} not found."
                });
            }

            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            NormalizeInvoicePaymentsAndStatus(invoice);

            // Sequentially populate order metadata (table, waiter, items)
            await PopulateInvoiceMetadataAsync(invoice);

            return Ok(new
            {
                success = true,
                message = "Invoice retrieved successfully.",
                data = invoice
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice for Order ID {OrderId}", orderId);
            return StatusCode(500, new
            {
                success = false,
                message = $"An error occurred while retrieving invoice for Order ID {orderId}: {ex.Message}"
            });
        }
    }

    [Authorize(Roles = InvoiceInquiryRoles)]
    [HttpGet("{id:long}/receipt")]
    public async Task<IActionResult> GetInvoiceReceipt(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Invoice {id} not found." });
        }

        var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
        if (!allowed)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        return Ok(new
        {
            success = true,
            invoiceId = invoice.InvoiceId,
            orderId = invoice.OrderId,
            invoiceNumber = invoice.InvoiceNumber,
            date = invoice.CreatedAt,
            subtotal = invoice.Subtotal,
            taxAmount = invoice.TaxAmount,
            discountAmount = invoice.DiscountAmount,
            totalAmount = invoice.TotalAmount,
            paidAmount = invoice.PaidAmount,
            dueAmount = invoice.DueAmount,
            status = invoice.Status,
            payments = invoice.Payments
        });
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpGet("{id:long}/payment-summary")]
    public async Task<IActionResult> GetPaymentSummary(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
        }

        var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
        if (!allowed)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        return Ok(new
        {
            success = true,
            billId = invoice.InvoiceId,
            totalAmount = invoice.TotalAmount,
            paidAmount = invoice.PaidAmount,
            dueAmount = invoice.DueAmount,
            status = invoice.Status,
            paymentCount = invoice.Payments.Count,
            payments = invoice.Payments
        });
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpGet("{id:long}/payments")]
    public async Task<IActionResult> GetPayments(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
        }

        var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
        if (!allowed)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        return Ok(new
        {
            success = true,
            billId = invoice.InvoiceId,
            count = invoice.Payments.Count,
            data = invoice.Payments
        });
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpPost("{id:long}/settle")]
    public async Task<IActionResult> SettleBill(long id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id);

        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
        }

        var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
        if (!allowed)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        if (string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { success = false, message = "Cannot settle a void invoice." });
        }

        var paidSoFar = invoice.Payments.Sum(p => p.Amount);
        var due = Math.Max(0, invoice.TotalAmount - paidSoFar);

        if (due > 0)
        {
            var payment = new InvoicePayment
            {
                InvoiceId = id,
                Amount = due,
                AmountPaid = due,
                PaymentMode = "CASH",
                PaymentMethod = "cash",
                TransactionReference = $"SETTLE-{DateTime.UtcNow:HHmmss}",
                TxnReference = $"SETTLE-{DateTime.UtcNow:HHmmss}",
                PaymentStatus = "success",
                PaidAt = DateTime.UtcNow
            };

            _context.InvoicePayments.Add(payment);
            invoice.PaidAmount = invoice.TotalAmount;
            invoice.AmountPaid = invoice.TotalAmount;
            invoice.Status = "PAID";
            invoice.PaymentStatus = "Paid";
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        var updated = await GetInvoiceByIdObject(id);
        var eventBranchId = updated?.BranchId ?? invoice.BranchId ?? 1;

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "invoice:settled",
            Module = "Invoices",
            Action = "settled",
            BranchId = eventBranchId,
            RecordId = id.ToString(),
            Data = updated
        });

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "payment:completed",
            Module = "Payments",
            Action = "completed",
            BranchId = eventBranchId,
            RecordId = id.ToString(),
            Data = new { invoiceId = id, amount = due, paymentMode = "CASH", status = "PAID" }
        });

        return Ok(new
        {
            success = true,
            message = "Bill settled successfully.",
            data = updated
        });
    }

    [Authorize(Roles = InvoiceAdminOnlyRoles)]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateInvoice(long id, [FromBody] UpdateInvoiceRequest request)
    {
        try
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == id);
            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            if (request.Subtotal.HasValue) invoice.Subtotal = request.Subtotal.Value;
            if (request.TaxAmount.HasValue) invoice.TaxAmount = request.TaxAmount.Value;
            if (request.DiscountAmount.HasValue) invoice.DiscountAmount = request.DiscountAmount.Value;
            if (request.TotalAmount.HasValue)
            {
                invoice.TotalAmount = request.TotalAmount.Value;
            }
            else if (request.Subtotal.HasValue || request.TaxAmount.HasValue || request.DiscountAmount.HasValue)
            {
                invoice.TotalAmount = Math.Max(0, invoice.Subtotal + invoice.TaxAmount - invoice.DiscountAmount);
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                invoice.Status = request.Status.Trim().ToUpper();
            }

            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await GetInvoiceByIdObject(id);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:updated",
                Module = "Invoices",
                Action = "updated",
                BranchId = updated?.BranchId ?? invoice.BranchId ?? 1,
                RecordId = id.ToString(),
                Data = updated
            });

            return Ok(new
            {
                success = true,
                message = "Invoice updated successfully.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating invoice {InvoiceId}", id);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [Authorize(Roles = InvoiceAdminOnlyRoles)]
    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateInvoiceStatus(long id, [FromBody] UpdateInvoiceStatusRequest request)
    {
        try
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == id);
            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            var newStatus = string.IsNullOrWhiteSpace(request.Status) ? "PAID" : request.Status.Trim().ToUpper();
            invoice.Status = newStatus;
            invoice.PaymentStatus = newStatus switch
            {
                "PAID" => "Paid",
                "PARTIAL" => "Partial",
                "VOID" => "Void",
                "REFUNDED" => "Refunded",
                _ => "Unpaid"
            };
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await GetInvoiceByIdObject(id);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:statusChanged",
                Module = "Invoices",
                Action = "statusChanged",
                BranchId = updated?.BranchId ?? invoice.BranchId ?? 1,
                RecordId = id.ToString(),
                Data = updated
            });

            return Ok(new
            {
                success = true,
                message = $"Invoice status updated to {newStatus}.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status for invoice {InvoiceId}", id);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [Authorize(Roles = InvoiceBillingRoles)]
    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
        }

        var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
        if (!allowed)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("========================================");
        sb.AppendLine("           RESTAURANT RECEIPT           ");
        sb.AppendLine("========================================");
        sb.AppendLine($"Invoice Number : {invoice.InvoiceNumber}");
        sb.AppendLine($"Date           : {invoice.CreatedAt:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine($"Order ID       : #{invoice.OrderId}");
        sb.AppendLine($"Table          : {invoice.TableName}");
        sb.AppendLine($"Server         : {invoice.ServerName}");
        sb.AppendLine($"Status         : {invoice.Status}");
        sb.AppendLine("----------------------------------------");
        sb.AppendLine("ITEMS:");
        if (invoice.Items != null && invoice.Items.Count > 0)
        {
            foreach (var item in invoice.Items)
            {
                sb.AppendLine($"{item.Name} x{item.Quantity} @ INR {item.Price:F2} = INR {item.Total:F2}");
            }
        }
        else
        {
            sb.AppendLine("Standard Food & Beverage Service");
        }
        sb.AppendLine("----------------------------------------");
        sb.AppendLine($"Subtotal       : INR {invoice.Subtotal:F2}");
        sb.AppendLine($"Tax Amount     : INR {invoice.TaxAmount:F2}");
        sb.AppendLine($"Discount       : INR {invoice.DiscountAmount:F2}");
        sb.AppendLine($"Total Amount   : INR {invoice.TotalAmount:F2}");
        sb.AppendLine($"Paid Amount    : INR {invoice.PaidAmount:F2}");
        sb.AppendLine($"Payment Mode   : {invoice.PaymentMethod}");
        sb.AppendLine("========================================");
        sb.AppendLine("       Thank you for dining with us!    ");
        sb.AppendLine("========================================");

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/plain", $"Invoice-{invoice.InvoiceNumber}.txt");
    }

    [Authorize(Roles = InvoiceAdminOnlyRoles)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInvoice(string id)
    {
        long numericId = 0;
        if (!string.IsNullOrEmpty(id))
        {
            var cleanId = Regex.Replace(id, @"^[^\d]+", "");
            long.TryParse(cleanId, out numericId);
        }

        if (numericId <= 0)
        {
            return Ok(new { success = true, message = "Invoice voided/deleted successfully." });
        }

        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == numericId);
        if (invoice != null)
        {
            var (allowed, statusCode, branchError) = await EnsureInvoiceBranchAccessAsync(invoice.BranchId, invoice.OrderId);
            if (!allowed)
            {
                return StatusCode(statusCode, new { success = false, message = branchError });
            }

            invoice.Status = "VOID";
            invoice.PaymentStatus = "Void";
            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:deleted",
                Module = "Invoices",
                Action = "deleted",
                BranchId = invoice.BranchId ?? 1,
                RecordId = numericId.ToString(),
                Data = new { invoiceId = numericId, status = "VOID" }
            });
        }

        return Ok(new
        {
            success = true,
            message = $"Invoice #{numericId} voided/deleted successfully."
        });
    }

    private async Task EnrichInvoicesAsync(List<Invoice> invoices)
    {
        if (invoices == null || invoices.Count == 0) return;
        var orderIds = invoices.Select(i => i.OrderId).Where(id => id > 0).Distinct().ToList();
        if (orderIds.Count == 0) return;

        try
        {
            // Sequential step 1: Query order items
            var items = await _context.OrderItems
                .AsNoTracking()
                .Where(oi => orderIds.Contains(oi.OrderId) && oi.IsActive && !oi.IsDeleted)
                .Select(oi => new { oi.OrderId, ItemName = oi.Name, oi.Quantity, UnitPrice = oi.Price, oi.TotalPrice })
                .ToListAsync();

            // Sequential step 2: Query orders
            var orders = await _context.Orders
                .AsNoTracking()
                .Where(o => orderIds.Contains(o.Id))
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.BranchId,
                    o.OutletId,
                    o.TableId,
                    o.WaiterId,
                    o.OrderType,
                    o.CustomerName,
                    o.CustomerPhone,
                    o.ServiceCharge
                })
                .ToListAsync();

            var tableIds = orders.Where(o => o.TableId.HasValue).Select(o => o.TableId!.Value).Distinct().ToList();
            var tables = await _context.DiningTables
                .AsNoTracking()
                .Where(t => tableIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Name);

            var waiterIds = orders.Where(o => o.WaiterId.HasValue).Select(o => o.WaiterId!.Value).Distinct().ToList();
            var waiters = await _context.Staff
                .AsNoTracking()
                .Where(s => waiterIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            foreach (var inv in invoices)
            {
                var ord = orders.FirstOrDefault(o => o.Id == inv.OrderId);
                if (ord != null)
                {
                    inv.OrderNumber ??= ord.OrderNumber;
                    inv.OrderType ??= ord.OrderType;
                    inv.BranchId ??= ord.BranchId ?? (ord.OutletId > 0 ? ord.OutletId : 1);
                    inv.CustomerName ??= ord.CustomerName;
                    inv.CustomerPhone ??= ord.CustomerPhone;

                    if (ord.TableId.HasValue && tables.TryGetValue(ord.TableId.Value, out var tableName))
                    {
                        inv.TableName = tableName;
                    }
                    else if (string.Equals(ord.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
                    {
                        inv.TableName = "Takeaway";
                    }
                    else if (string.Equals(ord.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase))
                    {
                        inv.TableName = "Self Service";
                    }

                    if (string.Equals(ord.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase))
                    {
                        inv.ServiceChargeAmount = 0m;
                        inv.ServiceChargePercent = 0m;
                    }
                    else if (inv.ServiceChargeAmount == 0 && ord.ServiceCharge > 0)
                    {
                        inv.ServiceChargeAmount = ord.ServiceCharge;
                    }

                    if (ord.WaiterId.HasValue && waiters.TryGetValue(ord.WaiterId.Value, out var waiterName))
                    {
                        inv.ServerName = waiterName;
                    }
                }

                if (inv.CgstAmount == 0 && inv.SgstAmount == 0 && inv.TaxAmount > 0)
                {
                    inv.CgstAmount = Math.Round(inv.TaxAmount / 2m, 2);
                    inv.SgstAmount = inv.TaxAmount - inv.CgstAmount;
                }

                inv.Items = items.Where(it => it.OrderId == inv.OrderId).Select(it => new InvoiceItemDto
                {
                    Name = it.ItemName,
                    Quantity = it.Quantity,
                    Price = it.UnitPrice,
                    Total = it.TotalPrice
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not enrich all invoices with order items");
        }
    }

    private async Task<Invoice?> GetInvoiceByIdObject(long id)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id);

        if (invoice == null) return null;

        NormalizeInvoicePaymentsAndStatus(invoice);

        await PopulateInvoiceMetadataAsync(invoice);
        return invoice;
    }

    private async Task PopulateInvoiceMetadataAsync(Invoice invoice)
    {
        if (invoice.OrderId <= 0) return;

        try
        {
            // Sequential step 1: Query order info
            var order = await _context.Orders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == invoice.OrderId);

            if (order != null)
            {
                invoice.OrderNumber ??= order.OrderNumber;
                invoice.OrderType ??= order.OrderType;
                invoice.BranchId ??= order.BranchId ?? (order.OutletId > 0 ? order.OutletId : 1);
                invoice.CustomerName ??= order.CustomerName;
                invoice.CustomerPhone ??= order.CustomerPhone;

                if (order.TableId.HasValue)
                {
                    var table = await _context.DiningTables
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == order.TableId.Value);
                    invoice.TableName = table?.Name ?? $"Table {order.TableId.Value}";
                }
                else if (string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
                {
                    invoice.TableName = "Takeaway";
                }
                else if (string.Equals(order.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase))
                {
                    invoice.TableName = "Self Service";
                }

                if (string.Equals(order.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase))
                {
                    invoice.ServiceChargeAmount = 0m;
                    invoice.ServiceChargePercent = 0m;
                }
                else if (invoice.ServiceChargeAmount == 0 && order.ServiceCharge > 0)
                {
                    invoice.ServiceChargeAmount = order.ServiceCharge;
                }

                if (order.WaiterId.HasValue)
                {
                    var waiter = await _context.Staff
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == order.WaiterId.Value);
                    invoice.ServerName = waiter?.Name ?? "Staff";
                }
            }

            if (invoice.CgstAmount == 0 && invoice.SgstAmount == 0 && invoice.TaxAmount > 0)
            {
                invoice.CgstAmount = Math.Round(invoice.TaxAmount / 2m, 2);
                invoice.SgstAmount = invoice.TaxAmount - invoice.CgstAmount;
            }

            // Sequential step 2: Query order items
            var orderItems = await _context.OrderItems
                .AsNoTracking()
                .Where(oi => oi.OrderId == invoice.OrderId && oi.IsActive && !oi.IsDeleted)
                .ToListAsync();

            if (orderItems.Count > 0)
            {
                invoice.Items = orderItems.Select(oi => new InvoiceItemDto
                {
                    Name = oi.Name,
                    Quantity = oi.Quantity,
                    Price = oi.Price,
                    Total = oi.TotalPrice
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not enrich metadata for invoice {InvoiceId}", invoice.InvoiceId);
        }
    }
    /// <summary>
    /// Exports Customer Billing Invoices as CSV or XLSX.
    /// Supports ?fromDate=...&toDate=...&status=...&department=...&format=csv|xlsx.
    /// </summary>
    [Authorize(Roles = InvoiceAdminOnlyRoles)]
    [HttpGet("export")]
    public async Task<IActionResult> ExportInvoices(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status,
        [FromQuery] string? department,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _reportingExportService.GenerateInvoicesExportAsync(fromDate, toDate, status, department);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting customer billing invoices");
            return StatusCode(500, new { success = false, message = "Failed to export invoices.", error = ex.Message });
        }
    }
}

public class CreateInvoiceRequest
{
    public long OrderId { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
}

public class RecordPaymentRequest
{
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "CASH";
    public string? TransactionReference { get; set; }
}

public class UpdateInvoiceRequest
{
    public decimal? Subtotal { get; set; }
    public decimal? TaxAmount { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? Status { get; set; }
}

public class UpdateInvoiceStatusRequest
{
    public string Status { get; set; } = "PAID";
}
