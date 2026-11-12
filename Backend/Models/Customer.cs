using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HMS.Models;

[Table("customers")]
public class Customer
{
    [Key]
    [Column("customer_id")]
    public long CustomerId { get; set; }

    [Required]
    [MaxLength(120)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(120)]
    [Column("email")]
    public string? Email { get; set; }

    [JsonIgnore]
    [MaxLength(255)]
    [Column("password_hash")]
    public string? PasswordHash { get; set; }

    [MaxLength(30)]
    [Column("role")]
    public string Role { get; set; } = "Customer";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("last_login")]
    public DateTime? LastLogin { get; set; }

    [Column("registered_branch_id")]
    public long? RegisteredBranchId { get; set; }

    [Column("loyalty_points")]
    public int LoyaltyPoints { get; set; } = 0;

    [JsonIgnore]
    [Column("failed_login_attempts")]
    public int FailedLoginAttempts { get; set; } = 0;

    [JsonIgnore]
    [Column("lockout_until")]
    public DateTime? LockoutUntil { get; set; }

    [JsonIgnore]
    [Column("token_version")]
    public int TokenVersion { get; set; } = 1;

    [JsonIgnore]
    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("branch_id")]
    public long? BranchId { get; set; }

    [Column("outlet_id")]
    public long? OutletId { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
