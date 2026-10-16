using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/menu-items")]
[Route("api/Menu")]
public class MenuItemsController : ControllerBase
{
    private readonly MenuItemService _menuItemService;
    private readonly ILogger<MenuItemsController> _logger;

    public MenuItemsController(MenuItemService menuItemService, ILogger<MenuItemsController> logger)
    {
        _menuItemService = menuItemService;
        _logger = logger;
    }

    // POST /api/v1/menu-items/upload-image or /api/v1/menu-items/upload or /api/Menu/upload-image or /api/Menu/upload
    [AllowAnonymous]
    [HttpPost("upload-image")]
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage([FromForm] ImageUploadDto dto)
    {
        _logger.LogInformation("Received request to upload menu item image.");

        var file = dto?.File ?? dto?.Image ?? Request.Form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
        {
            _logger.LogWarning("Image upload rejected: No file provided.");
            return BadRequest(new { success = false, message = "Please select a valid image file (JPG, JPEG, PNG, or WebP)." });
        }

        try
        {
            var result = await _menuItemService.SaveUploadedImageAsync(file);

            // Dynamically construct full public URL based on the current request host and scheme
            var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
            var fullUrl = $"{baseUrl}{result.ImageUrl}";

            _logger.LogInformation("Image successfully uploaded: {FileName}. Full URL: {Url}", result.FileName, fullUrl);

            return Ok(new
            {
                success = true,
                message = "Image uploaded successfully.",
                imageUrl = result.ImageUrl,
                url = fullUrl,
                fileName = result.FileName,
                fileSizeBytes = result.FileSizeBytes
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Image upload validation failed: {Message}", ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while uploading image.");
            return StatusCode(500, new { success = false, message = "An error occurred while uploading image. Please try again." });
        }
    }

    // GET /api/v1/menu-items or /api/Menu
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetMenuItems(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? dietaryType,
        [FromQuery] bool? isSpecial)
    {
        try
        {
            var items = await _menuItemService.GetMenuItemsAsync(search, category, dietaryType, isSpecial);
            return Ok(new
            {
                success = true,
                message = "Menu items retrieved successfully.",
                count = items.Count,
                menuItems = items,
                data = items
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve menu items.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve menu items.", error = ex.Message });
        }
    }

    // GET /api/v1/menu-items/specials or /api/menu-items/specials or /api/Menu/specials
    [AllowAnonymous]
    [HttpGet("specials")]
    [HttpGet("/api/menu-items/specials")]
    [HttpGet("/api/Menu/specials")]
    public async Task<IActionResult> GetSpecialMenuItems([FromQuery] string? category, [FromQuery] long? branchId)
    {
        _logger.LogInformation("Retrieving special menu items. Category: {Category}, BranchId: {BranchId}", category, branchId);
        try
        {
            var specials = await _menuItemService.GetSpecialMenuItemsAsync(category, branchId);
            return Ok(new
            {
                success = true,
                message = "Special menu items retrieved successfully.",
                count = specials.Count,
                menuItems = specials,
                data = specials
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve special menu items.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve special menu items.", error = ex.Message });
        }
    }

    // GET /api/v1/menu-items/categories or /api/Menu/categories
    [AllowAnonymous]
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var categories = await _menuItemService.GetCategoriesAsync();
            return Ok(new
            {
                success = true,
                data = categories
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve menu categories.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve categories.", error = ex.Message });
        }
    }

    // POST /api/v1/menu-items/categories or /api/Menu/categories
    [AllowAnonymous]
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Invalid category data.", errors = ModelState });
        }

        try
        {
            var created = await _menuItemService.CreateCategoryAsync(request);
            return Ok(new
            {
                success = true,
                message = "Category created successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create category: {CategoryName}", request.Name);
            return StatusCode(500, new { success = false, message = "Failed to create category.", error = ex.Message });
        }
    }

    // GET /api/v1/menu-items/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMenuItemById(long id)
    {
        try
        {
            var item = await _menuItemService.GetMenuItemByIdAsync(id);
            if (item == null)
            {
                return NotFound(new { success = false, message = $"Menu item with ID {id} not found." });
            }
            return Ok(new { success = true, data = item });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve menu item by ID: {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to retrieve menu item.", error = ex.Message });
        }
    }

    // POST /api/v1/menu-items or /api/Menu/items
    [AllowAnonymous]
    [HttpPost]
    [HttpPost("items")]
    public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state on CreateMenuItem: {Errors}", ModelState);
            return BadRequest(new { success = false, message = "Invalid menu item data.", errors = ModelState });
        }

        try
        {
            var created = await _menuItemService.CreateMenuItemAsync(dto);
            return CreatedAtAction(nameof(GetMenuItemById), new { id = created.MenuItemId }, new
            {
                success = true,
                message = "Menu item created successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating menu item: {DishName}", dto.DishName);
            return StatusCode(500, new { success = false, message = "Failed to create menu item.", error = ex.Message });
        }
    }

    // PUT /api/v1/menu-items/{id} or /api/Menu/items/{id}
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    [HttpPut("items/{id:long}")]
    public async Task<IActionResult> UpdateMenuItem(long id, [FromBody] UpdateMenuItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state on UpdateMenuItem for ID {Id}: {Errors}", id, ModelState);
            return BadRequest(new { success = false, message = "Invalid menu item data.", errors = ModelState });
        }

        try
        {
            var updated = await _menuItemService.UpdateMenuItemAsync(id, dto);
            if (updated == null)
            {
                return NotFound(new { success = false, message = $"Menu item with ID {id} not found." });
            }
            return Ok(new
            {
                success = true,
                message = "Menu item updated successfully.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating menu item ID {Id}: {DishName}", id, dto.DishName);
            return StatusCode(500, new { success = false, message = "Failed to update menu item.", error = ex.Message });
        }
    }

    // PATCH /api/v1/menu-items/{id}/availability or /api/Menu/items/{id}/availability
    [AllowAnonymous]
    [HttpPatch("{id:long}/availability")]
    [HttpPatch("items/{id:long}/availability")]
    public async Task<IActionResult> ToggleAvailability(long id, [FromBody] ToggleAvailabilityRequest request)
    {
        try
        {
            var updated = await _menuItemService.ToggleAvailabilityAsync(id, request.IsAvailable);
            if (updated == null)
            {
                return NotFound(new { success = false, message = $"Menu item with ID {id} not found." });
            }
            return Ok(new
            {
                success = true,
                message = $"Availability for menu item {id} updated to {request.IsAvailable}.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling availability for menu item ID {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to update availability.", error = ex.Message });
        }
    }

    // PATCH /api/v1/menu-items/{id}/special-status or /api/menu-items/{id}/special-status or /api/Menu/items/{id}/special-status
    [AllowAnonymous]
    [HttpPatch("{id:long}/special-status")]
    [HttpPatch("items/{id:long}/special-status")]
    [HttpPatch("/api/menu-items/{id:long}/special-status")]
    public async Task<IActionResult> ToggleSpecialStatus(long id, [FromBody] ToggleSpecialStatusRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, message = "Request body is required." });
        }

        var targetStatus = request.GetFinalStatus();
        _logger.LogInformation("Request to toggle special status for menu item ID {Id} to {Status}", id, targetStatus);

        try
        {
            var updated = await _menuItemService.ToggleSpecialStatusAsync(id, targetStatus);
            if (updated == null)
            {
                _logger.LogWarning("Menu item ID {Id} not found when toggling special status.", id);
                return NotFound(new { success = false, message = $"Menu item with ID {id} not found." });
            }

            return Ok(new
            {
                success = true,
                message = $"Special status for menu item {id} updated to {targetStatus}.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling special status for menu item ID {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to update special status.", error = ex.Message });
        }
    }

    // DELETE /api/v1/menu-items/{id} or /api/Menu/items/{id}
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    [HttpDelete("items/{id:long}")]
    public async Task<IActionResult> DeleteMenuItem(long id)
    {
        try
        {
            var success = await _menuItemService.DeleteMenuItemAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = $"Menu item with ID {id} not found." });
            }
            return Ok(new { success = true, message = "Menu item deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting menu item ID {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete menu item.", error = ex.Message });
        }
    }
}
