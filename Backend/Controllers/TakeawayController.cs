using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Middleware;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/takeaway")]
public class TakeawayController : ControllerBase
{
    private readonly TakeawayService _takeawayService;
    private readonly ILogger<TakeawayController> _logger;

    public TakeawayController(TakeawayService takeawayService, ILogger<TakeawayController> logger)
    {
        _takeawayService = takeawayService;
        _logger = logger;
    }

    private (long? UserId, string? FullName, string? IpAddress) ExtractActorContext()
    {
        long? userId = null;
        if (!CustomerAdminIsolationMiddleware.IsCustomerPrincipal(User))
        {
            string? rawId = User.FindFirstValue("userId")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            if (long.TryParse(rawId, out var parsedId) && parsedId > 0)
            {
                userId = parsedId;
            }
        }

        string? fullName = User.FindFirstValue("fullName")
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.UniqueName);

        string? ipAddress = HttpContext?.Connection?.RemoteIpAddress?.ToString();
        return (userId, fullName, ipAddress);
    }

    private (bool IsCustomer, long? CustomerId, string? Phone) ExtractCustomerContext()
    {
        if (!CustomerAdminIsolationMiddleware.IsCustomerPrincipal(User))
        {
            return (false, null, null);
        }

        long? customerId = long.TryParse(User.FindFirstValue("customerId"), out var parsedCid) && parsedCid > 0
            ? parsedCid
            : null;
        string? phone = User.FindFirstValue("phone") ?? User.FindFirstValue(ClaimTypes.MobilePhone);
        return (true, customerId, phone);
    }

    #region 1. Takeaway Menu Endpoints

    /// <summary>
    /// Returns active and available menu items for the Takeaway POS screen with pagination and sorting.
    /// Excludes deleted and unavailable items.
    /// </summary>
    [AllowAnonymous]
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
    [AllowAnonymous]
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
    [AllowAnonymous]
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
    [AllowAnonymous]
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
    [AllowAnonymous]
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

    #region 3. Takeaway Orders List, Summary, Creation, Status Lifecycle & Cancellation Endpoints

    /// <summary>
    /// Retrieves paginated Takeaway orders for the Admin / POS Takeaway Dashboard with search, status, date, payment status, and payment method filters.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? paymentStatus = null,
        [FromQuery] string? paymentMethod = null)
    {
        try
        {
            var orders = await _takeawayService.GetTakeawayOrdersAsync(
                page, pageSize, search, status, fromDate, toDate, paymentStatus, paymentMethod);
            return Ok(new
            {
                success = true,
                message = "Takeaway orders retrieved successfully.",
                data = orders
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway orders.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway orders.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves KPI summary statistics for Takeaway orders over an optional date range.
    /// Excludes cancelled orders and voided/refunded invoices from net sales metrics.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("orders/summary")]
    public async Task<IActionResult> GetOrdersSummary(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var summary = await _takeawayService.GetTakeawayOrdersSummaryAsync(fromDate, toDate);
            return Ok(new
            {
                success = true,
                message = "Takeaway orders summary retrieved successfully.",
                data = summary
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving takeaway orders summary.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve takeaway orders summary.", error = ex.Message });
        }
    }

    /// <summary>
    /// Processes checkout for a Takeaway order.
    /// Validates items against MySQL, verifies payment gateway payload/signature, creates parent order in restaurant_orders,
    /// saves customer details and line items, dispatches Kitchen KOT / Bar BOT tickets, generates invoice, records payment,
    /// and uses database transactions with idempotency protection.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateTakeawayOrderRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var (isCustomer, customerId, _) = ExtractCustomerContext();
            if (isCustomer)
            {
                if (!customerId.HasValue)
                {
                    return StatusCode(403, new { success = false, message = "Authenticated customer identity is required to place an order." });
                }
                request.CustomerId = customerId.Value;
            }

            var (userId, fullName, ipAddress) = ExtractActorContext();
            var orderResult = await _takeawayService.CreateTakeawayOrderAsync(request, userId, fullName, ipAddress);
            return StatusCode(orderResult.AlreadyProcessed ? 200 : 201, orderResult);
        }
        catch (PaymentVerificationException ex)
        {
            return BadRequest(new { success = false, paymentStatus = "Failed", message = ex.Message });
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

    /// <summary>
    /// Updates the fulfillment lifecycle status of a takeaway order
    /// (New -> Preparing -> Ready -> PickedUp -> Completed, or Cancelled) and synchronizes Kitchen KOT / Bar BOT tickets.
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("orders/{orderId:long}/status")]
    public async Task<IActionResult> UpdateOrderStatus(long orderId, [FromBody] UpdateTakeawayOrderStatusRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var (userId, fullName, ipAddress) = ExtractActorContext();
            var updated = await _takeawayService.UpdateTakeawayOrderStatusAsync(orderId, request, userId, fullName, ipAddress);
            if (updated == null)
            {
                return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
            }

            return Ok(updated);
        }
        catch (TakeawayOrderConflictException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
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
            _logger.LogError(ex, "Error updating status for takeaway order {OrderId}.", orderId);
            return StatusCode(500, new { success = false, message = "Failed to update takeaway order status.", error = ex.Message });
        }
    }

    /// <summary>
    /// Atomically cancels an active or settled (not yet PickedUp/Completed) Takeaway order,
    /// voids unpaid/pending invoices or marks collected payments/invoices as Refunded,
    /// cancels Kitchen KOT &amp; Bar BOT tickets, preserves financial history, and records an audit log.
    /// Restricted to Admin, Super Admin, Branch Manager, POS Cashier, and User POS roles.
    /// </summary>
    [Authorize(Roles = "Admin,Super Admin,Branch Manager,POS Cashier,User POS")]
    [HttpPost("orders/{orderId:long}/cancel")]
    public async Task<IActionResult> CancelOrder(
        long orderId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelTakeawayOrderRequest? request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var (userId, fullName, ipAddress) = ExtractActorContext();
            var result = await _takeawayService.CancelTakeawayOrderAsync(
                orderId,
                request ?? new CancelTakeawayOrderRequest(),
                userId,
                fullName,
                ipAddress);

            if (result == null)
            {
                return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
            }

            return Ok(result);
        }
        catch (TakeawayOrderConflictException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
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
            _logger.LogError(ex, "Error cancelling takeaway order {OrderId}.", orderId);
            return StatusCode(500, new { success = false, message = "Failed to cancel takeaway order.", error = ex.Message });
        }
    }

    #endregion

    #region 4. Takeaway Invoices & History Endpoints

    /// <summary>
    /// Retrieves paginated invoice history for Takeaway orders with date and search filters.
    /// </summary>
    [AllowAnonymous]
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
    [AllowAnonymous]
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
    /// Retrieves full order details including customer details, fulfillment status, line items, associated invoice, payment history, and KOT/BOT tickets.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("orders/{orderId:long}")]
    public async Task<IActionResult> GetOrderDetails(long orderId)
    {
        try
        {
            var (isCustomer, customerId, phone) = ExtractCustomerContext();
            if (isCustomer)
            {
                if (!customerId.HasValue)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to view this takeaway order." });
                }
                var (exists, allowed) = await _takeawayService.CanCustomerAccessOrderAsync(orderId, customerId.Value, phone);
                if (!exists)
                {
                    return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
                }
                if (!allowed)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to view another customer's takeaway order." });
                }
            }

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
    /// Records or verifies payment (Success, Pending, or Failed) for a takeaway order with duplicate-payment protection.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("orders/{orderId:long}/pay")]
    public async Task<IActionResult> RecordOrderPayment(long orderId, [FromBody] TakeawayRecordPaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var (isCustomer, customerId, phone) = ExtractCustomerContext();
            if (isCustomer)
            {
                if (!customerId.HasValue)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to record payment for this takeaway order." });
                }
                var (exists, allowed) = await _takeawayService.CanCustomerAccessOrderAsync(orderId, customerId.Value, phone);
                if (!exists)
                {
                    return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
                }
                if (!allowed)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to pay for another customer's takeaway order." });
                }
            }

            var result = await _takeawayService.RecordPaymentAsync(orderId, request, lookupByOrderId: true);
            if (result == null)
            {
                return NotFound(new { success = false, message = $"Takeaway order {orderId} was not found." });
            }

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (DuplicatePaymentException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (PaymentVerificationException ex)
        {
            return BadRequest(new { success = false, paymentStatus = "Failed", message = ex.Message });
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
            _logger.LogError(ex, "Error recording payment for takeaway order {OrderId}.", orderId);
            return StatusCode(500, new { success = false, message = "Failed to record payment.", error = ex.Message });
        }
    }

    /// <summary>
    /// Records or verifies payment (Success, Pending, or Failed) for a specific takeaway invoice with duplicate-payment protection.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("invoices/{invoiceId:long}/pay")]
    public async Task<IActionResult> RecordInvoicePayment(long invoiceId, [FromBody] TakeawayRecordPaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var (isCustomer, customerId, phone) = ExtractCustomerContext();
            if (isCustomer)
            {
                if (!customerId.HasValue)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to record payment for this invoice." });
                }
                var (exists, allowed) = await _takeawayService.CanCustomerAccessInvoiceAsync(invoiceId, customerId.Value, phone);
                if (!exists)
                {
                    return NotFound(new { success = false, message = $"Takeaway invoice {invoiceId} was not found." });
                }
                if (!allowed)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to pay for another customer's invoice." });
                }
            }

            var result = await _takeawayService.RecordPaymentAsync(invoiceId, request, lookupByOrderId: false);
            if (result == null)
            {
                return NotFound(new { success = false, message = $"Takeaway invoice {invoiceId} was not found." });
            }

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (DuplicatePaymentException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (PaymentVerificationException ex)
        {
            return BadRequest(new { success = false, paymentStatus = "Failed", message = ex.Message });
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
            _logger.LogError(ex, "Error recording payment for takeaway invoice {InvoiceId}.", invoiceId);
            return StatusCode(500, new { success = false, message = "Failed to record payment.", error = ex.Message });
        }
    }

    #endregion
}
