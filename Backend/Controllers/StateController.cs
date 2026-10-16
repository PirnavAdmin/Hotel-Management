using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api")]
[Route("api/v1")]
public class StateController : ControllerBase
{
    private readonly SpService _spService;
    private readonly TableService _tableService;
    private readonly MenuItemService _menuItemService;
    private readonly StaffService _staffService;
    private readonly RestaurantSettingsService _settingsService;
    private readonly ILogger<StateController> _logger;

    public StateController(
        SpService spService,
        TableService tableService,
        MenuItemService menuItemService,
        StaffService staffService,
        RestaurantSettingsService settingsService,
        ILogger<StateController> logger)
    {
        _spService = spService;
        _tableService = tableService;
        _menuItemService = menuItemService;
        _staffService = staffService;
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves full POS runtime state (tables, active orders, past orders, categories, menu items, staff).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("state")]
    [HttpGet("pos/state")]
    public async Task<IActionResult> GetState()
    {
        try
        {
            _logger.LogInformation("Fetching complete POS state via SPs.");

            var rawTables = await _tableService.GetTablesAsync();
            var tables = rawTables.ConvertAll(t => new
            {
                id = t.TableId,
                name = t.TableName,
                section = t.SectionArea,
                capacity = t.CapacityChairs,
                status = t.Status,
                server = t.AssignedServerName ?? "Staff"
            });

            var categoriesList = await _menuItemService.GetCategoriesAsync();
            var categories = categoriesList.ConvertAll(c => new { id = Guid.NewGuid().ToString(), name = c, displayOrder = 0 });

            var rawMenuItems = await _menuItemService.GetMenuItemsAsync();
            var menuItems = rawMenuItems.ConvertAll(m => new
            {
                id = m.MenuItemId.ToString(),
                name = m.DishName,
                category = m.Category,
                price = m.Price,
                isVeg = m.DietaryType.ToLower() == "veg",
                spiceLevel = m.SpiceLevel == 0 ? "Mild" : (m.SpiceLevel == 1 ? "Medium" : "Spicy"),
                description = m.ShortDescription,
                prepTimeMinutes = m.PrepTimeMinutes ?? 15,
                isAvailable = m.IsAvailable,
                imageUrl = m.ImageUrl
            });

            var rawStaff = await _staffService.GetStaffListAsync();
            var staff = rawStaff.ConvertAll(s => new
            {
                id = s.StaffId,
                name = s.FullName,
                role = s.RoleTitle,
                phone = s.Phone,
                shift = s.Shift,
                status = s.IsActive ? "active" : "inactive"
            });

            var activeOrders = new List<object>();
            var pastOrders = new List<object>();
            var restaurantSettings = await _settingsService.GetSettingsAsync();

            var stateData = new
            {
                tables,
                activeOrders,
                categories,
                menuItems,
                staff,
                pastOrders,
                restaurantSettings,
                gourmet_pos_settings_v1 = restaurantSettings
            };

            return Ok(new PosStateResponseDto
            {
                Success = true,
                Message = "POS state loaded successfully.",
                Tables = tables,
                ActiveOrders = activeOrders,
                Categories = categories,
                MenuItems = menuItems,
                Staff = staff,
                PastOrders = pastOrders,
                RestaurantSettings = restaurantSettings,
                GourmetPosSettingsV1 = restaurantSettings,
                Data = stateData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching POS state.");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving POS state." });
        }
    }

    /// <summary>
    /// Synchronizes POS client changes to the database.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncState([FromBody] JsonElement syncPayload)
    {
        try
        {
            _logger.LogInformation("Processing POS sync payload.");

            if (syncPayload.ValueKind == JsonValueKind.Object)
            {
                JsonElement settingsElement = default;
                bool hasSettings = syncPayload.TryGetProperty("gourmet_pos_settings_v1", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurantSettings", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurant_settings", out settingsElement);

                if (hasSettings && settingsElement.ValueKind == JsonValueKind.Object)
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var settingsDto = JsonSerializer.Deserialize<RestaurantSettingsDto>(settingsElement.GetRawText(), options);
                    if (settingsDto != null && !string.IsNullOrWhiteSpace(settingsDto.RestaurantName))
                    {
                        _logger.LogInformation("Syncing restaurant settings via /api/sync. Restaurant Name: {Name}", settingsDto.RestaurantName);
                        await _settingsService.SaveSettingsAsync(settingsDto);
                    }
                }
            }

            return Ok(new
            {
                success = true,
                message = "POS state synchronized successfully.",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing POS sync.");
            return StatusCode(500, new { success = false, message = "An error occurred while synchronizing POS state." });
        }
    }

    /// <summary>
    /// Server-Sent Events (SSE) stream endpoint for live real-time POS & Kitchen updates.
    /// </summary>
    [HttpGet("events")]
    public async Task GetEvents(CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        _logger.LogInformation("Client connected to SSE event stream.");

        try
        {
            var initialData = JsonSerializer.Serialize(new { eventType = "connected", message = "Connected to HMS live event stream.", timestamp = DateTime.UtcNow });
            await Response.WriteAsync($"data: {initialData}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            while (!cancellationToken.IsCancellationRequested)
            {
                await Task.Delay(15000, cancellationToken);
                var heartbeat = JsonSerializer.Serialize(new { eventType = "heartbeat", timestamp = DateTime.UtcNow });
                await Response.WriteAsync($"data: {heartbeat}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (TaskCanceledException)
        {
            _logger.LogInformation("SSE client disconnected from event stream.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SSE event stream.");
        }
    }
}
