using System;
using System.Text.Json.Serialization;

namespace HMS.DTOs;

public sealed class UpdateRestaurantThemeColorRequest
{
    [JsonPropertyName("accentColor")]
    public string? AccentColor { get; set; }
}

public sealed class RestaurantThemeColorResponse
{
    [JsonPropertyName("restaurantId")]
    public long RestaurantId { get; set; }

    [JsonPropertyName("accentColor")]
    public string AccentColor { get; set; } = "#f59e0b";

    [JsonPropertyName("createdAt")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("updatedBy")]
    public long? UpdatedBy { get; set; }
}