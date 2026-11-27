using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("organizations")]
public class Organization
{
    [Key]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(160)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    [Column("slug")]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("gstin")]
    public string? Gstin { get; set; }

    [MaxLength(150)]
    [Column("owner_email")]
    public string? OwnerEmail { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    public ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();
    public ICollection<TenantSubscription> Subscriptions { get; set; } = new List<TenantSubscription>();
}

[Table("restaurants")]
public class Restaurant
{
    [Key]
    [Column("restaurant_id")]
    public long RestaurantId { get; set; }

    [Required]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(160)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(60)]
    [Column("code")]
    public string Code { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("brand_tagline")]
    public string? BrandTagline { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    public Organization? Organization { get; set; }
    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}

[Table("user_workspace_access")]
public class UserWorkspaceAccess
{
    [Key]
    [Column("user_workspace_access_id")]
    public long UserWorkspaceAccessId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [Column("restaurant_id")]
    public long RestaurantId { get; set; }

    [Column("branch_id")]
    public long? BranchId { get; set; }

    [MaxLength(50)]
    [Column("scope_role")]
    public string ScopeRole { get; set; } = "Admin";

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Organization? Organization { get; set; }
    public Restaurant? Restaurant { get; set; }
    public Branch? Branch { get; set; }
}

[Table("restaurant_registrations")]
public class RestaurantRegistration
{
    [Key]
    [Column("restaurant_registration_id")]
    public long RestaurantRegistrationId { get; set; }

    [Required]
    [MaxLength(160)]
    [Column("organization_name")]
    public string OrganizationName { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    [Column("restaurant_name")]
    public string RestaurantName { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    [Column("branch_name")]
    public string BranchName { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    [Column("owner_name")]
    public string OwnerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(25)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("city")]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    [Column("address")]
    public string Address { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("gstin")]
    public string? Gstin { get; set; }

    [Required]
    [MaxLength(32)]
    [Column("status")]
    public string Status { get; set; } = "PendingApproval";

    [MaxLength(500)]
    [Column("rejection_reason")]
    public string? RejectionReason { get; set; }

    [Column("reviewed_by_user_id")]
    public long? ReviewedByUserId { get; set; }

    [Column("reviewed_at")]
    public DateTime? ReviewedAt { get; set; }

    [Column("provisioned_organization_id")]
    public long? ProvisionedOrganizationId { get; set; }

    [Column("provisioned_restaurant_id")]
    public long? ProvisionedRestaurantId { get; set; }

    [Column("provisioned_branch_id")]
    public long? ProvisionedBranchId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("demo_requests")]
public class DemoRequest
{
    [Key]
    [Column("demo_request_id")]
    public long DemoRequestId { get; set; }

    [Required]
    [MaxLength(120)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    [Column("restaurant_or_org")]
    public string RestaurantOrOrg { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(25)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Column("branch_count")]
    public int BranchCount { get; set; } = 1;

    [MaxLength(1000)]
    [Column("message")]
    public string? Message { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "New";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("tenant_subscriptions")]
public class TenantSubscription
{
    [Key]
    [Column("tenant_subscription_id")]
    public long TenantSubscriptionId { get; set; }

    [Required]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(60)]
    [Column("plan_key")]
    public string PlanKey { get; set; } = "single-outlet";

    [Required]
    [MaxLength(100)]
    [Column("plan_name")]
    public string PlanName { get; set; } = "Single Outlet";

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "Trial";

    [MaxLength(40)]
    [Column("trial_status")]
    public string TrialStatus { get; set; } = "ActiveTrial";

    [Column("branch_limit")]
    public int BranchLimit { get; set; } = 1;

    [Column("user_limit")]
    public int UserLimit { get; set; } = 15;

    [Column("enabled_modules_json", TypeName = "text")]
    public string? EnabledModulesJson { get; set; }

    [Column("monthly_price_inr", TypeName = "decimal(12,2)")]
    public decimal MonthlyPriceInr { get; set; } = 2499m;

    [Column("current_period_start")]
    public DateTime CurrentPeriodStart { get; set; } = DateTime.UtcNow;

    [Column("current_period_end")]
    public DateTime CurrentPeriodEnd { get; set; } = DateTime.UtcNow.AddDays(14);

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Organization? Organization { get; set; }
}

[Table("role_permissions")]
public class RolePermission
{
    [Key]
    [Column("role_permission_id")]
    public long RolePermissionId { get; set; }

    [Required]
    [Column("role_id")]
    public long RoleId { get; set; }

    [Required]
    [MaxLength(60)]
    [Column("role_key")]
    public string RoleKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    [Column("permission_key")]
    public string PermissionKey { get; set; } = string.Empty;

    [Column("is_granted")]
    public bool IsGranted { get; set; } = true;

    [Column("updated_by_user_id")]
    public long? UpdatedByUserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Role? Role { get; set; }
}

[Table("platform_settings")]
public class PlatformSetting
{
    [Key]
    [Column("platform_setting_id")]
    public long PlatformSettingId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("setting_key")]
    public string SettingKey { get; set; } = "default";

    [Required]
    [MaxLength(120)]
    [Column("platform_name")]
    public string PlatformName { get; set; } = "PIRNAV";

    [Column("require_manual_approval")]
    public bool RequireManualApproval { get; set; } = true;

    [Required]
    [MaxLength(10)]
    [Column("default_currency")]
    public string DefaultCurrency { get; set; } = "INR";

    [Column("default_tax_rate", TypeName = "decimal(5,2)")]
    public decimal DefaultTaxRate { get; set; } = 5.00m;

    [Column("notify_on_registration")]
    public bool NotifyOnRegistration { get; set; } = true;

    [Column("settings_json", TypeName = "text")]
    public string? SettingsJson { get; set; }

    [Column("updated_by_user_id")]
    public long? UpdatedByUserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("saas_billing_invoices")]
public class SaasBillingInvoice
{
    [Key]
    [Column("saas_billing_invoice_id")]
    public long SaasBillingInvoiceId { get; set; }

    [Required]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(60)]
    [Column("invoice_number")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("plan_name")]
    public string PlanName { get; set; } = string.Empty;

    [Column("amount", TypeName = "decimal(12,2)")]
    public decimal Amount { get; set; }

    [Column("due_date")]
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(7);

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "Pending";

    [MaxLength(120)]
    [Column("payment_reference")]
    public string? PaymentReference { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Organization? Organization { get; set; }
}

[Table("support_tickets")]
public class SupportTicket
{
    [Key]
    [Column("support_ticket_id")]
    public long SupportTicketId { get; set; }

    [Required]
    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("ticket_number")]
    public string TicketNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [Column("subject")]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("priority")]
    public string Priority { get; set; } = "Medium";

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = "Open";

    [Column("description", TypeName = "text")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Organization? Organization { get; set; }
    public ICollection<SupportTicketNote> Notes { get; set; } = new List<SupportTicketNote>();
}

[Table("support_ticket_notes")]
public class SupportTicketNote
{
    [Key]
    [Column("support_ticket_note_id")]
    public long SupportTicketNoteId { get; set; }

    [Required]
    [Column("support_ticket_id")]
    public long SupportTicketId { get; set; }

    [Column("author_user_id")]
    public long? AuthorUserId { get; set; }

    [Required]
    [Column("note", TypeName = "text")]
    public string Note { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SupportTicket? Ticket { get; set; }
}
