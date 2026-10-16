using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("attendances")]
public class Attendance
{
    [Key]
    [Column("attendance_id")]
    public long AttendanceId { get; set; }

    [Column("staff_id")]
    public long StaffId { get; set; }

    [Column("check_in")]
    public DateTime CheckIn { get; set; } = DateTime.UtcNow;

    [Column("check_out")]
    public DateTime? CheckOut { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "PRESENT"; // "PRESENT", "ABSENT", "LATE"

    [MaxLength(50)]
    [Column("shift")]
    public string? Shift { get; set; }
}
