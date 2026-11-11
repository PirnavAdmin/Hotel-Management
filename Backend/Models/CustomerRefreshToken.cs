using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HMS.Models;

[Table("customer_refresh_tokens")]
public class CustomerRefreshToken
{
    [Key]
    [Column("refresh_token_id")]
    public long RefreshTokenId { get; set; }

    [Column("customer_id")]
    public long CustomerId { get; set; }

    [Required]
    [MaxLength(128)]
    [Column("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    [Column("family_id")]
    public string FamilyId { get; set; } = string.Empty;

    [Column("remember_me")]
    public bool RememberMe { get; set; } = false;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("revoked_at")]
    public DateTime? RevokedAt { get; set; }

    [MaxLength(100)]
    [Column("revoked_reason")]
    public string? RevokedReason { get; set; }

    [MaxLength(128)]
    [Column("replaced_by_token_hash")]
    public string? ReplacedByTokenHash { get; set; }

    [MaxLength(64)]
    [Column("created_by_ip")]
    public string? CreatedByIp { get; set; }

    [MaxLength(64)]
    [Column("revoked_by_ip")]
    public string? RevokedByIp { get; set; }

    [MaxLength(255)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Customer? Customer { get; set; }
}
