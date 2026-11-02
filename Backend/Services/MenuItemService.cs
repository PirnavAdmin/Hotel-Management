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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class MenuItemService
{
    private readonly SpService _spService;
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MenuItemService> _logger;

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] AllowedContentTypes = { "image/jpeg", "image/png", "image/webp", "image/pjpeg", "image/x-png" };
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    public MenuItemService(SpService spService, AppDbContext context, IWebHostEnvironment environment, ILogger<MenuItemService> logger)
    {
        _spService = spService;
        _context = context;
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
        var trimmedName = dto.DishName.Trim();
        var trimmedCat = dto.Category.Trim();
        bool isDrink = DrinkCategoryHelper.IsDrinkCategory(trimmedCat, dto.DrinkType, dto.IsBarItem ?? false);

        string? finalDrinkType = dto.DrinkType;
        if (isDrink && string.IsNullOrWhiteSpace(finalDrinkType))
        {
            finalDrinkType = DrinkCategoryHelper.IsAlcoholicCategory(trimmedCat, null, dto.AlcoholPct) ? "Alcoholic" : "Non-Alcoholic";
        }

        decimal? finalAbv = dto.AlcoholPct;
        if (isDrink && !finalAbv.HasValue)
        {
            if (finalDrinkType == "Alcoholic")
            {
                var lowerCat = trimmedCat.ToLowerInvariant();
                if (lowerCat.Contains("beer")) finalAbv = 5.0m;
                else if (lowerCat.Contains("wine")) finalAbv = 12.0m;
                else finalAbv = 40.0m;
            }
            else
            {
                finalAbv = 0.0m;
            }
        }

        string? finalMeasure = dto.ServingMeasure;
        if (isDrink && string.IsNullOrWhiteSpace(finalMeasure))
        {
            var lowerCat = trimmedCat.ToLowerInvariant();
            if (lowerCat.Contains("beer")) finalMeasure = "330 ml (Pint)";
            else if (lowerCat.Contains("wine")) finalMeasure = "Glass (150 ml)";
            else if (lowerCat.Contains("tea") || lowerCat.Contains("coffee")) finalMeasure = "Cup (150 ml)";
            else if (finalDrinkType == "Alcoholic") finalMeasure = "30 ml (Single Peg)";
            else finalMeasure = "Glass (250 ml)";
        }

        var finalDietaryType = DrinkCategoryHelper.NormalizeDietaryType(dto.DietaryType, trimmedCat, finalDrinkType, isDrink, dto.IsVeg, finalAbv);
        var finalImageUrl = ProcessImageUrl(dto.ImageUrl);

        _logger.LogInformation("Creating menu item: {DishName}, Category: {Category}, DietaryType: {DietaryType}, IsDrink: {IsDrink}", trimmedName, trimmedCat, finalDietaryType, isDrink);

        // Requirement 6: Prevent duplicate records by matching dish_name (case-insensitive)
        var existing = await _context.MenuItems.FirstOrDefaultAsync(m => m.DeletedAt == null && m.DishName.ToLower() == trimmedName.ToLower());
        if (existing != null)
        {
            _logger.LogInformation("Item '{DishName}' already exists (ID: {Id}). Synchronizing existing record to prevent duplicate.", trimmedName, existing.MenuItemId);
            existing.DishName = trimmedName;
            existing.Category = trimmedCat;
            existing.Price = dto.Price;
            existing.DietaryType = finalDietaryType;
            existing.SpiceLevel = dto.SpiceLevel;
            existing.PrepTimeMinutes = dto.PrepTimeMinutes ?? 15;
            existing.ShortDescription = dto.ShortDescription?.Trim();
            if (!string.IsNullOrWhiteSpace(finalImageUrl))
            {
                existing.ImageUrl = finalImageUrl;
            }
            existing.IsChefsSpecial = dto.IsChefsSpecial;
            existing.IsAvailable = dto.IsAvailable;
            existing.IsBarItem = isDrink;
            existing.DrinkType = isDrink ? finalDrinkType : null;
            existing.AlcoholPct = isDrink ? finalAbv : null;
            existing.ServingMeasure = isDrink ? finalMeasure : null;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return (await GetMenuItemByIdAsync(existing.MenuItemId))!;
        }

        var entity = new MenuItem
        {
            DishName = trimmedName,
            Category = trimmedCat,
            Price = dto.Price,
            DietaryType = finalDietaryType,
            SpiceLevel = dto.SpiceLevel,
            PrepTimeMinutes = dto.PrepTimeMinutes ?? 15,
            ShortDescription = dto.ShortDescription?.Trim(),
            ImageUrl = finalImageUrl,
            IsChefsSpecial = dto.IsChefsSpecial,
            IsAvailable = dto.IsAvailable,
            IsBarItem = isDrink,
            DrinkType = isDrink ? finalDrinkType : null,
            AlcoholPct = isDrink ? finalAbv : null,
            ServingMeasure = isDrink ? finalMeasure : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MenuItems.Add(entity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Menu item created with ID: {Id}, DietaryType: {DietaryType}, IsBarItem: {IsBarItem}", entity.MenuItemId, finalDietaryType, isDrink);
        return (await GetMenuItemByIdAsync(entity.MenuItemId))!;
    }

    public async Task<MenuItemResponseDto?> UpdateMenuItemAsync(long id, UpdateMenuItemDto dto)
    {
        _logger.LogInformation("Updating menu item ID: {Id}, DishName: {DishName}", id, dto.DishName);

        var existing = await _context.MenuItems.FirstOrDefaultAsync(m => m.MenuItemId == id && m.DeletedAt == null);
        if (existing == null)
        {
            _logger.LogWarning("Update failed: Menu item ID {Id} not found.", id);
            return null;
        }

        var trimmedName = dto.DishName.Trim();
        var trimmedCat = dto.Category.Trim();
        bool isDrink = DrinkCategoryHelper.IsDrinkCategory(trimmedCat, dto.DrinkType, dto.IsBarItem ?? false);

        string? finalDrinkType = dto.DrinkType;
        if (isDrink && string.IsNullOrWhiteSpace(finalDrinkType))
        {
            finalDrinkType = DrinkCategoryHelper.IsAlcoholicCategory(trimmedCat, existing.DrinkType, dto.AlcoholPct ?? existing.AlcoholPct) ? "Alcoholic" : "Non-Alcoholic";
        }

        decimal? finalAbv = dto.AlcoholPct ?? (isDrink ? existing.AlcoholPct : null);
        if (isDrink && !finalAbv.HasValue)
        {
            if (finalDrinkType == "Alcoholic")
            {
                var lowerCat = trimmedCat.ToLowerInvariant();
                if (lowerCat.Contains("beer")) finalAbv = 5.0m;
                else if (lowerCat.Contains("wine")) finalAbv = 12.0m;
                else finalAbv = 40.0m;
            }
            else
            {
                finalAbv = 0.0m;
            }
        }

        string? finalMeasure = !string.IsNullOrWhiteSpace(dto.ServingMeasure) ? dto.ServingMeasure.Trim() : (isDrink ? existing.ServingMeasure : null);
        var finalDietaryType = DrinkCategoryHelper.NormalizeDietaryType(dto.DietaryType, trimmedCat, finalDrinkType, isDrink, dto.IsVeg, finalAbv);

        var finalImageUrl = !string.IsNullOrWhiteSpace(dto.ImageUrl)
            ? ProcessImageUrl(dto.ImageUrl)
            : existing.ImageUrl;

        existing.DishName = trimmedName;
        existing.Category = trimmedCat;
        existing.Price = dto.Price;
        existing.DietaryType = finalDietaryType;
        existing.SpiceLevel = dto.SpiceLevel;
        existing.PrepTimeMinutes = dto.PrepTimeMinutes ?? 15;
        existing.ShortDescription = dto.ShortDescription?.Trim();
        existing.ImageUrl = finalImageUrl;
        existing.IsChefsSpecial = dto.IsChefsSpecial;
        existing.IsAvailable = dto.IsAvailable;
        existing.IsBarItem = isDrink;
        existing.DrinkType = isDrink ? finalDrinkType : null;
        existing.AlcoholPct = isDrink ? finalAbv : null;
        existing.ServingMeasure = isDrink ? finalMeasure : null;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Menu item ID {Id} updated successfully. DietaryType: {DietaryType}, IsBarItem: {IsBarItem}", id, finalDietaryType, isDrink);

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

    public async Task<bool> DeleteCategoryAsync(string name)
    {
        var parameters = new Dictionary<string, object?> { { "p_name", name.Trim() } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteMenuCategory", parameters);
        _logger.LogInformation("Menu category deleted: {CategoryName}", name);
        return true;
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
        var category = reader.GetString(reader.GetOrdinal("category"));
        var rawDietary = reader.IsDBNull(reader.GetOrdinal("dietary_type"))
            ? null
            : reader.GetString(reader.GetOrdinal("dietary_type"));

        string? drinkType = null;
        int drinkTypeOrd = -1;
        try { drinkTypeOrd = reader.GetOrdinal("drink_type"); } catch { }
        if (drinkTypeOrd >= 0 && !reader.IsDBNull(drinkTypeOrd))
        {
            drinkType = reader.GetString(drinkTypeOrd);
        }

        decimal? alcoholPct = null;
        int alcOrd = -1;
        try { alcOrd = reader.GetOrdinal("alcohol_pct"); } catch { }
        if (alcOrd >= 0 && !reader.IsDBNull(alcOrd))
        {
            alcoholPct = reader.GetDecimal(alcOrd);
        }

        string? servingMeasure = null;
        int measureOrd = -1;
        try { measureOrd = reader.GetOrdinal("serving_measure"); } catch { }
        if (measureOrd >= 0 && !reader.IsDBNull(measureOrd))
        {
            servingMeasure = reader.GetString(measureOrd);
        }

        bool isBarItem = false;
        int barOrd = -1;
        try { barOrd = reader.GetOrdinal("is_bar_item"); } catch { }
        if (barOrd >= 0 && !reader.IsDBNull(barOrd))
        {
            isBarItem = reader.GetBoolean(barOrd);
        }

        var finalDietary = DrinkCategoryHelper.NormalizeDietaryType(rawDietary, category, drinkType, isBarItem, null, alcoholPct);
        bool? isVeg = finalDietary.Equals("veg", StringComparison.OrdinalIgnoreCase);

        return new MenuItemResponseDto
        {
            MenuItemId = reader.GetInt64(reader.GetOrdinal("menu_item_id")),
            DishName = reader.GetString(reader.GetOrdinal("dish_name")),
            Category = category,
            Price = reader.GetDecimal(reader.GetOrdinal("price")),
            DietaryType = finalDietary,
            IsVeg = isVeg,
            SpiceLevel = reader.GetInt32(reader.GetOrdinal("spice_level")),
            PrepTimeMinutes = reader.IsDBNull(reader.GetOrdinal("prep_time_minutes")) ? 15 : reader.GetInt32(reader.GetOrdinal("prep_time_minutes")),
            ShortDescription = reader.IsDBNull(reader.GetOrdinal("short_description")) ? null : reader.GetString(reader.GetOrdinal("short_description")),
            ImageUrl = reader.IsDBNull(reader.GetOrdinal("image_url")) ? null : reader.GetString(reader.GetOrdinal("image_url")),
            IsChefsSpecial = reader.GetBoolean(reader.GetOrdinal("is_chefs_special")),
            IsAvailable = reader.GetBoolean(reader.GetOrdinal("is_available")),
            ServingMeasure = servingMeasure,
            DrinkType = drinkType,
            AlcoholPct = alcoholPct,
            IsBarItem = isBarItem,
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }
}
