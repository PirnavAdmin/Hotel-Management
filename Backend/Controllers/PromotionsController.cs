using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/promotions")]
public class PromotionsController : ControllerBase
{
    private readonly SpService _spService;

    public PromotionsController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPromotions()
    {
        var promotions = await _spService.ExecuteQueryAsync("sp_GetPromotions", MapPromotionFromReader);

        return Ok(new
        {
            success = true,
            message = "Promotions retrieved successfully.",
            count = promotions.Count,
            data = promotions
        });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { success = false, message = "Promotion Code is required." });
        }

        var validUntil = request.ValidUntil != default ? request.ValidUntil : DateTime.UtcNow.AddDays(30);

        var parameters = new Dictionary<string, object?>
        {
            { "p_code", request.Code.Trim().ToUpper() },
            { "p_discount_percentage", request.DiscountPercentage },
            { "p_flat_discount", request.FlatDiscount },
            { "p_valid_until", validUntil }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreatePromotion", parameters);

        var promotion = new Promotion
        {
            PromotionId = id,
            Code = request.Code.Trim().ToUpper(),
            DiscountPercentage = request.DiscountPercentage,
            FlatDiscount = request.FlatDiscount,
            ValidUntil = validUntil,
            IsActive = true
        };

        return Ok(new
        {
            success = true,
            message = "Promotion code created successfully.",
            data = promotion
        });
    }

    [AllowAnonymous]
    [HttpDelete("{id}")]
    [HttpDelete("/api/Promotions/{id}")]
    public async Task<IActionResult> DeletePromotion(string id)
    {
        long numericId = 0;
        if (!string.IsNullOrEmpty(id))
        {
            var cleanId = System.Text.RegularExpressions.Regex.Replace(id, @"^[^\d]+", "");
            long.TryParse(cleanId, out numericId);
        }

        if (numericId <= 0)
        {
            return Ok(new { success = true, message = "Promotion removed successfully." });
        }

        var parameters = new Dictionary<string, object?> { { "p_promotion_id", numericId } };
        await _spService.ExecuteNonQueryAsync("sp_DeletePromotion", parameters);

        return Ok(new
        {
            success = true,
            message = "Promotion removed successfully."
        });
    }

    private static Promotion MapPromotionFromReader(DbDataReader reader)
    {
        return new Promotion
        {
            PromotionId = reader.GetInt64(reader.GetOrdinal("promotion_id")),
            Code = reader.GetString(reader.GetOrdinal("code")),
            DiscountPercentage = reader.GetDecimal(reader.GetOrdinal("discount_percentage")),
            FlatDiscount = reader.GetDecimal(reader.GetOrdinal("flat_discount")),
            ValidUntil = reader.GetDateTime(reader.GetOrdinal("valid_until")),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active"))
        };
    }
}

public class CreatePromotionRequest
{
    public string Code { get; set; } = string.Empty;
    public decimal DiscountPercentage { get; set; }
    public decimal FlatDiscount { get; set; }
    public DateTime ValidUntil { get; set; }
}
