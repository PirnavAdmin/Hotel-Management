using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/reservations")]
[Route("api/Reservations")]
public class ReservationsController : ControllerBase
{
    private readonly SpService _spService;

    public ReservationsController(SpService spService)
    {
        _spService = spService;
    }

    // GET /api/v1/reservations?branchId=1&date=2026-10-12&status=confirmed
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetReservations([FromQuery] long? branchId, [FromQuery] string? date, [FromQuery] string? status)
    {
        string? formattedDate = null;
        if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var parsedDate))
        {
            formattedDate = parsedDate.ToString("yyyy-MM-dd");
        }

        string action = !string.IsNullOrWhiteSpace(formattedDate) ? "GET_BY_BRANCH_DATE" : "GET_ALL";

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", action },
            { "p_reservation_id", null },
            { "p_customer_id", null },
            { "p_table_id", null },
            { "p_branch_id", branchId ?? 1 },
            { "p_reservation_date", formattedDate },
            { "p_reservation_time", null },
            { "p_guests_count", null },
            { "p_status", null },
            { "p_notes", null }
        };

        var reservations = await _spService.ExecuteQueryAsync("sp_manage_reservations", MapReservationResponse, parameters);

        if (!string.IsNullOrWhiteSpace(status))
        {
            reservations = reservations.Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Ok(new
        {
            success = true,
            message = "Reservations retrieved successfully.",
            count = reservations.Count,
            data = reservations
        });
    }

    // POST /api/v1/reservations
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName) && string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { success = false, message = "Customer Name and Phone are required." });
        }

        if (request.TableId <= 0)
        {
            return BadRequest(new { success = false, message = "A valid TableId is required." });
        }

        // Auto-lookup or create customer record
        if (!request.CustomerId.HasValue || request.CustomerId.Value <= 0)
        {
            var phone = request.Phone.Trim();
            if (!string.IsNullOrWhiteSpace(phone))
            {
                var existingCust = await _spService.ExecuteSqlQueryAsync(
                    "SELECT customer_id FROM customers WHERE phone = @phone LIMIT 1",
                    r => Convert.ToInt64(r["customer_id"]),
                    new Dictionary<string, object?> { { "phone", phone } });

                if (existingCust.Count > 0)
                {
                    request.CustomerId = existingCust[0];
                }
                else
                {
                    await _spService.ExecuteSqlNonQueryAsync(
                        "INSERT INTO customers (full_name, phone, registered_branch_id, is_active, created_at, updated_at) VALUES (@name, @phone, @branch_id, 1, NOW(), NOW())",
                        new Dictionary<string, object?>
                        {
                            { "name", !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : "Guest" },
                            { "phone", phone },
                            { "branch_id", request.BranchId ?? 1 }
                        });

                    var newCust = await _spService.ExecuteSqlQueryAsync(
                        "SELECT customer_id FROM customers WHERE phone = @phone ORDER BY customer_id DESC LIMIT 1",
                        r => Convert.ToInt64(r["customer_id"]),
                        new Dictionary<string, object?> { { "phone", phone } });

                    if (newCust.Count > 0)
                    {
                        request.CustomerId = newCust[0];
                    }
                }
            }
        }

        DateTime resDate = request.ReservationDate ?? (request.ReservationDateTime?.Date ?? DateTime.UtcNow.Date);
        TimeSpan resTime;
        if (!string.IsNullOrWhiteSpace(request.ReservationTime) && TimeSpan.TryParse(request.ReservationTime, out var parsedTime))
        {
            resTime = parsedTime;
        }
        else if (request.ReservationDateTime.HasValue)
        {
            resTime = request.ReservationDateTime.Value.TimeOfDay;
        }
        else
        {
            resTime = DateTime.UtcNow.TimeOfDay.Add(TimeSpan.FromHours(2));
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "BOOK_TABLE" },
            { "p_reservation_id", null },
            { "p_customer_id", request.CustomerId },
            { "p_table_id", request.TableId },
            { "p_branch_id", request.BranchId ?? 1 },
            { "p_reservation_date", resDate.ToString("yyyy-MM-dd") },
            { "p_reservation_time", resTime.ToString(@"hh\:mm\:ss") },
            { "p_guests_count", request.GuestsCount > 0 ? request.GuestsCount : 2 },
            { "p_status", "booked" },
            { "p_notes", request.Notes }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_reservations", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        if (result != null && result.StatusCode == 409)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                message = result.Message
            });
        }

        if (result != null && (result.StatusCode == 201 || result.StatusCode == 200) && result.DataId.HasValue)
        {
            long newId = result.DataId.Value;
            var all = await _spService.ExecuteQueryAsync(
                "sp_manage_reservations",
                MapReservationResponse,
                new Dictionary<string, object?>
                {
                    { "p_action", "GET_ALL" },
                    { "p_reservation_id", null },
                    { "p_customer_id", null },
                    { "p_table_id", null },
                    { "p_branch_id", request.BranchId ?? 1 },
                    { "p_reservation_date", null },
                    { "p_reservation_time", null },
                    { "p_guests_count", null },
                    { "p_status", null },
                    { "p_notes", null }
                });

            var created = all.FirstOrDefault(r => r.ReservationId == newId);

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                message = result.Message,
                data = created ?? (object)new
                {
                    reservationId = newId,
                    customerId = request.CustomerId,
                    customerName = request.CustomerName,
                    customerPhone = request.Phone,
                    tableId = request.TableId,
                    reservationDate = resDate.ToString("yyyy-MM-dd"),
                    reservationTime = resTime.ToString(@"hh\:mm\:ss"),
                    guestsCount = request.GuestsCount,
                    status = "booked",
                    notes = request.Notes
                }
            });
        }

        return StatusCode(result?.StatusCode ?? StatusCodes.Status500InternalServerError, new
        {
            success = false,
            message = result?.Message ?? "Failed to book table."
        });
    }

    // PUT /api/v1/reservations/{id:long}/status
    [AllowAnonymous]
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateReservationStatus(long id, [FromBody] UpdateReservationStatusDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "UPDATE_STATUS" },
            { "p_reservation_id", id },
            { "p_customer_id", null },
            { "p_table_id", null },
            { "p_branch_id", null },
            { "p_reservation_date", null },
            { "p_reservation_time", null },
            { "p_guests_count", null },
            { "p_status", request.Status.Trim().ToLower() },
            { "p_notes", null }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_reservations", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        return Ok(new
        {
            success = true,
            message = result?.Message ?? "Reservation status updated successfully.",
            data = new { reservationId = id, status = request.Status.Trim().ToLower() }
        });
    }

    // DELETE /api/v1/reservations/{id}
    [AllowAnonymous]
    [HttpDelete("{id}")]
    [HttpDelete("/api/Reservations/{id}")]
    public async Task<IActionResult> DeleteReservation(string id)
    {
        long numericId = 0;
        if (!string.IsNullOrEmpty(id))
        {
            var cleanId = System.Text.RegularExpressions.Regex.Replace(id, @"^[^\d]+", "");
            long.TryParse(cleanId, out numericId);
        }

        if (numericId <= 0)
        {
            return Ok(new { success = true, message = "Reservation removed successfully." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "CANCEL_RESERVATION" },
            { "p_reservation_id", numericId },
            { "p_customer_id", null },
            { "p_table_id", null },
            { "p_branch_id", null },
            { "p_reservation_date", null },
            { "p_reservation_time", null },
            { "p_guests_count", null },
            { "p_status", null },
            { "p_notes", null }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_reservations", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        return Ok(new
        {
            success = true,
            message = result?.Message ?? "Reservation cancelled/removed successfully."
        });
    }

    private static ReservationResponseDto MapReservationResponse(DbDataReader reader)
    {
        var notesOrd = HasColumn(reader, "notes") ? reader.GetOrdinal("notes") : -1;
        var tableNumOrd = HasColumn(reader, "table_number") ? reader.GetOrdinal("table_number") : -1;
        var locationOrd = HasColumn(reader, "location") ? reader.GetOrdinal("location") : -1;
        var custPhoneOrd = HasColumn(reader, "customer_phone") ? reader.GetOrdinal("customer_phone") : -1;
        var custNameOrd = HasColumn(reader, "customer_name") ? reader.GetOrdinal("customer_name") : -1;
        var phoneOrd = HasColumn(reader, "phone") ? reader.GetOrdinal("phone") : -1;
        var resDateOrd = HasColumn(reader, "reservation_date") ? reader.GetOrdinal("reservation_date") : -1;
        var resTimeOrd = HasColumn(reader, "reservation_time") ? reader.GetOrdinal("reservation_time") : -1;
        var updatedAtOrd = HasColumn(reader, "updated_at") ? reader.GetOrdinal("updated_at") : -1;

        var customerName = custNameOrd >= 0 && !reader.IsDBNull(custNameOrd)
            ? reader.GetString(custNameOrd)
            : "Guest";

        var phone = custPhoneOrd >= 0 && !reader.IsDBNull(custPhoneOrd)
            ? reader.GetString(custPhoneOrd)
            : (phoneOrd >= 0 && !reader.IsDBNull(phoneOrd) ? reader.GetString(phoneOrd) : string.Empty);

        string resDate = string.Empty;
        if (resDateOrd >= 0 && !reader.IsDBNull(resDateOrd))
        {
            var val = reader.GetValue(resDateOrd);
            if (val is DateTime dt) resDate = dt.ToString("yyyy-MM-dd");
            else resDate = val.ToString() ?? string.Empty;
        }

        string resTime = string.Empty;
        if (resTimeOrd >= 0 && !reader.IsDBNull(resTimeOrd))
        {
            var val = reader.GetValue(resTimeOrd);
            if (val is TimeSpan ts) resTime = ts.ToString(@"hh\:mm\:ss");
            else if (val is DateTime dt) resTime = dt.ToString("HH:mm:ss");
            else resTime = val.ToString() ?? string.Empty;
        }

        return new ReservationResponseDto
        {
            ReservationId = Convert.ToInt64(reader["reservation_id"]),
            BranchId = HasColumn(reader, "branch_id") && !reader.IsDBNull(reader.GetOrdinal("branch_id")) ? Convert.ToInt64(reader["branch_id"]) : 1,
            CustomerId = HasColumn(reader, "customer_id") && !reader.IsDBNull(reader.GetOrdinal("customer_id")) ? Convert.ToInt64(reader["customer_id"]) : null,
            CustomerName = customerName,
            CustomerPhone = phone,
            TableId = HasColumn(reader, "table_id") && !reader.IsDBNull(reader.GetOrdinal("table_id")) ? Convert.ToInt64(reader["table_id"]) : null,
            TableNumber = tableNumOrd >= 0 && !reader.IsDBNull(tableNumOrd) ? reader.GetString(tableNumOrd) : null,
            Location = locationOrd >= 0 && !reader.IsDBNull(locationOrd) ? reader.GetString(locationOrd) : null,
            ReservationDate = resDate,
            ReservationTime = resTime,
            GuestsCount = Convert.ToInt32(reader["guests_count"]),
            Status = reader["status"]?.ToString() ?? "booked",
            Notes = notesOrd >= 0 && !reader.IsDBNull(notesOrd) ? reader.GetString(notesOrd) : null,
            CreatedAt = reader["created_at"] is DateTime cdt ? cdt : DateTime.UtcNow,
            UpdatedAt = updatedAtOrd >= 0 && !reader.IsDBNull(updatedAtOrd) && reader.GetValue(updatedAtOrd) is DateTime udt ? udt : null
        };
    }

    private static SpOperationResult MapSpOperationResult(DbDataReader reader)
    {
        return new SpOperationResult
        {
            Status = reader["status"]?.ToString() ?? "ERROR",
            StatusCode = Convert.ToInt32(reader["status_code"]),
            Message = reader["message"]?.ToString() ?? string.Empty,
            DataId = reader["data_id"] != DBNull.Value ? Convert.ToInt64(reader["data_id"]) : null
        };
    }

    private static bool HasColumn(DbDataReader reader, string columnName)
    {
        for (int i = 0; i < reader.FieldCount; i++)
        {
            if (reader.GetName(i).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}

// Aliases for backward compatibility
public class CreateReservationRequest : CreateReservationDto { }
public class UpdateReservationStatusRequest : UpdateReservationStatusDto { }
