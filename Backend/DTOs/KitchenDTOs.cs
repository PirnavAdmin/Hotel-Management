namespace HMS.DTOs;

public class UpdateItemStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class KotTicketDto
{
    public long TicketId { get; set; }

    public long OrderId { get; set; }

    public long TableId { get; set; }

    public string TableName { get; set; } = string.Empty;

    public string Section { get; set; } = string.Empty;

    public string ServerName { get; set; } = string.Empty;

    public int KotBatch { get; set; }

    public DateTime OrderTime { get; set; }

    public string TicketStatus { get; set; } = "Queued";

    public List<OrderItemDto> Items { get; set; } = new();
}