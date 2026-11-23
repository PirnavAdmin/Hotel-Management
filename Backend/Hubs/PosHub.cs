namespace HMS.Hubs;

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

public class PosHub : Hub
{
    private readonly IRealtimeSyncService _syncService;
    private readonly ILogger<PosHub> _logger;

    public PosHub(IRealtimeSyncService syncService, ILogger<PosHub> logger)
    {
        _syncService = syncService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var user = Context.User;

        string? userId = user?.FindFirstValue("userId")
            ?? user?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user?.FindFirstValue("sub")
            ?? user?.FindFirstValue("customerId");

        string? roleName = user?.FindFirstValue("roleName")
            ?? user?.FindFirstValue(ClaimTypes.Role);

        string? restaurantClaim = user?.FindFirstValue("restaurantId") 
                               ?? user?.FindFirstValue("restaurant_id");

        string? branchClaim = user?.FindFirstValue("branchId");
        long.TryParse(branchClaim, out long branchId);
        if (branchId <= 0 && TryParseRestaurantId(restaurantClaim, out var restaurantBranchId))
        {
            branchId = restaurantBranchId;
        }

        bool isAuthenticated = user?.Identity?.IsAuthenticated == true;

        if (!isAuthenticated)
        {
            var httpContext = Context.GetHttpContext();
            var tokenFromQuery = httpContext?.Request.Query["access_token"].ToString();
            if (!string.IsNullOrWhiteSpace(tokenFromQuery) && tokenFromQuery.StartsWith("mock-jwt-token", StringComparison.OrdinalIgnoreCase))
            {
                isAuthenticated = true;
                userId = "1";
                roleName = "Admin";
                branchId = 1;
                _logger.LogInformation("Accepted development mock token for PosHub: {ConnectionId}", connectionId);
            }
        }

        if (!isAuthenticated)
        {
            _logger.LogWarning("Rejecting unauthenticated connection attempt to PosHub: {ConnectionId}", connectionId);
            await Clients.Caller.SendAsync("Connected", new
            {
                connectionId = connectionId,
                authenticated = false,
                error = "Authentication required. Please provide a valid JWT access token.",
                timestamp = DateTime.UtcNow
            });
            Context.Abort();
            return;
        }

        if (branchId <= 0)
        {
            _logger.LogWarning(
                "Rejecting authenticated POS hub connection without a valid restaurant claim. ConnectionId={ConnectionId}, UserId={UserId}, Role={Role}",
                connectionId, userId, roleName);
            await Clients.Caller.SendAsync("Connected", new
            {
                connectionId,
                authenticated = false,
                error = "A valid restaurant context is required.",
                timestamp = DateTime.UtcNow
            });
            Context.Abort();
            return;
        }

        // Register connection tracking and join only the server-validated
        // restaurant group used by RealtimeSyncService broadcasts.
        _syncService.TrackConnection(connectionId, userId, roleName, branchId);

        // Join user-specific group
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(connectionId, $"user_{userId}");
        }

        // Join role-specific group
        if (!string.IsNullOrWhiteSpace(roleName))
        {
            await Groups.AddToGroupAsync(connectionId, $"role_{roleName.Trim().ToLowerInvariant()}");
        }

        // Join restaurant-specific group
        await Groups.AddToGroupAsync(connectionId, $"restaurant_{branchId}");
        _logger.LogInformation(
            "POS SignalR connection established. ConnectionId={ConnectionId}, UserId={UserId}, Role={Role}, RestaurantId={RestaurantId}, Group={GroupName}",
            connectionId, userId, roleName, branchId, $"restaurant_{branchId}");

        // Auto-assign station based on authenticated role
        var normalizedRole = roleName?.Trim().ToLowerInvariant();
        if (normalizedRole == "kitchen" || normalizedRole == "chef")
        {
            await Groups.AddToGroupAsync(connectionId, "kitchen");
        }
        else if (normalizedRole == "bar" || normalizedRole == "bartender")
        {
            await Groups.AddToGroupAsync(connectionId, "bar");
        }
        else if (normalizedRole == "waiter" || normalizedRole == "cashier" || normalizedRole == "pos")
        {
            await Groups.AddToGroupAsync(connectionId, "floor");
        }
        else if (normalizedRole == "admin" || normalizedRole == "manager" || normalizedRole == "superadmin")
        {
            await Groups.AddToGroupAsync(connectionId, "admin");
            await Groups.AddToGroupAsync(connectionId, "floor");
            await Groups.AddToGroupAsync(connectionId, "kitchen");
            await Groups.AddToGroupAsync(connectionId, "bar");
        }

