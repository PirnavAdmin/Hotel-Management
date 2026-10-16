using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HMS.DTOs;

public class FlexibleSpiceLevelConverter : JsonConverter<int>
{
    public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            var num = reader.GetInt32();
            return Math.Clamp(num, 0, 3);
        }
        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString()?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(str)) return 0;
            if (str == "mild") return 1;
            if (str == "medium") return 2;
            if (str.Contains("spic") || str.Contains("hot")) return 3;
            if (int.TryParse(str, out var val)) return Math.Clamp(val, 0, 3);
        }
        return 0;
    }

    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}

public class CreateMenuItemDto : IValidatableObject
{
    private string _dishName = string.Empty;
    private string _dietaryType = "Non-Veg";
    private string? _shortDescription;
    private string? _imageUrl;
    private bool? _isChefsSpecial;

    public string DishName
    {
        get => !string.IsNullOrWhiteSpace(_dishName) ? _dishName : (Name ?? string.Empty);
        set => _dishName = value;
    }

    /// <summary>
    /// Property alias for DishName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required(ErrorMessage = "Price is required.")]
    [Range(0.01, 100000.00, ErrorMessage = "Price must be greater than zero.")]
    public decimal Price { get; set; }

    public string DietaryType
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_dietaryType))
            {
                var clean = _dietaryType.Trim();
                if (clean.Contains("🟢") || clean.Equals("veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("pure veg", StringComparison.OrdinalIgnoreCase))
                    return "Veg";
                if (clean.Contains("🔴") || clean.Equals("non-veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("non veg", StringComparison.OrdinalIgnoreCase))
                    return "Non-Veg";
                return clean.Length > 20 ? clean.Substring(0, 20) : clean;
            }
            return IsVeg == true ? "Veg" : "Non-Veg";
        }
        set => _dietaryType = value;
    }

    /// <summary>
    /// Property alias for boolean dietary type (supports frontend clients sending 'isVeg').
    /// </summary>
    public bool? IsVeg { get; set; }

    [JsonConverter(typeof(FlexibleSpiceLevelConverter))]
    [Range(0, 3, ErrorMessage = "Spice level must be between 0 and 3.")]
    public int SpiceLevel { get; set; } = 0;

    public int? PrepTimeMinutes { get; set; } = 15;

    public string? PrepTime
    {
        get => $"{PrepTimeMinutes ?? 15} min";
        set
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                var digits = System.Text.RegularExpressions.Regex.Match(value, @"\d+");
                if (digits.Success && int.TryParse(digits.Value, out var mins))
                {
                    PrepTimeMinutes = mins;
                }
            }
        }
    }

    public string? ShortDescription
    {
        get
        {
            var desc = !string.IsNullOrWhiteSpace(_shortDescription) ? _shortDescription : Description;
            if (desc != null && desc.Length > 500) return desc.Substring(0, 500);
            return desc;
        }
        set => _shortDescription = value;
    }

    /// <summary>
    /// Property alias for ShortDescription (supports frontend clients sending 'description').
    /// </summary>
    public string? Description { get; set; }

    public string? ImageUrl
    {
        get => !string.IsNullOrWhiteSpace(_imageUrl) ? _imageUrl : Image;
        set => _imageUrl = value;
    }

    /// <summary>
    /// Property alias for ImageUrl (supports frontend clients sending 'image').
    /// </summary>
    public string? Image { get; set; }

    public bool IsChefsSpecial
    {
        get => _isChefsSpecial ?? IsChefSpecial ?? false;
        set => _isChefsSpecial = value;
    }

    /// <summary>
    /// Property alias for IsChefsSpecial (supports frontend clients sending 'isChefSpecial').
    /// </summary>
    public bool? IsChefSpecial { get; set; }

    public bool IsAvailable { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(DishName))
        {
            yield return new ValidationResult("Dish Name is required.", new[] { nameof(DishName) });
        }
        else if (DishName.Length > 100)
        {
            yield return new ValidationResult("The field DishName must be a string with a maximum length of 100.", new[] { nameof(DishName) });
        }

        if (string.IsNullOrWhiteSpace(Category))
        {
            yield return new ValidationResult("Category is required.", new[] { nameof(Category) });
        }

        if (Price <= 0)
        {
            yield return new ValidationResult("Price must be greater than zero.", new[] { nameof(Price) });
        }
    }
}

