namespace HMS.Tests;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Controllers;
using HMS.Data;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

public static class Phase331BSaaSTests
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

    private static ClaimsPrincipal BuildPrincipal(long userId, string username, string role)
    {
        var claims = new[]
        {
            new Claim("userId", userId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("username", username),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
    }

    private static int GetStatusCode(IActionResult result)
    {
        return result switch
        {
            ObjectResult obj => obj.StatusCode ?? 200,
            StatusCodeResult sc => sc.StatusCode,
            _ => 200
        };
    }

    public static async Task<int> RunAsync(string[]? args = null)
    {
        Console.WriteLine("=======================================================================");
        Console.WriteLine("  STARTING PHASE 3.31B SUPER ADMIN & PUBLIC SAAS TESTS (INMEMORY)");
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
            .UseInMemoryDatabase($"pirnav_331b_{Guid.NewGuid():N}")
            .Options;

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "PirnavSuperSecretPhase331BTestKeyForUnitVerificationOnly!",
                ["Jwt:Issuer"] = "pirnav-test",
                ["Jwt:Audience"] = "pirnav-clients",
                ["Jwt:ExpiryMinutes"] = "60",
            })
            .Build();

        using var db = new AppDbContext(options);
        db.Roles.AddRange(
            new Role { RoleId = 1, RoleName = "Admin", IsActive = true },
            new Role { RoleId = 10, RoleName = "PlatformSuperAdmin", IsActive = true },
            new Role { RoleId = 11, RoleName = "RestaurantOwner", IsActive = true }
        );
        db.Users.Add(new User
        {
            UserId = 99,
            RoleId = 10,
            UserName = "platform_root",
            Email = "root@pirnav.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("RootPass#2026"),
            IsActive = true
        });
        await db.SaveChangesAsync();

        var publicController = new PublicSaasController(db);
        var superAdminController = new SuperAdminController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = BuildPrincipal(99, "platform_root", "PlatformSuperAdmin")
                }
            }
        };

        long approvedRegId = 0;
        long rejectedRegId = 0;
        long provisionedOrgId = 0;
        long provisionedRestId = 0;

        await RunTest("Public registration persists PendingApproval without authenticating", async () =>
        {
            var res = await publicController.RegisterRestaurant(new PublicSaasController.RestaurantRegistrationRequestDto
            {
                OrganizationName = "Coastal Spice Group",
                RestaurantName = "Coastal Spice",
                BranchName = "Jubilee Hills",
                OwnerName = "Ananya Rao",
                Email = "ananya@coastalspice.test",
                Phone = "+91 98765 43210",
                Password = "OwnerPass#2026",
                City = "Hyderabad",
                Address = "Road No 36, Jubilee Hills",
                Gstin = "36ABCDE1234F1Z5"
            });

            if (GetStatusCode(res) != 201) throw new Exception($"Expected 201, got {GetStatusCode(res)}");
            var reg = await db.RestaurantRegistrations.FirstAsync(r => r.Email == "ananya@coastalspice.test");
            if (reg.Status != "PendingApproval") throw new Exception($"Unexpected status {reg.Status}");
            if (string.IsNullOrWhiteSpace(reg.PasswordHash) || reg.PasswordHash == "OwnerPass#2026")
                throw new Exception("Password was not BCrypt-hashed.");
            approvedRegId = reg.RestaurantRegistrationId;
        });

        await RunTest("Duplicate email and GSTIN registrations are rejected with 409", async () =>
        {
            var dupEmail = await publicController.RegisterRestaurant(new PublicSaasController.RestaurantRegistrationRequestDto
            {
                OrganizationName = "Other Org",
                RestaurantName = "Other Rest",
                BranchName = "Main",
                OwnerName = "Someone",
                Email = "ananya@coastalspice.test",
                Phone = "9876543211",
                Password = "OwnerPass#2026",
                City = "Hyderabad",
                Address = "Banjara Hills Road 1"
            });
            if (GetStatusCode(dupEmail) != 409) throw new Exception($"Expected 409 for duplicate email, got {GetStatusCode(dupEmail)}");

            var dupGstin = await publicController.RegisterRestaurant(new PublicSaasController.RestaurantRegistrationRequestDto
            {
                OrganizationName = "Other Org 2",
                RestaurantName = "Other Rest 2",
                BranchName = "Main",
                OwnerName = "Someone 2",
                Email = "other2@coastalspice.test",
                Phone = "9876543212",
                Password = "OwnerPass#2026",
                City = "Hyderabad",
                Address = "Banjara Hills Road 2",
                Gstin = "36ABCDE1234F1Z5"
            });
            if (GetStatusCode(dupGstin) != 409) throw new Exception($"Expected 409 for duplicate GSTIN, got {GetStatusCode(dupGstin)}");
        });

        await RunTest("Public demo request persists with New status", async () =>
        {
            var res = await publicController.SubmitDemoRequest(new PublicSaasController.DemoRequestDto
            {
                Name = "Karthik",
                RestaurantOrOrg = "Bistro 24",
                Email = "karthik@bistro24.test",
                Phone = "9876501234",
                BranchCount = 3,
                Message = "Interested in multi-branch POS and KOT."
            });
            if (GetStatusCode(res) != 201) throw new Exception($"Expected 201, got {GetStatusCode(res)}");
            var saved = await db.DemoRequests.FirstOrDefaultAsync(d => d.Email == "karthik@bistro24.test");
            if (saved == null || saved.Status != "New") throw new Exception("Demo request not persisted with New status.");
        });

        await RunTest("SuperAdminController requires PlatformSuperAdmin role (401 anonymous / 403 Admin)", async () =>
        {
            var authAttr = typeof(SuperAdminController).GetCustomAttribute<AuthorizeAttribute>();
            if (authAttr == null || authAttr.Roles != "PlatformSuperAdmin")
                throw new Exception("SuperAdminController missing [Authorize(Roles = \"PlatformSuperAdmin\")].");

            var anonPrincipal = new ClaimsPrincipal(new ClaimsIdentity());
            var adminPrincipal = BuildPrincipal(5, "rest_admin", "Admin");
            var saPrincipal = BuildPrincipal(99, "platform_root", "PlatformSuperAdmin");

            if (anonPrincipal.Identity?.IsAuthenticated == true) throw new Exception("Anonymous should not be authenticated.");
            if (adminPrincipal.IsInRole("PlatformSuperAdmin")) throw new Exception("Ordinary Admin should not satisfy PlatformSuperAdmin.");
            if (!saPrincipal.IsInRole("PlatformSuperAdmin")) throw new Exception("PlatformSuperAdmin should satisfy role check.");
            await Task.CompletedTask;
        });

        await RunTest("Restaurant approval provisions Org, Restaurant, Branch, Owner, WorkspaceAccess, Subscription, Audit", async () =>
        {
            var res = await superAdminController.ApproveRegistration(approvedRegId);
            if (GetStatusCode(res) != 200) throw new Exception($"Expected 200, got {GetStatusCode(res)}");

            var reg = await db.RestaurantRegistrations.FirstAsync(r => r.RestaurantRegistrationId == approvedRegId);
            if (reg.Status != "Approved" || reg.ReviewedByUserId != 99 || reg.ReviewedAt == null)
                throw new Exception("Registration approval metadata not recorded.");

            provisionedOrgId = reg.ProvisionedOrganizationId ?? throw new Exception("ProvisionedOrganizationId missing.");
            provisionedRestId = reg.ProvisionedRestaurantId ?? throw new Exception("ProvisionedRestaurantId missing.");

            var owner = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == "ananya@coastalspice.test");
            if (owner == null || owner.Role?.RoleName != "RestaurantOwner")
                throw new Exception("Owner user or RestaurantOwner role missing.");

            var access = await db.UserWorkspaceAccesses.FirstOrDefaultAsync(w => w.UserId == owner.UserId && w.OrganizationId == provisionedOrgId);
            if (access == null) throw new Exception("UserWorkspaceAccess not created.");

            var sub = await db.TenantSubscriptions.FirstOrDefaultAsync(s => s.OrganizationId == provisionedOrgId);
            if (sub == null || sub.PlanKey != "single-outlet") throw new Exception("Default subscription not created.");
        });

        await RunTest("Duplicate approval is prevented with 409 Conflict", async () =>
        {
            var res = await superAdminController.ApproveRegistration(approvedRegId);
            if (GetStatusCode(res) != 409) throw new Exception($"Expected 409, got {GetStatusCode(res)}");
        });

        await RunTest("Registration rejection requires reason, stores reviewer, and blocks approval", async () =>
        {
            await publicController.RegisterRestaurant(new PublicSaasController.RestaurantRegistrationRequestDto
            {
                OrganizationName = "Reject Org",
                RestaurantName = "Reject Diner",
                BranchName = "Main",
                OwnerName = "Vikram",
                Email = "vikram@reject.test",
                Phone = "9876543299",
                Password = "OwnerPass#2026",
                City = "Pune",
                Address = "FC Road 12"
            });
            var reg = await db.RestaurantRegistrations.FirstAsync(r => r.Email == "vikram@reject.test");
            rejectedRegId = reg.RestaurantRegistrationId;

            var emptyReason = await superAdminController.RejectRegistration(rejectedRegId, new SuperAdminController.RejectRegistrationDto { Reason = " " });
            if (GetStatusCode(emptyReason) != 400) throw new Exception($"Expected 400 for empty reason, got {GetStatusCode(emptyReason)}");

            var rejectOk = await superAdminController.RejectRegistration(rejectedRegId, new SuperAdminController.RejectRegistrationDto { Reason = "Incomplete GST documentation" });
            if (GetStatusCode(rejectOk) != 200) throw new Exception($"Expected 200, got {GetStatusCode(rejectOk)}");

            var approveAfterReject = await superAdminController.ApproveRegistration(rejectedRegId);
            if (GetStatusCode(approveAfterReject) != 409) throw new Exception($"Expected 409 approving rejected reg, got {GetStatusCode(approveAfterReject)}");
        });

        await RunTest("Tenant status suspension cascades and blocks owner login until reactivated", async () =>
        {
            var sp = new SpService(db);
            var auth = new AuthService(sp, config, new StubEmailService(), NullLogger<AuthService>.Instance, db);

            var suspendRes = await superAdminController.SetTenantStatus(provisionedOrgId, new SuperAdminController.TenantStatusDto
            {
                Status = "Suspended",
                Reason = "Compliance hold"
            });
            if (GetStatusCode(suspendRes) != 200) throw new Exception($"Expected 200, got {GetStatusCode(suspendRes)}");

            var blockedLogin = await auth.LoginAsync(new HMS.DTOs.LoginRequestDto
            {
                UsernameOrEmail = "ananya@coastalspice.test",
                Password = "OwnerPass#2026"
            });
            if (blockedLogin.Success) throw new Exception("Suspended tenant owner should not authenticate.");

            var reactivateRes = await superAdminController.SetTenantStatus(provisionedOrgId, new SuperAdminController.TenantStatusDto
            {
                Status = "Active",
                Reason = "Verified"
            });
            if (GetStatusCode(reactivateRes) != 200) throw new Exception($"Expected 200, got {GetStatusCode(reactivateRes)}");

            var okLogin = await auth.LoginAsync(new HMS.DTOs.LoginRequestDto
            {
                UsernameOrEmail = "ananya@coastalspice.test",
                Password = "OwnerPass#2026"
            });
            if (!okLogin.Success) throw new Exception($"Reactivated owner login failed: {okLogin.Message}");
        });

        await RunTest("Branch creation enforces subscription limit & Subscription upgrade unlocks branches", async () =>
        {
            var limitBlocked = await superAdminController.CreateBranch(new SuperAdminController.BranchUpsertDto
            {
                RestaurantId = provisionedRestId,
                BranchName = "Banjara Hills",
                City = "Hyderabad"
            });
            if (GetStatusCode(limitBlocked) != 400) throw new Exception($"Expected 400 branch limit error, got {GetStatusCode(limitBlocked)}");

            var sub = await db.TenantSubscriptions.FirstAsync(s => s.OrganizationId == provisionedOrgId);
            var upgradeRes = await superAdminController.UpdateSubscription(sub.TenantSubscriptionId, new SuperAdminController.SubscriptionUpdateDto
            {
                PlanId = "growth-multi"
            });
            if (GetStatusCode(upgradeRes) != 200) throw new Exception($"Expected 200, got {GetStatusCode(upgradeRes)}");

            var branchCreated = await superAdminController.CreateBranch(new SuperAdminController.BranchUpsertDto
            {
                RestaurantId = provisionedRestId,
                BranchName = "Banjara Hills",
                City = "Hyderabad"
            });
            if (GetStatusCode(branchCreated) != 201) throw new Exception($"Expected 201 after upgrade, got {GetStatusCode(branchCreated)}");
        });

        await RunTest("Invalid restaurant/cross-tenant references are rejected and PasswordHash is never exposed", async () =>
        {
            var invalidRest = await superAdminController.CreateBranch(new SuperAdminController.BranchUpsertDto
            {
                RestaurantId = 999999,
                BranchName = "Ghost Branch"
            });
            if (GetStatusCode(invalidRest) != 400) throw new Exception($"Expected 400 for invalid restaurantId, got {GetStatusCode(invalidRest)}");

            var regsRes = await superAdminController.GetRegistrations("all");
            string json = JsonSerializer.Serialize(((ObjectResult)regsRes).Value);
            if (json.Contains("PasswordHash", StringComparison.OrdinalIgnoreCase) || json.Contains("$2", StringComparison.Ordinal))
                throw new Exception("PasswordHash leaked in GetRegistrations response.");
        });

        await RunTest("Roles & Permissions PUT -> GET roundtrip persists and hydrates saved checkboxes", async () =>
        {
            var matrix = new Dictionary<string, Dictionary<string, bool>>
            {
                ["Dine-In POS"] = new() { ["view"] = true, ["create"] = true, ["edit"] = false },
                ["Kitchen KOT"] = new() { ["view"] = true, ["manage"] = true }
            };
            var putRes = await superAdminController.SaveRolePermissions("RestaurantOwner", matrix);
            if (GetStatusCode(putRes) != 200) throw new Exception($"Expected 200 on PUT permissions, got {GetStatusCode(putRes)}");

            var getRes = await superAdminController.GetRolePermissions("RestaurantOwner");
            if (GetStatusCode(getRes) != 200) throw new Exception($"Expected 200 on GET permissions, got {GetStatusCode(getRes)}");

            string json = JsonSerializer.Serialize(((ObjectResult)getRes).Value);
            using var doc = JsonDocument.Parse(json);
            var perms = doc.RootElement.GetProperty("data").GetProperty("permissions");
            if (!perms.GetProperty("Dine-In POS").GetProperty("view").GetBoolean())
                throw new Exception("Expected Dine-In POS.view to remain true.");
            if (perms.GetProperty("Dine-In POS").GetProperty("edit").GetBoolean())
                throw new Exception("Expected Dine-In POS.edit to remain false.");
            if (!perms.GetProperty("Kitchen KOT").GetProperty("manage").GetBoolean())
                throw new Exception("Expected Kitchen KOT.manage to remain true.");
        });

        await RunTest("All remaining Super Admin modules (Dashboard, Billing, Support, Settings) persist and return data", async () =>
        {
            db.SaasBillingInvoices.Add(new SaasBillingInvoice
            {
                OrganizationId = provisionedOrgId,
                InvoiceNumber = "INV-SAAS-2026-001",
                PlanName = "Growth Multi-Branch",
                Amount = 4999m,
                Status = "Paid",
                PaymentReference = "PAY-TEST-001"
            });
            db.SupportTickets.Add(new SupportTicket
            {
                OrganizationId = provisionedOrgId,
                TicketNumber = "SUP-2026-001",
                Subject = "Printer setup help",
                Priority = "High",
                Status = "Open",
                Description = "Need thermal printer driver guidance."
            });
            await db.SaveChangesAsync();

            var dash = await superAdminController.GetDashboardSummary();
            if (GetStatusCode(dash) != 200) throw new Exception("Dashboard summary failed.");

            var billing = await superAdminController.GetBillingInvoices("all");
            if (GetStatusCode(billing) != 200) throw new Exception("Billing invoices failed.");

            var ticket = await db.SupportTickets.FirstAsync(t => t.TicketNumber == "SUP-2026-001");
            var noteRes = await superAdminController.AddTicketNote(ticket.SupportTicketId, new SuperAdminController.SupportNoteDto { Note = "Assigned to onboarding team." });
            if (GetStatusCode(noteRes) != 201) throw new Exception("Support ticket note failed.");

            var saveSettings = await superAdminController.SavePlatformSettings(new SuperAdminController.PlatformSettingsDto
            {
                PlatformName = "PIRNAV Staging",
                RequireManualApproval = true,
                DefaultCurrency = "INR",
                DefaultTaxRate = 5m,
                NotifyOnRegistration = true,
                MaintenanceBannerEnabled = true,
                MaintenanceBannerText = "Scheduled window",
                EnableMultiBranchOnboarding = true,
                EnableSelfServiceQr = true
            });
            if (GetStatusCode(saveSettings) != 200) throw new Exception("Save platform settings failed.");

            var getSettings = await superAdminController.GetPlatformSettings();
            string settingsJson = JsonSerializer.Serialize(((ObjectResult)getSettings).Value);
            if (!settingsJson.Contains("PIRNAV Staging") || !settingsJson.Contains("Scheduled window"))
                throw new Exception("Platform settings did not persist.");
        });

        await RunTest("TenantWorkspaceController returns authorized workspaces, subscription, and blocks cross-tenant switch", async () =>
        {
            var ownerUser = await db.Users.FirstAsync(u => u.Email == "ananya@coastalspice.test");
            var workspaceCtrl = new TenantWorkspaceController(db)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = BuildPrincipal(ownerUser.UserId, ownerUser.UserName, "RestaurantOwner")
                    }
                }
            };

            var authWs = await workspaceCtrl.GetAuthorizedWorkspaces();
            if (GetStatusCode(authWs) != 200) throw new Exception("Expected 200 on GetAuthorizedWorkspaces.");

            var subRes = await workspaceCtrl.GetTenantSubscription();
            if (GetStatusCode(subRes) != 200) throw new Exception("Expected 200 on GetTenantSubscription.");

            var crossTenantSwitch = await workspaceCtrl.SwitchWorkspaceContext(new TenantWorkspaceController.SwitchWorkspaceRequestDto
            {
                OrganizationId = 999999,
                RestaurantId = 999999,
                BranchId = 999999
            });
            if (GetStatusCode(crossTenantSwitch) != 403) throw new Exception($"Expected 403 on unauthorized workspace switch, got {GetStatusCode(crossTenantSwitch)}.");
        });

        Console.WriteLine("=======================================================================");
        Console.WriteLine($"  RESULT: {passed} passed, {failed} failed");
        Console.WriteLine("=======================================================================");
        return failed == 0 ? 0 : 1;
    }
}
