namespace HMS.Tests;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

public static class Issue21SecurityTests
{
    public static async Task<int> RunAsync(string[]? args = null)
    {
        Console.WriteLine("=======================================================================");
        Console.WriteLine("  STARTING ISSUE 2.1 SIGNALR BRANCH SECURITY VERIFICATION SUITE");
        Console.WriteLine("=======================================================================");

        int passed = 0;
        int failed = 0;

        async Task RunTest(string testName, Func<Task> testFunc)
        {
            try
            {
                Console.Write($"[TEST] {testName} ... ");
                await testFunc();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("PASSED");
                Console.ResetColor();
                Interlocked.Increment(ref passed);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("FAILED");
                Console.WriteLine($"       Error: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"       Inner: {ex.InnerException.Message}");
                }
                Console.ResetColor();
                Interlocked.Increment(ref failed);
            }
        }

        // Test 1: Global Admin branch switching
        await RunTest("1. Global Admin can connect to specified active branch and switch branches", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            var globalAdmin = harness.GlobalAdmin;
            var context = harness.CreateContext(globalAdmin, queryBranch: "1");
            var hub = harness.CreateHub(context);

            await hub.OnConnectedAsync();

            if (context.IsAborted) throw new Exception("Global Admin connection was unexpectedly aborted.");
            if (!context.Groups.Contains("restaurant_1")) throw new Exception("Global Admin was not added to restaurant_1 group.");
            if (context.Items["AuthorizedBranchId"] as long? != 1) throw new Exception("Authorized branch was not set to 1.");

            // Switch to Branch 2
            var result = await hub.JoinRestaurant(2);
            var resJson = System.Text.Json.JsonSerializer.Serialize(result);
            if (!resJson.Contains("\"success\":true")) throw new Exception($"JoinRestaurant(2) failed: {resJson}");

            if (!context.Groups.Contains("restaurant_2")) throw new Exception("Global Admin was not added to restaurant_2 after switch.");
            if (context.Groups.Contains("restaurant_1")) throw new Exception("Global Admin was NOT removed from restaurant_1 after switch.");
            if (context.Items["AuthorizedBranchId"] as long? != 2) throw new Exception("Authorized branch was not updated to 2.");
        });

