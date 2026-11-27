using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/public")]
[AllowAnonymous]
[Tags("Public SaaS")]
public class PublicSaasController : ControllerBase
{
    private static readonly Regex EmailRegex = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
    private static readonly Regex IndianMobileRegex = new(@"^[6-9]\d{9}$", RegexOptions.Compiled);
    private static readonly Regex GstinRegex = new(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", RegexOptions.Compiled);

    private readonly AppDbContext _context;

    public PublicSaasController(AppDbContext context)
    {
        _context = context;
    }

    public sealed class RestaurantRegistrationRequestDto
    {
        public string? OrganizationName { get; set; }
        public string? RestaurantName { get; set; }
        public string? BranchName { get; set; }
        public string? OwnerName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Password { get; set; }
        public string? City { get; set; }
        public string? Address { get; set; }
        public string? Gstin { get; set; }
    }

    public sealed class DemoRequestDto
    {
        public string? Name { get; set; }
        public string? RestaurantOrOrg { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public int BranchCount { get; set; } = 1;
        public string? Message { get; set; }
    }

    private static string NormalizePhone(string? raw)
    {
        string digits = Regex.Replace(raw ?? string.Empty, @"[\s\-()+]", string.Empty);
        if (digits.StartsWith("91", StringComparison.Ordinal) && digits.Length == 12)
        {
            digits = digits[2..];
        }
        else if (digits.StartsWith("0", StringComparison.Ordinal) && digits.Length == 11)
        {
            digits = digits[1..];
        }
        return digits;
    }

    [HttpPost("restaurant-registrations")]
    public async Task<IActionResult> RegisterRestaurant([FromBody] RestaurantRegistrationRequestDto? request)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, message = "Registration payload is required." });
        }

        string orgName = (request.OrganizationName ?? string.Empty).Trim();
        string restName = (request.RestaurantName ?? string.Empty).Trim();
        string branchName = (request.BranchName ?? string.Empty).Trim();
        string ownerName = (request.OwnerName ?? string.Empty).Trim();
        string email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        string phone = NormalizePhone(request.Phone);
        string password = request.Password ?? string.Empty;
        string city = (request.City ?? string.Empty).Trim();
        string address = (request.Address ?? string.Empty).Trim();
        string? gstin = string.IsNullOrWhiteSpace(request.Gstin) ? null : request.Gstin.Trim().ToUpperInvariant();

        var errors = new Dictionary<string, string>();
        if (orgName.Length < 2) errors["organizationName"] = "Organization name must be at least 2 characters.";
        if (restName.Length < 2) errors["restaurantName"] = "Restaurant name must be at least 2 characters.";
        if (branchName.Length < 2) errors["branchName"] = "Primary branch name must be at least 2 characters.";
        if (ownerName.Length < 2) errors["ownerName"] = "Owner full name must be at least 2 characters.";
        if (string.IsNullOrEmpty(email) || !EmailRegex.IsMatch(email)) errors["email"] = "A valid work email is required.";
        if (!IndianMobileRegex.IsMatch(phone)) errors["phone"] = "A valid 10-digit Indian mobile number is required.";
        if (password.Length < 8 || !Regex.IsMatch(password, "[A-Za-z]") || !Regex.IsMatch(password, @"\d"))
        {
            errors["password"] = "Password must be at least 8 characters and include a letter and a number.";
        }
        if (city.Length < 2) errors["city"] = "City is required.";
        if (address.Length < 5) errors["address"] = "Full street address is required (at least 5 characters).";
        if (gstin != null && !GstinRegex.IsMatch(gstin))
        {
            errors["gstin"] = "GSTIN must be a valid 15-character Indian GSTIN.";
        }

        if (errors.Count > 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Please correct the highlighted registration fields.",
                errors
            });
        }

        bool duplicateEmail =
            await _context.RestaurantRegistrations.AnyAsync(r => r.Email.ToLower() == email && r.Status != "Rejected") ||
            await _context.Users.AnyAsync(u => u.DeletedAt == null && u.Email != null && u.Email.ToLower() == email);

        if (duplicateEmail)
        {
            return Conflict(new
            {
                success = false,
                message = "A restaurant registration or user account with this email already exists."
            });
        }

        if (gstin != null)
        {
            bool duplicateGstin =
                await _context.RestaurantRegistrations.AnyAsync(r => r.Gstin == gstin && r.Status != "Rejected") ||
                await _context.Organizations.AnyAsync(o => o.DeletedAt == null && o.Gstin == gstin);

            if (duplicateGstin)
            {
                return Conflict(new
                {
                    success = false,
                    message = "An organization or registration with this GSTIN already exists."
                });
            }
        }

        DateTime now = DateTime.UtcNow;
        var entity = new RestaurantRegistration
        {
            OrganizationName = orgName,
            RestaurantName = restName,
            BranchName = branchName,
            OwnerName = ownerName,
            Email = email,
            Phone = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            City = city,
            Address = address,
            Gstin = gstin,
            Status = "PendingApproval",
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.RestaurantRegistrations.Add(entity);
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            message = "Restaurant registration submitted and pending Super Admin approval.",
            data = new
            {
                registrationId = entity.RestaurantRegistrationId,
                status = entity.Status,
                organizationName = entity.OrganizationName,
                restaurantName = entity.RestaurantName,
                branchName = entity.BranchName,
                email = entity.Email
            }
        });
    }

    [HttpPost("demo-requests")]
    public async Task<IActionResult> SubmitDemoRequest([FromBody] DemoRequestDto? request)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, message = "Demo request payload is required." });
        }

        string name = (request.Name ?? string.Empty).Trim();
        string restaurantOrOrg = (request.RestaurantOrOrg ?? string.Empty).Trim();
        string email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        string phone = NormalizePhone(request.Phone);
        string? message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim();

        var errors = new Dictionary<string, string>();
        if (name.Length < 2) errors["name"] = "Your name is required.";
        if (restaurantOrOrg.Length < 2) errors["restaurantOrOrg"] = "Restaurant or organization name is required.";
        if (string.IsNullOrEmpty(email) || !EmailRegex.IsMatch(email)) errors["email"] = "A valid work email is required.";
        if (!IndianMobileRegex.IsMatch(phone)) errors["phone"] = "A valid 10-digit Indian mobile number is required.";
        if (request.BranchCount < 1 || request.BranchCount > 5000) errors["branchCount"] = "Enter a valid number of branches (1 to 5000).";
        if (message != null && message.Length > 1000) errors["message"] = "Message cannot exceed 1000 characters.";

        if (errors.Count > 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Please correct the highlighted demo request fields.",
                errors
            });
        }

        DateTime now = DateTime.UtcNow;
        var entity = new DemoRequest
        {
            Name = name,
            RestaurantOrOrg = restaurantOrOrg,
            Email = email,
            Phone = phone,
            BranchCount = request.BranchCount,
            Message = message,
            Status = "New",
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.DemoRequests.Add(entity);
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            message = "Demo request submitted successfully.",
            data = new
            {
                demoRequestId = entity.DemoRequestId,
                status = entity.Status,
                restaurantOrOrg = entity.RestaurantOrOrg,
                email = entity.Email
            }
        });
    }
}
