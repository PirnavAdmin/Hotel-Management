using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class PosStateResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = "POS state retrieved successfully.";
    public object Tables { get; set; } = new List<object>();
    public object ActiveOrders { get; set; } = new List<object>();
    public object Categories { get; set; } = new List<object>();
    public object MenuItems { get; set; } = new List<object>();
    public object Staff { get; set; } = new List<object>();
    public object PastOrders { get; set; } = new List<object>();
    [System.Text.Json.Serialization.JsonPropertyName("restaurantSettings")]
    public object? RestaurantSettings { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("gourmet_pos_settings_v1")]
    public object? GourmetPosSettingsV1 { get; set; }
    public object Data { get; set; } = null!;
}

public class PosSyncRequestDto
{
    public List<TableSyncDto>? Tables { get; set; }
    public List<OrderSyncDto>? ActiveOrders { get; set; }
    public List<OrderSyncDto>? PastOrders { get; set; }
}

public class TableSyncDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Status { get; set; } = "Vacant";
    public string? Server { get; set; }
}

public class OrderSyncDto
{
    public long Id { get; set; }
    public long TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public string Server { get; set; } = string.Empty;
    public int Guests { get; set; } = 1;
    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public string Status { get; set; } = "Active";
    public List<OrderItemSyncDto> Items { get; set; } = new();
}

public class OrderItemSyncDto
{
    public long Id { get; set; }
    public long MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
    public string KotStatus { get; set; } = "Queued";
}

public class TransferTableRequestDto
{
    private long _sourceTableId;
    public long SourceTableId
    {
        get => _sourceTableId != 0 ? _sourceTableId : FromTableId;
        set => _sourceTableId = value;
    }

    private long _targetTableId;
    public long TargetTableId
    {
        get => _targetTableId != 0 ? _targetTableId : ToTableId;
        set => _targetTableId = value;
    }

    public long FromTableId { get; set; }
    public long ToTableId { get; set; }
}

public class UpdateGuestsRequestDto
{
    [Required]
    [Range(1, 100, ErrorMessage = "Guests count must be at least 1.")]
    public int Guests { get; set; }
}

public class UpdateDiscountRequestDto
{
    [Required]
    [Range(0, 100, ErrorMessage = "Discount percentage must be between 0 and 100.")]
    public decimal DiscountPercent { get; set; }
}

public class UpdateItemNotesRequestDto
{
    public string Notes { get; set; } = string.Empty;
}
