using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateTableDto : IValidatableObject
{
    private string _tableName = string.Empty;
    private string _sectionArea = "Main Hall";
    private int _capacityChairs = 4;

    public string TableName
    {
        get => !string.IsNullOrWhiteSpace(_tableName) ? _tableName : (Name ?? string.Empty);
        set => _tableName = value;
    }

    /// <summary>
    /// Property alias for TableName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    public string SectionArea
    {
        get => !string.IsNullOrWhiteSpace(_sectionArea) ? _sectionArea : (Section ?? "Main Hall");
        set => _sectionArea = value;
    }

    /// <summary>
    /// Property alias for SectionArea (supports frontend clients sending 'section').
    /// </summary>
    public string? Section { get; set; }

    public int CapacityChairs
    {
        get => _capacityChairs > 0 ? _capacityChairs : (Capacity > 0 ? Capacity : 4);
        set => _capacityChairs = value;
    }

    /// <summary>
    /// Property alias for CapacityChairs (supports frontend clients sending 'capacity').
    /// </summary>
    public int Capacity { get; set; }

    public long? AssignedServerId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(TableName))
        {
            yield return new ValidationResult("Table Name / Identifier is required.", new[] { nameof(TableName) });
        }
        else if (TableName.Length > 50)
        {
            yield return new ValidationResult("The field TableName must be a string with a maximum length of 50.", new[] { nameof(TableName) });
        }

        if (CapacityChairs < 1 || CapacityChairs > 50)
        {
            yield return new ValidationResult("Capacity must be between 1 and 50.", new[] { nameof(CapacityChairs) });
        }
    }
}

public class UpdateTableDto : IValidatableObject
{
    private string _tableName = string.Empty;
    private string _sectionArea = "Main Hall";
    private int _capacityChairs = 4;

    public string TableName
    {
        get => !string.IsNullOrWhiteSpace(_tableName) ? _tableName : (Name ?? string.Empty);
        set => _tableName = value;
    }

    public string? Name { get; set; }

    public string SectionArea
    {
        get => !string.IsNullOrWhiteSpace(_sectionArea) ? _sectionArea : (Section ?? "Main Hall");
        set => _sectionArea = value;
    }

    public string? Section { get; set; }

    public int CapacityChairs
    {
        get => _capacityChairs > 0 ? _capacityChairs : (Capacity > 0 ? Capacity : 4);
        set => _capacityChairs = value;
    }

    public int Capacity { get; set; }

    [Range(0, 50, ErrorMessage = "Occupied chairs must be non-negative.")]
    public int OccupiedChairs { get; set; } = 0;

    [Required(ErrorMessage = "Status is required.")]
    [MaxLength(20)]
    public string Status { get; set; } = "VACANT"; // "VACANT", "OCCUPIED", "RESERVED"

    public long? AssignedServerId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(TableName))
        {
            yield return new ValidationResult("Table Name / Identifier is required.", new[] { nameof(TableName) });
        }
        else if (TableName.Length > 50)
        {
            yield return new ValidationResult("The field TableName must be a string with a maximum length of 50.", new[] { nameof(TableName) });
        }

        if (CapacityChairs < 1 || CapacityChairs > 50)
        {
            yield return new ValidationResult("Capacity must be between 1 and 50.", new[] { nameof(CapacityChairs) });
        }
    }
}

public class TableResponseDto
{
    public long TableId { get; set; }

    public string TableName { get; set; } = string.Empty;

    public string SectionArea { get; set; } = string.Empty;

    public int CapacityChairs { get; set; }

    public int OccupiedChairs { get; set; }

    public string Status { get; set; } = string.Empty;

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