public class UpdateMenuItemDto : IValidatableObject
{
    private string _dishName = string.Empty;
    private string _dietaryType = "Non-Veg";
    private string? _shortDescription;
    private string? _imageUrl;
    private bool? _isChefsSpecial;

    public string DishName
    {
        get => !string.IsNullOrWhiteSpace(_dishName) ? _dishName : (Name ?? string.Empty);
        set => _dishName = value;
    }

    public string? Name { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required(ErrorMessage = "Price is required.")]
    [Range(0.01, 100000.00, ErrorMessage = "Price must be greater than zero.")]
    public decimal Price { get; set; }

    public string DietaryType
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_dietaryType))
            {
                var clean = _dietaryType.Trim();
                if (clean.Contains("🟢") || clean.Equals("veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("pure veg", StringComparison.OrdinalIgnoreCase))
                    return "Veg";
                if (clean.Contains("🔴") || clean.Equals("non-veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("non veg", StringComparison.OrdinalIgnoreCase))
                    return "Non-Veg";
                return clean.Length > 20 ? clean.Substring(0, 20) : clean;
            }
            return IsVeg == true ? "Veg" : "Non-Veg";
        }
        set => _dietaryType = value;
    }

    public bool? IsVeg { get; set; }

    [JsonConverter(typeof(FlexibleSpiceLevelConverter))]
    [Range(0, 3, ErrorMessage = "Spice level must be between 0 and 3.")]
    public int SpiceLevel { get; set; } = 0;

    public int? PrepTimeMinutes { get; set; } = 15;

    public string? PrepTime
    {
        get => $"{PrepTimeMinutes ?? 15} min";
        set
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                var digits = System.Text.RegularExpressions.Regex.Match(value, @"\d+");
                if (digits.Success && int.TryParse(digits.Value, out var mins))
                {
                    PrepTimeMinutes = mins;
                }
            }
        }
    }

    public string? ShortDescription
    {
        get
        {
            var desc = !string.IsNullOrWhiteSpace(_shortDescription) ? _shortDescription : Description;
            if (desc != null && desc.Length > 500) return desc.Substring(0, 500);
            return desc;
        }
        set => _shortDescription = value;
    }

    public string? Description { get; set; }

    public string? ImageUrl
    {
        get => !string.IsNullOrWhiteSpace(_imageUrl) ? _imageUrl : Image;
        set => _imageUrl = value;
    }

    public string? Image { get; set; }

    public bool IsChefsSpecial
    {
        get => _isChefsSpecial ?? IsChefSpecial ?? false;
        set => _isChefsSpecial = value;
    }

    public bool? IsChefSpecial { get; set; }

    public bool IsAvailable { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(DishName))
        {
            yield return new ValidationResult("Dish Name is required.", new[] { nameof(DishName) });
        }
        else if (DishName.Length > 100)
        {
            yield return new ValidationResult("The field DishName must be a string with a maximum length of 100.", new[] { nameof(DishName) });
        }

        if (string.IsNullOrWhiteSpace(Category))
        {
            yield return new ValidationResult("Category is required.", new[] { nameof(Category) });
        }

        if (Price <= 0)
        {
            yield return new ValidationResult("Price must be greater than zero.", new[] { nameof(Price) });
        }
    }
}

public class ImageUploadDto
{
    public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
    public Microsoft.AspNetCore.Http.IFormFile? Image { get; set; }
}

public class ImageUploadResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
}

public class MenuItemResponseDto
{
    public long MenuItemId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public string DietaryType { get; set; } = string.Empty;

    public int SpiceLevel { get; set; }

    public int? PrepTimeMinutes { get; set; }

    public string? ShortDescription { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsChefsSpecial { get; set; }

    public bool IsAvailable { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public class ToggleSpecialStatusRequest
{
    public bool? IsSpecial { get; set; }
    public bool? IsChefsSpecial { get; set; }
    public bool? Status { get; set; }

    public bool GetFinalStatus()
    {
        return IsSpecial ?? IsChefsSpecial ?? Status ?? false;
    }
}
