using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/invoices")]
[Route("api/Invoices")]
[Route("api/v1/bills")]
[Route("api/Bills")]
public class InvoicesController : ControllerBase
{
    private readonly SpService _spService;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(SpService spService, ILogger<InvoicesController> logger)
    {
        _spService = spService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet]
    [HttpGet("history")]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status)
    {
        try
        {
            _logger.LogInformation("Fetching invoices via SP.");
            var invoices = new List<Invoice>();
            var payments = new List<InvoicePayment>();

            var parameters = new Dictionary<string, object?> { { "p_status", status } };

            await _spService.ExecuteQueryMultipleAsync("sp_GetInvoices", parameters,
                reader =>
                {
                    while (reader.Read()) invoices.Add(MapInvoiceFromReader(reader));
                },
                reader =>
                {
                    while (reader.Read()) payments.Add(MapPaymentFromReader(reader));
                });

            foreach (var inv in invoices)
            {
                inv.Payments = payments.Where(p => p.InvoiceId == inv.InvoiceId).ToList();
                inv.PaymentMethod = inv.Payments.LastOrDefault()?.PaymentMode ?? "CASH";
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
            _logger.LogInformation("Fetching invoice {InvoiceId} via SP", id);
            Invoice? invoice = null;
            var payments = new List<InvoicePayment>();

            var parameters = new Dictionary<string, object?> { { "p_invoice_id", id } };

            await _spService.ExecuteQueryMultipleAsync("sp_GetInvoiceById", parameters,
                reader =>
                {
                    if (reader.Read()) invoice = MapInvoiceFromReader(reader);
                },
                reader =>
                {
                    while (reader.Read()) payments.Add(MapPaymentFromReader(reader));
                });

            if (invoice == null)
            {
                _logger.LogWarning("Invoice {InvoiceId} not found.", id);
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            invoice.Payments = payments;
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
            _logger.LogInformation("Creating invoice for Order ID {OrderId} via SP", request.OrderId);

            var subtotal = request.Subtotal;
            var taxableAmount = request.TaxableAmount > 0 ? request.TaxableAmount : (subtotal - request.DiscountAmount);
            taxableAmount = Math.Max(0, taxableAmount);

            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            var taxAmount = request.TaxAmount >= 0 ? request.TaxAmount : (taxableAmount * 0.05m);
            var totalAmount = Math.Max(0, subtotal + taxAmount - request.DiscountAmount);

            var parameters = new Dictionary<string, object?>
            {
                { "p_order_id", request.OrderId },
                { "p_invoice_number", invoiceNumber },
                { "p_subtotal", subtotal },
                { "p_taxable_amount", taxableAmount },
                { "p_tax_amount", taxAmount },
                { "p_discount_amount", request.DiscountAmount },
                { "p_total_amount", totalAmount }
            };

            long invoiceId = await _spService.ExecuteScalarAsync<long>("sp_CreateInvoice", parameters);

            return CreatedAtAction(nameof(GetInvoiceById), new { id = invoiceId }, new
            {
                success = true,
                message = "Invoice created successfully.",
                data = await GetInvoiceByIdObject(invoiceId)
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
    [HttpPost("{id:long}/cash-payment")]
    public async Task<IActionResult> RecordPayment(long id, [FromBody] RecordPaymentRequest request)
    {
        if (request == null || request.Amount <= 0)
        {
            return BadRequest(new { success = false, message = "Payment amount must be greater than zero." });
        }

        try
        {
            _logger.LogInformation("Recording payment of {Amount} for Invoice ID {InvoiceId} via SP", request.Amount, id);

            var existing = await GetInvoiceByIdObject(id);
            if (existing == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var parameters = new Dictionary<string, object?>
            {
                { "p_invoice_id", id },
                { "p_amount", request.Amount },
                { "p_payment_mode", string.IsNullOrWhiteSpace(request.PaymentMode) ? "CASH" : request.PaymentMode.Trim().ToUpper() },
                { "p_transaction_reference", request.TransactionReference }
            };

            await _spService.ExecuteNonQueryAsync("sp_RecordInvoicePayment", parameters);

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
            var invoices = new List<Invoice>();
            await _spService.ExecuteQueryMultipleAsync("sp_GetInvoices", new Dictionary<string, object?> { { "p_status", null } },
                reader => { while (reader.Read()) invoices.Add(MapInvoiceFromReader(reader)); },
                reader => { });

            var invoice = invoices.FirstOrDefault(i => i.OrderId == orderId);
            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice for Order ID {orderId} not found." });
            }

            var populated = await GetInvoiceByIdObject(invoice.InvoiceId);
            return Ok(new { success = true, data = populated });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
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
            dueAmount = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount),
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
        var invoice = await GetInvoiceByIdObject(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Bill {id} not found." });
        }

        var due = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
        if (due > 0)
        {
            var parameters = new Dictionary<string, object?>
            {
                { "p_invoice_id", id },
                { "p_amount", due },
                { "p_payment_mode", "CASH" },
                { "p_transaction_reference", $"SETTLE-{DateTime.UtcNow:HHmmss}" }
            };
            await _spService.ExecuteNonQueryAsync("sp_RecordInvoicePayment", parameters);
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
            var invoice = await GetInvoiceByIdObject(id);
            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var subtotal = request.Subtotal ?? invoice.Subtotal;
            var taxAmount = request.TaxAmount ?? invoice.TaxAmount;
            var discountAmount = request.DiscountAmount ?? invoice.DiscountAmount;
            var totalAmount = request.TotalAmount ?? (subtotal + taxAmount - discountAmount);
            var status = string.IsNullOrWhiteSpace(request.Status) ? invoice.Status : request.Status.Trim().ToUpper();

            await _spService.ExecuteSqlNonQueryAsync(
                @"UPDATE invoices 
                  SET subtotal = @subtotal, 
                      tax_amount = @tax_amount, 
                      discount_amount = @discount_amount, 
                      total_amount = @total_amount, 
                      status = @status, 
                      updated_at = NOW() 
                  WHERE invoice_id = @id",
                new Dictionary<string, object?>
                {
                    { "@subtotal", subtotal },
                    { "@tax_amount", taxAmount },
                    { "@discount_amount", discountAmount },
                    { "@total_amount", totalAmount },
                    { "@status", status },
                    { "@id", id }
                });

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
            var invoice = await GetInvoiceByIdObject(id);
            if (invoice == null)
            {
                return NotFound(new { success = false, message = $"Invoice with ID {id} not found." });
            }

            var newStatus = string.IsNullOrWhiteSpace(request.Status) ? "PAID" : request.Status.Trim().ToUpper();

            await _spService.ExecuteSqlNonQueryAsync(
                @"UPDATE invoices SET status = @status, payment_status = @pay_status, updated_at = NOW() WHERE invoice_id = @id",
                new Dictionary<string, object?>
                {
                    { "@status", newStatus },
                    { "@pay_status", newStatus == "PAID" ? "paid" : "pending" },
                    { "@id", id }
                });

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
    [HttpGet("{id:long}/download")]
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
    [HttpDelete("{id}")]
    [HttpDelete("/api/Invoices/{id}")]
    public async Task<IActionResult> DeleteInvoice(string id)
    {
        long numericId = 0;
        if (!string.IsNullOrEmpty(id))
        {
            var cleanId = System.Text.RegularExpressions.Regex.Replace(id, @"^[^\d]+", "");
            long.TryParse(cleanId, out numericId);
        }

        if (numericId <= 0)
        {
            return Ok(new { success = true, message = "Invoice voided/deleted successfully." });
        }

        var parameters = new Dictionary<string, object?> { { "p_invoice_id", numericId } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteInvoice", parameters);

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

        var inClause = string.Join(",", orderIds);
        try
        {
            var items = await _spService.ExecuteSqlQueryAsync(
                $"SELECT order_id, item_name, quantity, unit_price, total_price FROM order_items WHERE order_id IN ({inClause}) AND is_deleted = 0",
                reader => new
                {
                    OrderId = reader.GetInt64(0),
                    ItemName = reader.GetString(1),
                    Quantity = reader.GetInt32(2),
                    UnitPrice = reader.GetDecimal(3),
                    TotalPrice = reader.GetDecimal(4)
                });

            var ordersInfo = await _spService.ExecuteSqlQueryAsync(
                $"SELECT o.order_id, COALESCE(t.table_name, CONCAT('Table ', o.table_id)) AS table_name, 'Staff' AS server_name FROM orders o LEFT JOIN restaurant_tables t ON o.table_id = t.table_id WHERE o.order_id IN ({inClause})",
                reader => new
                {
                    OrderId = reader.GetInt64(0),
                    TableName = reader.IsDBNull(1) ? "Table 1" : reader.GetString(1),
                    ServerName = reader.IsDBNull(2) ? "Staff" : reader.GetString(2)
                });

            foreach (var inv in invoices)
            {
                var ord = ordersInfo.FirstOrDefault(o => o.OrderId == inv.OrderId);
                if (ord != null)
                {
                    inv.TableName = ord.TableName;
                    inv.ServerName = ord.ServerName;
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
        Invoice? invoice = null;
        var payments = new List<InvoicePayment>();
        var parameters = new Dictionary<string, object?> { { "p_invoice_id", id } };

        await _spService.ExecuteQueryMultipleAsync("sp_GetInvoiceById", parameters,
            reader => { if (reader.Read()) invoice = MapInvoiceFromReader(reader); },
            reader => { while (reader.Read()) payments.Add(MapPaymentFromReader(reader)); });

        if (invoice != null)
        {
            invoice.Payments = payments;
            invoice.PaymentMethod = payments.LastOrDefault()?.PaymentMode ?? "CASH";

            if (invoice.OrderId > 0)
            {
                try
                {
                    var ordersInfo = await _spService.ExecuteSqlQueryAsync(
                        "SELECT o.order_id, COALESCE(t.table_name, CONCAT('Table ', o.table_id)) AS table_name, 'Staff' AS server_name FROM orders o LEFT JOIN restaurant_tables t ON o.table_id = t.table_id WHERE o.order_id = @orderId",
                        reader => new
                        {
                            TableName = reader.IsDBNull(1) ? "Table 1" : reader.GetString(1),
                            ServerName = reader.IsDBNull(2) ? "Staff" : reader.GetString(2)
                        },
                        new Dictionary<string, object?> { { "@orderId", invoice.OrderId } });

                    if (ordersInfo.Count > 0)
                    {
                        invoice.TableName = ordersInfo[0].TableName;
                        invoice.ServerName = ordersInfo[0].ServerName;
                    }

                    invoice.Items = await _spService.ExecuteSqlQueryAsync(
                        "SELECT item_name, quantity, unit_price, total_price FROM order_items WHERE order_id = @orderId AND is_deleted = 0",
                        reader => new InvoiceItemDto
                        {
                            Name = reader.GetString(0),
                            Quantity = reader.GetInt32(1),
                            Price = reader.GetDecimal(2),
                            Total = reader.GetDecimal(3)
                        },
                        new Dictionary<string, object?> { { "@orderId", invoice.OrderId } });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not enrich invoice {InvoiceId}", id);
                }
            }
        }
        return invoice;
    }

    private static Invoice MapInvoiceFromReader(DbDataReader reader)
    {
        return new Invoice
        {
            InvoiceId = reader.GetInt64(reader.GetOrdinal("invoice_id")),
            OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
            InvoiceNumber = reader.GetString(reader.GetOrdinal("invoice_number")),
            Subtotal = reader.GetDecimal(reader.GetOrdinal("subtotal")),
            TaxableAmount = reader.GetDecimal(reader.GetOrdinal("taxable_amount")),
            TaxAmount = reader.GetDecimal(reader.GetOrdinal("tax_amount")),
            DiscountAmount = reader.GetDecimal(reader.GetOrdinal("discount_amount")),
            TotalAmount = reader.GetDecimal(reader.GetOrdinal("total_amount")),
            PaidAmount = reader.GetDecimal(reader.GetOrdinal("paid_amount")),
            AmountPaid = reader.GetDecimal(reader.GetOrdinal("paid_amount")),
            Status = reader.GetString(reader.GetOrdinal("status")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }

    private static InvoicePayment MapPaymentFromReader(DbDataReader reader)
    {
        var refOrd = reader.GetOrdinal("transaction_reference");

        return new InvoicePayment
        {
            PaymentId = reader.GetInt64(reader.GetOrdinal("payment_id")),
            InvoiceId = reader.GetInt64(reader.GetOrdinal("invoice_id")),
            Amount = reader.GetDecimal(reader.GetOrdinal("amount")),
            PaymentMode = reader.GetString(reader.GetOrdinal("payment_mode")),
            TransactionReference = reader.IsDBNull(refOrd) ? null : reader.GetString(refOrd),
            PaidAt = reader.GetDateTime(reader.GetOrdinal("paid_at"))
        };
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
