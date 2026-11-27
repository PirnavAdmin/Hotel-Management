using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
[Tags("TenantWorkspace")]
public class TenantWorkspaceController : ControllerBase
{
    private readonly AppDbContext _context;

    public TenantWorkspaceController(AppDbContext context)
    {
        _context = context;
    }

    public sealed class SwitchWorkspaceRequestDto
    {
        public long OrganizationId { get; set; }
        public long RestaurantId { get; set; }
        public long BranchId { get; set; }
    }

    private long? GetCurrentUserId()
    {
        string? raw = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(raw, out long uid) && uid > 0 ? uid : null;
    }

    private long? GetClaimLong(string claimType)
    {
        string? raw = User.FindFirstValue(claimType);
        return long.TryParse(raw, out long val) && val > 0 ? val : null;
    }

    private bool IsPlatformSuperAdmin() =>
        User.IsInRole("PlatformSuperAdmin") ||
        string.Equals(User.FindFirstValue(ClaimTypes.Role), "PlatformSuperAdmin", StringComparison.OrdinalIgnoreCase);

    private async Task<List<Organization>> LoadAuthorizedHierarchyAsync(long userId)
    {
        if (IsPlatformSuperAdmin())
        {
            return await _context.Organizations
                .AsNoTracking()
                .Where(o => o.DeletedAt == null && o.Status == "Active")
                .Include(o => o.Restaurants.Where(r => r.DeletedAt == null && r.Status == "Active"))
                .ThenInclude(r => r.Branches.Where(b => b.DeletedAt == null && b.IsActive))
                .OrderBy(o => o.OrganizationId)
                .ToListAsync();
        }

        var accesses = await _context.UserWorkspaceAccesses
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.IsActive)
            .ToListAsync();

        var allowedOrgIds = accesses.Select(a => a.OrganizationId).Distinct().ToList();
        var allowedRestIds = accesses.Select(a => a.RestaurantId).Distinct().ToList();
        var allowedBranchIds = accesses.Where(a => a.BranchId.HasValue).Select(a => a.BranchId!.Value).Distinct().ToList();

