using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateTableDto : IValidatableObject
{
    private string? _tableName;
    private string? _tableNumber;
    private string? _sectionArea;
    private int? _capacityChairs;

    public long? BranchId { get; set; } = 1;

    public string TableName
    {
        get => !string.IsNullOrWhiteSpace(_tableName) 
            ? _tableName 
            : (!string.IsNullOrWhiteSpace(_tableNumber) ? _tableNumber : (Name ?? string.Empty));
        set => _tableName = value;
    }

    /// <summary>
    /// Property alias for TableName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Property alias for TableNumber (supports frontend clients sending 'number').
    /// </summary>
    public string? Number { get; set; }

    /// <summary>
    /// Property alias for TableName / TableNumber (supports SP schema).
    /// </summary>
    public string TableNumber
    {
        get => !string.IsNullOrWhiteSpace(_tableNumber) 
            ? _tableNumber 
            : (!string.IsNullOrWhiteSpace(Number) ? Number : (!string.IsNullOrWhiteSpace(_tableName) ? _tableName : (Name ?? string.Empty)));
        set => _tableNumber = value;
    }

    public string SectionArea
    {
        get => !string.IsNullOrWhiteSpace(_sectionArea) 
            ? _sectionArea 
            : (!string.IsNullOrWhiteSpace(Location) ? Location : (Section ?? "Main Hall"));
        set => _sectionArea = value;
    }

    /// <summary>
    /// Property alias for SectionArea (supports frontend clients sending 'section').
    /// </summary>
    public string? Section { get; set; }

    /// <summary>
    /// Property alias for SectionArea / Location (supports SP schema).
    /// </summary>
    public string? Location { get; set; }

    public int CapacityChairs
    {
        get => _capacityChairs.HasValue && _capacityChairs.Value > 0 
            ? _capacityChairs.Value 
            : (Capacity > 0 ? Capacity : 4);
        set => _capacityChairs = value;
    }

    /// <summary>
    /// Property alias for CapacityChairs (supports frontend clients sending 'capacity').
    /// </summary>
    public int Capacity { get; set; }

    public string? QrCodeUrl { get; set; }

    public string Status { get; set; } = "available";

    public long? AssignedServerId { get; set; }

    /// <summary>
    /// Property alias for AssignedServerName (supports frontend sending server name).
    /// </summary>
    public string? Server { get; set; }

    /// <summary>
    /// Property alias for AssignedServerName.
    /// </summary>
    public string? AssignedServerName { get; set; }

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "available", "vacant", "occupied", "reserved", "cleaning", "inactive"
    };

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var resolvedNumber = !string.IsNullOrWhiteSpace(Number) ? Number : (!string.IsNullOrWhiteSpace(TableNumber) ? TableNumber : TableName);
        if (string.IsNullOrWhiteSpace(resolvedNumber))
        {
            yield return new ValidationResult("Table Number / Identifier is required and cannot be empty.", new[] { nameof(TableNumber), nameof(TableName) });
        }
        else if (resolvedNumber.Length > 20)
        {
            yield return new ValidationResult("Table Number / Identifier must not exceed 20 characters.", new[] { nameof(TableNumber), nameof(TableName) });
        }

        if (CapacityChairs < 1 || CapacityChairs > 50)
        {
            yield return new ValidationResult("Capacity must be between 1 and 50.", new[] { nameof(CapacityChairs) });
        }

        if (!string.IsNullOrWhiteSpace(Status) && !AllowedStatuses.Contains(Status.Trim()))
        {
            yield return new ValidationResult(
                $"Invalid status '{Status}'. Allowed values are: available, occupied, reserved, cleaning, inactive.",
                new[] { nameof(Status) });
        }

        if (BranchId.HasValue && BranchId.Value <= 0)
        {
            yield return new ValidationResult("BranchId must be a positive integer.", new[] { nameof(BranchId) });
        }
    }
}

public class UpdateTableDto : IValidatableObject
{
    private string? _tableName;
    private string? _tableNumber;
    private string? _sectionArea;
    private int? _capacityChairs;

    public long? BranchId { get; set; }

    public string TableName
    {
        get => !string.IsNullOrWhiteSpace(_tableName) 
            ? _tableName 
            : (!string.IsNullOrWhiteSpace(_tableNumber) ? _tableNumber : (Name ?? string.Empty));
        set => _tableName = value;
    }

