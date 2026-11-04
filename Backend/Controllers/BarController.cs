using System;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/bar")]
[Route("api/bar")]
public class BarController : ControllerBase
{
    private readonly BarService _barService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ILogger<BarController> _logger;

    public BarController(
        BarService barService,
        IHubContext<PosHub> hubContext,
        ILogger<BarController> logger)
    {
        _barService = barService;
        _hubContext = hubContext;
        _logger = logger;
    }

    #region Unified Screen Feed (All Bar Screens Together)

    /// <summary>
    /// Combined endpoint returning data for all bar screens: Overview KPIs, Drinks Menu, Bar Tables, and dropdown filter options in a single call.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("screen-feed")]
    [HttpGet("screens")]
    public async Task<IActionResult> GetBarScreenFeed([FromQuery] long? branchId)
    {
        _logger.LogInformation("GET /api/v1/bar/screen-feed requested");
        var feed = await _barService.GetBarScreenFeedAsync(branchId);
        return Ok(new
        {
            success = true,
            message = "Bar screen feed retrieved successfully.",
            data = feed
        });
    }

    #endregion

    #region Screen 1: Bar Overview & Recent Orders

    /// <summary>
    /// Returns 6 KPI summary metrics and recent bar orders for the Bar Overview dashboard.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("overview")]
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetBarOverview([FromQuery] long? branchId)
    {
        _logger.LogInformation("GET /api/v1/bar/overview requested");
        var overview = await _barService.GetBarOverviewAsync(branchId);
        return Ok(new
        {
            success = true,
            message = "Bar overview retrieved successfully.",
            data = overview
        });
    }

    /// <summary>
    /// Returns all recent bar orders (for the 'All Orders' button and overview recent orders).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("orders")]
    [HttpGet("overview/recent-orders")]
    [HttpGet("recent-orders")]
    public async Task<IActionResult> GetBarOrders([FromQuery] long? branchId, [FromQuery] int limit = 50)
    {
        var orders = await _barService.GetRecentBarOrdersAsync(branchId, limit);
        return Ok(new
        {
            success = true,
            message = "Bar orders retrieved successfully.",
            count = orders.Count,
            data = orders
        });
    }

    #endregion

    #region Screen 2 & 3: Drinks Menu & Add Drink

    /// <summary>
    /// Lists drinks menu items with optional search, category, availability, and price range filters.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks")]
    public async Task<IActionResult> GetBarDrinks(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? availability,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? priceRange)
    {
        var drinks = await _barService.GetBarDrinksAsync(search, category, availability, minPrice, maxPrice, priceRange);
        return Ok(new
        {
            success = true,
            message = "Bar drinks retrieved successfully.",
            count = drinks.Count,
            data = drinks
        });
    }

    /// <summary>
    /// Gets a single drink by menu_item_id or identifier.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks/{id}")]
    public async Task<IActionResult> GetBarDrinkById(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Drink ID is required." });
        }

        long drinkId = 0;
        if (!long.TryParse(id, out drinkId))
        {
            var match = await _barService.FindDrinkByIdentifierAsync(id);
            if (match != null) drinkId = match.MenuItemId;
        }

        if (drinkId <= 0)
        {
            return NotFound(new { success = false, message = $"Drink with identifier '{id}' not found." });
        }

