using System.Text.Json.Serialization;

namespace HMS.DTOs;

public class CreateOrderRequest
{
    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? TableId { get; set; }

    public string? TableName { get; set; }
    public string? TableNumber { get; set; }

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

    public int Guests { get; set; } = 1;

    public List<OrderItemInput> Items { get; set; } = new();

    public string? PaymentMethod { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
    public bool ServiceChargeEnabled { get; set; } = true;
    public decimal TipAmount { get; set; } = 0;
    public string? Status { get; set; }
}

public class OrderItemInput
{
    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    private long? _menuItemId;
    public long? MenuItemId
    {
        get => _menuItemId.HasValue && _menuItemId.Value > 0 ? _menuItemId : (Id.HasValue && Id.Value > 0 ? Id : (BackendId.HasValue && BackendId.Value > 0 ? BackendId : (ItemId.HasValue && ItemId.Value > 0 ? ItemId : null)));
        set => _menuItemId = value;
    }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? Id { get; set; }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? BackendId { get; set; }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? ItemId { get; set; }

    [JsonConverter(typeof(FlexibleNullableLongConverter))]
    public long? VariantId { get; set; }

    private string _name = string.Empty;
    public string Name
    {
        get => !string.IsNullOrWhiteSpace(_name) ? _name : (!string.IsNullOrWhiteSpace(DishName) ? DishName : "Order Item");
        set => _name = value;
    }

    /// <summary>
    /// Property alias for Name (supports frontend clients sending 'dishName').
    /// </summary>
    public string? DishName { get; set; }

    public decimal Price { get; set; }

    private int _quantity = 1;
    public int Quantity
    {
        get => _quantity > 0 ? _quantity : 1;
        set => _quantity = value;
    }

    public string? Notes { get; set; }
}

public class UpdateOrderItemsRequest
{
    public List<OrderItemInput> Items { get; set; } = new();
}

public class SettleOrderRequest
{
    public decimal DiscountPercent { get; set; }

    public bool ServiceChargeEnabled { get; set; }

    public decimal TipAmount { get; set; }

    public string? PaymentMethod { get; set; }
}

public class OrderDto
{
    public long Id { get; set; }

    public long TableId { get; set; }

    public string TableName { get; set; } = string.Empty;

    public string Section { get; set; } = string.Empty;

    public string ServerName { get; set; } = string.Empty;

    public int Guests { get; set; }

    public string Status { get; set; } = string.Empty;

    public decimal Subtotal { get; set; }

    public decimal DiscountPercent { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TaxPercent { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal ServiceChargePercent { get; set; }

    public decimal ServiceChargeAmount { get; set; }

    public decimal TipAmount { get; set; }

    public decimal GrandTotal { get; set; }

    public string? PaymentMethod { get; set; }

    public string? InvoiceNo { get; set; }

    public DateTime? SettledAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<OrderItemDto> Items { get; set; } = new();
}

public class OrderItemDto
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long MenuItemId { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int Quantity { get; set; }

    public string? Notes { get; set; }

    public string KotStatus { get; set; } = "Queued";

    public int KotBatch { get; set; }
}