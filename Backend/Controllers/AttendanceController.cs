using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/employees/attendance")]
public class AttendanceController : ControllerBase
{
    private readonly SpService _spService;

    public AttendanceController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAttendanceLogs([FromQuery] long? staffId)
    {
        var parameters = new Dictionary<string, object?> { { "p_staff_id", staffId ?? 0 } };
        var logs = await _spService.ExecuteQueryAsync("sp_GetAttendances", MapAttendanceFromReader, parameters);

        return Ok(new
        {
            success = true,
            message = "Attendance logs retrieved successfully.",
            count = logs.Count,
            data = logs
        });
    }

    [AllowAnonymous]
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest request)
    {
        if (request.StaffId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid Staff ID is required." });
        }

        var shift = string.IsNullOrWhiteSpace(request.Shift) ? "Morning Shift" : request.Shift.Trim();

        var parameters = new Dictionary<string, object?>
        {
            { "p_staff_id", request.StaffId },
            { "p_shift", shift }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CheckInAttendance", parameters);

        var attendance = new Attendance
        {
            AttendanceId = id,
            StaffId = request.StaffId,
            CheckIn = DateTime.UtcNow,
            Status = "PRESENT",
            Shift = shift
        };

        return Ok(new
        {
            success = true,
            message = "Employee checked in successfully.",
            data = attendance
        });
    }

    [AllowAnonymous]
    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutRequest request)
    {
        var parameters = new Dictionary<string, object?>
        {
            { "p_attendance_id", request.AttendanceId },
            { "p_staff_id", request.StaffId }
        };

        await _spService.ExecuteNonQueryAsync("sp_CheckOutAttendance", parameters);

        return Ok(new
        {
            success = true,
            message = "Employee checked out successfully.",
            data = new { attendanceId = request.AttendanceId, staffId = request.StaffId, checkOut = DateTime.UtcNow }
        });
    }

    private static Attendance MapAttendanceFromReader(DbDataReader reader)
    {
        var coOrd = reader.GetOrdinal("check_out");
        var statusOrd = reader.GetOrdinal("status");
        var shiftOrd = reader.GetOrdinal("shift");

        return new Attendance
        {
            AttendanceId = reader.GetInt64(reader.GetOrdinal("attendance_id")),
            StaffId = reader.GetInt64(reader.GetOrdinal("staff_id")),
            CheckIn = reader.GetDateTime(reader.GetOrdinal("check_in")),
            CheckOut = reader.IsDBNull(coOrd) ? null : reader.GetDateTime(coOrd),
            Status = reader.IsDBNull(statusOrd) ? "PRESENT" : reader.GetString(statusOrd),
            Shift = reader.IsDBNull(shiftOrd) ? "General Shift" : reader.GetString(shiftOrd)
        };
    }
}

public class CheckInRequest
{
    public long StaffId { get; set; }
    public string? Shift { get; set; }
}

public class CheckOutRequest
{
    public long AttendanceId { get; set; }
    public long StaffId { get; set; }
}
