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
[Route("api/v1/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly SpService _spService;

    public ReservationsController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetReservations([FromQuery] string? status)
    {
        var parameters = new Dictionary<string, object?> { { "p_status", status } };
        var reservations = await _spService.ExecuteQueryAsync("sp_GetReservations", MapReservationFromReader, parameters);

        return Ok(new
        {
            success = true,
            message = "Reservations retrieved successfully.",
            count = reservations.Count,
            data = reservations
        });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { success = false, message = "Customer Name and Phone are required." });
        }

        var resTime = request.ReservationTime != default ? request.ReservationTime : DateTime.UtcNow.AddHours(2);

        var parameters = new Dictionary<string, object?>
        {
            { "p_customer_id", request.CustomerId },
            { "p_customer_name", request.CustomerName.Trim() },
            { "p_phone", request.Phone.Trim() },
            { "p_table_id", request.TableId },
            { "p_guests_count", request.GuestsCount > 0 ? request.GuestsCount : 2 },
            { "p_reservation_time", resTime }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreateReservation", parameters);

        var reservation = new Reservation
        {
            ReservationId = id,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName.Trim(),
            Phone = request.Phone.Trim(),
            TableId = request.TableId,
            GuestsCount = request.GuestsCount > 0 ? request.GuestsCount : 2,
            ReservationTime = resTime,
            Status = "CONFIRMED",
            CreatedAt = DateTime.UtcNow
        };

        return Ok(new
        {
            success = true,
            message = "Reservation created successfully.",
            data = reservation
        });
    }

    [AllowAnonymous]
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateReservationStatus(long id, [FromBody] UpdateReservationStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_reservation_id", id },
            { "p_status", request.Status.Trim().ToUpper() }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateReservationStatus", parameters);

        return Ok(new
        {
            success = true,
            message = "Reservation status updated successfully.",
            data = new { reservationId = id, status = request.Status.Trim().ToUpper() }
        });
    }

    private static Reservation MapReservationFromReader(DbDataReader reader)
    {
        var cidOrd = reader.GetOrdinal("customer_id");
        var tidOrd = reader.GetOrdinal("table_id");

        return new Reservation
        {
            ReservationId = reader.GetInt64(reader.GetOrdinal("reservation_id")),
            CustomerId = reader.IsDBNull(cidOrd) ? null : reader.GetInt64(cidOrd),
            CustomerName = reader.GetString(reader.GetOrdinal("customer_name")),
            Phone = reader.GetString(reader.GetOrdinal("phone")),
            TableId = reader.IsDBNull(tidOrd) ? null : reader.GetInt64(tidOrd),
            GuestsCount = reader.GetInt32(reader.GetOrdinal("guests_count")),
            ReservationTime = reader.GetDateTime(reader.GetOrdinal("reservation_time")),
            Status = reader.GetString(reader.GetOrdinal("status")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }
}

public class CreateReservationRequest
{
    public long? CustomerId { get; set; }

    private string _customerName = string.Empty;
    public string CustomerName
    {
        get => !string.IsNullOrWhiteSpace(_customerName) ? _customerName : (!string.IsNullOrWhiteSpace(FullName) ? FullName : (Name ?? string.Empty));
        set => _customerName = value;
    }
    public string? FullName { get; set; }
    public string? Name { get; set; }

    public string Phone { get; set; } = string.Empty;
    public long? TableId { get; set; }

    private int _guestsCount = 2;
    public int GuestsCount
    {
        get => _guestsCount > 0 ? _guestsCount : (Guests > 0 ? Guests : 2);
        set => _guestsCount = value;
    }
    public int Guests { get; set; }

    public DateTime ReservationTime { get; set; }
}

public class UpdateReservationStatusRequest
{
    public string Status { get; set; } = "CONFIRMED";
}