        // Test 2: Branch-scoped Admin access restrictions
        await RunTest("2. Branch-scoped Admin cannot access or switch to unauthorized branch", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            var branch1Admin = harness.Branch1Admin;

            // Attempt to connect to Branch 2
            var crossContext = harness.CreateContext(branch1Admin, queryBranch: "2");
            var crossHub = harness.CreateHub(crossContext);
            await crossHub.OnConnectedAsync();

            if (!crossContext.IsAborted) throw new Exception("Branch 1 Admin connecting to Branch 2 was NOT aborted.");

            // Connect to legitimate Branch 1
            var validContext = harness.CreateContext(branch1Admin, queryBranch: "1");
            var validHub = harness.CreateHub(validContext);
            await validHub.OnConnectedAsync();

            if (validContext.IsAborted) throw new Exception("Branch 1 Admin connection to Branch 1 was unexpectedly aborted.");

            // Attempt to switch to Branch 2 via JoinRestaurant
            var switchResult = await validHub.JoinRestaurant(2);
            var resJson = System.Text.Json.JsonSerializer.Serialize(switchResult);
            if (!resJson.Contains("\"success\":false") || !resJson.Contains("Only global administrators can switch branches"))
            {
                throw new Exception($"Branch-scoped Admin switch was not rejected properly: {resJson}");
            }
            if (validContext.Groups.Contains("restaurant_2")) throw new Exception("Branch 1 Admin was illegally added to restaurant_2 group.");
        });

        // Test 3: Inactive and nonexistent branches
        await RunTest("3. Inactive and nonexistent branches are strictly rejected", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            var globalAdmin = harness.GlobalAdmin;

            // 3a. Nonexistent branch 999
            var nonExistentContext = harness.CreateContext(globalAdmin, queryBranch: "999");
            var nonExistentHub = harness.CreateHub(nonExistentContext);
            await nonExistentHub.OnConnectedAsync();
            if (!nonExistentContext.IsAborted) throw new Exception("Connection to nonexistent branch 999 was NOT aborted.");

            // 3b. Inactive branch 3 (is_active = false)
            var inactiveContext = harness.CreateContext(globalAdmin, queryBranch: "3");
            var inactiveHub = harness.CreateHub(inactiveContext);
            await inactiveHub.OnConnectedAsync();
            if (!inactiveContext.IsAborted) throw new Exception("Connection to inactive branch 3 was NOT aborted.");

            // 3c. Soft-deleted branch 4 (deleted_at IS NOT NULL)
            var deletedContext = harness.CreateContext(globalAdmin, queryBranch: "4");
            var deletedHub = harness.CreateHub(deletedContext);
            await deletedHub.OnConnectedAsync();
            if (!deletedContext.IsAborted) throw new Exception("Connection to soft-deleted branch 4 was NOT aborted.");

            // 3d. Non-existent branch with existing tables (must not bypass)
            // Seed a table with branch 999 without an active branch record
            harness.Db.RestaurantTables.Add(new RestaurantTable { TableId = 9991, TableNumber = "T999", TableName = "Ghost Table", BranchId = 999 });
            await harness.Db.SaveChangesAsync();

            var bypassContext = harness.CreateContext(globalAdmin, queryBranch: "999");
            var bypassHub = harness.CreateHub(bypassContext);
            await bypassHub.OnConnectedAsync();
            if (!bypassContext.IsAborted) throw new Exception("Presence of tables illegally allowed connection to nonexistent branch 999.");
        });

        // Test 4: Switching from Branch 1 to Branch 2
        await RunTest("4. Switching from Branch 1 to Branch 2 updates all groups and removes old branch groups", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            var globalAdmin = harness.GlobalAdmin;
            var context = harness.CreateContext(globalAdmin, queryBranch: "1");
            var hub = harness.CreateHub(context);
            await hub.OnConnectedAsync();

            if (!context.Groups.Contains("restaurant_1")) throw new Exception("Missing restaurant_1 initially.");
            if (!context.Groups.Contains("restaurant_1_admin")) throw new Exception("Missing restaurant_1_admin initially.");

            var res = await hub.JoinRestaurant(2);
            var resJson = System.Text.Json.JsonSerializer.Serialize(res);
            if (!resJson.Contains("\"success\":true")) throw new Exception($"JoinRestaurant(2) failed: {resJson}");

            // Verify previous groups removed
            if (context.Groups.Contains("restaurant_1")) throw new Exception("restaurant_1 was not removed after switch.");
            if (context.Groups.Contains("restaurant_1_admin")) throw new Exception("restaurant_1_admin was not removed after switch.");
            if (context.Groups.Contains("restaurant_1_floor")) throw new Exception("restaurant_1_floor was not removed after switch.");
            if (context.Groups.Contains("restaurant_1_kitchen")) throw new Exception("restaurant_1_kitchen was not removed after switch.");
            if (context.Groups.Contains("restaurant_1_bar")) throw new Exception("restaurant_1_bar was not removed after switch.");

            // Verify new groups added
            if (!context.Groups.Contains("restaurant_2")) throw new Exception("restaurant_2 was not added after switch.");
            if (!context.Groups.Contains("restaurant_2_admin")) throw new Exception("restaurant_2_admin was not added after switch.");
            if (!context.Groups.Contains("restaurant_2_floor")) throw new Exception("restaurant_2_floor was not added after switch.");
        });

        // Test 5: No events received from previous branch after switching
        await RunTest("5. Client does not receive events from previous branch after switching", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            var globalAdmin = harness.GlobalAdmin;
            var context = harness.CreateContext(globalAdmin, queryBranch: "1");
            var hub = harness.CreateHub(context);
            await hub.OnConnectedAsync();

            // Switch to Branch 2
            await hub.JoinRestaurant(2);

            // Publish an event for Branch 1
            var b1Event = new RealtimeEvent
            {
                EventType = "order:updated",
                Module = "Orders",
                BranchId = 1,
                RecordId = "101",
                Data = new { orderId = 101, status = "Served" }
            };

            await harness.SyncService.PublishAsync(b1Event);

            // Ensure NO message was delivered to restaurant_1 for this connection
            var receivedForConn = harness.GetDeliveredEventsForConnection(context.ConnectionId);
            if (receivedForConn.Any(e => e.BranchId == 1))
            {
                throw new Exception("Connection received Branch 1 event after switching to Branch 2!");
            }

            // Publish an event for Branch 2
            var b2Event = new RealtimeEvent
            {
                EventType = "order:updated",
                Module = "Orders",
                BranchId = 2,
                RecordId = "202",
                Data = new { orderId = 202, status = "Active" }
            };

            await harness.SyncService.PublishAsync(b2Event);

            var b2Received = harness.GetDeliveredEventsForConnection(context.ConnectionId);
            if (!b2Received.Any(e => e.BranchId == 2 && e.RecordId == "202"))
            {
                throw new Exception("Connection did NOT receive Branch 2 event after switching to Branch 2!");
            }
        });

        // Test 6: Unauthorized cross-branch broadcasts prevented
        await RunTest("6. Realtime broadcasts are restricted strictly to authorized restaurant groups", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            // Client A on Branch 1 (Cashier)
            var cashierContext = harness.CreateContext(harness.Branch1Cashier, queryBranch: "1");
            var cashierHub = harness.CreateHub(cashierContext);
            await cashierHub.OnConnectedAsync();

            // Client B on Branch 2 (Waiter)
            var waiterContext = harness.CreateContext(harness.Branch2Waiter, queryBranch: "2");
            var waiterHub = harness.CreateHub(waiterContext);
            await waiterHub.OnConnectedAsync();

            // Dispatch KOT for Branch 1
            var b1Kot = new RealtimeEvent
            {
                EventType = "kot:created",
                Module = "Kitchen",
                BranchId = 1,
                RecordId = "501",
                Data = new { kotNumber = "KOT-001" }
            };
            await harness.SyncService.PublishAsync(b1Kot);

            // Dispatch table update for Branch 2
            var b2Table = new RealtimeEvent
            {
                EventType = "table:statusChanged",
                Module = "Tables",
                BranchId = 2,
                RecordId = "20",
                Data = new { tableId = 20, status = "Occupied" }
            };
            await harness.SyncService.PublishAsync(b2Table);

            // Assert Cashier on Branch 1 ONLY received Branch 1 events
            var cashierEvents = harness.GetDeliveredEventsForConnection(cashierContext.ConnectionId);
            if (cashierEvents.Any(e => e.BranchId != 1))
            {
                throw new Exception("Cashier on Branch 1 received non-Branch 1 events!");
            }
            if (!cashierEvents.Any(e => e.BranchId == 1 && e.RecordId == "501"))
            {
                throw new Exception("Cashier on Branch 1 did not receive Branch 1 KOT event!");
            }

            // Assert Waiter on Branch 2 ONLY received Branch 2 events
            var waiterEvents = harness.GetDeliveredEventsForConnection(waiterContext.ConnectionId);
            if (waiterEvents.Any(e => e.BranchId != 2))
            {
                throw new Exception("Waiter on Branch 2 received non-Branch 2 events!");
            }
            if (!waiterEvents.Any(e => e.BranchId == 2 && e.RecordId == "20"))
            {
                throw new Exception("Waiter on Branch 2 did not receive Branch 2 Table event!");
            }
        });

        // Test 7: Cashier and Waiter branch isolation
        await RunTest("7. Cashier and Waiter branch isolation and invalid branch rejection", async () =>
        {
            using var harness = new PosHubTestHarness();
            await harness.SeedAsync();

            // 7a. User without a branch association is rejected
            var noBranchUser = harness.NoBranchWaiter;
            var noBranchContext = harness.CreateContext(noBranchUser);
            var noBranchHub = harness.CreateHub(noBranchContext);
            await noBranchHub.OnConnectedAsync();
            if (!noBranchContext.IsAborted) throw new Exception("Waiter without branch association was NOT rejected.");

            // 7b. Cashier cannot call GetMissedEvents for another branch
            var cashier = harness.Branch1Cashier;
            var cContext = harness.CreateContext(cashier, queryBranch: "1");
            var cHub = harness.CreateHub(cContext);
            await cHub.OnConnectedAsync();

            var missedCross = await cHub.GetMissedEvents(branchId: 2, lastEventId: null);
            if (missedCross.Success) throw new Exception("Cashier calling GetMissedEvents for Branch 2 succeeded when it should be blocked.");

            // 7c. Cashier calling GetMissedEvents for assigned Branch 1 succeeds
            var missedLegit = await cHub.GetMissedEvents(branchId: 1, lastEventId: null);
            if (!missedLegit.Success) throw new Exception("Cashier calling GetMissedEvents for assigned Branch 1 failed.");
        });

        Console.WriteLine("=======================================================================");
        Console.ForegroundColor = failed == 0 ? ConsoleColor.Green : ConsoleColor.Red;
        Console.WriteLine($"  TEST RUN COMPLETED: {passed} PASSED, {failed} FAILED");
        Console.ResetColor();
        Console.WriteLine("=======================================================================");

        return failed == 0 ? 0 : 1;
    }
}

