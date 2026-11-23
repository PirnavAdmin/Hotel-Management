using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class RestaurantSettingsService
{
    private static RestaurantSettingsDto? _fallbackSettings;
    private static readonly string SettingsFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "restaurant_settings.json");
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ILogger<RestaurantSettingsService> _logger;

    public RestaurantSettingsService(AppDbContext context, SpService spService, ILogger<RestaurantSettingsService> logger)
    {
        _context = context;
        _spService = spService;
        _logger = logger;
    }

    public async Task<RestaurantSettingsDto> GetSettingsAsync(string? restaurantId = null)
    {
        try
        {
            _logger.LogInformation("Retrieving restaurant brand identity & settings from MySQL database for restaurant {RestaurantId}.", restaurantId ?? "default");

            // 1. Try MySQL Stored Procedure
            try
            {
                var results = await _spService.ExecuteQueryAsync("sp_get_restaurant_settings", MapFromReader);
                if (results.Count > 0 && !string.IsNullOrWhiteSpace(results[0].RestaurantName))
                {
                    var settings = results[0];
                    if (_fallbackSettings != null)
                    {
                        if (!string.IsNullOrWhiteSpace(_fallbackSettings.RestaurantLogo) && string.IsNullOrWhiteSpace(settings.RestaurantLogo))
                            settings.RestaurantLogo = _fallbackSettings.RestaurantLogo;
                        if (!string.IsNullOrWhiteSpace(_fallbackSettings.RestaurantName) && _fallbackSettings.RestaurantName != "AVSR FOOD COURT")
                            settings.RestaurantName = _fallbackSettings.RestaurantName;
                        if (!string.IsNullOrWhiteSpace(_fallbackSettings.Tagline) && string.IsNullOrWhiteSpace(settings.Tagline))
                            settings.Tagline = _fallbackSettings.Tagline;
                        if (!string.IsNullOrWhiteSpace(_fallbackSettings.AccentColor) && string.IsNullOrWhiteSpace(settings.AccentColor))
                            settings.AccentColor = _fallbackSettings.AccentColor;
                    }
                    _logger.LogInformation("Successfully loaded restaurant settings for '{RestaurantName}' via SP.", settings.RestaurantName);
                    _fallbackSettings = settings;
                    SaveToFile(settings);
                    return settings;
                }
            }
            catch (Exception spEx)
            {
                _logger.LogWarning(spEx, "sp_get_restaurant_settings failed. Falling back to EF Core AppDbContext.");
            }

            // 2. Try EF Core AppDbContext directly
            try
            {
                RestaurantSetting? entity = null;
                if (!string.IsNullOrWhiteSpace(restaurantId))
                {
                    entity = await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.RestaurantId == restaurantId);
                    if (entity == null && int.TryParse(restaurantId.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase), out int numericId))
                    {
                        entity = await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == numericId);
                    }
                }

                if (entity == null)
                {
                    entity = await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1)
                          ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync();
                }

                if (entity != null && !string.IsNullOrWhiteSpace(entity.RestaurantName))
                {
                    var dto = MapFromEntity(entity);
                    _logger.LogInformation("Successfully loaded restaurant settings for '{RestaurantName}' via EF Core.", dto.RestaurantName);
                    _fallbackSettings = dto;
                    SaveToFile(dto);
                    return dto;
                }
            }
            catch (Exception efEx)
            {
                _logger.LogWarning(efEx, "EF Core RestaurantSettings lookup failed.");
            }

            // 3. Try persisted file on disk
            var diskSettings = LoadFromFile();
            if (diskSettings != null && !string.IsNullOrWhiteSpace(diskSettings.RestaurantName))
            {
                _fallbackSettings = diskSettings;
                return diskSettings;
            }

            if (_fallbackSettings != null) return _fallbackSettings;
            _logger.LogWarning("No restaurant settings record found. Falling back to default settings.");
            return new RestaurantSettingsDto();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving restaurant settings. Falling back to defaults.");
            return _fallbackSettings ?? LoadFromFile() ?? new RestaurantSettingsDto();
        }
    }

    public async Task<RestaurantSettingsDto> SaveSettingsAsync(RestaurantSettingsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RestaurantName))
        {
            _logger.LogWarning("Validation failed: RestaurantName is required and cannot be empty.");
            throw new ArgumentException("Restaurant Name is required.", nameof(dto.RestaurantName));
        }

        _fallbackSettings = dto;
        SaveToFile(dto);

        string? paymentQrsJson = null;
        if (dto.PaymentQrs != null)
        {
            if (dto.PaymentQrs is JsonElement je)
            {
                paymentQrsJson = je.GetRawText();
            }
            else if (dto.PaymentQrs is string s)
            {
                paymentQrsJson = s;
            }
            else
            {
                paymentQrsJson = JsonSerializer.Serialize(dto.PaymentQrs);
            }
        }

        // 1. Persist directly via EF Core AppDbContext
        try
        {
            var targetRestaurantId = !string.IsNullOrWhiteSpace(dto.RestaurantId) ? dto.RestaurantId.Trim() : "restaurant_1";
            var entity = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantId);
            if (entity == null && int.TryParse(targetRestaurantId.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase), out int numericId))
            {
                entity = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == numericId);
            }
            if (entity == null && targetRestaurantId == "restaurant_1")
            {
                entity = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == 1);
            }

            if (entity == null)
            {
                entity = new RestaurantSetting
                {
                    RestaurantId = targetRestaurantId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.RestaurantSettings.Add(entity);
            }

            entity.RestaurantId = targetRestaurantId;
            entity.RestaurantName = dto.RestaurantName.Trim();
            entity.Tagline = dto.Tagline?.Trim();
            entity.ContactNumber = (dto.ContactNumber ?? dto.Phone)?.Trim();
            entity.Address = dto.Address?.Trim();
            entity.Gstin = dto.Gstin?.Trim();
            entity.RestaurantLogo = dto.RestaurantLogo ?? dto.Logo;
            entity.FoodGstRate = dto.FoodGstRate;
            entity.ServiceChargeRate = dto.ServiceChargeRate;
            entity.ServiceChargeEnabled = dto.ServiceChargeEnabled;
            entity.RoundingMode = dto.RoundingMode ?? "nearest";
            entity.Currency = dto.Currency ?? "₹";
            entity.ReceiptHeader = dto.ReceiptHeader?.Trim();
            entity.ReceiptFooter = dto.ReceiptFooter?.Trim();
            entity.SelectedQrId = dto.SelectedQrId;
            entity.PaymentQrs = paymentQrsJson;
            entity.ShowLogoOnReceipt = dto.ShowLogoOnReceipt;
            entity.ShowAddressOnReceipt = dto.ShowAddressOnReceipt;
            entity.ShowGstBreakdown = dto.ShowGstBreakdown;
            entity.LowStockAlertsEnabled = dto.LowStockAlertsEnabled;
            entity.DisplayTheme = dto.DisplayTheme ?? dto.Theme ?? "royal-saffron";
            if (!string.IsNullOrWhiteSpace(dto.AccentColor))
            {
                entity.AccentColor = dto.AccentColor.Trim();
            }
            if (!string.IsNullOrWhiteSpace(dto.UpdatedBy))
            {
                entity.UpdatedBy = dto.UpdatedBy.Trim();
            }
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Saved restaurant settings directly to AppDbContext.RestaurantSettings.");
            dto.CreatedAt = entity.CreatedAt;
            dto.UpdatedAt = entity.UpdatedAt;
        }
        catch (Exception efEx)
        {
            _logger.LogWarning(efEx, "Could not persist restaurant settings via AppDbContext.");
        }

        // 2. Also try MySQL Stored Procedure
        try
        {
            var parameters = new Dictionary<string, object?>
            {
                { "p_restaurant_name", dto.RestaurantName.Trim() },
                { "p_tagline", dto.Tagline?.Trim() },
                { "p_contact_number", (dto.ContactNumber ?? dto.Phone)?.Trim() },
                { "p_address", dto.Address?.Trim() },
                { "p_gstin", dto.Gstin?.Trim() },
                { "p_restaurant_logo", dto.RestaurantLogo ?? dto.Logo },
                { "p_food_gst_rate", dto.FoodGstRate },
                { "p_service_charge_rate", dto.ServiceChargeRate },
                { "p_service_charge_enabled", dto.ServiceChargeEnabled ? 1 : 0 },
                { "p_rounding_mode", dto.RoundingMode ?? "nearest" },
                { "p_currency", dto.Currency ?? "₹" },
                { "p_receipt_header", dto.ReceiptHeader?.Trim() },
                { "p_receipt_footer", dto.ReceiptFooter?.Trim() },
                { "p_selected_qr_id", dto.SelectedQrId },
                { "p_payment_qrs", paymentQrsJson },
                { "p_show_logo_on_receipt", dto.ShowLogoOnReceipt ? 1 : 0 },
                { "p_show_address_on_receipt", dto.ShowAddressOnReceipt ? 1 : 0 },
                { "p_show_gst_breakdown", dto.ShowGstBreakdown ? 1 : 0 },
                { "p_low_stock_alerts_enabled", dto.LowStockAlertsEnabled ? 1 : 0 },
                { "p_display_theme", dto.DisplayTheme ?? dto.Theme ?? "royal-saffron" }
            };

            var results = await _spService.ExecuteQueryAsync("sp_save_restaurant_settings", MapFromReader, parameters);
            if (results.Count > 0)
            {
                _logger.LogInformation("sp_save_restaurant_settings succeeded. Name: '{RestaurantName}'.", results[0].RestaurantName);
                if (!string.IsNullOrWhiteSpace(dto.AccentColor) && string.IsNullOrWhiteSpace(results[0].AccentColor))
                {
                    results[0].AccentColor = dto.AccentColor;
                }
                if (!string.IsNullOrWhiteSpace(dto.RestaurantId) && string.IsNullOrWhiteSpace(results[0].RestaurantId))
                {
                    results[0].RestaurantId = dto.RestaurantId;
                }
                _fallbackSettings = results[0];
                SaveToFile(results[0]);
                return results[0];
            }
        }
        catch (Exception spEx)
        {
            _logger.LogWarning(spEx, "sp_save_restaurant_settings execution failed (changes saved to EF Core / disk).");
        }

        return dto;
    }

    private void SaveToFile(RestaurantSettingsDto dto)
    {
        try
        {
            var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(SettingsFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write restaurant settings to disk file {Path}", SettingsFilePath);
        }
    }

    private RestaurantSettingsDto? LoadFromFile()
    {
        try
        {
            if (File.Exists(SettingsFilePath))
            {
                var json = File.ReadAllText(SettingsFilePath);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                return JsonSerializer.Deserialize<RestaurantSettingsDto>(json, options);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read restaurant settings from disk file {Path}", SettingsFilePath);
        }
        return null;
    }

    private static RestaurantSettingsDto MapFromEntity(RestaurantSetting entity)
    {
        var dto = new RestaurantSettingsDto
        {
            RestaurantId = entity.RestaurantId,
            RestaurantName = entity.RestaurantName,
            Tagline = entity.Tagline,
            ContactNumber = entity.ContactNumber,
            Address = entity.Address,
            Gstin = entity.Gstin,
            RestaurantLogo = entity.RestaurantLogo,
            FoodGstRate = entity.FoodGstRate,
            ServiceChargeRate = entity.ServiceChargeRate,
            ServiceChargeEnabled = entity.ServiceChargeEnabled,
            RoundingMode = entity.RoundingMode,
            Currency = entity.Currency,
            ReceiptHeader = entity.ReceiptHeader,
            ReceiptFooter = entity.ReceiptFooter,
            SelectedQrId = entity.SelectedQrId,
            ShowLogoOnReceipt = entity.ShowLogoOnReceipt,
            ShowAddressOnReceipt = entity.ShowAddressOnReceipt,
            ShowGstBreakdown = entity.ShowGstBreakdown,
            LowStockAlertsEnabled = entity.LowStockAlertsEnabled,
            DisplayTheme = entity.DisplayTheme,
            AccentColor = entity.AccentColor,
            UpdatedBy = entity.UpdatedBy,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };

        if (!string.IsNullOrWhiteSpace(entity.PaymentQrs))
        {
            try
            {
                using var doc = JsonDocument.Parse(entity.PaymentQrs);
                dto.PaymentQrs = doc.RootElement.Clone();
            }
            catch
            {
                dto.PaymentQrs = entity.PaymentQrs;
            }
        }

        return dto;
    }

    private static RestaurantSettingsDto MapFromReader(DbDataReader reader)
    {
        var dto = new RestaurantSettingsDto();

        if (!reader.IsDBNull(reader.GetOrdinal("restaurant_name")))
            dto.RestaurantName = reader.GetString(reader.GetOrdinal("restaurant_name"));

        if (!reader.IsDBNull(reader.GetOrdinal("tagline")))
            dto.Tagline = reader.GetString(reader.GetOrdinal("tagline"));

        if (!reader.IsDBNull(reader.GetOrdinal("contact_number")))
            dto.ContactNumber = reader.GetString(reader.GetOrdinal("contact_number"));

        if (!reader.IsDBNull(reader.GetOrdinal("address")))
            dto.Address = reader.GetString(reader.GetOrdinal("address"));

        if (!reader.IsDBNull(reader.GetOrdinal("gstin")))
            dto.Gstin = reader.GetString(reader.GetOrdinal("gstin"));

        if (!reader.IsDBNull(reader.GetOrdinal("restaurant_logo")))
            dto.RestaurantLogo = reader.GetString(reader.GetOrdinal("restaurant_logo"));

        if (!reader.IsDBNull(reader.GetOrdinal("food_gst_rate")))
            dto.FoodGstRate = reader.GetDecimal(reader.GetOrdinal("food_gst_rate"));

        if (!reader.IsDBNull(reader.GetOrdinal("service_charge_rate")))
            dto.ServiceChargeRate = reader.GetDecimal(reader.GetOrdinal("service_charge_rate"));

        if (!reader.IsDBNull(reader.GetOrdinal("service_charge_enabled")))
            dto.ServiceChargeEnabled = reader.GetBoolean(reader.GetOrdinal("service_charge_enabled"));

        if (!reader.IsDBNull(reader.GetOrdinal("rounding_mode")))
            dto.RoundingMode = reader.GetString(reader.GetOrdinal("rounding_mode"));

        if (!reader.IsDBNull(reader.GetOrdinal("currency")))
            dto.Currency = reader.GetString(reader.GetOrdinal("currency"));

        if (!reader.IsDBNull(reader.GetOrdinal("receipt_header")))
            dto.ReceiptHeader = reader.GetString(reader.GetOrdinal("receipt_header"));

        if (!reader.IsDBNull(reader.GetOrdinal("receipt_footer")))
            dto.ReceiptFooter = reader.GetString(reader.GetOrdinal("receipt_footer"));

        if (!reader.IsDBNull(reader.GetOrdinal("selected_qr_id")))
            dto.SelectedQrId = reader.GetString(reader.GetOrdinal("selected_qr_id"));

        if (!reader.IsDBNull(reader.GetOrdinal("payment_qrs")))
        {
            var rawQrs = reader.GetString(reader.GetOrdinal("payment_qrs"));
            try
            {
                using var doc = JsonDocument.Parse(rawQrs);
                dto.PaymentQrs = doc.RootElement.Clone();
            }
            catch
            {
                dto.PaymentQrs = rawQrs;
            }
        }

        if (!reader.IsDBNull(reader.GetOrdinal("show_logo_on_receipt")))
            dto.ShowLogoOnReceipt = reader.GetBoolean(reader.GetOrdinal("show_logo_on_receipt"));

        if (!reader.IsDBNull(reader.GetOrdinal("show_address_on_receipt")))
            dto.ShowAddressOnReceipt = reader.GetBoolean(reader.GetOrdinal("show_address_on_receipt"));

        if (!reader.IsDBNull(reader.GetOrdinal("show_gst_breakdown")))
            dto.ShowGstBreakdown = reader.GetBoolean(reader.GetOrdinal("show_gst_breakdown"));

        if (!reader.IsDBNull(reader.GetOrdinal("low_stock_alerts_enabled")))
            dto.LowStockAlertsEnabled = reader.GetBoolean(reader.GetOrdinal("low_stock_alerts_enabled"));

        if (!reader.IsDBNull(reader.GetOrdinal("display_theme")))
            dto.DisplayTheme = reader.GetString(reader.GetOrdinal("display_theme"));

        if (!reader.IsDBNull(reader.GetOrdinal("updated_at")))
            dto.UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"));

        for (int i = 0; i < reader.FieldCount; i++)
        {
            var colName = reader.GetName(i);
            if (string.Equals(colName, "restaurant_id", StringComparison.OrdinalIgnoreCase) && !reader.IsDBNull(i))
                dto.RestaurantId = reader.GetString(i);
            else if (string.Equals(colName, "accent_color", StringComparison.OrdinalIgnoreCase) && !reader.IsDBNull(i))
                dto.AccentColor = reader.GetString(i);
            else if (string.Equals(colName, "updated_by", StringComparison.OrdinalIgnoreCase) && !reader.IsDBNull(i))
                dto.UpdatedBy = reader.GetString(i);
            else if (string.Equals(colName, "created_at", StringComparison.OrdinalIgnoreCase) && !reader.IsDBNull(i))
                dto.CreatedAt = reader.GetDateTime(i);
        }

        return dto;
    }
}
