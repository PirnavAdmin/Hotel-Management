namespace HMS.Models;

public class KitchenStation
{
    public long StationId { get; set; }

    public long OutletId { get; set; }

    public string StationName { get; set; } = string.Empty;

    public string? PrinterIp { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public long? UpdatedBy { get; set; }
}