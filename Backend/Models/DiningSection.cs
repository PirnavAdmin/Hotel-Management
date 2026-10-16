namespace HMS.Models;

public class DiningSection
{
    public long Id { get; set; }

    public long OutletId { get; set; }

    public string SectionName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public long? UpdatedBy { get; set; }
}