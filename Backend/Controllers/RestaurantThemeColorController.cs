using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/settings/theme")]
[Route("api/settings/theme")]
[Route("api/v1/restaurant-settings/theme")]
[Produces("application/json")]
public sealed class RestaurantThemeColorController : ControllerBase
{
    private readonly RestaurantThemeColorService _themeService;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly ILogger<RestaurantThemeColorController> _logger;

    public RestaurantThemeColorController(
        RestaurantThemeColorService themeService,
        IRealtimeSyncService realtimeSync,
        ILogger<RestaurantThemeColorController> logger)
    {
        _themeService = themeService;
        _realtimeSync = realtimeSync;
        _logger = logger;
    }

    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(typeof(object), 401)]
    [ProducesResponseType(typeof(object), 403)]
    public async Task<IActionResult> GetTheme()
    {
        try
        {
            if (!HasStaffRole())
            {
                return StatusCode(403, new { success = false, message = "Staff authentication is required." });
            }

            if (!TryGetRestaurantId(out var restaurantId))
            {
                return StatusCode(403, new { success = false, message = "The authenticated account has no restaurant/branch context." });
            }

            var saved = await _themeService.GetAsync(restaurantId);
            return Ok(new
            {
                success = true,
                data = new RestaurantThemeColorResponse
                {
                    RestaurantId = restaurantId,
                    AccentColor = saved?.AccentColor ?? RestaurantThemeColorService.DefaultAccentColor,
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
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(typeof(object), 400)]
    [ProducesResponseType(typeof(object), 401)]
    [ProducesResponseType(typeof(object), 403)]
    [ProducesResponseType(typeof(object), 500)]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateRestaurantThemeColorRequest? request)
    {
        try
        {
            if (!IsAdmin())
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
            if (!System.Text.RegularExpressions.Regex.IsMatch(accentColor, "^#[0-9a-fA-F]{6}$", System.Text.RegularExpressions.RegexOptions.CultureInvariant))
            {
                return BadRequest(new { success = false, message = "accentColor must be a HEX value in #RRGGBB format." });
            }

            if (!TryGetRestaurantId(out var restaurantId))
            {
                return StatusCode(403, new { success = false, message = "The authenticated account has no restaurant/branch context." });
            }

            if (!TryGetUserId(out var adminId))
            {
                return StatusCode(403, new { success = false, message = "The authenticated Admin account has no valid user ID." });
            }

            _logger.LogInformation("Admin theme update received. RestaurantId={RestaurantId}, AdminId={AdminId}, AccentColor={AccentColor}", restaurantId, adminId, accentColor);
            var saved = await _themeService.SaveAsync(restaurantId, accentColor, adminId);
            _logger.LogInformation("Theme database transaction committed. RestaurantId={RestaurantId}, AccentColor={AccentColor}", restaurantId, saved.AccentColor);

            var eventData = new
            {
                restaurantId,
                accentColor = saved.AccentColor,
                updatedAt = saved.UpdatedAt,
                updatedBy = saved.UpdatedBy
            };

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

            _logger.LogInformation("Theme event dispatch requested. RestaurantId={RestaurantId}, AccentColor={AccentColor}", restaurantId, saved.AccentColor);

            return Ok(new
            {
                success = true,
                message = "Restaurant theme color saved successfully.",
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

    private bool IsAdmin()
    {
        var role = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return User.IsInRole("Admin") ||
               User.IsInRole("SuperAdmin") ||
               User.IsInRole("Super Admin") ||
               string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase);
    }

    private bool HasStaffRole()
    {
        var role = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return !string.IsNullOrWhiteSpace(role) && !string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase);
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
            var sanitized = claim.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (long.TryParse(sanitized, out restaurantId) && restaurantId > 0)
            {
                return true;
            }
        }

        // For Admin users with default context, resolve to branch 1
        if (IsAdmin())
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
                 ?? User.FindFirstValue("sub");

        if (long.TryParse(claim, out userId) && userId > 0)
        {
            return true;
        }

        if (IsAdmin())
        {
            userId = 1;
            return true;
        }

        return false;
    }
}
