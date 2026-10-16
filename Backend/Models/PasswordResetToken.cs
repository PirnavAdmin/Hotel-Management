using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("password_reset_tokens")]
public class PasswordResetToken
{
    [Key]
    [Column("reset_id")]
    public long ResetId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("otp_hash")]
    public string OtpHash { get; set; } = string.Empty;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("used_at")]
    public DateTime? UsedAt { get; set; }

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}