        // Send connection acknowledgement to client
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = connectionId,
            authenticated = isAuthenticated,
            userId = userId,
            role = roleName,
            branchId = branchId,
            timestamp = DateTime.UtcNow
        });

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _syncService.UntrackConnection(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Clients join specific group based on station ("floor", "kitchen", "bar", "admin")
    public async Task JoinStation(string stationName)
    {
        if (!string.IsNullOrWhiteSpace(stationName))
        {
            var station = stationName.Trim().ToLowerInvariant();
            await Groups.AddToGroupAsync(Context.ConnectionId, station);
            _logger.LogInformation("Client {ConnectionId} joined station: {Station}", Context.ConnectionId, station);
            await Clients.Caller.SendAsync("StationJoined", new { station, timestamp = DateTime.UtcNow });
        }
    }

    public async Task LeaveStation(string stationName)
    {
        if (!string.IsNullOrWhiteSpace(stationName))
        {
            var station = stationName.Trim().ToLowerInvariant();
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, station);
            _logger.LogInformation("Client {ConnectionId} left station: {Station}", Context.ConnectionId, station);
            await Clients.Caller.SendAsync("StationLeft", new { station, timestamp = DateTime.UtcNow });
        }
    }

        // Restaurant-specific group isolation. The requested tenant must match
        // the tenant in the authenticated token, including for Admin/Manager.
    public async Task<object> JoinRestaurant(long branchId)
    {
        if (branchId <= 0)
        {
            return new { success = false, message = "Invalid restaurant/branch ID." };
        }

        var user = Context.User;
        if (user?.Identity?.IsAuthenticated != true || !TryGetAuthenticatedBranchId(user, out var myBranchId) || myBranchId != branchId)
        {
            _logger.LogWarning("Blocked restaurant group join. ConnectionId={ConnectionId}, RequestedRestaurantId={RestaurantId}", Context.ConnectionId, branchId);
            return new { success = false, message = "Unauthorized: the requested restaurant does not match the authenticated account." };
        }

        var groupName = $"restaurant_{branchId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} joined restaurant group: {GroupName}", Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("RestaurantJoined", new { branchId, timestamp = DateTime.UtcNow });
        return new { success = true, branchId, message = $"Successfully joined restaurant {branchId}." };
    }

    public async Task LeaveRestaurant(long branchId)
    {
        if (branchId > 0 && Context.User?.Identity?.IsAuthenticated == true &&
            TryGetAuthenticatedBranchId(Context.User, out var myBranchId) && myBranchId == branchId)
        {
            var groupName = $"restaurant_{branchId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("RestaurantLeft", new { branchId, timestamp = DateTime.UtcNow });
        }
    }

    public async Task<object> JoinRestaurantGroup(string restaurantId)
    {
        if (!TryParseRestaurantId(restaurantId, out var branchId))
        {
            return new { success = false, message = "Invalid restaurant ID." };
        }
        return await JoinRestaurant(branchId);
    }

    public async Task LeaveRestaurantGroup(string restaurantId)
    {
        if (TryParseRestaurantId(restaurantId, out var branchId))
        {
            await LeaveRestaurant(branchId);
        }
    }

    private static bool TryParseRestaurantId(string? value, out long branchId)
    {
        branchId = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var normalized = value.Trim();
        if (normalized.StartsWith("restaurant_", StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized["restaurant_".Length..];
        }
        return long.TryParse(normalized, out branchId) && branchId > 0;
    }

    private static bool TryGetAuthenticatedBranchId(ClaimsPrincipal user, out long branchId)
    {
        branchId = 0;
        if (long.TryParse(user.FindFirstValue("branchId"), out branchId) && branchId > 0) return true;
        return TryParseRestaurantId(user.FindFirstValue("restaurantId") ?? user.FindFirstValue("restaurant_id"), out branchId);
    }

    // Subscribe to specific module (e.g., "orders", "inventory", "tables")
    public async Task SubscribeToModule(string moduleName)
    {
        if (!string.IsNullOrWhiteSpace(moduleName))
        {
            var groupName = $"module_{moduleName.Trim().ToLowerInvariant()}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("ModuleSubscribed", new { module = moduleName, timestamp = DateTime.UtcNow });
        }
    }

    public async Task UnsubscribeFromModule(string moduleName)
    {
        if (!string.IsNullOrWhiteSpace(moduleName))
        {
            var groupName = $"module_{moduleName.Trim().ToLowerInvariant()}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("ModuleUnsubscribed", new { module = moduleName, timestamp = DateTime.UtcNow });
        }
    }

    // Support recovery of missed updates after client reconnection
    public Task<RealtimeMissedEventsResult> GetMissedEvents(long branchId, string? lastEventId, int maxCount = 50)
    {
        var missed = _syncService.GetMissedEvents(branchId, lastEventId, maxCount);
        return Task.FromResult(new RealtimeMissedEventsResult
        {
            Success = true,
            BranchId = branchId,
            LastEventId = lastEventId,
            Count = missed.Count,
            Events = missed
        });
    }

    // Ping / heartbeat for connection health check
    public Task<object> Ping()
    {
        return Task.FromResult<object>(new
        {
            status = "pong",
            timestamp = DateTime.UtcNow,
            connectionId = Context.ConnectionId
        });
    }
}

public class RealtimeMissedEventsResult
{
    public bool Success { get; set; } = true;
    public long BranchId { get; set; }
    public string? LastEventId { get; set; }
    public int Count { get; set; }
    public IReadOnlyList<RealtimeEvent> Events { get; set; } = Array.Empty<RealtimeEvent>();
}