        var drink = await _barService.GetBarDrinkByIdAsync(drinkId);
        if (drink == null)
        {
            return NotFound(new { success = false, message = $"Drink with ID {drinkId} not found." });
        }
        return Ok(new { success = true, data = drink });
    }

    /// <summary>
    /// Creates a new drink item (Add Drink modal).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("drinks")]
    public async Task<IActionResult> CreateBarDrink([FromBody] CreateBarDrinkDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Validation failed.", errors = ModelState });
        }

        try
        {
            var created = await _barService.CreateBarDrinkAsync(dto);

            // Real-time broadcast
            try { await _hubContext.Clients.All.SendAsync("ReceiveBarDrinkCreated", created); } catch { }

            return CreatedAtAction(nameof(GetBarDrinkById), new { id = created.MenuItemId }, new
            {
                success = true,
                message = "Drink created successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create drink");
            return StatusCode(500, new { success = false, message = "Failed to create drink.", error = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing drink item by ID or identifier.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("drinks/{id}")]
    public async Task<IActionResult> UpdateBarDrink(string id, [FromBody] UpdateBarDrinkDto dto)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Drink ID is required." });
        }

        long drinkId = 0;
        if (!long.TryParse(id, out drinkId))
        {
            var match = await _barService.FindDrinkByIdentifierAsync(id);
            if (match != null) drinkId = match.MenuItemId;
        }

        if (drinkId <= 0)
        {
            return NotFound(new { success = false, message = $"Drink with identifier '{id}' not found." });
        }

        var updated = await _barService.UpdateBarDrinkAsync(drinkId, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Drink with ID {drinkId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarDrinkUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = "Drink updated successfully.",
            data = updated
        });
    }

    /// <summary>
    /// Quick toggle or set availability (Enable / Disable buttons on table).
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("drinks/{id}/availability")]
    [HttpPatch("drinks/{id}/toggle-status")]
    public async Task<IActionResult> ToggleDrinkAvailability(string id, [FromBody] ToggleAvailabilityDto? dto)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Drink ID is required." });
        }

        long drinkId = 0;
        if (!long.TryParse(id, out drinkId))
        {
            var match = await _barService.FindDrinkByIdentifierAsync(id);
            if (match != null) drinkId = match.MenuItemId;
        }

        if (drinkId <= 0)
        {
            return NotFound(new { success = false, message = $"Drink with identifier '{id}' not found." });
        }

        var updated = await _barService.ToggleDrinkAvailabilityAsync(drinkId, dto?.IsAvailable);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Drink with ID {drinkId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarDrinkUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Drink availability changed to {(updated.IsAvailable ? "Available" : "Unavailable")}.",
            data = updated
        });
    }

    /// <summary>
    /// Soft deletes a drink item by ID or name identifier.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("drinks/{id}")]
    public async Task<IActionResult> DeleteBarDrink(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Drink ID is required." });
        }

        long drinkId = 0;
        if (!long.TryParse(id, out drinkId))
        {
            var match = await _barService.FindDrinkByIdentifierAsync(id);
            if (match != null) drinkId = match.MenuItemId;
        }

        if (drinkId <= 0)
        {
            return NotFound(new { success = false, message = $"Drink with identifier '{id}' not found." });
        }

        var deleted = await _barService.DeleteBarDrinkAsync(drinkId);
        if (!deleted)
        {
            return NotFound(new { success = false, message = $"Drink with ID {drinkId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarDrinkDeleted", drinkId); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Drink {drinkId} deleted successfully."
        });
    }

    /// <summary>
    /// Quick toggle or set special status (Bartender's Special).
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("drinks/{id}/special")]
    [HttpPatch("drinks/{id}/toggle-special")]
    public async Task<IActionResult> ToggleDrinkSpecial(string id, [FromBody] ToggleSpecialDto? dto)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Drink ID is required." });
        }

        long drinkId = 0;
        if (!long.TryParse(id, out drinkId))
        {
            var match = await _barService.FindDrinkByIdentifierAsync(id);
            if (match != null) drinkId = match.MenuItemId;
        }

        if (drinkId <= 0)
        {
            return NotFound(new { success = false, message = $"Drink with identifier '{id}' not found." });
        }

        var updated = await _barService.ToggleDrinkSpecialAsync(drinkId, dto?.IsSpecial);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Drink with ID {drinkId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarDrinkUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Drink special changed to {(updated.IsSpecial ? "Special" : "Regular")}.",
            data = updated
        });
    }

    /// <summary>
    /// Returns distinct categories for drinks (e.g. Cocktails, Beers, Wines, Spirits, Mocktails, beverages).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks/categories")]
    public async Task<IActionResult> GetBarCategories()
    {
        var categories = await _barService.GetBarCategoriesAsync();
        return Ok(new { success = true, data = categories });
    }

    /// <summary>
    /// Returns standard serving measures list.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks/serving-measures")]
    public IActionResult GetServingMeasures()
    {
        return Ok(new { success = true, data = BarService.GetServingMeasures() });
    }

    /// <summary>
    /// Returns standard price range filter options (Image 1).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks/price-ranges")]
    public IActionResult GetPriceRanges()
    {
        return Ok(new { success = true, data = BarService.GetPriceRanges() });
    }

    /// <summary>
    /// Returns availability filter options (Image 3).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("drinks/availability-options")]
    public IActionResult GetAvailabilityOptions()
    {
        return Ok(new { success = true, data = new[] { "All", "Available", "Unavailable" } });
    }

    #endregion

    #region Screen 4 & 5: Bar Tables & Add Table

    /// <summary>
    /// Lists bar tables with capacity, current active order details, order amount, and assigned servers.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("tables")]
    public async Task<IActionResult> GetBarTables(
        [FromQuery] string? search,
        [FromQuery] string? area,
        [FromQuery] string? occupancy,
        [FromQuery] int? minimumCapacity)
    {
        var tables = await _barService.GetBarTablesAsync(search, area, occupancy, minimumCapacity);
        return Ok(new
        {
            success = true,
            message = "Bar tables retrieved successfully.",
            count = tables.Count,
            data = tables
        });
    }

    /// <summary>
    /// Gets a single bar table with order details.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("tables/{id:long}")]
    public async Task<IActionResult> GetBarTableById(long id)
    {
        var table = await _barService.GetBarTableByIdAsync(id);
        if (table == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }
        return Ok(new { success = true, data = table });
    }

    /// <summary>
    /// Creates a new bar table (Add Bar Table modal).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("tables")]
    public async Task<IActionResult> CreateBarTable([FromBody] CreateBarTableDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Validation failed.", errors = ModelState });
        }

        try
        {
            var created = await _barService.CreateBarTableAsync(dto);

            try { await _hubContext.Clients.All.SendAsync("ReceiveBarTableCreated", created); } catch { }

            return CreatedAtAction(nameof(GetBarTableById), new { id = created.TableId }, new
            {
                success = true,
                message = "Bar table created successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create bar table");
            return StatusCode(500, new { success = false, message = "Failed to create bar table.", error = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing bar table.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("tables/{id:long}")]
    public async Task<IActionResult> UpdateBarTable(long id, [FromBody] UpdateBarTableDto dto)
    {
        var updated = await _barService.UpdateBarTableAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarTableUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = "Bar table updated successfully.",
            data = updated
        });
    }

    /// <summary>
    /// Quick status change for bar table (Available, Occupied, Reserved, Billed).
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("tables/{id:long}/status")]
    public async Task<IActionResult> UpdateTableStatus(long id, [FromBody] UpdateBarTableStatusDto dto)
    {
        var updated = await _barService.UpdateTableStatusAsync(id, dto.Status, dto.CurrentGuests);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarTableUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Table status updated to {updated.Status}.",
            data = updated
        });
    }

    /// <summary>
    /// Soft deletes a bar table.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("tables/{id}")]
    public async Task<IActionResult> DeleteBarTable(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Table ID or identifier is required." });
        }

        long tableId = 0;
        if (!long.TryParse(id, out tableId))
        {
            var match = await _barService.FindTableByIdentifierAsync(id);
            if (match != null) tableId = match.TableId;
        }

        if (tableId <= 0)
        {
            return NotFound(new { success = false, message = $"Table with identifier '{id}' not found." });
        }

        var deleted = await _barService.DeleteBarTableAsync(tableId);
        if (!deleted)
        {
            return NotFound(new { success = false, message = $"Table with ID {tableId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarTableDeleted", tableId); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Bar table {id} deleted successfully."
        });
    }

    /// <summary>
    /// Returns distinct areas / sections (VIP Lounge, Main Hall, Bar Counter, Rooftop).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("tables/areas")]
    public async Task<IActionResult> GetBarTableAreas()
    {
        var areas = await _barService.GetBarTableAreasAsync();
        return Ok(new { success = true, data = areas });
    }

    #endregion

    #region Screen 6 & 7: Bar Staff & Persons (Images 4 & 5)

    /// <summary>
    /// Lists bar staff & persons with their assigned tables and bar areas (Image 4).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("staff")]
    public async Task<IActionResult> GetBarStaff(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? shift,
        [FromQuery] string? assignment)
    {
        var staff = await _barService.GetBarStaffListAsync(search, role, shift, assignment);
        return Ok(new
        {
            success = true,
            message = "Bar staff retrieved successfully.",
            count = staff.Count,
            data = staff
        });
    }

    private static bool TryResolveStaffId(string rawId, out long resolvedId)
    {
        if (long.TryParse(rawId, out resolvedId)) return true;
        var digits = System.Text.RegularExpressions.Regex.Match(rawId ?? string.Empty, @"\d+").Value;
        return long.TryParse(digits, out resolvedId);
    }

    /// <summary>
    /// Gets a single staff member with assigned tables.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("staff/{id}")]
    public async Task<IActionResult> GetBarStaffById(string id)
    {
        if (!TryResolveStaffId(id, out var staffId))
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        var staff = await _barService.GetBarStaffByIdAsync(staffId);
        if (staff == null)
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }
        return Ok(new { success = true, data = staff });
    }

    /// <summary>
    /// Creates a new staff member and binds selected tables (Image 5: Add Bar Staff Member).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("staff")]
    public async Task<IActionResult> CreateBarStaff([FromBody] CreateBarStaffDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) && !string.IsNullOrWhiteSpace(dto.Name))
            dto.FullName = dto.Name;
        if (string.IsNullOrWhiteSpace(dto.JobTitle) && !string.IsNullOrWhiteSpace(dto.Role))
            dto.JobTitle = dto.Role;
        if (string.IsNullOrWhiteSpace(dto.JobTitle) && !string.IsNullOrWhiteSpace(dto.RoleTitle))
            dto.JobTitle = dto.RoleTitle;

        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Validation failed.", errors = ModelState });
        }

        try
        {
            var created = await _barService.CreateBarStaffAsync(dto);

            try { await _hubContext.Clients.All.SendAsync("ReceiveBarStaffCreated", created); } catch { }

            return CreatedAtAction(nameof(GetBarStaffById), new { id = created.StaffId }, new
            {
                success = true,
                message = "Bar staff member created successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create bar staff member");
            return StatusCode(500, new { success = false, message = "Failed to create bar staff member.", error = ex.Message });
        }
    }

    /// <summary>
    /// Updates staff member information and rebinds assigned tables.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("staff/{id}")]
    public async Task<IActionResult> UpdateBarStaff(string id, [FromBody] UpdateBarStaffDto dto)
    {
        if (!TryResolveStaffId(id, out var staffId))
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        if (string.IsNullOrWhiteSpace(dto.FullName) && !string.IsNullOrWhiteSpace(dto.Name))
            dto.FullName = dto.Name;
        if (string.IsNullOrWhiteSpace(dto.JobTitle) && !string.IsNullOrWhiteSpace(dto.Role))
            dto.JobTitle = dto.Role;
        if (string.IsNullOrWhiteSpace(dto.JobTitle) && !string.IsNullOrWhiteSpace(dto.RoleTitle))
            dto.JobTitle = dto.RoleTitle;

        var updated = await _barService.UpdateBarStaffAsync(staffId, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarStaffUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = "Bar staff member updated successfully.",
            data = updated
        });
    }

    /// <summary>
    /// Toggles active/inactive status of a staff member.
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("staff/{id}/toggle-status")]
    public async Task<IActionResult> ToggleStaffStatus(string id)
    {
        if (!TryResolveStaffId(id, out var staffId))
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        var updated = await _barService.ToggleStaffStatusAsync(staffId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarStaffUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Staff member status toggled to {updated.Status}.",
            data = updated
        });
    }

    /// <summary>
    /// Soft deletes a staff member and clears their assigned table links.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("staff/{id}")]
    public async Task<IActionResult> DeleteBarStaff(string id)
    {
        if (!TryResolveStaffId(id, out var staffId))
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        var deleted = await _barService.DeleteBarStaffAsync(staffId);
        if (!deleted)
        {
            return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarStaffDeleted", staffId); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Bar staff member {id} deleted successfully."
        });
    }

    /// <summary>
    /// Returns filter dropdown options (Roles, Shifts, Assignment status) and the assignable tables list (Image 4 & 5).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("staff/filter-options")]
    public async Task<IActionResult> GetBarStaffFilterOptions()
    {
        var options = await _barService.GetBarStaffFilterOptionsAsync();
        return Ok(new { success = true, data = options });
    }

    /// <summary>
    /// Returns available tables list formatted for the checklist box: 'Table-1 • VIP Lounge' (Image 5).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("staff/assignable-tables")]
    public async Task<IActionResult> GetAssignableTables()
    {
        var tables = await _barService.GetAssignableTablesAsync();
        return Ok(new { success = true, data = tables });
    }

    #endregion

    #region Screen 8: Bar KOT / BOT (Bar Order Tickets)

    /// <summary>
    /// Returns list of Bar Order Tickets (BOT) with beverage items.
    /// Supports filtering by search, table, and status.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("kot")]
    [HttpGet("kot/tickets")]
    [HttpGet("bot")]
    [HttpGet("bot/tickets")]
    public async Task<IActionResult> GetBarKotTickets(
        [FromQuery] string? search,
        [FromQuery] string? table,
        [FromQuery] string? status)
    {
        var tickets = await _barService.GetBarKotTicketsAsync(search, table, status);
        return Ok(new
        {
            success = true,
            count = tickets.Count,
            tickets = tickets,
            data = tickets
        });
    }

    /// <summary>
    /// Returns summary KPI metrics for the Bar BOT / KOT screen.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("kot/summary")]
    [HttpGet("bot/summary")]
    public async Task<IActionResult> GetBarKotSummary()
    {
        var summary = await _barService.GetBarKotSummaryAsync();
        return Ok(new { success = true, data = summary });
    }

    /// <summary>
    /// Returns filter dropdown options (Tables and Statuses) for Bar BOT / KOT.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("kot/filter-options")]
    [HttpGet("bot/filter-options")]
    public async Task<IActionResult> GetBarKotFilterOptions()
    {
        var options = await _barService.GetBarKotFilterOptionsAsync();
        return Ok(new { success = true, data = options });
    }

    /// <summary>
    /// Unified Bar BOT Screen Feed bundling Summary, Tickets, and Filter Options together.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("kot/screen-feed")]
    [HttpGet("kot/screens")]
    [HttpGet("bot/screen-feed")]
    [HttpGet("bot/screens")]
    public async Task<IActionResult> GetBarKotScreenFeed(
        [FromQuery] string? search,
        [FromQuery] string? table,
        [FromQuery] string? status)
    {
        var feed = await _barService.GetBarKotScreenFeedAsync(search, table, status);
        return Ok(new
        {
            success = true,
            message = "Bar BOT screen feed retrieved successfully.",
            data = feed
        });
    }

    /// <summary>
    /// Returns a single Bar BOT ticket by ID.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("kot/{id:long}")]
    [HttpGet("bot/{id:long}")]
    public async Task<IActionResult> GetBarKotTicketById(long id)
    {
        var ticket = await _barService.GetBarKotTicketByIdAsync(id);
        if (ticket == null)
        {
            return NotFound(new { success = false, message = $"Bar BOT ticket {id} not found." });
        }
        return Ok(new { success = true, data = ticket });
    }

    /// <summary>
    /// Updates status of a Bar BOT ticket (e.g. 'preparing', 'ready', 'served', 'cancelled').
    /// </summary>
    [AllowAnonymous]
    [HttpPut("kot/{id:long}/status")]
    [HttpPatch("kot/{id:long}/status")]
    [HttpPut("bot/{id:long}/status")]
    [HttpPatch("bot/{id:long}/status")]
    public async Task<IActionResult> UpdateBarKotStatus(long id, [FromBody] UpdateBarKotStatusDto dto)
    {
        var updated = await _barService.UpdateBarKotStatusAsync(id, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Bar BOT ticket {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarKotUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Bar BOT ticket {id} status updated to {dto.Status}.",
            data = updated
        });
    }

    /// <summary>
    /// Marks all drink items in a Bar BOT ticket as 'ready'.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("kot/{id:long}/mark-all-ready")]
    [HttpPost("bot/{id:long}/mark-all-ready")]
    public async Task<IActionResult> MarkAllBarKotReady(long id)
    {
        var updated = await _barService.MarkAllBarKotReadyAsync(id);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Bar BOT ticket {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarKotUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"All drinks in Bar BOT ticket {id} marked as ready.",
            data = updated
        });
    }

    /// <summary>
    /// Marks all drink items for a specific table as 'ready'.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("kot/tables/{tableId:long}/mark-all-ready")]
    [HttpPost("bot/tables/{tableId:long}/mark-all-ready")]
    public async Task<IActionResult> MarkAllBarKotTableReady(long tableId)
    {
        var success = await _barService.MarkAllBarKotTableReadyAsync(tableId);
        if (!success)
        {
            return NotFound(new { success = false, message = $"No active beverage orders found for Table {tableId}." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarKotTableUpdated", new { tableId, status = "ready" }); } catch { }

        return Ok(new
        {
            success = true,
            message = $"All drinks for Table {tableId} marked as ready.",
            tableId = tableId,
            status = "ready"
        });
    }

    /// <summary>
    /// Updates status of an individual drink line item inside a Bar BOT.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("kot/items/{orderItemId:long}/status")]
    [HttpPatch("kot/items/{orderItemId:long}/status")]
    [HttpPut("bot/items/{orderItemId:long}/status")]
    [HttpPatch("bot/items/{orderItemId:long}/status")]
    public async Task<IActionResult> UpdateBarKotItemStatus(long orderItemId, [FromBody] UpdateBarKotItemStatusDto dto)
    {
        var updated = await _barService.UpdateBarKotItemStatusAsync(orderItemId, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Bar BOT item {orderItemId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarKotItemUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Bar BOT item {orderItemId} status updated to {dto.Status}.",
            data = updated
        });
    }

    /// <summary>
    /// Advances drink item status to the next step ('queued' -> 'cooking' -> 'ready' -> 'served').
    /// </summary>
    [AllowAnonymous]
    [HttpPost("kot/items/{orderItemId:long}/advance")]
    [HttpPost("bot/items/{orderItemId:long}/advance")]
    public async Task<IActionResult> AdvanceBarKotItemStatus(long orderItemId)
    {
        var updated = await _barService.AdvanceBarKotItemStatusAsync(orderItemId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Bar BOT item {orderItemId} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveBarKotItemUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Bar BOT item {orderItemId} status advanced to {updated.Status}.",
            data = updated
        });
    }

    #endregion

    #region Screen 9: Shared Inventory & Add Inventory Modal (Image 5)

    /// <summary>
    /// Returns inventory ingredients list with filtering by category, search, and stock levels.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory")]
    public async Task<IActionResult> GetBarInventoryItems(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] bool? lowStockOnly)
    {
        var items = await _barService.GetBarInventoryItemsAsync(category, search, status, lowStockOnly);
        return Ok(new
        {
            success = true,
            count = items.Count,
            data = items
        });
    }

    /// <summary>
    /// Returns inventory categories dropdown options (Image 5).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory/categories")]
    public IActionResult GetBarInventoryCategories()
    {
        var categories = BarService.GetInventoryCategories();
        return Ok(new { success = true, data = categories });
    }

    /// <summary>
    /// Returns measurement units dropdown options (Image 5: Bottle, Can, Peg, ML, etc.).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory/units")]
    public IActionResult GetBarInventoryUnits()
    {
        var units = BarService.GetInventoryUnits();
        return Ok(new { success = true, data = units });
    }

    /// <summary>
    /// Returns summary KPI metrics for Shared / Bar Inventory (Total items, Low stock, Value).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory/summary")]
    public async Task<IActionResult> GetBarInventorySummary()
    {
        var summary = await _barService.GetBarInventorySummaryAsync();
        return Ok(new { success = true, data = summary });
    }

    /// <summary>
    /// Unified Bar / Shared Inventory Screen Feed bundling Summary, Items, Categories, and Units together.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory/screen-feed")]
    [HttpGet("inventory/screens")]
    public async Task<IActionResult> GetBarInventoryScreenFeed(
        [FromQuery] string? category,
        [FromQuery] string? search)
    {
        var feed = await _barService.GetBarInventoryScreenFeedAsync(category, search);
        return Ok(new
        {
            success = true,
            message = "Inventory screen feed retrieved successfully.",
            data = feed
        });
    }

    /// <summary>
    /// Returns single inventory item by ID.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("inventory/{id:long}")]
    public async Task<IActionResult> GetBarInventoryItemById(long id)
    {
        var item = await _barService.GetBarInventoryItemByIdAsync(id);
        if (item == null)
        {
            return NotFound(new { success = false, message = $"Inventory item {id} not found." });
        }
        return Ok(new { success = true, data = item });
    }

    /// <summary>
    /// Adds a new inventory item (Image 5: Add Inventory Modal).
    /// Fields: Item Name *, Category *, Unit *, Stock *, Threshold *, Unit Cost *.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("inventory")]
    public async Task<IActionResult> CreateInventoryItem([FromBody] CreateInventoryItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ItemName))
        {
            return BadRequest(new { success = false, message = "Item Name is required." });
        }

        var created = await _barService.CreateInventoryItemAsync(dto);

        try { await _hubContext.Clients.All.SendAsync("ReceiveInventoryCreated", created); } catch { }

        return CreatedAtAction(nameof(GetBarInventoryItemById), new { id = created.ItemId }, new
        {
            success = true,
            message = "Inventory item added successfully.",
            data = created
        });
    }

    /// <summary>
    /// Updates an existing inventory item.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("inventory/{id:long}")]
    public async Task<IActionResult> UpdateInventoryItem(long id, [FromBody] UpdateInventoryItemDto dto)
    {
        var updated = await _barService.UpdateInventoryItemAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Inventory item {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveInventoryUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = "Inventory item updated successfully.",
            data = updated
        });
    }

    /// <summary>
    /// Adjusts stock count for an inventory item (+/- delta).
    /// </summary>
    [AllowAnonymous]
    [HttpPatch("inventory/{id:long}/stock")]
    public async Task<IActionResult> AdjustInventoryStock(long id, [FromBody] AdjustInventoryStockDto dto)
    {
        var updated = await _barService.AdjustInventoryStockAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Inventory item {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveInventoryUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = "Stock adjusted successfully.",
            data = updated
        });
    }

    /// <summary>
    /// Receives incoming stock delivery for an inventory item (Image 1: 'Receive' button).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("inventory/{id:long}/receive")]
    public async Task<IActionResult> ReceiveInventoryStock(long id, [FromBody] ReceiveInventoryStockDto dto)
    {
        var updated = await _barService.ReceiveInventoryStockAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Inventory item {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveInventoryUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Stock received successfully for {updated.ItemName}. New stock: {updated.Stock}.",
            data = updated
        });
    }

    /// <summary>
    /// Soft deletes / archives an inventory item.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("inventory/{id:long}")]
    public async Task<IActionResult> DeleteInventoryItem(long id)
    {
        var deleted = await _barService.DeleteInventoryItemAsync(id);
        if (!deleted)
        {
            return NotFound(new { success = false, message = $"Inventory item {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveInventoryDeleted", id); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Inventory item {id} deleted successfully."
        });
    }

    #endregion

    #region Screen 10: Invoices & Billing Logs (Image 2)

    /// <summary>
    /// Returns settled invoices list with pagination and filtering by search, date range, and payment mode (Image 2).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("invoices")]
    public async Task<IActionResult> GetBarInvoices(
        [FromQuery] string? search,
        [FromQuery] string? dateRange,
        [FromQuery] string? paymentMode,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 6)
    {
        var allInvoices = await _barService.GetBarInvoicesAsync(search, dateRange, paymentMode, page, pageSize);
        var paged = allInvoices.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new
        {
            success = true,
            count = paged.Count,
            totalCount = allInvoices.Count,
            page = page,
            pageSize = pageSize,
            invoices = paged,
            data = paged
        });
    }

    /// <summary>
    /// Returns 4 KPI metric cards for Invoices: Total Invoices, Total Revenue, Cash Collected, UPI Collected (Image 2).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("invoices/summary")]
    public async Task<IActionResult> GetBarInvoicesSummary()
    {
        var summary = await _barService.GetBarInvoicesSummaryAsync();
        return Ok(new { success = true, data = summary });
    }

    /// <summary>
    /// Unified Invoices Screen Feed bundling Summary, List, Date Options, and Payment Modes together (Image 2).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("invoices/screen-feed")]
    [HttpGet("invoices/screens")]
    public async Task<IActionResult> GetBarInvoicesScreenFeed(
        [FromQuery] string? search,
        [FromQuery] string? dateRange,
        [FromQuery] string? paymentMode,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 6)
    {
        var feed = await _barService.GetBarInvoicesScreenFeedAsync(search, dateRange, paymentMode, page, pageSize);
        return Ok(new
        {
            success = true,
            message = "Invoices screen feed retrieved successfully.",
            data = feed
        });
    }

    /// <summary>
    /// Returns a single invoice by ID with line items and receipt details (Image 2: 'View' button).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("invoices/{id:long}")]
    public async Task<IActionResult> GetBarInvoiceById(long id)
    {
        var invoice = await _barService.GetBarInvoiceByIdAsync(id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = $"Invoice {id} not found." });
        }
        return Ok(new { success = true, data = invoice });
    }

    /// <summary>
    /// Updates invoice payment mode, status, or settlement notes (Image 2: 'Edit' button).
    /// </summary>
    [AllowAnonymous]
    [HttpPut("invoices/{id:long}")]
    public async Task<IActionResult> UpdateBarInvoice(long id, [FromBody] UpdateBarInvoiceDto dto)
    {
        var updated = await _barService.UpdateBarInvoiceAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Invoice {id} not found." });
        }

        try { await _hubContext.Clients.All.SendAsync("ReceiveInvoiceUpdated", updated); } catch { }

        return Ok(new
        {
            success = true,
            message = $"Invoice {id} updated successfully.",
            data = updated
        });
    }

    #endregion

    #region Screen 11: Bar Reports (Image 3)

    /// <summary>
    /// Returns Bar Reports KPI cards and summary table (Image 3: Active Beverage Orders, Menu Beverage Items, Inventory Records, Completed Sales).
    /// Supports ?format=csv or Accept: text/csv to trigger CSV download automatically.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("reports")]
    [HttpGet("report")]
    [HttpGet("reports/screen-feed")]
    [HttpGet("reports/screens")]
    [HttpGet("/api/v1/reports/bar")]
    [HttpGet("/api/reports/bar")]
    [HttpGet("/api/v1/bar-reports")]
    [HttpGet("/api/bar-reports")]
    [HttpPost("reports")]
    [HttpPost("report")]
    public async Task<IActionResult> GetBarReports([FromQuery] string? format = null)
    {
        if (string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase) ||
            Request.Headers.Accept.ToString().Contains("text/csv", StringComparison.OrdinalIgnoreCase))
        {
            return await ExportBarReportsCsv();
        }

        var reports = await _barService.GetBarReportsScreenAsync();
        return Ok(new
        {
            success = true,
            message = "Bar reports retrieved successfully.",
            activeBeverageOrders = reports.ActiveBeverageOrders,
            menuBeverageItems = reports.MenuBeverageItems,
            beverageInventoryRecords = reports.BeverageInventoryRecords,
            completedDrinkSales = reports.CompletedDrinkSales,
            formattedCompletedSales = reports.FormattedCompletedSales,
            rows = reports.Rows,
            kpiCards = reports.KpiCards,
            tableRows = reports.TableRows,
            title = reports.Title,
            subtitle = reports.Subtitle,
            note = reports.Note,
            badge = reports.Badge,
            generatedAt = reports.GeneratedAt,
            serverTimeFormatted = reports.ServerTimeFormatted,
            data = reports
        });
    }

    /// <summary>
    /// Exports Bar Reports as a CSV file (Image 3: 'Export CSV' button).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("reports/export-csv")]
    [HttpGet("reports/export")]
    [HttpGet("reports/export.csv")]
    [HttpGet("reports/csv")]
    [HttpGet("reports/download")]
    [HttpGet("/api/v1/reports/bar/export-csv")]
    [HttpGet("/api/reports/bar/export-csv")]
    [HttpGet("/api/v1/bar-reports/export-csv")]
    [HttpGet("/api/bar-reports/export-csv")]
    [HttpPost("reports/export-csv")]
    [HttpPost("reports/export")]
    [HttpPost("/api/v1/reports/bar/export-csv")]
    [HttpPost("/api/reports/bar/export-csv")]
    public async Task<IActionResult> ExportBarReportsCsv()
    {
        var csv = await _barService.ExportBarReportsCsvAsync();

        // Include UTF-8 BOM preamble so Excel renders ₹ symbols cleanly
        byte[] preamble = System.Text.Encoding.UTF8.GetPreamble();
        byte[] contentBytes = System.Text.Encoding.UTF8.GetBytes(csv);
        byte[] fileBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fileBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fileBytes, preamble.Length, contentBytes.Length);

        string fileName = $"Bar_Reports_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

        Response.Headers["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Length, X-Suggested-Filename";
        Response.Headers["X-Suggested-Filename"] = fileName;

        return File(fileBytes, "text/csv; charset=utf-8", fileName);
    }

    #endregion
}