// ----------------------------------------------------------------------------------------------------
// TEST HARNESS & IN-MEMORY MOCKS
// ----------------------------------------------------------------------------------------------------

public class PosHubTestHarness : IDisposable
{
    public AppDbContext Db { get; }
    public SpService Sp { get; }
    public RealtimeSyncService SyncService { get; }
    public TestHubContext HubContext { get; }
    public IServiceScopeFactory ScopeFactory { get; }

    public User GlobalAdmin { get; private set; } = null!;
    public User Branch1Admin { get; private set; } = null!;
    public User Branch1Manager { get; private set; } = null!;
    public User Branch1Cashier { get; private set; } = null!;
    public User Branch2Waiter { get; private set; } = null!;
    public User NoBranchWaiter { get; private set; } = null!;

    private readonly ServiceProvider _serviceProvider;

    public PosHubTestHarness()
    {
        var dbName = "pos_test_db_" + Guid.NewGuid().ToString("N");
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        Db = new AppDbContext(dbOptions);

        var services = new ServiceCollection();
        services.AddSingleton(Db);
        services.AddSingleton(new SpService(Db));
        _serviceProvider = services.BuildServiceProvider();
        ScopeFactory = _serviceProvider.GetRequiredService<IServiceScopeFactory>();

        Sp = new SpService(Db);
        HubContext = new TestHubContext();
        SyncService = new RealtimeSyncService(HubContext, new TestSseBroadcaster(), NullLogger<RealtimeSyncService>.Instance);
    }

