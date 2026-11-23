using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/settings/theme")]
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

    [HttpPut]
    [Authorize(Roles = "Admin,SuperAdmin,Super Admin")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(typeof(object), 400)]
    [ProducesResponseType(typeof(object), 401)]
    [ProducesResponseType(typeof(object), 403)]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateRestaurantThemeColorRequest? request)
    {
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
        _logger.LogInformation("Theme event dispatch requested. RestaurantId={RestaurantId}, Group={GroupName}, AccentColor={AccentColor}", restaurantId, $"restaurant_{restaurantId}", saved.AccentColor);

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

    private bool HasStaffRole()
    {
        var role = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role);
        return !string.IsNullOrWhiteSpace(role) && !string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase);
    }

    private bool TryGetRestaurantId(out long restaurantId)
    {
        var claim = User.FindFirstValue("branchId") ?? User.FindFirstValue("restaurantId");
        return long.TryParse(claim, out restaurantId) && restaurantId > 0;
    }

    private bool TryGetUserId(out long userId)
    {
        var claim = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(claim, out userId) && userId > 0;
    }
}
