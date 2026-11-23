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

[Authorize]
[ApiController]
[Route("api/v1/settings")]
[Route("api/settings")]
[Tags("Settings", "RestaurantTheme")]
public class SettingsController : ControllerBase
{
    private static readonly Regex HexColorRegex = new(@"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$", RegexOptions.Compiled);

    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(
        AppDbContext context,
        IConfiguration configuration,
        IHubContext<PosHub> hubContext,
        IRealtimeSyncService realtimeSync,
        ISseBroadcaster sseBroadcaster,
        ILogger<SettingsController> logger)
    {
        _context = context;
        _configuration = configuration;
        _hubContext = hubContext;
        _realtimeSync = realtimeSync;
        _sseBroadcaster = sseBroadcaster;
        _logger = logger;
    }

    /// <summary>
    /// Updates the global restaurant theme accent colour.
    /// Accessible only by authorized Admin users.
    /// Derives restaurantId strictly from authenticated user context.
    /// </summary>
    [HttpPut("theme")]
    [HttpPut("/api/v1/restaurant-settings/theme")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeColorDto dto)
    {
        try
        {
            // 1. Authorization: Only authorized Admin users can update the restaurant theme
            var role = User.FindFirstValue(ClaimTypes.Role)
                    ?? User.FindFirstValue("roleName")
                    ?? User.FindFirstValue("role");

            bool isAdmin = User.IsInRole("Admin") ||
                           string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
            {
                _logger.LogWarning("Unauthorized theme update attempt by user '{User}' with role '{Role}'.", User.Identity?.Name, role);
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Only authorized Admin users can update the restaurant theme."
                });
            }

