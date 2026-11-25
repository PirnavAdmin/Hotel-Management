using System;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/settings/theme")]
[Route("api/settings/theme")]
[Route("api/v1/restaurant-settings/theme")]
[Produces("application/json")]
public sealed class RestaurantThemeColorController : ControllerBase
{
    private static readonly Regex HexColorPattern = new(@"^#[0-9a-fA-F]{6}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly RestaurantThemeColorService _themeService;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RestaurantThemeColorController> _logger;

    public RestaurantThemeColorController(
        RestaurantThemeColorService themeService,
        IRealtimeSyncService realtimeSync,
        IHubContext<PosHub> hubContext,
        ISseBroadcaster sseBroadcaster,
        AppDbContext db,
        IConfiguration configuration,
        ILogger<RestaurantThemeColorController> logger)
    {
        _themeService = themeService;
        _realtimeSync = realtimeSync;
        _hubContext = hubContext;
        _sseBroadcaster = sseBroadcaster;
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetTheme()
    {
        try
        {
            if (!HasStaffRole())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Staff authentication is required." });
            }

            if (!TryGetRestaurantId(out var restaurantId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "The authenticated account has no restaurant/branch context." });
            }

            var defaultColor = _configuration["ThemeSettings:DefaultAccentColor"]
                            ?? _configuration["DefaultTheme:AccentColor"]
                            ?? RestaurantThemeColorService.DefaultAccentColor;

            var saved = await _themeService.GetAsync(restaurantId);

            string? resolvedColor = saved?.AccentColor;
            if (string.IsNullOrWhiteSpace(resolvedColor))
            {
                var setting = await _db.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.RestaurantId == restaurantId.ToString() || s.Id == (int)restaurantId);
                if (!string.IsNullOrWhiteSpace(setting?.AccentColor))
                {
                    resolvedColor = setting.AccentColor;
                }
            }

            return Ok(new
            {
                success = true,
                data = new RestaurantThemeColorResponse
                {
                    RestaurantId = restaurantId,
                    AccentColor = resolvedColor ?? defaultColor,
                    CreatedAt = saved?.CreatedAt,
                    UpdatedAt = saved?.UpdatedAt,
                    UpdatedBy = saved?.UpdatedBy
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error retrieving restaurant theme color.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "An error occurred while retrieving restaurant theme.",
                error = ex.Message
            });
        }
    }

    [HttpPut]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateRestaurantThemeColorRequest? request)
    {
        try
        {
            if (!HasAdminRole())
            {
                _logger.LogWarning("Unauthorized theme update attempt by user '{User}'.", User.Identity?.Name);
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Only authorized Admin users can update the restaurant theme."
                });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.AccentColor))
            {
                return BadRequest(new { success = false, message = "accentColor is required." });
            }

            var accentColor = request.AccentColor.Trim();
            if (!HexColorPattern.IsMatch(accentColor))
            {
                return BadRequest(new { success = false, message = "accentColor must be a HEX value in #RRGGBB format." });
            }

            if (!TryGetRestaurantId(out var restaurantId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "The authenticated account has no restaurant/branch context." });
            }

            if (!TryGetUserId(out var adminId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "The authenticated Admin account has no valid user ID." });
            }

            _logger.LogInformation("Admin theme update received. RestaurantId={RestaurantId}, AdminId={AdminId}, AccentColor={AccentColor}", restaurantId, adminId, accentColor);
            var saved = await _themeService.SaveAsync(restaurantId, accentColor, adminId);
            _logger.LogInformation("Theme database transaction committed. RestaurantId={RestaurantId}, AccentColor={AccentColor}", restaurantId, saved.AccentColor);

            // Also keep restaurant_settings table in sync if it exists
            try
            {
                var rSetting = await _db.RestaurantSettings.FirstOrDefaultAsync(s => s.RestaurantId == restaurantId.ToString() || s.Id == (int)restaurantId);
                if (rSetting != null)
                {
                    rSetting.AccentColor = saved.AccentColor;
                    rSetting.UpdatedBy = adminId.ToString();
                    rSetting.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to secondary sync theme to restaurant_settings table for restaurant {RestaurantId}", restaurantId);
            }

            var eventData = new
            {
                restaurantId,
                accentColor = saved.AccentColor,
                updatedAt = saved.UpdatedAt,
                updatedBy = saved.UpdatedBy
            };

            // 1. Publish to RealtimeSyncService (for RealTimeProvider.jsx)
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "restaurantSetting:updated",
                Module = "Settings",
                Action = "updated",
                BranchId = restaurantId,
                RecordId = restaurantId.ToString(),
                TriggeredBy = adminId.ToString(),
                Data = eventData
            }, EventScope.Restaurant);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "RestaurantThemeUpdated",
                Module = "Settings",
                Action = "updated",
                BranchId = restaurantId,
                RecordId = restaurantId.ToString(),
                TriggeredBy = adminId.ToString(),
                Data = eventData
            }, EventScope.Restaurant);

            // 2. Broadcast via SignalR to restaurant group (PosHub)
            var primaryGroup = $"restaurant_{restaurantId}";
            await _hubContext.Clients.Group(primaryGroup).SendAsync("RestaurantThemeUpdated", eventData);

            // 3. Broadcast via SSE
            await _sseBroadcaster.BroadcastAsync("RestaurantThemeUpdated", eventData);

            return Ok(new
            {
                success = true,
                message = "Restaurant theme updated successfully",
                data = new RestaurantThemeColorResponse
                {
                    RestaurantId = restaurantId,
                    AccentColor = saved.AccentColor,
                    CreatedAt = saved.CreatedAt,
                    UpdatedAt = saved.UpdatedAt,
                    UpdatedBy = saved.UpdatedBy
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred in PUT settings/theme.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "An error occurred while updating the restaurant theme color.",
                error = ex.Message
            });
        }
    }

    private bool HasStaffRole()
    {
        var role = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return !string.IsNullOrWhiteSpace(role) && !string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase);
    }

    private bool HasAdminRole()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("roleName") ?? User.FindFirstValue("role");
        return User.IsInRole("Admin") ||
               User.IsInRole("admin") ||
               User.IsInRole("SuperAdmin") ||
               User.IsInRole("Super Admin") ||
               string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase);
    }

    private bool TryGetRestaurantId(out long restaurantId)
    {
        restaurantId = 0;
        var claim = User.FindFirstValue("branchId") 
                 ?? User.FindFirstValue("restaurantId") 
                 ?? User.FindFirstValue("branch_id") 
                 ?? User.FindFirstValue("restaurant_id");

        if (!string.IsNullOrWhiteSpace(claim))
        {
            var cleaned = claim.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (long.TryParse(cleaned, out restaurantId) && restaurantId > 0)
            {
                return true;
            }
        }

        // For Admin users with default context, resolve to branch 1
        if (HasAdminRole())
        {
            restaurantId = 1;
            return true;
        }

        return false;
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue("userId") 
                 ?? User.FindFirstValue(ClaimTypes.NameIdentifier) 
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirstValue("sub");

        if (!string.IsNullOrWhiteSpace(claim))
        {
            var cleaned = claim.Replace("user_", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (long.TryParse(cleaned, out userId) && userId > 0)
            {
                return true;
            }
        }

        if (HasAdminRole())
        {
            userId = 1;
            return true;
        }

        return false;
    }
}