    public async Task SeedAsync()
    {
        // 1. Roles
        var rAdmin = new Role { RoleId = 1, RoleName = "Admin", IsActive = true };
        var rManager = new Role { RoleId = 2, RoleName = "Manager", IsActive = true };
        var rCashier = new Role { RoleId = 3, RoleName = "Cashier", IsActive = true };
        var rWaiter = new Role { RoleId = 4, RoleName = "Waiter", IsActive = true };
        Db.Roles.AddRange(rAdmin, rManager, rCashier, rWaiter);

        // 2. Branches
        var b1 = new Branch { BranchId = 1, BranchName = "Main Branch", IsActive = true, DeletedAt = null };
        var b2 = new Branch { BranchId = 2, BranchName = "Uptown Branch", IsActive = true, DeletedAt = null };
        var b3 = new Branch { BranchId = 3, BranchName = "Inactive Branch", IsActive = false, DeletedAt = null };
        var b4 = new Branch { BranchId = 4, BranchName = "Deleted Branch", IsActive = true, DeletedAt = DateTime.UtcNow.AddDays(-1) };
        Db.Branches.AddRange(b1, b2, b3, b4);

        // 3. Users
        GlobalAdmin = new User { UserId = 1, UserName = "globaladmin", RoleId = 1, Role = rAdmin, BranchId = null, IsActive = true };
        Branch1Admin = new User { UserId = 2, UserName = "b1admin", RoleId = 1, Role = rAdmin, BranchId = 1, IsActive = true };
        Branch1Manager = new User { UserId = 3, UserName = "b1manager", RoleId = 2, Role = rManager, BranchId = 1, IsActive = true };
        Branch1Cashier = new User { UserId = 4, UserName = "b1cashier", RoleId = 3, Role = rCashier, BranchId = 1, IsActive = true };
        Branch2Waiter = new User { UserId = 5, UserName = "b2waiter", RoleId = 4, Role = rWaiter, BranchId = 2, IsActive = true };
        NoBranchWaiter = new User { UserId = 6, UserName = "nobranch", RoleId = 4, Role = rWaiter, BranchId = null, IsActive = true };
        Db.Users.AddRange(GlobalAdmin, Branch1Admin, Branch1Manager, Branch1Cashier, Branch2Waiter, NoBranchWaiter);

        // 4. Tables
        Db.RestaurantTables.Add(new RestaurantTable { TableId = 10, TableNumber = "T1", TableName = "Table 1", BranchId = 1 });
        Db.RestaurantTables.Add(new RestaurantTable { TableId = 20, TableNumber = "T2", TableName = "Table 2", BranchId = 2 });

        await Db.SaveChangesAsync();
    }