    public string? Name { get; set; }

    public string? Number { get; set; }

    public string TableNumber
    {
        get => !string.IsNullOrWhiteSpace(_tableNumber) 
            ? _tableNumber 
            : (!string.IsNullOrWhiteSpace(Number) ? Number : (!string.IsNullOrWhiteSpace(_tableName) ? _tableName : (Name ?? string.Empty)));
        set => _tableNumber = value;
    }

    public string SectionArea
    {
        get => !string.IsNullOrWhiteSpace(_sectionArea) 
            ? _sectionArea 
            : (!string.IsNullOrWhiteSpace(Location) ? Location : (Section ?? "Main Hall"));
        set => _sectionArea = value;
    }

    public string? Section { get; set; }

    public string? Location { get; set; }

    public int CapacityChairs
    {
        get => _capacityChairs.HasValue && _capacityChairs.Value > 0 
            ? _capacityChairs.Value 
            : (Capacity > 0 ? Capacity : 4);
        set => _capacityChairs = value;
    }

    public int Capacity { get; set; }

    [Range(0, 50, ErrorMessage = "Occupied chairs must be non-negative.")]
    public int OccupiedChairs { get; set; } = 0;

    [Required(ErrorMessage = "Status is required.")]
    [MaxLength(20)]
    public string Status { get; set; } = "available";

    public string? QrCodeUrl { get; set; }

    public long? AssignedServerId { get; set; }

    /// <summary>
    /// Property alias for AssignedServerName (supports frontend sending server name).
    /// </summary>
    public string? Server { get; set; }

    /// <summary>
    /// Property alias for AssignedServerName.
    /// </summary>
    public string? AssignedServerName { get; set; }

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "available", "vacant", "occupied", "reserved", "cleaning", "inactive"
    };

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var resolvedNumber = !string.IsNullOrWhiteSpace(Number) ? Number : (!string.IsNullOrWhiteSpace(TableNumber) ? TableNumber : TableName);
        if (string.IsNullOrWhiteSpace(resolvedNumber))
        {
            yield return new ValidationResult("Table Number / Identifier is required and cannot be empty.", new[] { nameof(TableNumber), nameof(TableName) });
        }
        else if (resolvedNumber.Length > 20)
        {
            yield return new ValidationResult("Table Number / Identifier must not exceed 20 characters.", new[] { nameof(TableNumber), nameof(TableName) });
        }

        if (CapacityChairs < 1 || CapacityChairs > 50)
        {
            yield return new ValidationResult("Capacity must be between 1 and 50.", new[] { nameof(CapacityChairs) });
        }

        if (!string.IsNullOrWhiteSpace(Status) && !AllowedStatuses.Contains(Status.Trim()))
        {
            yield return new ValidationResult(
                $"Invalid status '{Status}'. Allowed values are: available, occupied, reserved, cleaning, inactive.",
                new[] { nameof(Status) });
        }

        if (BranchId.HasValue && BranchId.Value <= 0)
        {
            yield return new ValidationResult("BranchId must be a positive integer.", new[] { nameof(BranchId) });
        }
    }
}

public class UpdateTableStatusDto
{
    [Required]
    public string Status { get; set; } = "available";
}

public class TableResponseDto
{
    public long TableId { get; set; }

    public long BranchId { get; set; } = 1;

    public string TableName { get; set; } = string.Empty;

    public string TableNumber { get; set; } = string.Empty;

    public string SectionArea { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public int CapacityChairs { get; set; }

    public int OccupiedChairs { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? QrCodeUrl { get; set; }

    public string? ActiveOrderNumber { get; set; }

    public long? AssignedServerId { get; set; }

    public string? AssignedServerName { get; set; }

    public string? AssignedServerRole { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class TableSummaryDto
{
    public int TotalTables { get; set; }

    public int TotalChairs { get; set; }

    public int OccupiedChairs { get; set; }

    public int AvailableChairs { get; set; }
}

public class SpOperationResult
{
    public string Status { get; set; } = string.Empty;
    public int StatusCode { get; set; } = 200;
    public string Message { get; set; } = string.Empty;
    public long? DataId { get; set; }
}

public class DuplicateTableException : Exception
{
    public DuplicateTableException(string message) : base(message) { }
}

