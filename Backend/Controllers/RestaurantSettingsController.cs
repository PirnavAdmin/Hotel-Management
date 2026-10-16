using System;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/restaurant-settings")]
[Route("api/restaurant-settings")]
public class RestaurantSettingsController : ControllerBase
{
    private readonly RestaurantSettingsService _settingsService;
    private readonly ILogger<RestaurantSettingsController> _logger;

    public RestaurantSettingsController(
        RestaurantSettingsService settingsService,
        ILogger<RestaurantSettingsController> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves saved restaurant settings & brand identity from MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        try
        {
            _logger.LogInformation("HTTP GET restaurant-settings received.");
            var settings = await _settingsService.GetSettingsAsync();

            return Ok(new
            {
                success = true,
                message = "Restaurant settings retrieved successfully.",
                data = settings
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred in GET restaurant-settings.");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while retrieving restaurant settings.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Updates restaurant details & brand identity in MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpPut]
    [HttpPost]
    public async Task<IActionResult> UpdateSettings([FromBody] RestaurantSettingsDto dto)
    {
        try
        {
            if (dto == null)
            {
                _logger.LogWarning("HTTP PUT restaurant-settings rejected: Request body is empty.");
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request payload. Settings data is required."
                });
            }

            if (string.IsNullOrWhiteSpace(dto.RestaurantName))
            {
                _logger.LogWarning("HTTP PUT restaurant-settings validation error: RestaurantName is missing.");
                return BadRequest(new
                {
                    success = false,
                    message = "Restaurant Name is required."
                });
            }

            _logger.LogInformation("HTTP PUT restaurant-settings: Updating restaurant name to '{RestaurantName}'", dto.RestaurantName.Trim());

            var savedSettings = await _settingsService.SaveSettingsAsync(dto);

            return Ok(new
            {
                success = true,
                message = "Restaurant settings saved successfully.",
                data = savedSettings
            });
        }
        catch (ArgumentException aex)
        {
            _logger.LogWarning(aex, "Validation failure in PUT restaurant-settings: {Message}", aex.Message);
            return BadRequest(new
            {
                success = false,
                message = aex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred in PUT restaurant-settings.");
            return StatusCode(500, new
            {
                success = false,
                message = "Failed to update restaurant settings in MySQL database.",
                error = ex.Message
            });
        }
    }
}
