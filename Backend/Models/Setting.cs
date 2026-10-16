using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("settings")]
public class Setting
{
    [Key]
    [Column("setting_id")]
    public ulong SettingId { get; set; }

    [Column("branch_id")]
    public ulong? BranchId { get; set; }

    [Required]
    [MaxLength(80)]
    [Column("setting_key")]
    public string SettingKey { get; set; } = string.Empty;

    [Column("setting_value", TypeName = "longtext")]
    public string? SettingValue { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
