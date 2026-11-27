using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/super-admin")]
[Authorize(Roles = "PlatformSuperAdmin")]
[Tags("SuperAdmin")]
public class SuperAdminController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly Dictionary<string, (string PlanName, int BranchLimit, int UserLimit, decimal MonthlyPriceInr)> PlanCatalog =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["single-outlet"] = ("Single Outlet", 1, 15, 2499m),
            ["growth-multi"] = ("Growth Multi-Branch", 5, 60, 4999m),
            ["enterprise"] = ("Enterprise Chain", 9999, 9999, 0m),
        };

    public SuperAdminController(AppDbContext context)
    {
        _context = context;
    }

    public sealed class TenantUpsertDto
    {
        public string? OrganizationName { get; set; }
        public string? OwnerName { get; set; }
        public string? OwnerEmail { get; set; }
        public string? Phone { get; set; }
        public string? RestaurantName { get; set; }
        public string? BranchName { get; set; }
        public string? City { get; set; }
        public string? Gstin { get; set; }
    }

    public sealed class TenantStatusDto
    {
        public string? Status { get; set; }
        public string? Reason { get; set; }
    }

    public sealed class RejectRegistrationDto
    {
        public string? Reason { get; set; }
    }

    public sealed class BranchUpsertDto
    {
        public long? RestaurantId { get; set; }
        public string? BranchName { get; set; }
        public string? BranchCode { get; set; }
        public string? RestaurantName { get; set; }
        public string? City { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public sealed class SubscriptionUpdateDto
    {
        public string? PlanId { get; set; }
    }

    public sealed class SupportNoteDto
    {
        public string? Note { get; set; }
    }

    public sealed class PlatformSettingsDto
    {
        public string? PlatformName { get; set; }
        public bool RequireManualApproval { get; set; } = true;
        public string? DefaultCurrency { get; set; }
        public decimal DefaultTaxRate { get; set; } = 5m;
        public bool NotifyOnRegistration { get; set; } = true;
        public bool MaintenanceBannerEnabled { get; set; }
        public string? MaintenanceBannerText { get; set; }
        public bool EnableMultiBranchOnboarding { get; set; } = true;
        public bool EnableSelfServiceQr { get; set; } = true;
    }

    private long? GetCurrentUserId()
    {
        string? raw = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(raw, out long uid) && uid > 0 ? uid : null;
    }

    private string GetCurrentActorName()
    {
        return User.FindFirstValue("username")
               ?? User.FindFirstValue(ClaimTypes.Name)
               ?? User.Identity?.Name
               ?? "PlatformSuperAdmin";
    }

    private static string Slugify(string value, string fallback = "tenant")
    {
        string slug = Regex.Replace((value ?? string.Empty).Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? fallback : slug;
    }

    private async Task<string> EnsureUniqueOrgSlugAsync(string baseName)
    {
        string root = Slugify(baseName, "org");
        string candidate = root;
        int suffix = 1;
        while (await _context.Organizations.AnyAsync(o => o.Slug == candidate))
        {
            candidate = $"{root}-{suffix++}";
        }
        return candidate;
    }

    private async Task<string> EnsureUniqueRestaurantCodeAsync(string baseName)
    {
        string root = Slugify(baseName, "rest");
        string candidate = root;
        int suffix = 1;
        while (await _context.Restaurants.AnyAsync(r => r.Code == candidate))
        {
            candidate = $"{root}-{suffix++}";
        }
        return candidate;
    }

    private async Task<string> EnsureUniqueBranchCodeAsync(string baseName)
    {
        string root = Slugify(baseName, "branch");
        string candidate = root;
        int suffix = 1;
        while (await _context.Branches.AnyAsync(b => b.BranchCode == candidate))
        {
            candidate = $"{root}-{suffix++}";
        }
        return candidate;
    }

    private async Task<string> EnsureUniqueUsernameAsync(string email, string ownerName)
    {
        string local = email.Contains('@') ? email.Split('@')[0] : ownerName;
        string root = Regex.Replace(local.ToLowerInvariant(), @"[^a-z0-9_.-]+", string.Empty);
        if (root.Length < 3) root = "owner";
        string candidate = root;
        int suffix = 1;
        while (await _context.Users.AnyAsync(u => u.UserName == candidate))
        {
            candidate = $"{root}{suffix++}";
        }
        return candidate;
    }

    private async Task RecordAuditAsync(string action, string tableName, long? recordId, string summary)
    {
        if (!_context.Database.IsRelational())
        {
            return;
        }

        try
        {
            long? uid = GetCurrentUserId();
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value, created_at) VALUES ({uid}, {action}, {tableName}, {recordId}, {summary}, {DateTime.UtcNow})");
        }
        catch
        {
            // Non-blocking audit write so relational schema variations do not abort valid Super Admin actions
        }
    }

    // ============================================================
    // 1. PLATFORM DASHBOARD
    // ============================================================

    [HttpGet("dashboard/summary")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        int totalTenants = await _context.Organizations.CountAsync(o => o.DeletedAt == null);
        int suspendedTenants = await _context.Organizations.CountAsync(o => o.DeletedAt == null && o.Status == "Suspended");
        int activeRestaurants = await _context.Restaurants.CountAsync(r => r.DeletedAt == null && r.Status == "Active");
        int totalBranches = await _context.Branches.CountAsync(b => b.DeletedAt == null);

        int pendingRegistrations = await _context.RestaurantRegistrations.CountAsync(r => r.Status == "PendingApproval" || r.Status == "Pending");
        int approvedRegistrations = await _context.RestaurantRegistrations.CountAsync(r => r.Status == "Approved");
        int rejectedRegistrations = await _context.RestaurantRegistrations.CountAsync(r => r.Status == "Rejected");

        var activeSubs = await _context.TenantSubscriptions
            .AsNoTracking()
            .Where(s => s.Status == "Active" || s.Status == "Trial")
            .ToListAsync();

        decimal mrr = activeSubs.Where(s => s.Status == "Active").Sum(s => s.MonthlyPriceInr);

        var recentRegs = await _context.RestaurantRegistrations
            .AsNoTracking()
            .OrderByDescending(r => r.UpdatedAt)
            .Take(8)
            .Select(r => new
            {
                id = r.RestaurantRegistrationId,
                action = "REGISTRATION",
                description = $"{r.RestaurantName} ({r.OrganizationName}) — {r.Status}",
                status = r.Status,
                createdAt = r.UpdatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalTenants,
                activeRestaurants,
                pendingRegistrations,
                suspendedTenants,
                totalBranches,
                activeSubscriptions = activeSubs.Count,
                monthlyRecurringRevenue = mrr,
                approvalStats = new
                {
                    pending = pendingRegistrations,
                    approved = approvedRegistrations,
                    rejected = rejectedRegistrations
                },
                recentActivities = recentRegs
            }
        });
    }

    // ============================================================
    // 2. TENANT MANAGEMENT
    // ============================================================

    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants([FromQuery] string? status)
    {
        var query = _context.Organizations
            .AsNoTracking()
            .Where(o => o.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            string normalized = status.Trim();
            query = query.Where(o => o.Status == normalized);
        }

        var orgs = await query
            .Include(o => o.Restaurants)
            .ThenInclude(r => r.Branches)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var items = orgs.Select(o =>
        {
            var primaryRest = o.Restaurants.FirstOrDefault(r => r.DeletedAt == null);
            var primaryBranch = primaryRest?.Branches.FirstOrDefault(b => b.DeletedAt == null);
            return new
            {
                id = o.OrganizationId,
                organizationId = o.OrganizationId,
                organizationName = o.Name,
                slug = o.Slug,
                gstin = o.Gstin,
                ownerName = o.OwnerEmail ?? "Owner",
                ownerEmail = o.OwnerEmail ?? "—",
                phone = primaryBranch?.Phone ?? "",
                restaurantName = primaryRest?.Name ?? "",
                branchName = primaryBranch?.BranchName ?? "",
                city = primaryBranch?.City ?? "",
                restaurantCount = o.Restaurants.Count(r => r.DeletedAt == null),
                branchCount = o.Restaurants.Where(r => r.DeletedAt == null).SelectMany(r => r.Branches).Count(b => b.DeletedAt == null),
                status = o.Status,
                createdAt = o.CreatedAt
            };
        });

        return Ok(new { success = true, data = items });
    }

    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] TenantUpsertDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.OrganizationName) || string.IsNullOrWhiteSpace(dto.RestaurantName))
        {
            return BadRequest(new { success = false, message = "Organization name and restaurant name are required." });
        }

        string orgName = dto.OrganizationName.Trim();
        string restName = dto.RestaurantName.Trim();
        string branchName = string.IsNullOrWhiteSpace(dto.BranchName) ? $"{restName} Main" : dto.BranchName.Trim();
        string? ownerEmail = string.IsNullOrWhiteSpace(dto.OwnerEmail) ? null : dto.OwnerEmail.Trim().ToLowerInvariant();
        string? gstin = string.IsNullOrWhiteSpace(dto.Gstin) ? null : dto.Gstin.Trim().ToUpperInvariant();

        if (gstin != null && await _context.Organizations.AnyAsync(o => o.DeletedAt == null && o.Gstin == gstin))
        {
            return Conflict(new { success = false, message = "An organization with this GSTIN already exists." });
        }

        DateTime now = DateTime.UtcNow;
        var org = new Organization
        {
            Name = orgName,
            Slug = await EnsureUniqueOrgSlugAsync(orgName),
            OwnerEmail = ownerEmail,
            Gstin = gstin,
            Status = "Active",
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var restaurant = new Restaurant
        {
            OrganizationId = org.OrganizationId,
            Name = restName,
            Code = await EnsureUniqueRestaurantCodeAsync(restName),
            Status = "Active",
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();

        var branch = new Branch
        {
            RestaurantId = restaurant.RestaurantId,
            BranchName = branchName,
            BranchCode = await EnsureUniqueBranchCodeAsync(branchName),
            City = dto.City?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = ownerEmail,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.Branches.Add(branch);

        _context.TenantSubscriptions.Add(new TenantSubscription
        {
            OrganizationId = org.OrganizationId,
            PlanKey = "single-outlet",
            PlanName = "Single Outlet",
            Status = "Trial",
            TrialStatus = "ActiveTrial",
            BranchLimit = 1,
            UserLimit = 15,
            MonthlyPriceInr = 2499m,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = now.AddDays(14),
            CreatedAt = now,
            UpdatedAt = now
        });

        await _context.SaveChangesAsync();
        await RecordAuditAsync("CREATE", "organizations", org.OrganizationId, $"Created tenant {org.Name}");
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            data = new
            {
                id = org.OrganizationId,
                organizationName = org.Name,
                ownerEmail = org.OwnerEmail,
                restaurantName = restaurant.Name,
                branchName = branch.BranchName,
                status = org.Status
            }
        });
    }

    [HttpPut("tenants/{id:long}")]
    public async Task<IActionResult> UpdateTenant(long id, [FromBody] TenantUpsertDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.OrganizationName))
        {
            return BadRequest(new { success = false, message = "Organization name is required." });
        }

        var org = await _context.Organizations
            .Include(o => o.Restaurants)
            .ThenInclude(r => r.Branches)
            .FirstOrDefaultAsync(o => o.OrganizationId == id && o.DeletedAt == null);

        if (org == null)
        {
            return NotFound(new { success = false, message = "Tenant organization not found." });
        }

        org.Name = dto.OrganizationName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.OwnerEmail))
        {
            org.OwnerEmail = dto.OwnerEmail.Trim().ToLowerInvariant();
        }
        org.UpdatedAt = DateTime.UtcNow;

        var primaryRest = org.Restaurants.FirstOrDefault(r => r.DeletedAt == null);
        if (primaryRest != null && !string.IsNullOrWhiteSpace(dto.RestaurantName))
        {
            primaryRest.Name = dto.RestaurantName.Trim();
            primaryRest.UpdatedAt = DateTime.UtcNow;
        }

        var primaryBranch = primaryRest?.Branches.FirstOrDefault(b => b.DeletedAt == null);
        if (primaryBranch != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.BranchName)) primaryBranch.BranchName = dto.BranchName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.City)) primaryBranch.City = dto.City.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Phone)) primaryBranch.Phone = dto.Phone.Trim();
            primaryBranch.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "organizations", org.OrganizationId, $"Updated tenant {org.Name}");
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                id = org.OrganizationId,
                organizationName = org.Name,
                ownerEmail = org.OwnerEmail,
                status = org.Status
            }
        });
    }

    [HttpPatch("tenants/{id:long}/status")]
    public async Task<IActionResult> SetTenantStatus(long id, [FromBody] TenantStatusDto? dto)
    {
        string targetStatus = (dto?.Status ?? string.Empty).Trim();
        if (targetStatus != "Active" && targetStatus != "Suspended" && targetStatus != "Pending")
        {
            return BadRequest(new { success = false, message = "Status must be Active, Suspended, or Pending." });
        }

        var org = await _context.Organizations
            .Include(o => o.Restaurants)
            .ThenInclude(r => r.Branches)
            .FirstOrDefaultAsync(o => o.OrganizationId == id && o.DeletedAt == null);

        if (org == null)
        {
            return NotFound(new { success = false, message = "Tenant organization not found." });
        }

        DateTime now = DateTime.UtcNow;
        org.Status = targetStatus;
        org.UpdatedAt = now;

        foreach (var rest in org.Restaurants.Where(r => r.DeletedAt == null))
        {
            rest.Status = targetStatus;
            rest.UpdatedAt = now;
            foreach (var branch in rest.Branches.Where(b => b.DeletedAt == null))
            {
                branch.IsActive = targetStatus == "Active";
                branch.UpdatedAt = now;
            }
        }

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "organizations", org.OrganizationId, $"Set status={targetStatus}; reason={dto?.Reason ?? ""}");
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new { id = org.OrganizationId, status = org.Status }
        });
    }

    // ============================================================
    // 3. RESTAURANT REGISTRATION QUEUE & APPROVAL WORKFLOW
    // ============================================================

    [HttpGet("registrations")]
    public async Task<IActionResult> GetRegistrations([FromQuery] string? status)
    {
        var query = _context.RestaurantRegistrations.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            string s = status.Trim();
            if (string.Equals(s, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(r => r.Status == "PendingApproval" || r.Status == "Pending");
            }
            else
            {
                query = query.Where(r => r.Status == s);
            }
        }

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.RestaurantRegistrationId,
                organizationName = r.OrganizationName,
                restaurantName = r.RestaurantName,
                branchName = r.BranchName,
                ownerName = r.OwnerName,
                email = r.Email,
                phone = r.Phone,
                city = r.City,
                address = r.Address,
                gstin = r.Gstin,
                status = r.Status,
                rejectionReason = r.RejectionReason,
                reviewedByUserId = r.ReviewedByUserId,
                reviewedAt = r.ReviewedAt,
                provisionedOrganizationId = r.ProvisionedOrganizationId,
                provisionedRestaurantId = r.ProvisionedRestaurantId,
                provisionedBranchId = r.ProvisionedBranchId,
                createdAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { success = true, data = items });
    }

    [HttpPost("registrations/{id:long}/approve")]
    public async Task<IActionResult> ApproveRegistration(long id)
    {
        var registration = await _context.RestaurantRegistrations
            .FirstOrDefaultAsync(r => r.RestaurantRegistrationId == id);

        if (registration == null)
        {
            return NotFound(new { success = false, message = "Registration request not found." });
        }

        if (string.Equals(registration.Status, "Approved", StringComparison.OrdinalIgnoreCase) ||
            registration.ProvisionedOrganizationId != null)
        {
            return Conflict(new { success = false, message = "This registration has already been approved." });
        }

        if (string.Equals(registration.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "Rejected registrations cannot be approved." });
        }

        if (registration.Status != "PendingApproval" && registration.Status != "Pending")
        {
            return BadRequest(new { success = false, message = $"Registration is in unexpected status '{registration.Status}'." });
        }

        string email = registration.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.DeletedAt == null && u.Email != null && u.Email.ToLower() == email))
        {
            return Conflict(new { success = false, message = "An active user account with this owner email already exists." });
        }

        bool useTxn = _context.Database.IsRelational();
        await using var tx = useTxn ? await _context.Database.BeginTransactionAsync() : null;

        try
        {
            DateTime now = DateTime.UtcNow;

            var ownerRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "RestaurantOwner" && r.DeletedAt == null);
            if (ownerRole == null)
            {
                ownerRole = new Role
                {
                    RoleName = "RestaurantOwner",
                    Description = "Primary owner of a registered restaurant organization",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Roles.Add(ownerRole);
                await _context.SaveChangesAsync();
            }

            var org = new Organization
            {
                Name = registration.OrganizationName,
                Slug = await EnsureUniqueOrgSlugAsync(registration.OrganizationName),
                Gstin = registration.Gstin,
                OwnerEmail = email,
                Status = "Active",
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Organizations.Add(org);
            await _context.SaveChangesAsync();

            var restaurant = new Restaurant
            {
                OrganizationId = org.OrganizationId,
                Name = registration.RestaurantName,
                Code = await EnsureUniqueRestaurantCodeAsync(registration.RestaurantName),
                Status = "Active",
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Restaurants.Add(restaurant);
            await _context.SaveChangesAsync();

            var branch = new Branch
            {
                RestaurantId = restaurant.RestaurantId,
                BranchName = registration.BranchName,
                BranchCode = await EnsureUniqueBranchCodeAsync(registration.BranchName),
                City = registration.City,
                Address = registration.Address,
                Phone = registration.Phone,
                Email = email,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();

            var ownerUser = new User
            {
                RoleId = ownerRole.RoleId,
                BranchId = branch.BranchId,
                FullName = registration.OwnerName,
                UserName = await EnsureUniqueUsernameAsync(email, registration.OwnerName),
                Email = email,
                Phone = registration.Phone,
                PasswordHash = registration.PasswordHash,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Users.Add(ownerUser);
            await _context.SaveChangesAsync();

            _context.UserWorkspaceAccesses.Add(new UserWorkspaceAccess
            {
                UserId = ownerUser.UserId,
                OrganizationId = org.OrganizationId,
                RestaurantId = restaurant.RestaurantId,
                BranchId = branch.BranchId,
                ScopeRole = "RestaurantOwner",
                IsDefault = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            });

            _context.TenantSubscriptions.Add(new TenantSubscription
            {
                OrganizationId = org.OrganizationId,
                PlanKey = "single-outlet",
                PlanName = "Single Outlet",
                Status = "Trial",
                TrialStatus = "ActiveTrial",
                BranchLimit = 1,
                UserLimit = 15,
                MonthlyPriceInr = 2499m,
                CurrentPeriodStart = now,
                CurrentPeriodEnd = now.AddDays(14),
                CreatedAt = now,
                UpdatedAt = now
            });

            registration.Status = "Approved";
            registration.ReviewedByUserId = GetCurrentUserId();
            registration.ReviewedAt = now;
            registration.ProvisionedOrganizationId = org.OrganizationId;
            registration.ProvisionedRestaurantId = restaurant.RestaurantId;
            registration.ProvisionedBranchId = branch.BranchId;
            registration.UpdatedAt = now;

            await _context.SaveChangesAsync();
        await RecordAuditAsync("APPROVE", "restaurant_registrations", registration.RestaurantRegistrationId,
                $"Approved {registration.RestaurantName} -> Org={org.OrganizationId}, Rest={restaurant.RestaurantId}, Branch={branch.BranchId}");

            await _context.SaveChangesAsync();

            if (tx != null)
            {
                await tx.CommitAsync();
            }

            return Ok(new
            {
                success = true,
                message = "Restaurant registration approved and tenant workspace provisioned.",
                data = new
                {
                    registrationId = registration.RestaurantRegistrationId,
                    status = registration.Status,
                    organizationId = org.OrganizationId,
                    restaurantId = restaurant.RestaurantId,
                    branchId = branch.BranchId,
                    ownerUserId = ownerUser.UserId,
                    reviewedByUserId = registration.ReviewedByUserId,
                    reviewedAt = registration.ReviewedAt
                }
            });
        }
        catch
        {
            if (tx != null)
            {
                await tx.RollbackAsync();
            }
            throw;
        }
    }

    [HttpPost("registrations/{id:long}/reject")]
    public async Task<IActionResult> RejectRegistration(long id, [FromBody] RejectRegistrationDto? dto)
    {
        string reason = (dto?.Reason ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(reason))
        {
            return BadRequest(new { success = false, message = "A rejection reason is required." });
        }

        var registration = await _context.RestaurantRegistrations
            .FirstOrDefaultAsync(r => r.RestaurantRegistrationId == id);

        if (registration == null)
        {
            return NotFound(new { success = false, message = "Registration request not found." });
        }

        if (string.Equals(registration.Status, "Approved", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "Approved registrations cannot be rejected." });
        }

        if (string.Equals(registration.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "This registration has already been rejected." });
        }

        DateTime now = DateTime.UtcNow;
        registration.Status = "Rejected";
        registration.RejectionReason = reason;
        registration.ReviewedByUserId = GetCurrentUserId();
        registration.ReviewedAt = now;
        registration.UpdatedAt = now;

        await _context.SaveChangesAsync();
        await RecordAuditAsync("REJECT", "restaurant_registrations", registration.RestaurantRegistrationId, $"Rejected: {reason}");
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Registration rejected.",
            data = new
            {
                registrationId = registration.RestaurantRegistrationId,
                status = registration.Status,
                rejectionReason = registration.RejectionReason,
                reviewedByUserId = registration.ReviewedByUserId,
                reviewedAt = registration.ReviewedAt
            }
        });
    }

    // ============================================================
    // 4. BRANCH MANAGEMENT
    // ============================================================

    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches([FromQuery] string? status)
    {
        var query = _context.Branches
            .AsNoTracking()
            .Include(b => b.Restaurant)
            .Where(b => b.DeletedAt == null);

        if (string.Equals(status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(b => b.IsActive);
        }
        else if (string.Equals(status, "Inactive", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(b => !b.IsActive);
        }

        var branches = await query.OrderBy(b => b.BranchId).ToListAsync();
        var items = branches.Select(b => new
        {
            id = b.BranchId,
            branchId = b.BranchId,
            branchName = b.BranchName,
            branchCode = b.BranchCode ?? Slugify(b.BranchName, $"branch-{b.BranchId}"),
            restaurantId = b.RestaurantId,
            restaurantName = b.Restaurant?.Name ?? "Unassigned",
            organizationId = b.Restaurant?.OrganizationId,
            city = b.City ?? "",
            address = b.Address ?? "",
            phone = b.Phone ?? "",
            isActive = b.IsActive,
            status = b.IsActive ? "Active" : "Inactive"
        });

        return Ok(new { success = true, data = items });
    }

    [HttpPost("branches")]
    public async Task<IActionResult> CreateBranch([FromBody] BranchUpsertDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.BranchName))
        {
            return BadRequest(new { success = false, message = "Branch name is required." });
        }

        Restaurant? restaurant = null;
        if (dto.RestaurantId.HasValue && dto.RestaurantId.Value > 0)
        {
            restaurant = await _context.Restaurants
                .Include(r => r.Organization)
                .FirstOrDefaultAsync(r => r.RestaurantId == dto.RestaurantId.Value && r.DeletedAt == null);
        }
        else if (!string.IsNullOrWhiteSpace(dto.RestaurantName))
        {
            string restName = dto.RestaurantName.Trim();
            restaurant = await _context.Restaurants
                .Include(r => r.Organization)
                .FirstOrDefaultAsync(r => r.Name == restName && r.DeletedAt == null);
        }

        if (restaurant == null || restaurant.Organization == null || restaurant.Organization.DeletedAt != null)
        {
            return BadRequest(new { success = false, message = "A valid active restaurant association is required." });
        }

        var sub = await _context.TenantSubscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.OrganizationId == restaurant.OrganizationId);

        if (sub != null)
        {
            int currentCount = await _context.Branches
                .Include(b => b.Restaurant)
                .CountAsync(b => b.DeletedAt == null && b.Restaurant != null && b.Restaurant.OrganizationId == restaurant.OrganizationId);
            if (currentCount >= sub.BranchLimit)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Branch limit ({sub.BranchLimit}) reached for plan '{sub.PlanName}'. Upgrade subscription first."
                });
            }
        }

        DateTime now = DateTime.UtcNow;
        string rawCode = string.IsNullOrWhiteSpace(dto.BranchCode) ? dto.BranchName : dto.BranchCode;
        var branch = new Branch
        {
            RestaurantId = restaurant.RestaurantId,
            BranchName = dto.BranchName.Trim(),
            BranchCode = await EnsureUniqueBranchCodeAsync(rawCode),
            City = dto.City?.Trim(),
            Address = dto.Address?.Trim(),
            Phone = dto.Phone?.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync();

        await _context.SaveChangesAsync();
        await RecordAuditAsync("CREATE", "branches", branch.BranchId, $"Created branch {branch.BranchName} for Restaurant={restaurant.RestaurantId}");
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            data = new
            {
                id = branch.BranchId,
                branchName = branch.BranchName,
                branchCode = branch.BranchCode,
                restaurantId = restaurant.RestaurantId,
                restaurantName = restaurant.Name,
                organizationId = restaurant.OrganizationId,
                city = branch.City,
                isActive = branch.IsActive
            }
        });
    }

    [HttpPut("branches/{id:long}")]
    public async Task<IActionResult> UpdateBranch(long id, [FromBody] BranchUpsertDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.BranchName))
        {
            return BadRequest(new { success = false, message = "Branch name is required." });
        }

        var branch = await _context.Branches
            .Include(b => b.Restaurant)
            .FirstOrDefaultAsync(b => b.BranchId == id && b.DeletedAt == null);

        if (branch == null)
        {
            return NotFound(new { success = false, message = "Branch not found." });
        }

        branch.BranchName = dto.BranchName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.BranchCode))
        {
            string requestedCode = Slugify(dto.BranchCode, $"branch-{branch.BranchId}");
            bool codeTaken = await _context.Branches.AnyAsync(b => b.BranchId != id && b.BranchCode == requestedCode);
            if (codeTaken)
            {
                return Conflict(new { success = false, message = "Branch code is already in use." });
            }
            branch.BranchCode = requestedCode;
        }
        branch.City = dto.City?.Trim();
        branch.Address = dto.Address?.Trim();
        branch.Phone = dto.Phone?.Trim();
        branch.IsActive = dto.IsActive;
        branch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "branches", branch.BranchId, $"Updated branch {branch.BranchName}");
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                id = branch.BranchId,
                branchName = branch.BranchName,
                branchCode = branch.BranchCode,
                restaurantId = branch.RestaurantId,
                restaurantName = branch.Restaurant?.Name ?? "",
                isActive = branch.IsActive
            }
        });
    }

    // ============================================================
    // 5. ROLES & PERMISSIONS MATRIX
    // ============================================================

    [HttpGet("roles/{roleKey}/permissions")]
    public async Task<IActionResult> GetRolePermissions(string roleKey)
    {
        string cleanKey = (roleKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(cleanKey))
        {
            return BadRequest(new { success = false, message = "Role key is required." });
        }

        var role = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.DeletedAt == null && r.RoleName.ToLower() == cleanKey.ToLower());

        var rows = role != null
            ? await _context.RolePermissions
                .AsNoTracking()
                .Where(rp => rp.RoleId == role.RoleId)
                .ToListAsync()
            : await _context.RolePermissions
                .AsNoTracking()
                .Where(rp => rp.RoleKey.ToLower() == cleanKey.ToLower())
                .ToListAsync();

        var permissions = new Dictionary<string, Dictionary<string, bool>>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            int dot = row.PermissionKey.LastIndexOf('.');
            if (dot <= 0 || dot >= row.PermissionKey.Length - 1) continue;
            string mod = row.PermissionKey[..dot];
            string act = row.PermissionKey[(dot + 1)..].ToLowerInvariant();
            if (!permissions.TryGetValue(mod, out var actMap))
            {
                actMap = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
                permissions[mod] = actMap;
            }
            actMap[act] = row.IsGranted;
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                roleKey = role?.RoleName ?? cleanKey,
                permissions
            }
        });
    }

    [HttpPut("roles/{roleKey}/permissions")]
    public async Task<IActionResult> SaveRolePermissions(string roleKey, [FromBody] Dictionary<string, Dictionary<string, bool>>? matrix)
    {
        string cleanKey = (roleKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(cleanKey) || matrix == null)
        {
            return BadRequest(new { success = false, message = "Role key and permissions matrix are required." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(r =>
            r.DeletedAt == null && r.RoleName.ToLower() == cleanKey.ToLower());

        DateTime now = DateTime.UtcNow;
        if (role == null)
        {
            role = new Role
            {
                RoleName = cleanKey,
                Description = $"Custom platform role ({cleanKey})",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
        }

        var existing = await _context.RolePermissions
            .Where(rp => rp.RoleId == role.RoleId)
            .ToListAsync();
        var existingByKey = existing.ToDictionary(rp => rp.PermissionKey, StringComparer.OrdinalIgnoreCase);

        long? actorId = GetCurrentUserId();
        foreach (var (moduleName, actions) in matrix)
        {
            if (actions == null) continue;
            foreach (var (actionName, isGranted) in actions)
            {
                string permKey = $"{moduleName}.{actionName}";
                if (existingByKey.TryGetValue(permKey, out var row))
                {
                    row.IsGranted = isGranted;
                    row.UpdatedByUserId = actorId;
                    row.UpdatedAt = now;
                }
                else
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.RoleId,
                        RoleKey = role.RoleName,
                        PermissionKey = permKey,
                        IsGranted = isGranted,
                        UpdatedByUserId = actorId,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "role_permissions", role.RoleId, $"Updated permissions for role {role.RoleName}");
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = new { roleId = role.RoleId, roleKey = role.RoleName } });
    }

    // ============================================================
    // 6. SUBSCRIPTION MANAGEMENT
    // ============================================================

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions()
    {
        var subs = await _context.TenantSubscriptions
            .AsNoTracking()
            .Include(s => s.Organization)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

        var items = subs.Select(s => new
        {
            id = s.TenantSubscriptionId,
            organizationId = s.OrganizationId,
            organizationName = s.Organization?.Name ?? $"Org #{s.OrganizationId}",
            planKey = s.PlanKey,
            planName = s.PlanName,
            status = s.Status,
            trialStatus = s.TrialStatus,
            expiresAt = s.CurrentPeriodEnd.ToString("yyyy-MM-dd"),
            branchLimit = s.BranchLimit,
            userLimit = s.UserLimit,
            monthlyPriceInr = s.MonthlyPriceInr
        });

        return Ok(new { success = true, data = items });
    }

    [HttpPut("subscriptions/{id:long}")]
    public async Task<IActionResult> UpdateSubscription(long id, [FromBody] SubscriptionUpdateDto? dto)
    {
        string planId = (dto?.PlanId ?? string.Empty).Trim();
        if (!PlanCatalog.TryGetValue(planId, out var plan))
        {
            return BadRequest(new { success = false, message = "Invalid subscription planId." });
        }

        var sub = await _context.TenantSubscriptions
            .Include(s => s.Organization)
            .FirstOrDefaultAsync(s => s.TenantSubscriptionId == id);

        if (sub == null)
        {
            return NotFound(new { success = false, message = "Subscription record not found." });
        }

        DateTime now = DateTime.UtcNow;
        sub.PlanKey = planId;
        sub.PlanName = plan.PlanName;
        sub.BranchLimit = plan.BranchLimit;
        sub.UserLimit = plan.UserLimit;
        sub.MonthlyPriceInr = plan.MonthlyPriceInr;
        sub.Status = "Active";
        sub.TrialStatus = "Converted";
        sub.CurrentPeriodStart = now;
        sub.CurrentPeriodEnd = now.AddMonths(1);
        sub.UpdatedAt = now;

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "tenant_subscriptions", sub.TenantSubscriptionId, $"Updated plan to {plan.PlanName} for Org={sub.OrganizationId}");
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                id = sub.TenantSubscriptionId,
                organizationId = sub.OrganizationId,
                planKey = sub.PlanKey,
                planName = sub.PlanName,
                status = sub.Status,
                branchLimit = sub.BranchLimit,
                userLimit = sub.UserLimit
            }
        });
    }

    // ============================================================
    // 7. SAAS BILLING INVOICES
    // ============================================================

    [HttpGet("billing/invoices")]
    public async Task<IActionResult> GetBillingInvoices([FromQuery] string? status)
    {
        var all = await _context.SaasBillingInvoices
            .AsNoTracking()
            .Include(i => i.Organization)
            .OrderByDescending(i => i.DueDate)
            .ToListAsync();

        var filtered = all.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            filtered = filtered.Where(i => string.Equals(i.Status, status.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        var items = filtered.Select(i => new
        {
            id = i.SaasBillingInvoiceId,
            invoiceNumber = i.InvoiceNumber,
            organizationId = i.OrganizationId,
            organizationName = i.Organization?.Name ?? $"Org #{i.OrganizationId}",
            planName = i.PlanName,
            amount = i.Amount,
            dueDate = i.DueDate.ToString("yyyy-MM-dd"),
            status = i.Status,
            paymentReference = i.PaymentReference
        }).ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                summary = new
                {
                    totalBilled = all.Sum(i => i.Amount),
                    paidCount = all.Count(i => string.Equals(i.Status, "Paid", StringComparison.OrdinalIgnoreCase)),
                    pendingCount = all.Count(i => string.Equals(i.Status, "Pending", StringComparison.OrdinalIgnoreCase)),
                    overdueCount = all.Count(i => string.Equals(i.Status, "Overdue", StringComparison.OrdinalIgnoreCase))
                },
                items
            }
        });
    }

    // ============================================================
    // 8. SUPPORT TICKETS
    // ============================================================

    [HttpGet("support-tickets")]
    public async Task<IActionResult> GetSupportTickets([FromQuery] string? priority)
    {
        var query = _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.Organization)
            .Include(t => t.Notes)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(priority) && !string.Equals(priority, "all", StringComparison.OrdinalIgnoreCase))
        {
            string p = priority.Trim();
            query = query.Where(t => t.Priority == p);
        }

        var tickets = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        var items = tickets.Select(t => new
        {
            id = t.SupportTicketId,
            ticketNumber = t.TicketNumber,
            subject = t.Subject,
            organizationId = t.OrganizationId,
            organizationName = t.Organization?.Name ?? $"Org #{t.OrganizationId}",
            priority = t.Priority,
            status = t.Status,
            description = t.Description,
            notes = t.Notes.OrderByDescending(n => n.CreatedAt).Select(n => new
            {
                id = n.SupportTicketNoteId,
                note = n.Note,
                authorUserId = n.AuthorUserId,
                createdAt = n.CreatedAt
            })
        });

        return Ok(new { success = true, data = items });
    }

    [HttpPost("support-tickets/{id:long}/notes")]
    public async Task<IActionResult> AddTicketNote(long id, [FromBody] SupportNoteDto? dto)
    {
        string noteText = (dto?.Note ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(noteText))
        {
            return BadRequest(new { success = false, message = "Note content is required." });
        }

        var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.SupportTicketId == id);
        if (ticket == null)
        {
            return NotFound(new { success = false, message = "Support ticket not found." });
        }

        DateTime now = DateTime.UtcNow;
        var note = new SupportTicketNote
        {
            SupportTicketId = ticket.SupportTicketId,
            AuthorUserId = GetCurrentUserId(),
            Note = noteText,
            CreatedAt = now
        };
        _context.SupportTicketNotes.Add(note);
        ticket.UpdatedAt = now;

        await _context.SaveChangesAsync();
        await RecordAuditAsync("CREATE", "support_ticket_notes", ticket.SupportTicketId, $"Added internal note to {ticket.TicketNumber}");
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            data = new
            {
                id = note.SupportTicketNoteId,
                ticketId = ticket.SupportTicketId,
                note = note.Note,
                createdAt = note.CreatedAt
            }
        });
    }

    // ============================================================
    // 9. PLATFORM SETTINGS
    // ============================================================

    [HttpGet("settings")]
    public async Task<IActionResult> GetPlatformSettings()
    {
        var setting = await _context.PlatformSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SettingKey == "default");

        bool maintenanceBannerEnabled = false;
        string maintenanceBannerText = string.Empty;
        bool enableMultiBranchOnboarding = true;
        bool enableSelfServiceQr = true;

        if (!string.IsNullOrWhiteSpace(setting?.SettingsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(setting.SettingsJson);
                if (doc.RootElement.TryGetProperty("maintenanceBannerEnabled", out var p1)) maintenanceBannerEnabled = p1.GetBoolean();
                if (doc.RootElement.TryGetProperty("maintenanceBannerText", out var p2)) maintenanceBannerText = p2.GetString() ?? string.Empty;
                if (doc.RootElement.TryGetProperty("enableMultiBranchOnboarding", out var p3)) enableMultiBranchOnboarding = p3.GetBoolean();
                if (doc.RootElement.TryGetProperty("enableSelfServiceQr", out var p4)) enableSelfServiceQr = p4.GetBoolean();
            }
            catch { }
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                platformName = setting?.PlatformName ?? "PIRNAV",
                requireManualApproval = setting?.RequireManualApproval ?? true,
                defaultCurrency = setting?.DefaultCurrency ?? "INR",
                defaultTaxRate = setting?.DefaultTaxRate ?? 5.00m,
                notifyOnRegistration = setting?.NotifyOnRegistration ?? true,
                maintenanceBannerEnabled,
                maintenanceBannerText,
                enableMultiBranchOnboarding,
                enableSelfServiceQr
            }
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> SavePlatformSettings([FromBody] PlatformSettingsDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { success = false, message = "Settings payload is required." });
        }

        DateTime now = DateTime.UtcNow;
        var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == "default");
        if (setting == null)
        {
            setting = new PlatformSetting { SettingKey = "default", CreatedAt = now };
            _context.PlatformSettings.Add(setting);
        }

        setting.PlatformName = string.IsNullOrWhiteSpace(dto.PlatformName) ? "PIRNAV" : dto.PlatformName.Trim();
        setting.RequireManualApproval = dto.RequireManualApproval;
        setting.DefaultCurrency = string.IsNullOrWhiteSpace(dto.DefaultCurrency) ? "INR" : dto.DefaultCurrency.Trim().ToUpperInvariant();
        setting.DefaultTaxRate = Math.Clamp(dto.DefaultTaxRate, 0m, 28m);
        setting.NotifyOnRegistration = dto.NotifyOnRegistration;
        setting.SettingsJson = JsonSerializer.Serialize(new
        {
            maintenanceBannerEnabled = dto.MaintenanceBannerEnabled,
            maintenanceBannerText = (dto.MaintenanceBannerText ?? string.Empty).Trim(),
            enableMultiBranchOnboarding = dto.EnableMultiBranchOnboarding,
            enableSelfServiceQr = dto.EnableSelfServiceQr
        });
        setting.UpdatedByUserId = GetCurrentUserId();
        setting.UpdatedAt = now;

        await _context.SaveChangesAsync();
        await RecordAuditAsync("UPDATE", "platform_settings", setting.PlatformSettingId, "Updated platform settings");
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Platform settings saved." });
    }
}
