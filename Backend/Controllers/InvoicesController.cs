using HMS.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/invoices")]
<<<<<<< HEAD
[Tags("Invoices")]
=======
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<InvoicesController> _logger;

<<<<<<< HEAD
    public InvoicesController(
        SpService spService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<InvoicesController> logger)
=======
    public InvoicesController(AppDbContext context, SpService spService, ILogger<InvoicesController> logger)
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    {
        _context = context;
        _spService = spService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status)
    {
        try
        {
            _logger.LogInformation("Fetching invoices with status filter: '{Status}'", status);

            var query = _context.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var upperStatus = status.Trim().ToUpper();
                query = query.Where(i => i.Status.ToUpper() == upperStatus);
            }

            var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();

            foreach (var inv in invoices)
            {
                var paymentsList = inv.Payments?.OrderBy(p => p.PaidAt).ToList() ?? new List<InvoicePayment>();
                decimal totalPaid = paymentsList.Count > 0 ? paymentsList.Sum(p => p.Amount) : inv.PaidAmount;
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
            }

            await EnrichInvoicesAsync(invoices);

            return Ok(new
            {
                success = true,
                message = "Invoices retrieved successfully.",
                count = invoices.Count,
                data = invoices
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching invoices.");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving invoices: " + ex.Message });
        }
    }

    [AllowAnonymous]
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

            return Ok(new { success = true, data = invoice });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching invoice {InvoiceId}", id);
            return StatusCode(500, new { success = false, message = $"An error occurred while fetching invoice {id}: " + ex.Message });
        }
    }

    [AllowAnonymous]
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

            var subtotal = request.Subtotal;
            var taxableAmount = request.TaxableAmount > 0 ? request.TaxableAmount : (subtotal - request.DiscountAmount);
            taxableAmount = Math.Max(0, taxableAmount);

            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            var taxAmount = request.TaxAmount >= 0 ? request.TaxAmount : (taxableAmount * 0.05m);
            var totalAmount = Math.Max(0, taxableAmount + taxAmount);

            var invoice = new Invoice
            {
                OrderId = request.OrderId,
                InvoiceNumber = invoiceNumber,
                Subtotal = subtotal,
                TaxableAmount = taxableAmount,
                TaxAmount = taxAmount,
                DiscountAmount = request.DiscountAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0.00m,
                AmountPaid = 0.00m,
                Status = "UNPAID",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            var populated = await GetInvoiceByIdObject(invoice.InvoiceId);

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

    [AllowAnonymous]
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
<<<<<<< HEAD
            if (string.Equals(existing.Status, "VOID", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(existing.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(existing.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = $"Cannot record payment for a {existing.Status} invoice." });
            }

            var parameters = new Dictionary<string, object?>
=======
            if (string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase))
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
            {
                return BadRequest(new { success = false, message = "Cannot record payment for a void invoice." });
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
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await GetInvoiceByIdObject(id);
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

    [AllowAnonymous]
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

            // Calculate paid amount and due amount accurately without duplication
            var paymentsList = invoice.Payments?.OrderBy(p => p.PaidAt).ToList() ?? new List<InvoicePayment>();
            decimal totalPaid = paymentsList.Count > 0
                ? paymentsList.Sum(p => p.Amount)
                : (invoice.PaidAmount > 0 ? invoice.PaidAmount : invoice.AmountPaid);

            invoice.PaidAmount = totalPaid;
            invoice.AmountPaid = totalPaid;
            invoice.Payments = paymentsList;
            invoice.PaymentMethod = paymentsList.LastOrDefault()?.PaymentMode ?? "CASH";

            // Preserve and calculate invoice status
            if (!string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase))
            {
                if (totalPaid >= invoice.TotalAmount && invoice.TotalAmount > 0)
                {
                    invoice.Status = "PAID";
                }
                else if (totalPaid > 0)
                {
                    invoice.Status = "PARTIAL";
                }
            }

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

    [AllowAnonymous]
    [HttpGet("{id:long}/receipt")]
    public async Task<IActionResult> GetInvoiceReceipt(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Invoice {id} not found." });
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

    [AllowAnonymous]
    [HttpGet("{id:long}/payment-summary")]
    public async Task<IActionResult> GetPaymentSummary(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
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

    [AllowAnonymous]
    [HttpGet("{id:long}/payments")]
    public async Task<IActionResult> GetPayments(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
        }

        return Ok(new
        {
            success = true,
            billId = invoice.InvoiceId,
            count = invoice.Payments.Count,
            data = invoice.Payments
        });
    }

    [AllowAnonymous]
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
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        var updated = await GetInvoiceByIdObject(id);
        return Ok(new
        {
            success = true,
            message = "Bill settled successfully.",
            data = updated
        });
    }

    [AllowAnonymous]
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

    [AllowAnonymous]
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

            var newStatus = string.IsNullOrWhiteSpace(request.Status) ? "PAID" : request.Status.Trim().ToUpper();
            invoice.Status = newStatus;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await GetInvoiceByIdObject(id);
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

    [AllowAnonymous]
    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(long id)
    {
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
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

    [AllowAnonymous]
<<<<<<< HEAD
    [HttpDelete("{id}")]
=======
    [HttpDelete("{id:long}")]
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
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
            invoice.Status = "VOID";
            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
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
                .Select(o => new { o.Id, o.TableId, o.WaiterId, o.OrderType })
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
                    if (ord.TableId.HasValue && tables.TryGetValue(ord.TableId.Value, out var tableName))
                    {
                        inv.TableName = tableName;
                    }
                    else if (string.Equals(ord.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
                    {
                        inv.TableName = "Takeaway";
                    }

                    if (ord.WaiterId.HasValue && waiters.TryGetValue(ord.WaiterId.Value, out var waiterName))
                    {
                        inv.ServerName = waiterName;
                    }
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

        var paymentsList = invoice.Payments?.OrderBy(p => p.PaidAt).ToList() ?? new List<InvoicePayment>();
        decimal totalPaid = paymentsList.Count > 0
            ? paymentsList.Sum(p => p.Amount)
            : (invoice.PaidAmount > 0 ? invoice.PaidAmount : invoice.AmountPaid);

        invoice.PaidAmount = totalPaid;
        invoice.AmountPaid = totalPaid;
        invoice.Payments = paymentsList;
        invoice.PaymentMethod = paymentsList.LastOrDefault()?.PaymentMode ?? "CASH";

        if (!string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase))
        {
            if (totalPaid >= invoice.TotalAmount && invoice.TotalAmount > 0)
            {
                invoice.Status = "PAID";
            }
            else if (totalPaid > 0)
            {
                invoice.Status = "PARTIAL";
            }
        }

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

                if (order.WaiterId.HasValue)
                {
                    var waiter = await _context.Staff
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == order.WaiterId.Value);
                    invoice.ServerName = waiter?.Name ?? "Staff";
                }
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
    [AllowAnonymous]
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
