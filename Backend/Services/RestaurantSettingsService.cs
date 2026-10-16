using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class RestaurantSettingsService
{
    private readonly SpService _spService;
    private readonly ILogger<RestaurantSettingsService> _logger;

    public RestaurantSettingsService(SpService spService, ILogger<RestaurantSettingsService> logger)
    {
        _spService = spService;
        _logger = logger;
    }

    public async Task<RestaurantSettingsDto> GetSettingsAsync()
    {
        try
        {
            _logger.LogInformation("Retrieving restaurant brand identity & settings from MySQL database.");

            var results = await _spService.ExecuteQueryAsync("sp_get_restaurant_settings", MapFromReader);
            if (results.Count > 0)
            {
                var settings = results[0];
                _logger.LogInformation("Successfully loaded restaurant settings for '{RestaurantName}'.", settings.RestaurantName);
                return settings;
            }

            _logger.LogWarning("No restaurant settings record found via SP. Falling back to default settings.");
            return new RestaurantSettingsDto();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while executing sp_get_restaurant_settings. Falling back to defaults.");
            return new RestaurantSettingsDto();
        }
    }

    public async Task<RestaurantSettingsDto> SaveSettingsAsync(RestaurantSettingsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RestaurantName))
        {
            _logger.LogWarning("Validation failed: RestaurantName is required and cannot be empty.");
            throw new ArgumentException("Restaurant Name is required.", nameof(dto.RestaurantName));
        }

        try
        {
            _logger.LogInformation("Saving updated restaurant settings to MySQL. Target Restaurant Name: {RestaurantName}", dto.RestaurantName.Trim());

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
                _logger.LogInformation("Database UPDATE succeeded for restaurant settings. Restaurant Name is now '{RestaurantName}'.", results[0].RestaurantName);
                return results[0];
            }

            _logger.LogInformation("Database UPDATE completed via sp_save_restaurant_settings.");
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save restaurant settings to MySQL.");
            throw;
        }
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

        return dto;
    }
}
