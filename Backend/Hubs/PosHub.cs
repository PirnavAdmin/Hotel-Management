namespace HMS.Hubs;

using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class PosHub : Hub
{
    private readonly IRealtimeSyncService _syncService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PosHub> _logger;

    public PosHub(IRealtimeSyncService syncService, IServiceScopeFactory scopeFactory, ILogger<PosHub> logger)
    {
        _syncService = syncService;
        _scopeFactory = scopeFactory;
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

        bool isAuthenticated = user?.Identity?.IsAuthenticated == true;

        if (!isAuthenticated)
        {
            var httpContext = Context.GetHttpContext();
            var tokenFromQuery = httpContext?.Request.Query["access_token"].ToString();
            var env = httpContext?.RequestServices.GetService<IWebHostEnvironment>();
            var config = httpContext?.RequestServices.GetService<IConfiguration>();
            bool allowMock = env?.IsDevelopment() == true &&
                             !(env?.IsProduction() == true) &&
                             config?.GetValue<bool>("Authentication:AllowMockJwtInDevelopment", false) == true;

            if (allowMock && !string.IsNullOrWhiteSpace(tokenFromQuery) && tokenFromQuery.StartsWith("mock-jwt-token", StringComparison.OrdinalIgnoreCase))
            {
                isAuthenticated = true;
                userId = "1";
                roleName = "Admin";
                _logger.LogInformation("Accepted development mock token for PosHub: {ConnectionId}", connectionId);
            }
        }

        if (!isAuthenticated || string.IsNullOrWhiteSpace(userId) || !long.TryParse(userId, out var numericUserId) || numericUserId <= 0)
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

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sp = scope.ServiceProvider.GetRequiredService<SpService>();

        // 1. Retrieve user from database (trusted server-side source)
        var dbUser = await db.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == numericUserId);
        if (dbUser == null || !dbUser.IsActive)
        {
            _logger.LogWarning("Rejecting SignalR connection: User {UserId} not found or inactive. ConnectionId: {ConnectionId}", numericUserId, connectionId);
            await Clients.Caller.SendAsync("Connected", new
            {
                connectionId = connectionId,
                authenticated = false,
                error = "Unauthorized. User account not found or deactivated.",
                timestamp = DateTime.UtcNow
            });
            Context.Abort();
            return;
        }

        var effectiveRole = dbUser.Role?.RoleName ?? roleName ?? "User";
        var normalizedRole = effectiveRole.Trim().ToLowerInvariant();
        bool isAdmin = normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "manager";

        // 2. Parse any client-requested branch context (from query or token claim)
        var httpContextRef = Context.GetHttpContext();
        string? queryBranch = httpContextRef?.Request.Query["branchId"].ToString()
            ?? httpContextRef?.Request.Query["restaurantId"].ToString();
        long.TryParse(queryBranch, out long requestedBranchId);
        if (requestedBranchId <= 0 && TryParseRestaurantId(queryBranch, out var qParsedBranch))
        {
            requestedBranchId = qParsedBranch;
        }

        string? branchClaim = user?.FindFirstValue("branchId");
        string? restaurantClaim = user?.FindFirstValue("restaurantId") ?? user?.FindFirstValue("restaurant_id");
        if (requestedBranchId <= 0 && long.TryParse(branchClaim, out var claimBranch) && claimBranch > 0)
        {
            requestedBranchId = claimBranch;
        }
        if (requestedBranchId <= 0 && TryParseRestaurantId(restaurantClaim, out var restClaimBranch))
        {
            requestedBranchId = restClaimBranch;
        }

        // 3. Resolve and validate branch based on server-side user data and role permissions
        long resolvedBranchId = 0;

        if (!isAdmin)
        {
            // Non-administrative staff (Cashier, Waiter, Kitchen, etc.) MUST be explicitly assigned to a branch in the database
            if (!dbUser.BranchId.HasValue || dbUser.BranchId.Value <= 0)
            {
                _logger.LogWarning("Rejecting SignalR connection: User {UserId} ({Role}) has no branch association. ConnectionId: {ConnectionId}",
                    numericUserId, effectiveRole, connectionId);
                await Clients.Caller.SendAsync("Connected", new
                {
                    connectionId = connectionId,
                    authenticated = false,
                    error = "User is not associated with any restaurant branch. Access denied.",
                    timestamp = DateTime.UtcNow
                });
                Context.Abort();
                return;
            }

            // Cross-branch prevention: non-admin cannot access any branch other than their assigned branch
            if (requestedBranchId > 0 && requestedBranchId != dbUser.BranchId.Value)
            {
                _logger.LogWarning("Cross-branch connection rejected: User {UserId} ({Role}) assigned to branch {AssignedBranch} requested branch {RequestedBranch}. ConnectionId: {ConnectionId}",
                    numericUserId, effectiveRole, dbUser.BranchId.Value, requestedBranchId, connectionId);
                await Clients.Caller.SendAsync("Connected", new
                {
                    connectionId = connectionId,
                    authenticated = false,
                    error = "Unauthorized. You are not assigned to the requested branch.",
                    timestamp = DateTime.UtcNow
                });
                Context.Abort();
                return;
            }

            resolvedBranchId = dbUser.BranchId.Value;
        }
        else
        {
            // Administrative staff (Admin / Manager)
            if (dbUser.BranchId.HasValue && dbUser.BranchId.Value > 0)
            {
                // Admin is assigned to a specific branch in DB
                if (requestedBranchId > 0 && requestedBranchId != dbUser.BranchId.Value)
                {
                    _logger.LogWarning("Admin branch mismatch: Admin {UserId} assigned to branch {AssignedBranch} requested branch {RequestedBranch}. ConnectionId: {ConnectionId}",
                        numericUserId, dbUser.BranchId.Value, requestedBranchId, connectionId);
                    await Clients.Caller.SendAsync("Connected", new
                    {
                        connectionId = connectionId,
                        authenticated = false,
                        error = "Unauthorized. Administrator is assigned to a different branch.",
                        timestamp = DateTime.UtcNow
                    });
                    Context.Abort();
                    return;
                }
                resolvedBranchId = dbUser.BranchId.Value;
            }
            else
            {
                // Global Administrator without a single branch lock in DB:
                // Must specify a target branch via query or token claims. NEVER automatically assign branch 1 as fallback!
                if (requestedBranchId > 0)
                {
                    resolvedBranchId = requestedBranchId;
                }
                else
                {
                    _logger.LogWarning("Rejecting SignalR connection: Global Admin {UserId} did not provide a branch context. ConnectionId: {ConnectionId}",
                        numericUserId, connectionId);
                    await Clients.Caller.SendAsync("Connected", new
                    {
                        connectionId = connectionId,
                        authenticated = false,
                        error = "Branch context could not be identified or is missing. Please specify a valid branch ID.",
                        timestamp = DateTime.UtcNow
                    });
                    Context.Abort();
                    return;
                }
            }
        }

        // 4. Validate that resolved branch exists in the database
        if (!await CheckBranchExistsAsync(db, sp, resolvedBranchId))
        {
            _logger.LogWarning("Rejecting SignalR connection: Resolved Branch {BranchId} does not exist in database. ConnectionId: {ConnectionId}",
                resolvedBranchId, connectionId);
            await Clients.Caller.SendAsync("Connected", new
            {
                connectionId = connectionId,
                authenticated = false,
                error = $"Branch ID {resolvedBranchId} does not exist or is inactive.",
                timestamp = DateTime.UtcNow
            });
            Context.Abort();
            return;
        }

        // Store authorized branch state in connection context items
        Context.Items["AuthorizedBranchId"] = resolvedBranchId;
        Context.Items["IsAdmin"] = isAdmin;
        Context.Items["UserId"] = numericUserId;
        Context.Items["RoleName"] = effectiveRole;

        // Register connection tracking and join only the server-validated restaurant group
        _syncService.TrackConnection(connectionId, numericUserId.ToString(), effectiveRole, resolvedBranchId);

        // Join user-specific group
        await Groups.AddToGroupAsync(connectionId, $"user_{numericUserId}");

        // Join role-specific group
        if (!string.IsNullOrWhiteSpace(normalizedRole))
        {
            await Groups.AddToGroupAsync(connectionId, $"role_{normalizedRole}");
        }

        // Join restaurant-specific group
        var restaurantGroupName = $"restaurant_{resolvedBranchId}";
        await Groups.AddToGroupAsync(connectionId, restaurantGroupName);
        _logger.LogInformation(
            "POS SignalR connection authorized. ConnectionId={ConnectionId}, UserId={UserId}, Role={Role}, BranchId={BranchId}, Group={GroupName}",
            connectionId, numericUserId, effectiveRole, resolvedBranchId, restaurantGroupName);

        // Auto-assign station based on authenticated role
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
        else if (isAdmin)
        {
            await Groups.AddToGroupAsync(connectionId, "admin");
            await Groups.AddToGroupAsync(connectionId, "floor");
            await Groups.AddToGroupAsync(connectionId, "kitchen");
            await Groups.AddToGroupAsync(connectionId, "bar");
        }

        // Send connection acknowledgement to client with validated branch
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = connectionId,
            authenticated = true,
            userId = numericUserId.ToString(),
            role = effectiveRole,
            branchId = resolvedBranchId,
            timestamp = DateTime.UtcNow
        });

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _syncService.UntrackConnection(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Clients join specific station based on role ("floor", "kitchen", "bar", "admin")
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

    // Restaurant-specific group isolation. Enforces server-side authorization check before allowing a join.
    public async Task<object> JoinRestaurant(long branchId)
    {
        if (branchId <= 0)
        {
            return new { success = false, message = "Invalid restaurant/branch ID." };
        }

        var user = Context.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return new { success = false, message = "Authentication required." };
        }

        string? userIdStr = user.FindFirstValue("userId")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        if (!long.TryParse(userIdStr, out var numericUserId) || numericUserId <= 0)
        {
            return new { success = false, message = "Unauthorized: invalid user identifier." };
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sp = scope.ServiceProvider.GetRequiredService<SpService>();

        // 1. Verify branch exists
        if (!await CheckBranchExistsAsync(db, sp, branchId))
        {
            _logger.LogWarning("JoinRestaurant rejected: Branch {BranchId} does not exist in database.", branchId);
            return new { success = false, message = $"Branch ID {branchId} does not exist or is inactive." };
        }

        // 2. Verify user branch permissions from database
        var dbUser = await db.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == numericUserId);
        if (dbUser == null || !dbUser.IsActive)
        {
            return new { success = false, message = "Unauthorized: user not found or deactivated." };
        }

        var effectiveRole = dbUser.Role?.RoleName ?? user.FindFirstValue(ClaimTypes.Role) ?? "User";
        var normalizedRole = effectiveRole.Trim().ToLowerInvariant();
        bool isAdmin = normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "manager";

        if (!isAdmin)
        {
            if (!dbUser.BranchId.HasValue || dbUser.BranchId.Value != branchId)
            {
                _logger.LogWarning("Blocked cross-branch join: User {UserId} ({Role}) assigned to branch {AssignedBranch} attempted to join branch {RequestedBranch}",
                    numericUserId, effectiveRole, dbUser.BranchId, branchId);
                return new { success = false, message = "Unauthorized: user is not assigned to the requested branch." };
            }
        }
        else
        {
            if (dbUser.BranchId.HasValue && dbUser.BranchId.Value > 0 && dbUser.BranchId.Value != branchId)
            {
                _logger.LogWarning("Blocked admin branch mismatch join: Admin {UserId} assigned to branch {AssignedBranch} attempted to join branch {RequestedBranch}",
                    numericUserId, dbUser.BranchId.Value, branchId);
                return new { success = false, message = "Unauthorized: administrator is assigned to a different branch." };
            }
        }

        // Leave previous branch group if switching
        if (Context.Items.TryGetValue("AuthorizedBranchId", out var prevObj) && prevObj is long prevBranch && prevBranch != branchId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}");
        }

        Context.Items["AuthorizedBranchId"] = branchId;
        _syncService.TrackConnection(Context.ConnectionId, numericUserId.ToString(), effectiveRole, branchId);

        var groupName = $"restaurant_{branchId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} (User {UserId}) authorized and joined restaurant group: {GroupName}",
            Context.ConnectionId, numericUserId, groupName);
        await Clients.Caller.SendAsync("RestaurantJoined", new { branchId, timestamp = DateTime.UtcNow });
        return new { success = true, branchId, message = $"Successfully joined restaurant {branchId}." };
    }

    public async Task LeaveRestaurant(long branchId)
    {
        if (branchId > 0 && Context.User?.Identity?.IsAuthenticated == true)
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

    // Support recovery of missed updates after client reconnection, with branch authorization check
    public Task<RealtimeMissedEventsResult> GetMissedEvents(long branchId, string? lastEventId, int maxCount = 50)
    {
        var user = Context.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return Task.FromResult(new RealtimeMissedEventsResult
            {
                Success = false,
                BranchId = branchId,
                LastEventId = lastEventId,
                Count = 0,
                Events = Array.Empty<RealtimeEvent>()
            });
        }

        // Validate that client is authorized for this branch
        if (Context.Items.TryGetValue("AuthorizedBranchId", out var authBranchObj) && authBranchObj is long authBranch)
        {
            bool isAdmin = Context.Items.TryGetValue("IsAdmin", out var adminObj) && adminObj is true;
            if (!isAdmin && authBranch != branchId)
            {
                _logger.LogWarning("Blocked cross-branch GetMissedEvents: Client authorized for branch {AuthBranch} requested events for branch {RequestedBranch}",
                    authBranch, branchId);
                return Task.FromResult(new RealtimeMissedEventsResult
                {
                    Success = false,
                    BranchId = branchId,
                    LastEventId = lastEventId,
                    Count = 0,
                    Events = Array.Empty<RealtimeEvent>()
                });
            }
        }

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

    private static async Task<bool> CheckBranchExistsAsync(AppDbContext db, SpService sp, long branchId)
    {
        if (branchId <= 0) return false;
        try
        {
            var count = await sp.ExecuteSqlScalarAsync<long>(
                "SELECT COUNT(*) FROM branches WHERE branch_id = @bid",
                new Dictionary<string, object?> { { "bid", branchId } });
            if (count > 0) return true;
        }
        catch
        {
            // Fallback if branches table is queried differently or when running with in-memory provider
        }

        try
        {
            if (await db.RestaurantTables.AnyAsync(t => t.BranchId == branchId)) return true;
        }
        catch { }

        return false;
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
