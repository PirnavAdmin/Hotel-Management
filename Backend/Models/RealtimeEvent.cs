using System;
using System.Text.Json.Serialization;

namespace HMS.Models;

/// <summary>
/// Standardized envelope for application-wide real-time synchronization events.
/// Published across SignalR WebSocket connections and SSE streams.
/// </summary>
public class RealtimeEvent
{
    [JsonPropertyName("eventId")]
    public string EventId { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = string.Empty;

    [JsonPropertyName("module")]
    public string Module { get; set; } = string.Empty;

    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("branchId")]
    public long? BranchId { get; set; }

    [JsonPropertyName("recordId")]
    public string? RecordId { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("data")]
    public object? Data { get; set; }

    [JsonPropertyName("triggeredBy")]
    public string? TriggeredBy { get; set; }

    [JsonPropertyName("station")]
    public string? Station { get; set; }
}