    public TestHubCallerContext CreateContext(User user, string? queryBranch = null)
    {
        var claims = new List<Claim>
        {
            new Claim("userId", user.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "User"),
            new Claim("roleName", user.Role?.RoleName ?? "User"),
        };
        if (user.BranchId.HasValue)
        {
            claims.Add(new Claim("branchId", user.BranchId.Value.ToString()));
            claims.Add(new Claim("restaurantId", $"restaurant_{user.BranchId.Value}"));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var query = new QueryCollection(new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
        {
            { "branchId", queryBranch ?? "" }
        });

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Query = query;

        var connId = "conn_" + Guid.NewGuid().ToString("N");
        return new TestHubCallerContext(connId, principal, httpContext, HubContext.GroupManager);
    }

    public PosHub CreateHub(TestHubCallerContext context)
    {
        var hub = new PosHub(SyncService, ScopeFactory, NullLogger<PosHub>.Instance)
        {
            Context = context,
            Groups = HubContext.GroupManager,
            Clients = new TestCallerClients(context.ConnectionId, HubContext)
        };
        return hub;
    }

    public List<RealtimeEvent> GetDeliveredEventsForConnection(string connectionId)
    {
        var groups = HubContext.GroupManager.GetGroupsForConnection(connectionId);
        var events = new List<RealtimeEvent>();

        foreach (var group in groups)
        {
            if (HubContext.GroupDeliveries.TryGetValue(group, out var groupEvents))
            {
                events.AddRange(groupEvents);
            }
        }
        return events;
    }

    public void Dispose()
    {
        Db.Dispose();
        _serviceProvider.Dispose();
    }
}

public class TestHubContext : IHubContext<PosHub>
{
    public TestGroupManager GroupManager { get; } = new();
    public ConcurrentDictionary<string, List<RealtimeEvent>> GroupDeliveries { get; } = new();

    public IHubClients Clients => new TestHubClients(this);
    public IGroupManager Groups => GroupManager;
}

public class TestHubClients : IHubClients
{
    private readonly TestHubContext _context;

    public TestHubClients(TestHubContext context) => _context = context;

    public IClientProxy All => new TestGroupProxy("all", _context);
    public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => new TestGroupProxy("all", _context);
    public IClientProxy Client(string connectionId) => new TestGroupProxy($"client_{connectionId}", _context);
    public IClientProxy Clients(IReadOnlyList<string> connectionIds) => new TestGroupProxy("clients", _context);
    public IClientProxy Group(string groupName) => new TestGroupProxy(groupName, _context);
    public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => new TestGroupProxy(groupName, _context);
    public IClientProxy Groups(IReadOnlyList<string> groupNames) => new TestGroupProxy(groupNames.FirstOrDefault() ?? "group", _context);
    public IClientProxy User(string userId) => new TestGroupProxy($"user_{userId}", _context);
    public IClientProxy Users(IReadOnlyList<string> userIds) => new TestGroupProxy("users", _context);
}

public class TestGroupProxy : IClientProxy
{
    private readonly string _target;
    private readonly TestHubContext _context;

    public TestGroupProxy(string target, TestHubContext context)
    {
        _target = target;
        _context = context;
    }

    public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
    {
        if (args.Length > 0 && args[0] is RealtimeEvent evt)
        {
            _context.GroupDeliveries.AddOrUpdate(_target,
                _ => new List<RealtimeEvent> { evt },
                (_, list) => { lock (list) list.Add(evt); return list; });
        }
        return Task.CompletedTask;
    }
}

public class TestCallerClients : IHubCallerClients
{
    private readonly string _connectionId;
    private readonly TestHubContext _context;

