using System;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/takeaway")]
[Route("api/takeaway")]
[AllowAnonymous]
public class TakeawayController : ControllerBase
{
    private readonly TakeawayService _takeawayService;
    private readonly ILogger<TakeawayController> _logger;

    public TakeawayController(TakeawayService takeawayService, ILogger<TakeawayController> logger)
    {
        _takeawayService = takeawayService;
        _logger = logger;
    }

    #region 1. Takeaway Menu Endpoints

    /// <summary>
    /// Returns active and available menu items for the Takeaway POS screen with pagination and sorting.
    /// Excludes deleted and unavailable items.
    /// </summary>
    [HttpGet("menu")]
    public async Task<IActionResult> GetMenu(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = "asc")
    {
        try
        {
            var menu = await _takeawayService.GetMenuAsync(search, category, page, pageSize, sortBy, sortOrder);
            return Ok(new
            {
                success = true,
                message = "Takeaway menu retrieved successfully.",
                data = menu
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway menu.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway menu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Returns distinct categories containing active and available takeaway menu items.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var categories = await _takeawayService.GetCategoriesAsync();
            return Ok(new
            {
                success = true,
                message = "Takeaway categories retrieved successfully.",
                data = categories
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway categories.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway categories.", error = ex.Message });
        }
    }

    /// <summary>
    /// Searches available menu items by dish name or category keyword (case-insensitive).
    /// </summary>
    [HttpGet("menu/search")]
    public async Task<IActionResult> SearchMenu(
        [FromQuery] string? query,
        [FromQuery] string? q,
        [FromQuery] string? category)
    {
        try
        {
            var searchTerm = !string.IsNullOrWhiteSpace(query) ? query : q;
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return BadRequest(new { success = false, message = "Search query parameter ('query' or 'q') is required." });
            }

            var results = await _takeawayService.SearchMenuAsync(searchTerm, category);
            return Ok(new
            {
                success = true,
                message = $"Found {results.Count} matching item(s).",
                count = results.Count,
                data = results
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching takeaway menu.");
            return StatusCode(500, new { success = false, message = "Failed to search takeaway menu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves active and available menu items belonging to a specific category (by ID or category name).
    /// </summary>
    [HttpGet("menu/category/{categoryId}")]
    public async Task<IActionResult> GetMenuByCategory(string categoryId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(categoryId))
            {
                return BadRequest(new { success = false, message = "Category identifier is required." });
            }

            var items = await _takeawayService.GetMenuByCategoryAsync(categoryId);
            return Ok(new
            {
                success = true,
                message = $"Retrieved {items.Count} items for category '{categoryId}'.",
                count = items.Count,
                data = items
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items for category {CategoryId}.", categoryId);
            return StatusCode(500, new { success = false, message = "Failed to retrieve category items.", error = ex.Message });
        }
    }

    #endregion

    #region 2. Takeaway Cart Calculation Endpoint

    /// <summary>
    /// Performs server-side financial calculation for takeaway cart items.
    /// Validates items in MySQL, retrieves actual selling prices, applies discounts, calculates 5% GST and packaging charges.
    /// Never trusts client-supplied prices or tax rates.
    /// </summary>
    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateCart([FromBody] TakeawayCartCalculateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _takeawayService.CalculateCartAsync(request);
            return Ok(new
            {
                success = true,
                message = "Takeaway cart calculated successfully.",
                data = result
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating takeaway cart.");
            return StatusCode(500, new { success = false, message = "Calculation failed.", error = ex.Message });
        }
    }

    #endregion

    #region 3. Takeaway Order Creation & Checkout Endpoint

    /// <summary>
    /// Processes checkout for a Takeaway order.
    /// Validates items against MySQL, verifies actual prices, creates parent order in restaurant_orders,
    /// saves line items, dispatches Kitchen KOT / Bar BOT tickets, generates invoice, records payment,
    /// and uses database transactions with idempotency protection.
    /// </summary>
    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateTakeawayOrderRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var orderResult = await _takeawayService.CreateTakeawayOrderAsync(request);
            return StatusCode(201, orderResult);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating takeaway order.");
            return StatusCode(500, new { success = false, message = "Takeaway order creation failed.", error = ex.Message });
        }
    }

    #endregion

    #region 4. Takeaway Invoices & History Endpoints

    /// <summary>
    /// Retrieves paginated invoice history for Takeaway orders with date and search filters.
    /// </summary>
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? search,
        [FromQuery] string? paymentStatus,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var invoices = await _takeawayService.GetInvoicesAsync(startDate, endDate, search, paymentStatus, page, pageSize);
            return Ok(new
            {
                success = true,
                message = "Takeaway invoices retrieved successfully.",
                data = invoices
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway invoices.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway invoices.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves complete invoice details for a specific Takeaway invoice by ID.
    /// </summary>
    [HttpGet("invoices/{invoiceId:long}")]
    public async Task<IActionResult> GetInvoiceById(long invoiceId)
    {
        try
        {
            var detail = await _takeawayService.GetInvoiceByIdAsync(invoiceId);
            if (detail == null)
            {
                return NotFound(new { success = false, message = $"Takeaway invoice {invoiceId} was not found." });
            }

            return Ok(new
            {
                success = true,
                message = "Takeaway invoice details retrieved successfully.",
                data = detail
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway invoice {InvoiceId}.", invoiceId);
            return StatusCode(500, new { success = false, message = "Failed to retrieve invoice details.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves full order details including line items, associated invoice, payment, and KOT/BOT tickets.
    /// </summary>
    [HttpGet("orders/{orderId:long}")]
    public async Task<IActionResult> GetOrderDetails(long orderId)
    {
        try
        {
            var orderDetail = await _takeawayService.GetTakeawayOrderDetailsAsync(orderId);
            if (orderDetail == null)
            {
                return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
            }

            return Ok(new
            {
                success = true,
                message = "Takeaway order details retrieved successfully.",
                data = orderDetail
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway order {OrderId}.", orderId);
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway order details.", error = ex.Message });
        }
    }

    #endregion

    #region 5. Payment Recording Endpoints

    /// <summary>
    /// Records or updates payment for a pending takeaway order.
    /// </summary>
    [HttpPost("orders/{orderId:long}/pay")]
    public async Task<IActionResult> RecordOrderPayment(long orderId, [FromBody] TakeawayRecordPaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            bool updated = await _takeawayService.RecordPaymentAsync(orderId, request);
            if (!updated)
            {
                return NotFound(new { success = false, message = $"Takeaway order or invoice {orderId} was not found." });
            }

            return Ok(new
            {
                success = true,
                message = $"Payment of {request.Amount:C} via {request.PaymentMethod} recorded successfully for takeaway order {orderId}."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording payment for takeaway order {OrderId}.", orderId);
            return StatusCode(500, new { success = false, message = "Failed to record payment.", error = ex.Message });
        }
    }

    /// <summary>
    /// Records payment for a specific takeaway invoice.
    /// </summary>
    [HttpPost("invoices/{invoiceId:long}/pay")]
    public async Task<IActionResult> RecordInvoicePayment(long invoiceId, [FromBody] TakeawayRecordPaymentRequest request)
    {
        return await RecordOrderPayment(invoiceId, request);
    }

    #endregion
}
