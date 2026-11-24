using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public sealed class RestaurantThemeColorService
{
    public const string DefaultAccentColor = "#f59e0b";
    private static readonly Regex HexColorPattern = new("^#[0-9a-fA-F]{6}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static bool _tableEnsured;
    private static readonly SemaphoreSlim _initLock = new(1, 1);

    private readonly AppDbContext _db;
    private readonly ILogger<RestaurantThemeColorService> _logger;

    public RestaurantThemeColorService(AppDbContext db, ILogger<RestaurantThemeColorService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private async Task EnsureTableAsync()
    {
        if (_tableEnsured) return;
        await _initLock.WaitAsync();
        try
        {
            if (_tableEnsured) return;
            await _db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `restaurant_theme_settings` (
                    `restaurant_id` BIGINT NOT NULL,
                    `accent_color` VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
                    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    `updated_by` BIGINT NOT NULL,
                    PRIMARY KEY (`restaurant_id`),
                    KEY `ix_restaurant_theme_settings_updated_by` (`updated_by`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            _tableEnsured = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not ensure table 'restaurant_theme_settings' exists via DDL.");
        }
        finally
        {
            _initLock.Release();
        }
    }

    public async Task<RestaurantThemeSetting?> GetAsync(long restaurantId)
    {
        await EnsureTableAsync();
        try
        {
            var theme = await _db.RestaurantThemeSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(theme => theme.RestaurantId == restaurantId);
            if (theme != null) return theme;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not query 'restaurant_theme_settings'. Trying 'restaurant_settings'.");
        }

        try
        {
            var targetRestaurantKey = $"restaurant_{restaurantId}";
            var setting = await _db.RestaurantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantKey || s.Id == restaurantId);

            if (setting == null && restaurantId == 1)
            {
                setting = await _db.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1)
                       ?? await _db.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync();
            }

            if (setting != null && !string.IsNullOrWhiteSpace(setting.AccentColor) && HexColorPattern.IsMatch(setting.AccentColor))
            {
                return new RestaurantThemeSetting
                {
                    RestaurantId = restaurantId,
                    AccentColor = setting.AccentColor.Trim().ToLowerInvariant(),
                    CreatedAt = setting.CreatedAt,
                    UpdatedAt = setting.UpdatedAt,
                    UpdatedBy = long.TryParse(setting.UpdatedBy, out var uId) ? uId : 1
                };
            }
        }
        catch (Exception sEx)
        {
            _logger.LogWarning(sEx, "Could not query accent color from 'restaurant_settings'.");
        }

        return null;
    }

    public async Task<RestaurantThemeSetting> SaveAsync(long restaurantId, string accentColor, long updatedBy)
    {
        ArgumentNullException.ThrowIfNull(accentColor);
        if (!HexColorPattern.IsMatch(accentColor))
        {
            throw new ArgumentException("accentColor must be a HEX value in #RRGGBB format.", nameof(accentColor));
        }

        await EnsureTableAsync();

        var normalizedColor = accentColor.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        // 1. Try to persist into restaurant_theme_settings
        RestaurantThemeSetting? saved = null;
        try
        {
            var existingTheme = await _db.RestaurantThemeSettings
                .FirstOrDefaultAsync(theme => theme.RestaurantId == restaurantId);

            if (existingTheme == null)
            {
                existingTheme = new RestaurantThemeSetting
                {
                    RestaurantId = restaurantId,
                    AccentColor = normalizedColor,
                    CreatedAt = now,
                    UpdatedAt = now,
                    UpdatedBy = updatedBy
                };
                _db.RestaurantThemeSettings.Add(existingTheme);
            }
            else
            {
                existingTheme.AccentColor = normalizedColor;
                existingTheme.UpdatedAt = now;
                existingTheme.UpdatedBy = updatedBy;
            }

            await _db.SaveChangesAsync();
            saved = existingTheme;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to save theme setting to 'restaurant_theme_settings'. Falling back to restaurant_settings.");
        }

        // 2. Synchronize to restaurant_settings table as well
        try
        {
            var targetRestaurantKey = $"restaurant_{restaurantId}";
            var setting = await _db.RestaurantSettings
                .FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantKey || s.Id == restaurantId);

            if (setting == null && restaurantId == 1)
            {
                setting = await _db.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == 1)
                       ?? await _db.RestaurantSettings.FirstOrDefaultAsync();
            }

            if (setting != null)
            {
                setting.AccentColor = normalizedColor;
                setting.UpdatedAt = now;
                setting.UpdatedBy = updatedBy.ToString();
                await _db.SaveChangesAsync();
                _logger.LogInformation("Synchronized theme accent color '{Color}' to restaurant_settings.", normalizedColor);
            }
        }
        catch (Exception syncEx)
        {
            _logger.LogWarning(syncEx, "Could not synchronize accent color to restaurant_settings table.");
        }

        return saved ?? new RestaurantThemeSetting
        {
            RestaurantId = restaurantId,
            AccentColor = normalizedColor,
            CreatedAt = now,
            UpdatedAt = now,
            UpdatedBy = updatedBy
        };
    }
}
