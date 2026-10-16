using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateKotOrderDto : IValidatableObject
{
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
    private long? _menuItemId;
    public long? MenuItemId
    {
        get => _menuItemId.HasValue && _menuItemId.Value > 0 ? _menuItemId : (Id.HasValue && Id.Value > 0 ? Id : (BackendId.HasValue && BackendId.Value > 0 ? BackendId : null));
        set => _menuItemId = value;
    }

    public long? Id { get; set; }
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
