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
        return await _db.RestaurantThemeSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(theme => theme.RestaurantId == restaurantId);
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
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($@"
                INSERT INTO `restaurant_theme_settings`
                    (`restaurant_id`, `accent_color`, `updated_by`)
                VALUES
                    ({restaurantId}, {normalizedColor}, {updatedBy})
                ON DUPLICATE KEY UPDATE
                    `accent_color` = VALUES(`accent_color`),
                    `updated_at` = CURRENT_TIMESTAMP(6),
                    `updated_by` = VALUES(`updated_by`);");

            return await _db.RestaurantThemeSettings
                .AsNoTracking()
                .FirstAsync(theme => theme.RestaurantId == restaurantId);
        });
    }
}
