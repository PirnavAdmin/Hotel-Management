using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HMS.Models;

[Table("customer_otp_tokens")]
public class CustomerOtpToken
{
    [Key]
    [Column("otp_id")]
    public long OtpId { get; set; }

    [Column("customer_id")]
    public long CustomerId { get; set; }

    [Required]
    [MaxLength(40)]
    [Column("purpose")]
    public string Purpose { get; set; } = "ACCOUNT_VERIFY";

    [Required]
    [MaxLength(30)]
    [Column("channel")]
    public string Channel { get; set; } = "EMAIL_AND_PHONE";

    [Required]
    [MaxLength(150)]
    [Column("target_identifier")]
    public string TargetIdentifier { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("otp_hash")]
    public string OtpHash { get; set; } = string.Empty;

    [MaxLength(128)]
    [Column("reset_token_hash")]
    public string? ResetTokenHash { get; set; }

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("used_at")]
    public DateTime? UsedAt { get; set; }

    [Column("invalidated_at")]
    public DateTime? InvalidatedAt { get; set; }

    [Column("attempts")]
    public int Attempts { get; set; } = 0;

    [Column("max_attempts")]
    public int MaxAttempts { get; set; } = 5;

    [MaxLength(64)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Customer? Customer { get; set; }
}