        if (allowedOrgIds.Count == 0)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId && u.DeletedAt == null);

            if (user?.BranchId != null)
            {
                var branch = await _context.Branches
                    .AsNoTracking()
                    .Include(b => b.Restaurant)
                    .FirstOrDefaultAsync(b => b.BranchId == user.BranchId.Value && b.DeletedAt == null);

                if (branch?.Restaurant != null)
                {
                    allowedOrgIds.Add(branch.Restaurant.OrganizationId);
                    allowedRestIds.Add(branch.RestaurantId!.Value);
                    allowedBranchIds.Add(branch.BranchId);
                }
            }
            else
            {
                long? claimOrg = GetClaimLong("organizationId");
                long? claimRest = GetClaimLong("restaurantId");
                long? claimBranch = GetClaimLong("branchId");
                if (claimOrg.HasValue) allowedOrgIds.Add(claimOrg.Value);
                if (claimRest.HasValue) allowedRestIds.Add(claimRest.Value);
                if (claimBranch.HasValue) allowedBranchIds.Add(claimBranch.Value);
            }
        }

        if (allowedOrgIds.Count == 0)
        {
            return new List<Organization>();
        }

        var orgs = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.DeletedAt == null && o.Status == "Active" && allowedOrgIds.Contains(o.OrganizationId))
            .Include(o => o.Restaurants)
            .ThenInclude(r => r.Branches)
            .ToListAsync();

        foreach (var org in orgs)
        {
            org.Restaurants = org.Restaurants
                .Where(r => r.DeletedAt == null && r.Status == "Active" && (allowedRestIds.Count == 0 || allowedRestIds.Contains(r.RestaurantId)))
                .ToList();

            foreach (var rest in org.Restaurants)
            {
                bool hasOrgWideScope = accesses.Any(a => a.RestaurantId == rest.RestaurantId && a.BranchId == null);
                rest.Branches = rest.Branches
                    .Where(b => b.DeletedAt == null && b.IsActive && (hasOrgWideScope || allowedBranchIds.Count == 0 || allowedBranchIds.Contains(b.BranchId)))
                    .ToList();
            }
        }

        return orgs;
    }

    [HttpGet("workspaces/authorized")]
    public async Task<IActionResult> GetAuthorizedWorkspaces()
    {
        long? userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new { success = false, message = "Authenticated user claim required." });
        }

        var orgs = await LoadAuthorizedHierarchyAsync(userId.Value);
        long? activeOrgId = GetClaimLong("organizationId") ?? orgs.FirstOrDefault()?.OrganizationId;
        var activeOrg = orgs.FirstOrDefault(o => o.OrganizationId == activeOrgId) ?? orgs.FirstOrDefault();
        long? activeRestId = GetClaimLong("restaurantId") ?? activeOrg?.Restaurants.FirstOrDefault()?.RestaurantId;
        var activeRest = activeOrg?.Restaurants.FirstOrDefault(r => r.RestaurantId == activeRestId) ?? activeOrg?.Restaurants.FirstOrDefault();
        long? activeBranchId = GetClaimLong("branchId") ?? activeRest?.Branches.FirstOrDefault()?.BranchId;

        return Ok(new
        {
            success = true,
            data = new
            {
                activeOrganizationId = activeOrg?.OrganizationId,
                activeRestaurantId = activeRest?.RestaurantId,
                activeBranchId,
                organizations = orgs.Select(o => new
                {
                    id = o.OrganizationId,
                    name = o.Name,
                    slug = o.Slug,
                    restaurants = o.Restaurants.Select(r => new
                    {
                        id = r.RestaurantId,
                        name = r.Name,
                        code = r.Code,
                        branches = r.Branches.Select(b => new
                        {
                            id = b.BranchId,
                            name = b.BranchName,
                            branchCode = b.BranchCode
                        })
                    })
                })
            }
        });
    }

    [HttpPost("workspaces/switch-context")]
    public async Task<IActionResult> SwitchWorkspaceContext([FromBody] SwitchWorkspaceRequestDto? request)
    {
        long? userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new { success = false, message = "Authenticated user claim required." });
        }

        if (request == null || request.OrganizationId <= 0 || request.RestaurantId <= 0 || request.BranchId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid organizationId, restaurantId, and branchId are required." });
        }

        var orgs = await LoadAuthorizedHierarchyAsync(userId.Value);
        var org = orgs.FirstOrDefault(o => o.OrganizationId == request.OrganizationId);
        var rest = org?.Restaurants.FirstOrDefault(r => r.RestaurantId == request.RestaurantId);
        var branch = rest?.Branches.FirstOrDefault(b => b.BranchId == request.BranchId);

        if (org == null || rest == null || branch == null)
        {
            return StatusCode(403, new
            {
                success = false,
                message = "You are not authorized to switch to the requested organization, restaurant, or branch."
            });
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                organizationId = org.OrganizationId,
                organizationName = org.Name,
                restaurantId = rest.RestaurantId,
                restaurantName = rest.Name,
                branchId = branch.BranchId,
                branchName = branch.BranchName,
                branchCode = branch.BranchCode
            }
        });
    }

    [HttpGet("tenant/subscription")]
    public async Task<IActionResult> GetTenantSubscription()
    {
        long? userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new { success = false, message = "Authenticated user claim required." });
        }

        long? orgId = GetClaimLong("organizationId");
        if (!orgId.HasValue)
        {
            var orgs = await LoadAuthorizedHierarchyAsync(userId.Value);
            orgId = orgs.FirstOrDefault()?.OrganizationId;
        }

        if (!orgId.HasValue)
        {
            return NotFound(new { success = false, message = "No organization subscription found for this account." });
        }

        var sub = await _context.TenantSubscriptions
            .AsNoTracking()
            .Where(s => s.OrganizationId == orgId.Value)
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync();

        if (sub == null)
        {
            return Ok(new
            {
                success = true,
                data = new
                {
                    organizationId = orgId.Value,
                    planKey = "single-outlet",
                    planName = "Standard Plan",
                    status = "Active",
                    trialStatus = "None",
                    branchLimit = 1,
                    userLimit = 15,
                    enabledModules = new[] { "Dine-In POS", "Takeaway", "Kitchen KOT", "QR Self-Service" }
                }
            });
        }

        string[] modules = new[] { "Dine-In POS", "Takeaway", "Kitchen KOT", "QR Self-Service" };
        if (!string.IsNullOrWhiteSpace(sub.EnabledModulesJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<string[]>(sub.EnabledModulesJson);
                if (parsed != null && parsed.Length > 0) modules = parsed;
            }
            catch { }
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                organizationId = sub.OrganizationId,
                planKey = sub.PlanKey,
                planName = sub.PlanName,
                status = sub.Status,
                trialStatus = sub.TrialStatus,
                branchLimit = sub.BranchLimit,
                userLimit = sub.UserLimit,
                expiresAt = sub.CurrentPeriodEnd.ToString("yyyy-MM-dd"),
                enabledModules = modules
            }
        });
    }
}
