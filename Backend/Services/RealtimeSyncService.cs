using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Hubs;
using HMS.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class RealtimeSyncService : IRealtimeSyncService
{
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly ILogger<RealtimeSyncService> _logger;

    // Active connection tracking: connectionId -> ConnectionInfo
    private readonly ConcurrentDictionary<string, ClientConnectionInfo> _connections = new();

    // In-memory sliding buffer of recent events for replay upon reconnection (max 1000 entries)
    private readonly ConcurrentQueue<RealtimeEvent> _recentEvents = new();
    private const int MaxBufferSize = 1000;

    // Deduplication tracker: dedupKey -> expireTimeUtc
    private readonly ConcurrentDictionary<string, DateTime> _dedupCache = new();
    private static readonly TimeSpan DedupWindow = TimeSpan.FromSeconds(3);

    public RealtimeSyncService(
        IHubContext<PosHub> hubContext,
        ISseBroadcaster sseBroadcaster,
        ILogger<RealtimeSyncService> logger)
    {
        _hubContext = hubContext;
        _sseBroadcaster = sseBroadcaster;
        _logger = logger;
    }

    public int ActiveConnectionCount => _connections.Count;

    public void TrackConnection(string connectionId, string? userId, string? role, long? branchId)
    {
        _connections[connectionId] = new ClientConnectionInfo
        {
            ConnectionId = connectionId,
            UserId = userId,
            Role = role,
            BranchId = branchId,
            ConnectedAt = DateTime.UtcNow
        };
        _logger.LogInformation(
            "[RealtimeSync] Client connected: {ConnectionId} (User: {UserId}, Role: {Role}, Branch: {BranchId}). Total active: {Count}",
            connectionId, userId ?? "anonymous", role ?? "none", branchId?.ToString() ?? "none", _connections.Count);
    }

    public void UntrackConnection(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var info))
        {
            var duration = DateTime.UtcNow - info.ConnectedAt;
            _logger.LogInformation(
                "[RealtimeSync] Client disconnected: {ConnectionId} after {Duration}. Total active: {Count}",
                connectionId, duration, _connections.Count);
        }
    }

    public async Task PublishAsync(
        RealtimeEvent evt,
        EventScope scope = EventScope.Restaurant,
        string? targetRoleOrStation = null)
    {
        if (evt == null) return;

        // Ensure EventId and Timestamp
        if (string.IsNullOrWhiteSpace(evt.EventId))
        {
            evt.EventId = Guid.NewGuid().ToString("N");
        }
        if (evt.Timestamp == default)
        {
            evt.Timestamp = DateTime.UtcNow;
        }

        // Deduplication check
        var themeAccentKey = string.Empty;
        if (string.Equals(evt.EventType, "restaurantSetting:updated", StringComparison.OrdinalIgnoreCase) && evt.Data != null)
        {
            var themeData = System.Text.Json.JsonSerializer.SerializeToElement(evt.Data);
            if (themeData.ValueKind == System.Text.Json.JsonValueKind.Object &&
                (themeData.TryGetProperty("accentColor", out var accent) || themeData.TryGetProperty("AccentColor", out accent)))
            {
                themeAccentKey = accent.GetString()?.Trim().ToLowerInvariant() ?? string.Empty;
            }
        }
        // Theme updates share event/tenant/record/action values. Include the
        // saved color so a different color selected inside the dedupe window
        // still reaches every connected client.
        string dedupKey = $"{evt.EventType}:{evt.BranchId}:{evt.RecordId}:{evt.Action}:{themeAccentKey}";
        var now = DateTime.UtcNow;
        CleanExpiredDedup(now);

        if (_dedupCache.TryGetValue(dedupKey, out var expiry) && expiry > now)
        {
            _logger.LogDebug("[RealtimeSync] Dropping duplicate event {DedupKey}", dedupKey);
            return;
        }
        _dedupCache[dedupKey] = now.Add(DedupWindow);

        // Store in sliding buffer for reconnection recovery
        _recentEvents.Enqueue(evt);
        while (_recentEvents.Count > MaxBufferSize && _recentEvents.TryDequeue(out _)) { }

        _logger.LogInformation(
            "[RealtimeSync] Publishing {EventType} for module {Module} (Record: {RecordId}, Branch: {BranchId}, Scope: {Scope})",
            evt.EventType, evt.Module, evt.RecordId, evt.BranchId, scope);

        // 1. Dispatch to SignalR Clients
        try
        {
            await DispatchToSignalRAsync(evt, scope, targetRoleOrStation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RealtimeSync] Error dispatching event {EventType} to SignalR", evt.EventType);
        }

        // 2. Dispatch to SSE Subscribers
        try
        {
            await _sseBroadcaster.BroadcastAsync(evt.EventType, evt);

            // Also broadcast under legacy SSE events if applicable
            await DispatchLegacySseAsync(evt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RealtimeSync] Error dispatching event {EventType} to SSE", evt.EventType);
        }
    }

    private async Task DispatchToSignalRAsync(RealtimeEvent evt, EventScope scope, string? targetRoleOrStation)
    {
        // Target selection
        IClientProxy targetClients;
        string? restaurantGroup = null;
        int? trackedRestaurantConnections = null;

        switch (scope)
        {
            case EventScope.Restaurant when evt.BranchId.HasValue:
                restaurantGroup = $"restaurant_{evt.BranchId.Value}";
                targetClients = _hubContext.Clients.Group(restaurantGroup);
                trackedRestaurantConnections = _connections.Values.Count(connection => connection.BranchId == evt.BranchId.Value);
                if (string.Equals(evt.EventType, "restaurantSetting:updated", StringComparison.OrdinalIgnoreCase))
                {
                    var themeData = System.Text.Json.JsonSerializer.SerializeToElement(evt.Data);
                    var accentColor = themeData.ValueKind == System.Text.Json.JsonValueKind.Object &&
                        (themeData.TryGetProperty("accentColor", out var accent) || themeData.TryGetProperty("AccentColor", out accent))
                            ? accent.GetString()
                            : "unavailable";
                    _logger.LogInformation(
                        "Theme event target selected. Event={EventType}, RestaurantId={RestaurantId}, Group={GroupName}, TrackedConnections={ConnectionCount}, AccentColor={AccentColor}",
                        evt.EventType, evt.BranchId.Value, restaurantGroup, trackedRestaurantConnections, accentColor);
                }
                break;

            case EventScope.Role when !string.IsNullOrWhiteSpace(targetRoleOrStation):
                targetClients = _hubContext.Clients.Group($"role_{targetRoleOrStation.Trim().ToLowerInvariant()}");
                break;

            case EventScope.Station when !string.IsNullOrWhiteSpace(targetRoleOrStation):
                targetClients = _hubContext.Clients.Group(targetRoleOrStation.Trim().ToLowerInvariant());
                break;

            case EventScope.User when !string.IsNullOrWhiteSpace(targetRoleOrStation):
                targetClients = _hubContext.Clients.Group($"user_{targetRoleOrStation.Trim()}");
                break;

            case EventScope.All:
            default:
                targetClients = _hubContext.Clients.All;
                break;
        }

        // Send to general real-time stream "AppEvent"
        await targetClients.SendAsync("AppEvent", evt);

        // Send to specific event channel (e.g. "order:created")
        if (!string.IsNullOrWhiteSpace(evt.EventType))
        {
            await targetClients.SendAsync(evt.EventType, evt);
        }

        // Send to module channel (e.g. "module:orders")
        if (!string.IsNullOrWhiteSpace(evt.Module))
        {
            await targetClients.SendAsync($"module:{evt.Module.ToLowerInvariant()}", evt);
        }

        if (string.Equals(evt.EventType, "restaurantSetting:updated", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation(
                "Theme SignalR broadcast completed. RestaurantId={RestaurantId}, Group={GroupName}, TrackedConnections={ConnectionCount}",
                evt.BranchId, restaurantGroup, trackedRestaurantConnections);
        }

        // Send legacy SignalR events for complete backward compatibility
        await DispatchLegacySignalRAsync(evt);
    }

    private async Task DispatchLegacySignalRAsync(RealtimeEvent evt)
    {
        try
        {
            switch (evt.EventType.ToLowerInvariant())
            {
                case "order:created":
                case "order:updated":
                case "order:statuschanged":
                    await _hubContext.Clients.Group("floor").SendAsync("OrderUpdated", evt.Data ?? evt);
                    break;

                case "order:tabletransferred":
                case "table:updated":
                case "table:statuschanged":
                    await _hubContext.Clients.All.SendAsync("TableStatusUpdated", evt.Data ?? evt);
                    break;

                case "kot:created":
                    await _hubContext.Clients.Group("kitchen").SendAsync("ReceiveNewKOT", evt.Data ?? evt);
                    await _hubContext.Clients.All.SendAsync("KotOrderCreated", evt.Data ?? evt);
                    break;

                case "kot:updated":
                case "kot:statuschanged":
                    await _hubContext.Clients.Group("kitchen").SendAsync("KotOrderUpdated", evt.Data ?? evt);
                    await _hubContext.Clients.All.SendAsync("KotOrderUpdated", evt.Data ?? evt);
                    break;

                case "kot:cancelled":
                    await _hubContext.Clients.All.SendAsync("KotOrderCancelled", evt.Data ?? evt);
                    break;

                case "bot:created":
                    await _hubContext.Clients.Group("bar").SendAsync("ReceiveNewBOT", evt.Data ?? evt);
                    await _hubContext.Clients.All.SendAsync("ReceiveBarKotCreated", evt.Data ?? evt);
                    break;

                case "takeaway:created":
                    await _hubContext.Clients.Group("floor").SendAsync("TakeawayOrderCreated", evt.Data ?? evt);
                    break;

                case "takeaway:statuschanged":
                    await _hubContext.Clients.Group("floor").SendAsync("TakeawayStatusUpdated", evt.Data ?? evt);
                    break;

                case "takeaway:cancelled":
                    await _hubContext.Clients.Group("floor").SendAsync("TakeawayOrderCancelled", evt.Data ?? evt);
                    break;

                case "tablelock:acquired":
                case "tablelock:released":
                    await _hubContext.Clients.All.SendAsync("TableLockUpdated", evt.Data ?? evt);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RealtimeSync] Could not send legacy SignalR alias for {EventType}", evt.EventType);
        }
    }

    private async Task DispatchLegacySseAsync(RealtimeEvent evt)
    {
        try
        {
            switch (evt.EventType.ToLowerInvariant())
            {
                case "table:updated":
                case "table:created":
                case "table:deleted":
                case "table:statuschanged":
                    await _sseBroadcaster.BroadcastAsync("SYNC_TABLES", evt.Data ?? evt);
                    break;

                case "tablelock:acquired":
                case "tablelock:released":
                    await _sseBroadcaster.BroadcastAsync("SYNC_TABLE_LOCKS", evt.Data ?? evt);
                    break;

                case "kot:created":
                    await _sseBroadcaster.BroadcastAsync("KOT_CREATED", evt.Data ?? evt);
                    break;

                case "kot:updated":
                case "kot:statuschanged":
                    await _sseBroadcaster.BroadcastAsync("KOT_STATUS_UPDATED", evt.Data ?? evt);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RealtimeSync] Could not send legacy SSE alias for {EventType}", evt.EventType);
        }
    }

    public IReadOnlyList<RealtimeEvent> GetMissedEvents(long? branchId, string? lastEventId, int maxCount = 50)
    {
        var list = _recentEvents.ToList();
        if (list.Count == 0) return Array.Empty<RealtimeEvent>();

        int startIndex = 0;
        if (!string.IsNullOrWhiteSpace(lastEventId))
        {
            int idx = list.FindIndex(e => string.Equals(e.EventId, lastEventId, StringComparison.OrdinalIgnoreCase));
            if (idx >= 0)
            {
                startIndex = idx + 1;
            }
        }

        var query = list.Skip(startIndex);
        if (branchId.HasValue && branchId.Value > 0)
        {
            query = query.Where(e => !e.BranchId.HasValue || e.BranchId == branchId.Value);
        }

        return query.Take(Math.Max(1, Math.Min(maxCount, 200))).ToList();
    }

    public IReadOnlyList<RealtimeEvent> GetRecentEvents(long? branchId, int maxCount = 50)
    {
        var list = _recentEvents.ToList();
        var query = list.AsEnumerable();
        if (branchId.HasValue && branchId.Value > 0)
        {
            query = query.Where(e => !e.BranchId.HasValue || e.BranchId == branchId.Value);
        }

        return query.OrderByDescending(e => e.Timestamp)
                    .Take(Math.Max(1, Math.Min(maxCount, 200)))
                    .Reverse()
                    .ToList();
    }

    public IReadOnlyDictionary<string, object> GetDiagnostics()
    {
        return new Dictionary<string, object>
        {
            { "activeConnections", _connections.Count },
            { "bufferedEventsCount", _recentEvents.Count },
            { "cachedDedupKeys", _dedupCache.Count },
            { "timestamp", DateTime.UtcNow }
        };
    }

    private void CleanExpiredDedup(DateTime now)
    {
        if (_dedupCache.Count > 1000)
        {
            foreach (var kvp in _dedupCache)
            {
                if (kvp.Value <= now)
                {
                    _dedupCache.TryRemove(kvp.Key, out _);
                }
            }
        }
    }

    private class ClientConnectionInfo
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? Role { get; set; }
        public long? BranchId { get; set; }
        public DateTime ConnectedAt { get; set; }
    }
}
