using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class MenuItemService
{
    private readonly SpService _spService;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MenuItemService> _logger;

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] AllowedContentTypes = { "image/jpeg", "image/png", "image/webp", "image/pjpeg", "image/x-png" };
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    public MenuItemService(SpService spService, IWebHostEnvironment environment, ILogger<MenuItemService> logger)
    {
        _spService = spService;
        _environment = environment;
        _logger = logger;
    }

    public async Task<List<MenuItemResponseDto>> GetMenuItemsAsync(string? search = null, string? category = null, string? dietaryType = null, bool? isSpecial = null)
    {
        var parameters = new Dictionary<string, object?>
        {
            { "p_search", search },
            { "p_category", category },
            { "p_dietary_type", dietaryType }
        };

        var items = await _spService.ExecuteQueryAsync("sp_GetMenuItems", MapFromReader, parameters);

        if (isSpecial.HasValue)
        {
            items = items.Where(x => x.IsChefsSpecial == isSpecial.Value).ToList();
        }

        return items;
    }

    public async Task<MenuItemResponseDto?> GetMenuItemByIdAsync(long id)
    {
        var parameters = new Dictionary<string, object?> { { "p_menu_item_id", id } };
        var items = await _spService.ExecuteQueryAsync("sp_GetMenuItemById", MapFromReader, parameters);
        return items.Count > 0 ? items[0] : null;
    }

    public async Task<MenuItemResponseDto> CreateMenuItemAsync(CreateMenuItemDto dto)
    {
        _logger.LogInformation("Creating menu item: {DishName}, Category: {Category}", dto.DishName, dto.Category);

        var finalImageUrl = ProcessImageUrl(dto.ImageUrl);

        var parameters = new Dictionary<string, object?>
        {
            { "p_dish_name", dto.DishName.Trim() },
            { "p_category", dto.Category.Trim() },
            { "p_price", dto.Price },
            { "p_dietary_type", dto.DietaryType.Trim().ToUpper() },
            { "p_spice_level", dto.SpiceLevel },
            { "p_prep_time_minutes", dto.PrepTimeMinutes ?? 15 },
            { "p_short_description", dto.ShortDescription?.Trim() },
            { "p_image_url", finalImageUrl },
            { "p_is_chefs_special", dto.IsChefsSpecial ? 1 : 0 },
            { "p_is_available", dto.IsAvailable ? 1 : 0 }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreateMenuItem", parameters);
        _logger.LogInformation("Menu item created with ID: {Id}, ImageUrl: {ImageUrl}", id, finalImageUrl);

        return (await GetMenuItemByIdAsync(id))!;
    }

    public async Task<MenuItemResponseDto?> UpdateMenuItemAsync(long id, UpdateMenuItemDto dto)
    {
        _logger.LogInformation("Updating menu item ID: {Id}, DishName: {DishName}", id, dto.DishName);

        var existing = await GetMenuItemByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("Update failed: Menu item ID {Id} not found.", id);
            return null;
        }

        // If a new image URL is provided (either a real URL or base64), process it;
        // if empty or null, retain the existing saved image URL so images are not lost on edit.
        var finalImageUrl = !string.IsNullOrWhiteSpace(dto.ImageUrl)
            ? ProcessImageUrl(dto.ImageUrl)
            : existing.ImageUrl;

        var parameters = new Dictionary<string, object?>
        {
            { "p_menu_item_id", id },
            { "p_dish_name", dto.DishName.Trim() },
            { "p_category", dto.Category.Trim() },
            { "p_price", dto.Price },
            { "p_dietary_type", dto.DietaryType.Trim().ToUpper() },
            { "p_spice_level", dto.SpiceLevel },
            { "p_prep_time_minutes", dto.PrepTimeMinutes ?? 15 },
            { "p_short_description", dto.ShortDescription?.Trim() },
            { "p_image_url", finalImageUrl },
            { "p_is_chefs_special", dto.IsChefsSpecial ? 1 : 0 },
            { "p_is_available", dto.IsAvailable ? 1 : 0 }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateMenuItem", parameters);
        _logger.LogInformation("Menu item ID {Id} updated successfully. Final ImageUrl: {ImageUrl}", id, finalImageUrl);

        return await GetMenuItemByIdAsync(id);
    }

    public async Task<bool> DeleteMenuItemAsync(long id)
    {
        var existing = await GetMenuItemByIdAsync(id);
        if (existing == null) return false;

        var parameters = new Dictionary<string, object?> { { "p_menu_item_id", id } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteMenuItem", parameters);
        _logger.LogInformation("Menu item ID {Id} marked as deleted.", id);
        return true;
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _spService.ExecuteQueryAsync("sp_GetMenuCategories", reader => reader.GetString(0));
    }

    public async Task<MenuCategory> CreateCategoryAsync(CreateCategoryRequest request)
    {
        var category = new MenuCategory
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            DisplayOrder = request.DisplayOrder
        };

        var parameters = new Dictionary<string, object?>
        {
            { "p_id", category.Id.ToString() },
            { "p_name", category.Name },
            { "p_display_order", category.DisplayOrder }
        };

        await _spService.ExecuteNonQueryAsync("sp_CreateMenuCategory", parameters);
        _logger.LogInformation("Menu category created: {CategoryName}", category.Name);
        return category;
    }

    public async Task<MenuItemResponseDto?> ToggleAvailabilityAsync(long id, bool isAvailable)
    {
        var existing = await GetMenuItemByIdAsync(id);
        if (existing == null) return null;

        var parameters = new Dictionary<string, object?>
        {
            { "p_menu_item_id", id },
            { "p_is_available", isAvailable ? 1 : 0 }
        };

        await _spService.ExecuteNonQueryAsync("sp_ToggleMenuItemAvailability", parameters);
        _logger.LogInformation("Menu item ID {Id} availability updated to {IsAvailable}.", id, isAvailable);
        return await GetMenuItemByIdAsync(id);
    }

    public async Task<List<MenuItemResponseDto>> GetSpecialMenuItemsAsync(string? category = null, long? branchId = null)
    {
        _logger.LogInformation("Fetching special menu items. Category: {Category}, BranchId: {BranchId}", category, branchId);
        var parameters = new Dictionary<string, object?>
        {
            { "p_category", category },
            { "p_branch_id", branchId }
        };

        try
        {
            return await _spService.ExecuteQueryAsync("sp_GetSpecialMenuItems", MapFromReader, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "sp_GetSpecialMenuItems execution failed, falling back to GetMenuItemsAsync with filtering.");
            var allItems = await GetMenuItemsAsync(category: category);
            return allItems.Where(i => i.IsChefsSpecial && i.IsAvailable).ToList();
        }
    }

    public async Task<MenuItemResponseDto?> ToggleSpecialStatusAsync(long id, bool isSpecial)
    {
        _logger.LogInformation("Updating special status for menu item ID {Id} to {IsSpecial}", id, isSpecial);
        var existing = await GetMenuItemByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("Cannot toggle special status: Menu item ID {Id} not found.", id);
            return null;
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_menu_item_id", id },
            { "p_is_chefs_special", isSpecial ? 1 : 0 }
        };

        await _spService.ExecuteNonQueryAsync("sp_ToggleMenuItemSpecialStatus", parameters);
        _logger.LogInformation("Menu item ID {Id} special status successfully updated to {IsSpecial}.", id, isSpecial);

        return await GetMenuItemByIdAsync(id);
    }

    /// <summary>
    /// Validates and saves an uploaded image file to wwwroot/uploads and returns the relative URL.
    /// </summary>
    public async Task<ImageUploadResponseDto> SaveUploadedImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No file was provided for upload.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException($"File size ({file.Length / (1024 * 1024):F2} MB) exceeds maximum allowed size of 5 MB.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
        {
            throw new ArgumentException($"Unsupported image extension '{ext}'. Allowed extensions are: JPG, JPEG, PNG, and WebP.");
        }

        var contentType = file.ContentType?.ToLowerInvariant() ?? string.Empty;
        if (!AllowedContentTypes.Contains(contentType))
        {
            throw new ArgumentException($"Invalid Content-Type '{contentType}'. Allowed types are JPG, JPEG, PNG, and WebP.");
        }

        // Validate image magic numbers to prevent malicious uploads
        await ValidateImageSignatureAsync(file, ext);

        var uploadsFolder = GetUploadsFolderPath();
        var uniqueFileName = $"menu_{Guid.NewGuid():N}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/{uniqueFileName}";
        _logger.LogInformation("Successfully saved uploaded image to {Path}. Relative URL: {Url}", filePath, relativeUrl);

        return new ImageUploadResponseDto
        {
            Success = true,
            Message = "Image uploaded successfully.",
            ImageUrl = relativeUrl,
            FileName = uniqueFileName,
            FileSizeBytes = file.Length
        };
    }

    /// <summary>
    /// Processes ImageUrl. If Base64 string is received, decodes and saves it to disk so DB stays clean.
    /// </summary>
    public string? ProcessImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return null;
        }

        var trimmed = imageUrl.Trim();

        // Check if string is a Base64 data URL
        if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var commaIdx = trimmed.IndexOf(',');
                if (commaIdx > 0)
                {
                    var header = trimmed.Substring(0, commaIdx);
                    var base64Data = trimmed.Substring(commaIdx + 1).Trim();

                    var ext = "png";
                    if (header.IndexOf("jpeg", StringComparison.OrdinalIgnoreCase) >= 0 || header.IndexOf("jpg", StringComparison.OrdinalIgnoreCase) >= 0)
                        ext = "jpg";
                    else if (header.IndexOf("webp", StringComparison.OrdinalIgnoreCase) >= 0)
                        ext = "webp";
                    else if (header.IndexOf("gif", StringComparison.OrdinalIgnoreCase) >= 0)
                        ext = "gif";

                    var bytes = Convert.FromBase64String(base64Data);
                    if (bytes.Length <= MaxFileSizeBytes)
                    {
                        var uploadsFolder = GetUploadsFolderPath();
                        var uniqueFileName = $"menu_base64_{Guid.NewGuid():N}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.{ext}";
                        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                        File.WriteAllBytes(filePath, bytes);
                        var savedUrl = $"/uploads/{uniqueFileName}";
                        _logger.LogInformation("Converted Base64 payload into disk image file {Path}. Saved URL: {Url}", filePath, savedUrl);
                        return savedUrl;
                    }
                    else
                    {
                        _logger.LogWarning("Base64 image size exceeds maximum permitted 5MB.");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decode and save incoming Base64 image data.");
            }

            return null; // Don't pass massive base64 string to database
        }

        if (trimmed.Length > 500)
        {
            return trimmed.Substring(0, 500);
        }

        return trimmed;
    }

    private string GetUploadsFolderPath()
    {
        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }
        var uploads = Path.Combine(root, "uploads");
        if (!Directory.Exists(uploads))
        {
            Directory.CreateDirectory(uploads);
        }
        return uploads;
    }

    private static async Task ValidateImageSignatureAsync(IFormFile file, string ext)
    {
        using var stream = file.OpenReadStream();
        var header = new byte[12];
        int bytesRead = await stream.ReadAsync(header, 0, header.Length);
        if (bytesRead < 4)
        {
            throw new ArgumentException("The uploaded file header is invalid or corrupt.");
        }

        // JPEG: FF D8 FF
        if (ext is ".jpg" or ".jpeg")
        {
            if (header[0] != 0xFF || header[1] != 0xD8 || header[2] != 0xFF)
            {
                throw new ArgumentException("The file is not a valid JPEG image.");
            }
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        else if (ext == ".png")
        {
            if (header[0] != 0x89 || header[1] != 0x50 || header[2] != 0x4E || header[3] != 0x47)
            {
                throw new ArgumentException("The file is not a valid PNG image.");
            }
        }
        // WebP: RIFF ... WEBP
        else if (ext == ".webp")
        {
            if (bytesRead < 12 ||
                header[0] != 0x52 || header[1] != 0x49 || header[2] != 0x46 || header[3] != 0x46 || // RIFF
                header[8] != 0x57 || header[9] != 0x45 || header[10] != 0x42 || header[11] != 0x50)   // WEBP
            {
                throw new ArgumentException("The file is not a valid WebP image.");
            }
        }
    }

    private static MenuItemResponseDto MapFromReader(DbDataReader reader)
    {
        return new MenuItemResponseDto
        {
            MenuItemId = reader.GetInt64(reader.GetOrdinal("menu_item_id")),
            DishName = reader.GetString(reader.GetOrdinal("dish_name")),
            Category = reader.GetString(reader.GetOrdinal("category")),
            Price = reader.GetDecimal(reader.GetOrdinal("price")),
            DietaryType = reader.GetString(reader.GetOrdinal("dietary_type")),
            SpiceLevel = reader.GetInt32(reader.GetOrdinal("spice_level")),
            PrepTimeMinutes = reader.IsDBNull(reader.GetOrdinal("prep_time_minutes")) ? 15 : reader.GetInt32(reader.GetOrdinal("prep_time_minutes")),
            ShortDescription = reader.IsDBNull(reader.GetOrdinal("short_description")) ? null : reader.GetString(reader.GetOrdinal("short_description")),
            ImageUrl = reader.IsDBNull(reader.GetOrdinal("image_url")) ? null : reader.GetString(reader.GetOrdinal("image_url")),
            IsChefsSpecial = reader.GetBoolean(reader.GetOrdinal("is_chefs_special")),
            IsAvailable = reader.GetBoolean(reader.GetOrdinal("is_available")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }
}