            // 2. Payload & HEX Color Validation
            if (dto == null || string.IsNullOrWhiteSpace(dto.AccentColor))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Accent colour is required."
                });
            }

            var sanitizedColor = dto.AccentColor.Trim();
            if (!HexColorRegex.IsMatch(sanitizedColor))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid HEX colour format."
                });
            }

            // 3. Multi-Tenant Restaurant Identification
            var restaurantId = GetRestaurantIdFromContext();
            if (string.IsNullOrWhiteSpace(restaurantId))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Missing restaurant context."
                });
            }

            var updatedBy = GetUpdatedByFromContext();

            _logger.LogInformation("Updating theme accent colour for restaurant '{RestaurantId}' to '{AccentColor}' by '{UpdatedBy}'.",
                restaurantId, sanitizedColor, updatedBy);

            // 4. Persistence in Database (One active record per restaurant, avoid duplicates)
            var setting = await _context.RestaurantSettings
                .FirstOrDefaultAsync(s => s.RestaurantId == restaurantId);

            if (setting == null && int.TryParse(restaurantId.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase), out int numericId))
            {
                setting = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == numericId);
            }

            if (setting == null && (restaurantId == "restaurant_1" || restaurantId == "1"))
            {
                setting = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == 1);
            }

            if (setting == null)
            {
                setting = new RestaurantSetting
                {
                    RestaurantId = restaurantId,
                    RestaurantName = $"Restaurant {restaurantId}",
                    AccentColor = sanitizedColor,
                    UpdatedBy = updatedBy,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.RestaurantSettings.Add(setting);
            }
            else
            {
                setting.RestaurantId = restaurantId;
                setting.AccentColor = sanitizedColor;
                setting.UpdatedBy = updatedBy;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // 5. Real-Time Theme Synchronization
            // Broadcast restaurant-scoped event strictly to users belonging to this restaurant
            var eventPayload = new
            {
                restaurantId = restaurantId,
                accentColor = sanitizedColor
            };

            // 5a. Broadcast to primary restaurant SignalR group
            var primaryGroup = restaurantId.StartsWith("restaurant_", StringComparison.OrdinalIgnoreCase)
                ? restaurantId.ToLowerInvariant()
                : $"restaurant_{restaurantId.ToLowerInvariant()}";

            await _hubContext.Clients.Group(primaryGroup).SendAsync("RestaurantThemeUpdated", eventPayload);

            // If restaurantId maps to numeric branch, also broadcast to numeric group (e.g. restaurant_1)
            var numericPart = restaurantId.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase);
            if (long.TryParse(numericPart, out long branchNum))
            {
                if (primaryGroup != $"restaurant_{branchNum}")
                {
                    await _hubContext.Clients.Group($"restaurant_{branchNum}").SendAsync("RestaurantThemeUpdated", eventPayload);
                }
            }

            // 5b. Publish via IRealtimeSyncService
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "RestaurantThemeUpdated",
                Module = "Settings",
                Action = "updated",
                BranchId = branchNum > 0 ? branchNum : 1,
                RecordId = restaurantId,
                Data = eventPayload
            }, EventScope.Restaurant);

            // 5c. Broadcast via SSE for clients listening to SSE streams
            await _sseBroadcaster.BroadcastAsync("RestaurantThemeUpdated", eventPayload);

            // 6. Return Success Response
            return Ok(new
            {
                success = true,
                message = "Restaurant theme updated successfully",
                data = new
                {
                    restaurantId = restaurantId,
                    accentColor = sanitizedColor
                }
            });
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database update failure while updating theme colour.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Database update failure occurred while saving restaurant theme.",
                error = dbEx.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred in PUT settings/theme.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "An unexpected error occurred while updating restaurant theme.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Retrieves the saved restaurant-wide theme accent colour.
    /// Available to all authenticated users belonging to the restaurant.
    /// Returns the default accent colour if no custom colour has been configured.
    /// Always returns the theme belonging to the authenticated user's restaurant.
    /// </summary>
    [HttpGet("theme")]
    [HttpGet("/api/v1/restaurant-settings/theme")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetTheme()
    {
        try
        {
            // 1. Multi-Tenant Restaurant Identification
            var restaurantId = GetRestaurantIdFromContext();
            if (string.IsNullOrWhiteSpace(restaurantId))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Missing restaurant context."
                });
            }

            // 2. Fetch saved restaurant-wide accent colour
            var setting = await _context.RestaurantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.RestaurantId == restaurantId);

            if (setting == null && int.TryParse(restaurantId.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase), out int numericId))
            {
                setting = await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == numericId);
            }

            if (setting == null && (restaurantId == "restaurant_1" || restaurantId == "1"))
            {
                setting = await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);
            }

            // 3. Fallback to default accent colour if not configured (never hardcoded orange or green in backend code)
            string defaultAccentColor = _configuration["ThemeSettings:DefaultAccentColor"]
                                     ?? _configuration["DefaultTheme:AccentColor"]
                                     ?? "#3b82f6";

            string accentColor = !string.IsNullOrWhiteSpace(setting?.AccentColor)
                ? setting.AccentColor
                : defaultAccentColor;

            return Ok(new
            {
                success = true,
                data = new
                {
                    accentColor = accentColor
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred in GET settings/theme.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "An error occurred while retrieving restaurant theme.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Derives the restaurant identifier solely from the authenticated user context.
    /// Never trusts client-supplied parameters for tenant resolution.
    /// </summary>
    private string? GetRestaurantIdFromContext()
    {
        // 1. Check direct restaurantId claim
        var restaurantClaim = User.FindFirstValue("restaurantId")
                           ?? User.FindFirstValue("restaurant_id");

        if (!string.IsNullOrWhiteSpace(restaurantClaim))
        {
            return restaurantClaim;
        }

        // 2. Check branchId / outlet claims
        var branchClaim = User.FindFirstValue("branchId")
                       ?? User.FindFirstValue("branch_id")
                       ?? User.FindFirstValue("outlet_id");

        if (!string.IsNullOrWhiteSpace(branchClaim))
        {
            return branchClaim.StartsWith("restaurant_", StringComparison.OrdinalIgnoreCase)
                ? branchClaim
                : $"restaurant_{branchClaim}";
        }

        return null;
    }

    /// <summary>
    /// Derives the user identifier from the authenticated context for auditing.
    /// </summary>
    private string GetUpdatedByFromContext()
    {
        var userId = User.FindFirstValue("userId")
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            return userId;
        }

        var username = User.FindFirstValue(ClaimTypes.Name)
                    ?? User.FindFirstValue(ClaimTypes.Email)
                    ?? User.Identity?.Name;

        return !string.IsNullOrWhiteSpace(username) ? username : "admin";
    }
}
