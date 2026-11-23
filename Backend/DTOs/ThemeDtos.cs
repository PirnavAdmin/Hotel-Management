using System.Text.Json.Serialization;

namespace HMS.DTOs;

public class UpdateThemeColorDto
{
    [JsonPropertyName("accentColor")]
    public string AccentColor { get; set; } = string.Empty;

    [JsonPropertyName("accent_color")]
    public string? AccentColorSnakeCase
    {
        get => AccentColor;
        set { if (!string.IsNullOrWhiteSpace(value)) AccentColor = value; }
    }
}
