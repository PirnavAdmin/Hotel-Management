namespace HMS.DTOs;

using System.ComponentModel.DataAnnotations;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}

public class CreateCategoryRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;
}

public class MenuItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsVeg { get; set; }
    public string SpiceLevel { get; set; } = "Medium";
    public string? Description { get; set; }
    public int PrepTimeMinutes { get; set; }
    public bool IsAvailable { get; set; }
    public string? ImageUrl { get; set; }
}

public class CreateMenuItemRequest
{
    public string? Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public Guid CategoryId { get; set; }
    [Required]
    public decimal Price { get; set; }
    public bool IsVeg { get; set; } = true;
    public string SpiceLevel { get; set; } = "Medium";
    public string? Description { get; set; }
    public int PrepTimeMinutes { get; set; } = 15;
    public bool IsAvailable { get; set; } = true;
    public string? ImageUrl { get; set; }
}

public class UpdateMenuItemRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public Guid CategoryId { get; set; }
    [Required]
    public decimal Price { get; set; }
    public bool IsVeg { get; set; }
    public string SpiceLevel { get; set; } = "Medium";
    public string? Description { get; set; }
    public int PrepTimeMinutes { get; set; }
    public bool IsAvailable { get; set; }
    public string? ImageUrl { get; set; }
}

public class ToggleAvailabilityRequest
{
    public bool IsAvailable { get; set; }
}
