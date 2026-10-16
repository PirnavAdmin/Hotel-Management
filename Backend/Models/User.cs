
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("users")]
public class User
{
    // ============================================================
    // PRIMARY KEY
    // ============================================================

    [Key]
    [Column("user_id")]
    public long UserId { get; set; }


    // ============================================================
    // ROLE
    // ============================================================

    [Required]
    [Column("role_id")]
    public long RoleId { get; set; }


    // ============================================================
    // BRANCH
    // ============================================================

    [Column("branch_id")]
    public long? BranchId { get; set; }


    // ============================================================
    // USERNAME
    // ============================================================

    [Required]
    [MaxLength(60)]
    [Column("user_name")]
    public string UserName { get; set; } = string.Empty;


    // ============================================================
    // PASSWORD
    // ============================================================

    [MaxLength(255)]
    [Column("password")]
    public string? Password { get; set; }


    // FIX: Not mapped to MySQL users table.
    // Used only for password confirmation.
    [NotMapped]
    public string? ConfirmPassword { get; set; }


    // ============================================================
    // PASSWORD HASH
    // ============================================================

    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;


    // ============================================================
    // FULL NAME
    // ============================================================

    [MaxLength(100)]
    [Column("full_name")]
    public string? FullName { get; set; }


    // ============================================================
    // EMAIL
    // ============================================================

    [Required]
    [MaxLength(100)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;


    // ============================================================
    // PHONE
    // ============================================================

    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }


    // ============================================================
    // PIN CODE
    // ============================================================

    [MaxLength(10)]
    [Column("pin_code")]
    public string? PinCode { get; set; }


    // ============================================================
    // STATUS
    // ============================================================

    [Column("is_active")]
    public bool IsActive { get; set; } = true;


    // ============================================================
    // LAST LOGIN
    // ============================================================

    [Column("last_login")]
    public DateTime? LastLogin { get; set; }


    // ============================================================
    // SOFT DELETE
    // ============================================================

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }


    // ============================================================
    // AUDIT FIELDS
    // ============================================================

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }


    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }


    [Column("created_by")]
    public long? CreatedBy { get; set; }


    [Column("updated_by")]
    public long? UpdatedBy { get; set; }


    // ============================================================
    // ROLE RELATIONSHIP
    // ============================================================

    public Role? Role { get; set; }
}
