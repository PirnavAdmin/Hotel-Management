using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace HMS.DTOs;

public class FlexibleNullableLongConverter : JsonConverter<long?>
{
    public override long? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.Number) return reader.GetInt64();
        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(str)) return null;
            if (long.TryParse(str, out var directLong)) return directLong;
            var digits = Regex.Replace(str, @"\D+", "");
            if (long.TryParse(digits, out var parsedDigits)) return parsedDigits;
            return null;
        }
        return null;
    }

    public override void Write(Utf8JsonWriter writer, long? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteNumberValue(value.Value);
        else writer.WriteNullValue();
    }
}

public class CreateKotOrderDto : IValidatableObject
{
    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? TableId { get; set; }

    private string _tableName = string.Empty;
    public string TableName
    {
        get => !string.IsNullOrWhiteSpace(_tableName) ? _tableName : (!string.IsNullOrWhiteSpace(Name) ? Name : (TableId.HasValue ? $"Table {TableId.Value}" : "Main Table"));
        set => _tableName = value;
    }

    /// <summary>
    /// Property alias for TableName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    private string _sectionArea = "Main Hall";
    public string SectionArea
    {
        get => !string.IsNullOrWhiteSpace(_sectionArea) ? _sectionArea : (!string.IsNullOrWhiteSpace(Section) ? Section : "Main Hall");
        set => _sectionArea = value;
    }

    /// <summary>
    /// Property alias for SectionArea (supports frontend clients sending 'section').
    /// </summary>
    public string? Section { get; set; }

    private string _serverName = string.Empty;
    public string ServerName
    {
        get => !string.IsNullOrWhiteSpace(_serverName) ? _serverName : (!string.IsNullOrWhiteSpace(Server) ? Server : "Server");
        set => _serverName = value;
    }

    /// <summary>
    /// Property alias for ServerName (supports frontend clients sending 'server').
    /// </summary>
    public string? Server { get; set; }

    public List<CreateKotOrderItemDto> Items { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(TableName))
        {
            yield return new ValidationResult("Table Name is required.", new[] { nameof(TableName) });
        }

        if (Items == null || Items.Count == 0)
        {
            yield return new ValidationResult("At least one item is required.", new[] { nameof(Items) });
        }
    }
}

public class CreateKotOrderItemDto : IValidatableObject
{
    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    private long? _menuItemId;
    public long? MenuItemId
    {
        get => _menuItemId.HasValue && _menuItemId.Value > 0 ? _menuItemId : (Id.HasValue && Id.Value > 0 ? Id : (BackendId.HasValue && BackendId.Value > 0 ? BackendId : null));
        set => _menuItemId = value;
    }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? Id { get; set; }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? BackendId { get; set; }

    private string _dishName = string.Empty;
    public string DishName
    {
        get => !string.IsNullOrWhiteSpace(_dishName) ? _dishName : (!string.IsNullOrWhiteSpace(Name) ? Name : "Dish Item");
        set => _dishName = value;
    }

    /// <summary>
    /// Property alias for DishName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    private int _quantity = 1;
    public int Quantity
    {
        get => _quantity > 0 ? _quantity : 1;
        set => _quantity = value;
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(DishName))
        {
            yield return new ValidationResult("Dish Name is required.", new[] { nameof(DishName) });
        }
    }
}

public class UpdateOrderStatusDto
{
    [Required(ErrorMessage = "Status is required.")]
    public string Status { get; set; } = "PREPARATION COMPLETED"; // "PENDING", "IN PREPARATION", "PREPARATION COMPLETED"
}

public class UpdateItemStatusDto
{
    [Required(ErrorMessage = "Status is required.")]
    public string Status { get; set; } = "READY"; // "PENDING", "IN PREP", "READY"
}

public class KotOrderResponseDto
{
    public long OrderId { get; set; }

    public long? TableId { get; set; }

    public string TableName { get; set; } = string.Empty;

    public string SectionArea { get; set; } = string.Empty;

    public string ServerName { get; set; } = string.Empty;

    public string OrderStatus { get; set; } = string.Empty;

    public DateTime OrderReceivedAt { get; set; }

    public string OrderReceivedFormatted { get; set; } = string.Empty; // e.g. "04:46 PM"

    public string? KotNumber { get; set; }

    public string? OrderType { get; set; }

    public string? TableNumber { get; set; }

    public string? SpecialInstructions { get; set; }

    public int TotalItems { get; set; }

    public int PreparedItems { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<KotOrderItemResponseDto> Items { get; set; } = new();
}

public class KotOrderItemResponseDto
{
    public long OrderItemId { get; set; }

    public long OrderId { get; set; }

    public long? MenuItemId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public string ItemStatus { get; set; } = string.Empty;

    public string? TableName { get; set; }

    public string? SectionArea { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}

public class KotSummaryDto
{
    public int TotalTickets { get; set; }

    public int PendingTickets { get; set; }

    public int InPrepTickets { get; set; }

    public int ReadyTickets { get; set; }

    public int CancelledTickets { get; set; }

    public double AveragePrepTimeMinutes { get; set; }
}

public class KotScreenFeedDto
{
    public KotSummaryDto Summary { get; set; } = new();

    public List<KotOrderResponseDto> Orders { get; set; } = new();

    public int TotalActiveOrders { get; set; }

    public int TotalActiveItems { get; set; }

    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;

    public string ServerTimeFormatted { get; set; } = DateTime.Now.ToString("hh:mm:ss tt");
}

public class AddKotItemDto
{
    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? MenuItemId { get; set; }

    [Required(ErrorMessage = "Dish Name is required.")]
    public string DishName { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;

    public string? ItemStatus { get; set; } = "PENDING";
}

