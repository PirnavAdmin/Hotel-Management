namespace HMS.Tests;

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using HMS.Controllers;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

public static class Phase331ASaaSAuthTests
{
    private sealed class StubEmailService : IEmailService
    {
        public Task SendEmailAsync(
            string recipientEmail,
            string subject,
            string htmlBody,
            string plainTextBody,
            System.Threading.CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    public static async Task<int> RunAsync(string[]? args = null)
    {
        Console.WriteLine("=======================================================================");
        Console.WriteLine("  STARTING PHASE 3.31A SAAS SCHEMA & AUTH HARDENING TESTS");
        Console.WriteLine("=======================================================================");

        int passed = 0;
        int failed = 0;

        async Task RunTest(string name, Func<Task> test)
        {
            Console.Write($"[TEST] {name} ... ");
            try
            {
                await test();
                Console.WriteLine("PASSED");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"FAILED: {ex.Message}");
                failed++;
            }
        }

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"pirnav_331a_{Guid.NewGuid():N}")
            .Options;

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "PirnavSuperSecretPhase331ATestKeyForUnitVerificationOnly!",
                ["Jwt:Issuer"] = "pirnav-test",
                ["Jwt:Audience"] = "pirnav-clients",
                ["Jwt:ExpiryMinutes"] = "60",
            })
            .Build();

        using var db = new AppDbContext(options);

        // Seed roles, org, restaurant, branch, users, permissions
        var superAdminRole = new Role { RoleId = 10, RoleName = "PlatformSuperAdmin", IsActive = true };
        var adminRole = new Role { RoleId = 1, RoleName = "Admin", IsActive = true };
        db.Roles.AddRange(superAdminRole, adminRole);

        var org = new Organization { OrganizationId = 100, Name = "Spice Group", Slug = "spice-group", Gstin = "29ABCDE1234F1Z5", Status = "Active" };
        var suspendedOrg = new Organization { OrganizationId = 101, Name = "Paused Group", Slug = "paused-group", Status = "Suspended" };
        db.Organizations.AddRange(org, suspendedOrg);

        var rest = new Restaurant { RestaurantId = 200, OrganizationId = 100, Name = "Spice Courtyard", Code = "spice-courtyard", Status = "Active" };
        var pausedRest = new Restaurant { RestaurantId = 201, OrganizationId = 101, Name = "Paused Diner", Code = "paused-diner", Status = "Suspended" };
        db.Restaurants.AddRange(rest, pausedRest);

        var branch = new Branch { BranchId = 300, RestaurantId = 200, BranchName = "Indiranagar", IsActive = true };
        var pausedBranch = new Branch { BranchId = 301, RestaurantId = 201, BranchName = "Koramangala", IsActive = true };
        db.Branches.AddRange(branch, pausedBranch);

        db.RolePermissions.Add(new RolePermission { RoleId = 1, RoleKey = "Admin", PermissionKey = "orders.view", IsGranted = true });
        db.RolePermissions.Add(new RolePermission { RoleId = 1, RoleKey = "Admin", PermissionKey = "invoices.view", IsGranted = true });

        var activeUser = new User
        {
            UserId = 1,
            RoleId = 1,
            BranchId = 300,
            UserName = "pirnav",
            Email = "owner@spice.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StrongPass#2026"),
            IsActive = true,
            Role = adminRole
        };
        var inactiveUser = new User
        {
            UserId = 2,
            RoleId = 1,
            BranchId = 300,
            UserName = "pending_owner",
            Email = "pending@spice.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StrongPass#2026"),
            IsActive = false,
            Role = adminRole
        };
        var suspendedTenantUser = new User
        {
            UserId = 3,
            RoleId = 1,
            BranchId = 301,
            UserName = "paused_owner",
            Email = "paused@spice.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StrongPass#2026"),
            IsActive = true,
            Role = adminRole
        };
        db.Users.AddRange(activeUser, inactiveUser, suspendedTenantUser);
        db.RestaurantRegistrations.Add(new RestaurantRegistration
        {
            OrganizationName = "Spice Group",
            RestaurantName = "Spice Courtyard",
            BranchName = "Indiranagar",
            OwnerName = "Priya",
            Email = "owner@spice.test",
            Phone = "9876543210",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StrongPass#2026"),
            City = "Bengaluru",
            Address = "100 Feet Rd",
            Status = "PendingApproval"
        });
        db.DemoRequests.Add(new DemoRequest { Name = "Arjun", RestaurantOrOrg = "Fork Co", Email = "arjun@fork.test", Phone = "9876543211", BranchCount = 2 });
        db.TenantSubscriptions.Add(new TenantSubscription { OrganizationId = 100, PlanKey = "growth-multi", PlanName = "Growth Multi-Branch", Status = "Active", BranchLimit = 5, UserLimit = 50 });
        db.PlatformSettings.Add(new PlatformSetting { SettingKey = "default", PlatformName = "PIRNAV" });
        db.UserWorkspaceAccesses.Add(new UserWorkspaceAccess { UserId = 1, OrganizationId = 100, RestaurantId = 200, BranchId = 300, ScopeRole = "Admin", IsDefault = true });
        await db.SaveChangesAsync();

        var sp = new SpService(db);
        var authService = new AuthService(sp, config, new StubEmailService(), NullLogger<AuthService>.Instance, db);

        await RunTest("SaaS entities and Branch->Restaurant->Organization links persist", async () =>
        {
            var loadedBranch = await db.Branches.Include(b => b.Restaurant).ThenInclude(r => r!.Organization).FirstAsync(b => b.BranchId == 300);
            if (loadedBranch.Restaurant?.OrganizationId != 100) throw new Exception("Missing OrganizationId link.");
            if (db.RestaurantRegistrations.Count() != 1 || db.DemoRequests.Count() != 1 || db.TenantSubscriptions.Count() != 1)
                throw new Exception("SaaS DbSets missing expected rows.");
        });

        await RunTest("Hardcoded pirnav/1234 fallback password bypass is rejected", async () =>
        {
            var res = await authService.LoginAsync(new LoginRequestDto { UsernameOrEmail = "pirnav", Password = "1234" });
            if (res.Success) throw new Exception("Legacy fallback password '1234' must be rejected.");
        });

        await RunTest("Inactive user cannot authenticate", async () =>
        {
            var res = await authService.LoginAsync(new LoginRequestDto { UsernameOrEmail = "pending_owner", Password = "StrongPass#2026" });
            if (res.Success) throw new Exception("Inactive user must not authenticate.");
        });

        await RunTest("Suspended organization user cannot authenticate", async () =>
        {
            var res = await authService.LoginAsync(new LoginRequestDto { UsernameOrEmail = "paused_owner", Password = "StrongPass#2026" });
            if (res.Success) throw new Exception("Suspended organization user must not authenticate.");
        });

        await RunTest("Valid user authenticates and JWT contains organizationId, restaurantId, branchId, and permissions", async () =>
        {
            var res = await authService.LoginAsync(new LoginRequestDto { UsernameOrEmail = "pirnav", Password = "StrongPass#2026" });
            if (!res.Success || string.IsNullOrWhiteSpace(res.Token)) throw new Exception("Expected valid login & JWT.");
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(res.Token);
            if (jwt.Claims.FirstOrDefault(c => c.Type == "organizationId")?.Value != "100") throw new Exception("Missing organizationId claim.");
            if (jwt.Claims.FirstOrDefault(c => c.Type == "restaurantId")?.Value != "200") throw new Exception("Missing restaurantId claim.");
            if (jwt.Claims.FirstOrDefault(c => c.Type == "branchId")?.Value != "300") throw new Exception("Missing branchId claim.");
            var perms = jwt.Claims.Where(c => c.Type == "permissions").Select(c => c.Value).ToList();
            if (!perms.Contains("orders.view") || !perms.Contains("invoices.view")) throw new Exception("Missing permissions claims.");
        });

        await RunTest("UsersController, RolesController, and AuditController require [Authorize]", async () =>
        {
            bool HasAuth(Type t) => t.GetCustomAttributes(typeof(AuthorizeAttribute), true).Length > 0;
            bool HasAnon(Type t) => t.GetCustomAttributes(typeof(AllowAnonymousAttribute), true).Length > 0;
            if (!HasAuth(typeof(UsersController))) throw new Exception("UsersController missing [Authorize].");
            if (!HasAuth(typeof(RolesController)) || HasAnon(typeof(RolesController))) throw new Exception("RolesController must require [Authorize].");
            if (!HasAuth(typeof(AuditController))) throw new Exception("AuditController missing [Authorize].");
            await Task.CompletedTask;
        });

        Console.WriteLine($"RESULT: {passed} passed, {failed} failed");
        return failed == 0 ? 0 : 1;
    }
}
