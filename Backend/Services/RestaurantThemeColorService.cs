using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public sealed class RestaurantThemeColorService
{
    public const string DefaultAccentColor = "#f59e0b";
    private static readonly Regex HexColorPattern = new("^#[0-9a-fA-F]{6}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private readonly AppDbContext _db;

    public RestaurantThemeColorService(AppDbContext db)
    {
        _db = db;
    }

    public Task<RestaurantThemeSetting?> GetAsync(long restaurantId)
    {
        return _db.RestaurantThemeSettings
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

        var normalizedColor = accentColor.Trim().ToLowerInvariant();
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
    }
}