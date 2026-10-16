namespace HMS.Models;

using System.ComponentModel.DataAnnotations;

public class DiningTable
{
    public long Id { get; set; }

    [Required]
    public long SectionId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int Capacity { get; set; } = 4;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Vacant";

    public long? AssignedWaiterId { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public long? UpdatedBy { get; set; }
}