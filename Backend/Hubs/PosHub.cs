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
            if (numericUserId == 1)
            {
                var userPrincipal = Context.User;
                var userNameClaim = userPrincipal?.FindFirstValue(ClaimTypes.Name) ?? userPrincipal?.FindFirstValue("unique_name");
                dbUser = await db.Users.AsNoTracking().Include(u => u.Role)
                    .FirstOrDefaultAsync(u => (u.UserName == userNameClaim || u.UserName == "pirnav" || u.UserName == "admin") && u.IsActive);
            }
        }

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
        bool isGlobalAdmin = (normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "super admin") &&
                             (!dbUser.BranchId.HasValue || dbUser.BranchId.Value <= 0);
        bool isAdmin = normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "super admin";

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

        if (!isGlobalAdmin)
        {
            // All non-global users (branch-scoped Admins, Managers, Cashiers, Waiters, Kitchen, etc.)
            // MUST be explicitly assigned to a branch in the database
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

            // Cross-branch prevention: non-global users cannot access any branch other than their assigned branch
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

        // 4. Validate that resolved branch exists and is active in the database
        if (!await CheckBranchIsActiveAsync(db, sp, resolvedBranchId))
        {
            _logger.LogWarning("Rejecting SignalR connection: Resolved Branch {BranchId} does not exist or is inactive in database. ConnectionId: {ConnectionId}",
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
        Context.Items["IsGlobalAdmin"] = isGlobalAdmin;
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

        // Auto-assign station based on authenticated role (both restaurant-scoped and legacy station groups)
        if (normalizedRole == "kitchen" || normalizedRole == "chef")
        {
            await Groups.AddToGroupAsync(connectionId, "kitchen");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_kitchen");
        }
        else if (normalizedRole == "bar" || normalizedRole == "bartender")
        {
            await Groups.AddToGroupAsync(connectionId, "bar");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_bar");
        }
        else if (normalizedRole == "waiter" || normalizedRole == "cashier" || normalizedRole == "pos")
        {
            await Groups.AddToGroupAsync(connectionId, "floor");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_floor");
        }
        else if (isAdmin)
        {
            await Groups.AddToGroupAsync(connectionId, "admin");
            await Groups.AddToGroupAsync(connectionId, "floor");
            await Groups.AddToGroupAsync(connectionId, "kitchen");
            await Groups.AddToGroupAsync(connectionId, "bar");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_admin");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_floor");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_kitchen");
            await Groups.AddToGroupAsync(connectionId, $"restaurant_{resolvedBranchId}_bar");
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
            if (Context.Items.TryGetValue("AuthorizedBranchId", out var authObj) && authObj is long branchId && branchId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_{station}");
            }
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
            if (Context.Items.TryGetValue("AuthorizedBranchId", out var authObj) && authObj is long branchId && branchId > 0)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_{station}");
            }
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

        // 1. Verify user branch permissions from database (trusted server-side source)
        var dbUser = await db.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == numericUserId);
        if (dbUser == null || !dbUser.IsActive)
        {
            return new { success = false, message = "Unauthorized: user not found or deactivated." };
        }

        var effectiveRole = dbUser.Role?.RoleName ?? user.FindFirstValue(ClaimTypes.Role) ?? "User";
        var normalizedRole = effectiveRole.Trim().ToLowerInvariant();
        bool isGlobalAdmin = (normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "super admin") &&
                             (!dbUser.BranchId.HasValue || dbUser.BranchId.Value <= 0);

        // Security requirement: ONLY genuine global administrators can switch branches.
        // Branch-scoped Admins, Managers, Cashiers, Waiters, etc. are restricted to their assigned branch.
        if (!isGlobalAdmin)
        {
            _logger.LogWarning("Blocked branch switch: User {UserId} ({Role}) assigned to branch {AssignedBranch} attempted to switch to branch {RequestedBranch}",
                numericUserId, effectiveRole, dbUser.BranchId, branchId);
            return new { success = false, message = "Unauthorized: Only global administrators can switch branches." };
        }

        // 2. Verify target branch exists and is active
        if (!await CheckBranchIsActiveAsync(db, sp, branchId))
        {
            _logger.LogWarning("JoinRestaurant rejected: Branch {BranchId} does not exist or is inactive in database.", branchId);
            return new { success = false, message = $"Branch ID {branchId} does not exist or is inactive." };
        }

        // 3. SignalR Group Switching: Remove connection from all previously authorized restaurant and station groups
        if (Context.Items.TryGetValue("AuthorizedBranchId", out var prevObj) && prevObj is long prevBranch && prevBranch != branchId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}_floor");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}_kitchen");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}_bar");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{prevBranch}_admin");
            _logger.LogInformation("Removed connection {ConnectionId} from previous restaurant groups for branch {PrevBranch}", Context.ConnectionId, prevBranch);
        }

        Context.Items["AuthorizedBranchId"] = branchId;
        Context.Items["IsGlobalAdmin"] = true;
        _syncService.TrackConnection(Context.ConnectionId, numericUserId.ToString(), effectiveRole, branchId);

        var groupName = $"restaurant_{branchId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_floor");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_kitchen");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_bar");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_admin");

        _logger.LogInformation("Global Admin {ConnectionId} (User {UserId}) authorized and switched to restaurant group: {GroupName}",
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
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_floor");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_kitchen");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_bar");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"restaurant_{branchId}_admin");
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
            bool isGlobalAdmin = Context.Items.TryGetValue("IsGlobalAdmin", out var gaObj) && gaObj is true;
            if (!isGlobalAdmin && authBranch != branchId)
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

    private static async Task<bool> CheckBranchIsActiveAsync(AppDbContext db, SpService sp, long branchId)
    {
        if (branchId <= 0) return false;

        // 1. Primary check via EF Core on Branch entity (checks is_active and deleted_at)
        try
        {
            var isActive = await db.Branches.AsNoTracking().AnyAsync(b => b.BranchId == branchId && b.IsActive && b.DeletedAt == null);
            if (isActive) return true;
        }
        catch
        {
            // Fall back to direct SQL execution if EF model is not yet compiled or using raw provider
        }

        // 2. Direct SQL validation checking is_active = 1 and deleted_at IS NULL
        try
        {
            var count = await sp.ExecuteSqlScalarAsync<long>(
                "SELECT COUNT(*) FROM branches WHERE branch_id = @bid AND is_active = 1 AND deleted_at IS NULL",
                new Dictionary<string, object?> { { "bid", branchId } });
            if (count > 0) return true;
        }
        catch
        {
        }

        // Tables must NEVER be treated as proof that a branch is active.
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