    public TestCallerClients(string connectionId, TestHubContext context)
    {
        _connectionId = connectionId;
        _context = context;
    }

    public IClientProxy Caller => new TestSingleClientProxy();
    public IClientProxy Others => new TestGroupProxy("others", _context);
    public IClientProxy OthersInGroup(string groupName) => new TestGroupProxy(groupName, _context);
    public IClientProxy All => new TestGroupProxy("all", _context);
    public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => new TestGroupProxy("all", _context);
    public IClientProxy Client(string connectionId) => new TestGroupProxy($"client_{connectionId}", _context);
    public IClientProxy Clients(IReadOnlyList<string> connectionIds) => new TestGroupProxy("clients", _context);
    public IClientProxy Group(string groupName) => new TestGroupProxy(groupName, _context);
    public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => new TestGroupProxy(groupName, _context);
    public IClientProxy Groups(IReadOnlyList<string> groupNames) => new TestGroupProxy(groupNames.FirstOrDefault() ?? "group", _context);
    public IClientProxy User(string userId) => new TestGroupProxy($"user_{userId}", _context);
    public IClientProxy Users(IReadOnlyList<string> userIds) => new TestGroupProxy("users", _context);
}

public class TestSingleClientProxy : ISingleClientProxy, IClientProxy
{
    public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<T> InvokeCoreAsync<T>(string method, object?[] args, CancellationToken cancellationToken = default) => Task.FromResult<T>(default!);
}

public class TestGroupManager : IGroupManager
{
    private readonly ConcurrentDictionary<string, HashSet<string>> _connectionGroups = new();

    public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        _connectionGroups.AddOrUpdate(connectionId,
            _ => new HashSet<string> { groupName },
            (_, set) => { lock (set) set.Add(groupName); return set; });
        return Task.CompletedTask;
    }

    public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        if (_connectionGroups.TryGetValue(connectionId, out var set))
        {
            lock (set) set.Remove(groupName);
        }
        return Task.CompletedTask;
    }

    public HashSet<string> GetGroupsForConnection(string connectionId)
    {
        if (_connectionGroups.TryGetValue(connectionId, out var set))
        {
            lock (set) return new HashSet<string>(set);
        }
        return new HashSet<string>();
    }
}

public class TestHubCallerContext : HubCallerContext
{
    public override string ConnectionId { get; }
    public override ClaimsPrincipal? User { get; }
    public override string? UserIdentifier => User?.FindFirstValue(ClaimTypes.NameIdentifier);
    public override IDictionary<object, object?> Items { get; } = new Dictionary<object, object?>();
    public override IFeatureCollection Features { get; }
    public override CancellationToken ConnectionAborted => CancellationToken.None;

    public bool IsAborted { get; private set; }
    private readonly TestGroupManager _groupManager;

    public HashSet<string> Groups => _groupManager.GetGroupsForConnection(ConnectionId);

    public TestHubCallerContext(string connectionId, ClaimsPrincipal user, HttpContext httpContext, TestGroupManager groupManager)
    {
        ConnectionId = connectionId;
        User = user;
        _groupManager = groupManager;

        var features = new FeatureCollection();
        features.Set<Microsoft.AspNetCore.Http.Connections.Features.IHttpContextFeature>(new TestHttpContextFeature(httpContext));
        Features = features;
    }

    public override void Abort()
    {
        IsAborted = true;
    }
}

public class TestHttpContextFeature : Microsoft.AspNetCore.Http.Connections.Features.IHttpContextFeature
{
    public HttpContext? HttpContext { get; set; }
    public TestHttpContextFeature(HttpContext context) => HttpContext = context;
}

public class TestSseBroadcaster : ISseBroadcaster
{
    public int ActiveClientCount => 0;
    public Task BroadcastAsync(string eventType, object? payload) => Task.CompletedTask;
    public Task BroadcastRawAsync(string rawMessage) => Task.CompletedTask;
    public async IAsyncEnumerable<string> SubscribeAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask;
        yield break;
    }
}
