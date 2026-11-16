using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HMS.Models;

namespace HMS.Services;

public enum EventScope
{
    /// <summary>
    /// Broadcast to all users of the specified restaurant/branch (restaurant_{branchId}).
    /// </summary>
    Restaurant,

    /// <summary>
    /// Broadcast to members of a specific role group (role_{roleName}).
    /// </summary>
    Role,

    /// <summary>
    /// Broadcast to a specific station group (floor, kitchen, bar, admin).
    /// </summary>
    Station,

    /// <summary>
    /// Broadcast to a specific user (user_{userId}).
    /// </summary>
    User,

    /// <summary>
    /// Broadcast application-wide across all connected clients.
    /// </summary>
    All
}

public interface IRealtimeSyncService
{
    Task PublishAsync(
        RealtimeEvent evt,
        EventScope scope = EventScope.Restaurant,
        string? targetRoleOrStation = null);

    IReadOnlyList<RealtimeEvent> GetMissedEvents(long? branchId, string? lastEventId, int maxCount = 50);

    IReadOnlyList<RealtimeEvent> GetRecentEvents(long? branchId, int maxCount = 50);

    int ActiveConnectionCount { get; }

    void TrackConnection(string connectionId, string? userId, string? role, long? branchId);

    void UntrackConnection(string connectionId);

    IReadOnlyDictionary<string, object> GetDiagnostics();
}
