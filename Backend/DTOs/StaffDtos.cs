using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateStaffDto : IValidatableObject
{
    private string _fullName = string.Empty;
    private string _roleTitle = string.Empty;

    public string FullName
    {
        get => !string.IsNullOrWhiteSpace(_fullName) ? _fullName : (Name ?? string.Empty);
        set => _fullName = value;
    }

    /// <summary>
    /// Property alias for FullName (supports frontend clients sending 'name').
    /// </summary>
    public string? Name { get; set; }

    public string RoleTitle
    {
        get => !string.IsNullOrWhiteSpace(_roleTitle) ? _roleTitle : (Role ?? string.Empty);
        set => _roleTitle = value;
    }

    /// <summary>
    /// Property alias for RoleTitle (supports frontend clients sending 'role' or 'designation').
    /// </summary>
    public string? Role { get; set; }

    private string _phone = "N/A";
    [MaxLength(20)]
    public string Phone
    {
        get => !string.IsNullOrWhiteSpace(_phone) ? _phone : "N/A";
        set => _phone = value;
    }

    private string _shift = "Morning";
    [MaxLength(50)]
    public string Shift
    {
        get => !string.IsNullOrWhiteSpace(_shift) ? _shift : "Morning";
        set => _shift = value;
    }

    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(FullName))
        {
            yield return new ValidationResult("Full Name is required.", new[] { nameof(FullName) });
        }
        else if (FullName.Length > 100)
        {
            yield return new ValidationResult("The field FullName must be a string with a maximum length of 100.", new[] { nameof(FullName) });
        }

        if (string.IsNullOrWhiteSpace(RoleTitle))
        {
            yield return new ValidationResult("Role / Designation title is required.", new[] { nameof(RoleTitle) });
        }
        else if (RoleTitle.Length > 50)
        {
            yield return new ValidationResult("The field RoleTitle must be a string with a maximum length of 50.", new[] { nameof(RoleTitle) });
        }
    }
}

public class UpdateStaffDto : IValidatableObject
{
    private string _fullName = string.Empty;
    private string _roleTitle = string.Empty;

    public string FullName
    {
        get => !string.IsNullOrWhiteSpace(_fullName) ? _fullName : (Name ?? string.Empty);
        set => _fullName = value;
    }

    public string? Name { get; set; }

    public string RoleTitle
    {
        get => !string.IsNullOrWhiteSpace(_roleTitle) ? _roleTitle : (Role ?? string.Empty);
        set => _roleTitle = value;
    }

    public string? Role { get; set; }

    private string _phone = "N/A";
    [MaxLength(20)]
    public string Phone
    {
        get => !string.IsNullOrWhiteSpace(_phone) ? _phone : "N/A";
        set => _phone = value;
    }

    private string _shift = "Morning";
    [MaxLength(50)]
    public string Shift
    {
        get => !string.IsNullOrWhiteSpace(_shift) ? _shift : "Morning";
        set => _shift = value;
    }

    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(FullName))
        {
            yield return new ValidationResult("Full Name is required.", new[] { nameof(FullName) });
        }
        else if (FullName.Length > 100)
        {
            yield return new ValidationResult("The field FullName must be a string with a maximum length of 100.", new[] { nameof(FullName) });
        }

        if (string.IsNullOrWhiteSpace(RoleTitle))
        {
            yield return new ValidationResult("Role / Designation title is required.", new[] { nameof(RoleTitle) });
        }
        else if (RoleTitle.Length > 50)
        {
            yield return new ValidationResult("The field RoleTitle must be a string with a maximum length of 50.", new[] { nameof(RoleTitle) });
        }
    }
}

public class StaffResponseDto
{
    public long StaffId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string RoleTitle { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Shift { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public int AssignedTablesCount { get; set; }

    public string AvatarInitial { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
