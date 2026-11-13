using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[AttributeUsage(AttributeTargets.Method)]
internal sealed class BufferRequestBodyAttribute : Attribute, IAsyncResourceFilter
{
    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        context.HttpContext.Request.EnableBuffering();
        await next();
    }
}

[ApiController]
[Route("api/v1/reservations")]
[Tags("Reservations")]
public class ReservationsController : ControllerBase
{
    private readonly SpService _spService;
    private readonly ReservationService _reservationService;
    private readonly ILogger<ReservationsController> _logger;

    public ReservationsController(
        SpService spService,
        ReservationService reservationService,
        ILogger<ReservationsController> logger)
    {
        _spService = spService;
        _reservationService = reservationService;
        _logger = logger;
    }

    private ReservationCallerContext GetCaller()
    {
        string? ipAddress = HttpContext?.Connection?.RemoteIpAddress?.ToString();
        return ReservationService.ExtractCallerContext(User, ipAddress);
    }

    private IActionResult MapReservationException(Exception ex)
    {
        return ex switch
        {
            ReservationUnauthorizedException => Unauthorized(new { success = false, message = ex.Message }),
            ReservationForbiddenException => StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message }),
            ReservationNotFoundException => NotFound(new { success = false, message = ex.Message }),
            ReservationConflictException => Conflict(new { success = false, message = ex.Message }),
            DuplicatePaymentException => Conflict(new { success = false, message = ex.Message }),
            PaymentVerificationException => UnprocessableEntity(new { success = false, paymentStatus = "FAILED", message = ex.Message }),
            ArgumentException or InvalidOperationException => BadRequest(new { success = false, message = ex.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "An unexpected error occurred.", error = ex.Message })
        };
    }

    #region Availability & Table Lookup (Customer Website)

    /// <summary>
    /// Checks real-time table availability for the requested date, time slot, guest count, and seating preference.
    /// Does not rely on live POS floor occupation for future dates and returns alternative slot suggestions if full.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("availability")]
    public async Task<IActionResult> CheckAvailability(
        [FromQuery] string? date,
        [FromQuery] string? time,
        [FromQuery] int guests = 2,
        [FromQuery] string? preference = null,
        [FromQuery] string? section = null,
        [FromQuery] long branchId = 1)
    {
        try
        {
            string? resolvedPref = !string.IsNullOrWhiteSpace(preference) ? preference : section;
            var result = await _reservationService.CheckAvailabilityAsync(date, time, guests, resolvedPref, branchId);
            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Returns section-filtered dining tables annotated with slot availability, pricing estimate, and required advance payment.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("available-tables")]
    public async Task<IActionResult> GetAvailableTables(
        [FromQuery] string? date,
        [FromQuery] string? time,
        [FromQuery] int guests = 2,
        [FromQuery] string? preference = null,
        [FromQuery] string? section = null,
        [FromQuery] long branchId = 1)
    {
        try
        {
            string? resolvedPref = !string.IsNullOrWhiteSpace(preference) ? preference : section;
            var result = await _reservationService.GetAvailableTablesAsync(date, time, guests, resolvedPref, branchId);
            return Ok(new
            {
                success = true,
                message = result.Message,
                count = result.AvailableTablesCount,
                data = result
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Retrieves dining table specifications and optional slot availability/pricing for a specific table.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("tables/{tableId:long}")]
    public async Task<IActionResult> GetTableDetails(
        long tableId,
        [FromQuery] string? date = null,
        [FromQuery] string? time = null,
        [FromQuery] int? guests = null)
    {
        try
        {
            var detail = await _reservationService.GetTableDetailAsync(tableId, date, time, guests);
            return Ok(new
            {
                success = true,
                message = "Table details retrieved successfully.",
                data = detail
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    #endregion

    #region Guest OTP & Authenticated My Reservations

    /// <summary>
    /// Sends a 6-digit OTP (stored hashed in MySQL) to verify guest mobile ownership before accessing reservation history or changes.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("otp/send")]
    public async Task<IActionResult> SendOtp([FromBody] SendReservationOtpRequestDto request)
    {
        try
        {
            var result = await _reservationService.SendGuestOtpAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Verifies the guest OTP and issues a scoped JWT bearer token for reservation history, modifications, and cancellations.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("otp/verify")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyReservationOtpRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _reservationService.VerifyGuestOtpAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Returns upcoming and past/cancelled reservations for the authenticated customer, verified guest phone, or staff query.
    /// </summary>
    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyReservations(
        [FromQuery] string? phone = null,
        [FromQuery] string? tab = "all",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var caller = GetCaller();
            var result = await _reservationService.GetMyReservationsAsync(phone, tab, page, pageSize, caller);
            return Ok(new
            {
                success = true,
                message = "Reservations retrieved successfully.",
                data = result
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    #endregion

    #region Create, Read Detail, Modify & Cancel Reservations

    /// <summary>
    /// <summary>
    /// Retrieves summary metrics for Table Reservations dashboard (Total, Confirmed, Pending, Seated, Completed, Cancelled).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetReservationsSummary(
        [FromQuery] long? branchId,
        [FromQuery] string? date,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate)
    {
        try
        {
            var reservations = await FetchReservationsListAsync(branchId, date, fromDate, toDate, null, null);

            int total = reservations.Count;
            int confirmed = reservations.Count(r => string.Equals(r.Status, "confirmed", StringComparison.OrdinalIgnoreCase) || string.Equals(r.Status, "booked", StringComparison.OrdinalIgnoreCase));
            int pending = reservations.Count(r => string.Equals(r.Status, "pending", StringComparison.OrdinalIgnoreCase) || string.Equals(r.Status, "pending_payment", StringComparison.OrdinalIgnoreCase));
            int seated = reservations.Count(r => string.Equals(r.Status, "seated", StringComparison.OrdinalIgnoreCase));
            int completed = reservations.Count(r => string.Equals(r.Status, "completed", StringComparison.OrdinalIgnoreCase));
            int cancelled = reservations.Count(r => string.Equals(r.Status, "cancelled", StringComparison.OrdinalIgnoreCase));

            return Ok(new
            {
                success = true,
                message = "Reservations summary retrieved successfully.",
                data = new
                {
                    totalReservations = total,
                    total = total,
                    confirmedBookings = confirmed,
                    confirmed = confirmed,
                    pendingBookings = pending,
                    pending = pending,
                    seatedBookings = seated,
                    seated = seated,
                    completedBookings = completed,
                    completed = completed,
                    seatedAndCompleted = seated + completed,
                    cancelledBookings = cancelled,
                    cancelled = cancelled
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving reservations summary.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve reservations summary.", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves reservations for Admin POS management with optional branch, date, search, and status filters.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetReservations(
        [FromQuery] long? branchId,
        [FromQuery] string? date,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        try
        {
            var reservations = await FetchReservationsListAsync(branchId, date, fromDate, toDate, status, search);

            return Ok(new
            {
                success = true,
                message = "Reservations retrieved successfully.",
                count = reservations.Count,
                data = reservations
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving reservations.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve reservations.", error = ex.Message });
        }
    }

    private async Task<List<ReservationResponseDto>> FetchReservationsListAsync(
        long? branchId,
        string? date,
        string? fromDate,
        string? toDate,
        string? status,
        string? search)
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

        if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out var fromDt))
        {
            var fromStr = fromDt.ToString("yyyy-MM-dd");
            reservations = reservations.Where(r => string.Compare(r.ReservationDate, fromStr, StringComparison.Ordinal) >= 0).ToList();
        }

        if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out var toDt))
        {
            var toStr = toDt.ToString("yyyy-MM-dd");
            reservations = reservations.Where(r => string.Compare(r.ReservationDate, toStr, StringComparison.Ordinal) <= 0).ToList();
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            reservations = reservations.Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            reservations = reservations.Where(r =>
                (!string.IsNullOrEmpty(r.ReservationNumber) && r.ReservationNumber.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                r.ReservationId.ToString().Contains(q, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(r.CustomerName) && r.CustomerName.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(r.CustomerPhone) && r.CustomerPhone.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(r.TableNumber) && r.TableNumber.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(r.Location) && r.Location.Contains(q, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        return reservations;
    }

    /// <summary>
    /// Creates a table reservation with Serializable row-lock overlap protection, server-side advance calculation,
    /// idempotency support, and checkout token issuance (starts as PENDING_PAYMENT when advance payment is required).
    /// </summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var caller = GetCaller();
            var (reservation, alreadyProcessed) = await _reservationService.CreateReservationAsync(request, caller);
            return StatusCode(alreadyProcessed ? StatusCodes.Status200OK : StatusCodes.Status201Created, new
            {
                success = true,
                alreadyProcessed,
                message = alreadyProcessed
                    ? "Reservation retrieved for existing idempotency key."
                    : (reservation.Status == "PENDING_PAYMENT"
                        ? "Table hold created. Complete advance payment to confirm your reservation."
                        : "Table reservation booked successfully."),
                guestToken = reservation.GuestToken,
                data = reservation
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Retrieves full details and payment history for a single reservation by numeric ID or RES-code (authenticated owner or staff).
    /// </summary>
    [Authorize]
    [HttpGet("{reservationId}")]
    public async Task<IActionResult> GetReservationById(string reservationId)
    {
        try
        {
            var caller = GetCaller();
            var detail = await _reservationService.GetReservationByIdAsync(reservationId, caller);
            return Ok(new
            {
                success = true,
                message = "Reservation details retrieved successfully.",
                data = detail
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Modifies reservation date, time, guest count, table, seating preference, or special requests
    /// with overlap re-validation and server-side advance payment delta calculation.
    /// </summary>
    [Authorize]
    [HttpPut("{reservationId}")]
    public async Task<IActionResult> ModifyReservation(string reservationId, [FromBody] ModifyReservationDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var caller = GetCaller();
            var result = await _reservationService.ModifyReservationAsync(reservationId, request, caller);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Cancels an active reservation, applies configurable cutoff-hour refund rules, records refund transactions,
    /// conditionally releases reserved physical table status, and writes an audit log.
    /// </summary>
    [Authorize]
    [HttpPost("{reservationId}/cancel")]
    public async Task<IActionResult> CancelReservation(
        string reservationId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelReservationDto? request)
    {
        try
        {
            var caller = GetCaller();
            var result = await _reservationService.CancelReservationAsync(reservationId, request, caller);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    #endregion

    #region Advance Payment, Payment Status & Gateway Webhook

    /// <summary>
    /// Processes or verifies advance payment (SUCCESS, PENDING, or FAILED) for a reservation with idempotency,
    /// duplicate payment protection, and HMAC-SHA256 gateway verification. Transitions booking to CONFIRMED only on verified success.
    /// </summary>
    [Authorize]
    [HttpPost("{reservationId}/payment")]
    public async Task<IActionResult> ProcessAdvancePayment(string reservationId, [FromBody] ReservationPaymentRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var caller = GetCaller();
            var result = await _reservationService.ProcessPaymentAsync(reservationId, request, caller);

            if (result.AlreadyProcessed)
            {
                return Ok(result);
            }

            if (result.Pending)
            {
                return StatusCode(StatusCodes.Status202Accepted, result);
            }

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Returns the current payment summary, refund summary, and payment transaction log for a reservation.
    /// </summary>
    [Authorize]
    [HttpGet("{reservationId}/payment-status")]
    public async Task<IActionResult> GetPaymentStatus(string reservationId)
    {
        try
        {
            var caller = GetCaller();
            var status = await _reservationService.GetPaymentStatusAsync(reservationId, caller);
            return Ok(new
            {
                success = true,
                message = "Reservation payment status retrieved successfully.",
                data = status
            });
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    /// <summary>
    /// Receives signed asynchronous payment gateway webhooks to verify and finalize reservation advance payments.
    /// </summary>
    [AllowAnonymous]
    [BufferRequestBody]
    [HttpPost("payment/webhook")]
    public async Task<IActionResult> PaymentWebhook([FromBody] ReservationWebhookRequestDto request)
    {
        try
        {
            string rawBody = string.Empty;
            if (Request.Body.CanSeek)
            {
                Request.Body.Position = 0;
                using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
                rawBody = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
            }

            string? headerSignature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault()
                                      ?? Request.Headers["X-Webhook-Signature"].FirstOrDefault();
            string? ipAddress = HttpContext?.Connection?.RemoteIpAddress?.ToString();

            var result = await _reservationService.ProcessWebhookAsync(rawBody, request, headerSignature, ipAddress);
            if (!result.Success && !result.Pending)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapReservationException(ex);
        }
    }

    #endregion

    #region Legacy Admin POS Compatibility Endpoints

    // PUT / PATCH /api/v1/reservations/{id}/status
    [AllowAnonymous]
    [HttpPut("{id}/status")]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateReservationStatus(string id, [FromBody] UpdateReservationStatusDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        long numericId = 0;
        if (!string.IsNullOrEmpty(id))
        {
            var cleanId = System.Text.RegularExpressions.Regex.Replace(id, @"^[^\d]+", "");
            long.TryParse(cleanId, out numericId);
        }

        if (numericId <= 0)
        {
            return BadRequest(new { success = false, message = "Invalid reservation ID." });
        }

        string normalized = request.Status.Trim();
        var parameters = new Dictionary<string, object?>
        {
            { "p_action", "UPDATE_STATUS" },
            { "p_reservation_id", numericId },
            { "p_customer_id", null },
            { "p_table_id", null },
            { "p_branch_id", null },
            { "p_reservation_date", null },
            { "p_reservation_time", null },
            { "p_guests_count", null },
            { "p_status", normalized.ToLowerInvariant() },
            { "p_notes", null }
        };

        var results = await _spService.ExecuteQueryAsync("sp_manage_reservations", MapSpOperationResult, parameters);
        var result = results.Count > 0 ? results[0] : null;

        await _spService.ExecuteSqlNonQueryAsync(
            "UPDATE reservations SET status = @stat, updated_at = UTC_TIMESTAMP() WHERE reservation_id = @rid;",
            new Dictionary<string, object?> { { "@stat", normalized.ToLowerInvariant() }, { "@rid", numericId } });

        return Ok(new
        {
            success = true,
            message = result?.Message ?? "Reservation status updated successfully.",
            data = new { reservationId = numericId, status = normalized.ToLowerInvariant() }
        });
    }

    // DELETE /api/v1/reservations/{id}
    [AllowAnonymous]
    [HttpDelete("{id}")]
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

    #endregion

    #region SP Reader Mapping Helpers

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

        var resNumberOrd = HasColumn(reader, "reservation_number") ? reader.GetOrdinal("reservation_number") : -1;
        var payStatusOrd = HasColumn(reader, "payment_status") ? reader.GetOrdinal("payment_status") : -1;
        var advOrd = HasColumn(reader, "advance_amount") ? reader.GetOrdinal("advance_amount") : -1;
        var paidOrd = HasColumn(reader, "paid_amount") ? reader.GetOrdinal("paid_amount") : -1;
        var remOrd = HasColumn(reader, "remaining_amount") ? reader.GetOrdinal("remaining_amount") : -1;
        var resAmtOrd = HasColumn(reader, "reservation_amount") ? reader.GetOrdinal("reservation_amount") : -1;
        var prefOrd = HasColumn(reader, "seating_preference") ? reader.GetOrdinal("seating_preference") : -1;

        long reservationId = Convert.ToInt64(reader["reservation_id"]);

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
        string formattedTime = string.Empty;
        if (resTimeOrd >= 0 && !reader.IsDBNull(resTimeOrd))
        {
            var val = reader.GetValue(resTimeOrd);
            if (val is TimeSpan ts)
            {
                resTime = ts.ToString(@"hh\:mm\:ss");
                formattedTime = DateTime.Today.Add(ts).ToString("hh:mm tt");
            }
            else if (val is DateTime dt)
            {
                resTime = dt.ToString("HH:mm:ss");
                formattedTime = dt.ToString("hh:mm tt");
            }
            else
            {
                resTime = val.ToString() ?? string.Empty;
                formattedTime = resTime;
            }
        }

        string resNumber = resNumberOrd >= 0 && !reader.IsDBNull(resNumberOrd)
            ? reader.GetString(resNumberOrd)
            : $"RES-{1000 + reservationId}";

        return new ReservationResponseDto
        {
            ReservationId = reservationId,
            ReservationNumber = resNumber,
            BranchId = HasColumn(reader, "branch_id") && !reader.IsDBNull(reader.GetOrdinal("branch_id")) ? Convert.ToInt64(reader["branch_id"]) : 1,
            CustomerId = HasColumn(reader, "customer_id") && !reader.IsDBNull(reader.GetOrdinal("customer_id")) ? Convert.ToInt64(reader["customer_id"]) : null,
            CustomerName = customerName,
            CustomerPhone = phone,
            TableId = HasColumn(reader, "table_id") && !reader.IsDBNull(reader.GetOrdinal("table_id")) ? Convert.ToInt64(reader["table_id"]) : null,
            TableNumber = tableNumOrd >= 0 && !reader.IsDBNull(tableNumOrd) ? reader.GetString(tableNumOrd) : null,
            Location = locationOrd >= 0 && !reader.IsDBNull(locationOrd) ? reader.GetString(locationOrd) : null,
            SeatingPreference = prefOrd >= 0 && !reader.IsDBNull(prefOrd) ? reader.GetString(prefOrd) : null,
            ReservationDate = resDate,
            ReservationTime = resTime,
            FormattedTime = formattedTime,
            GuestsCount = Convert.ToInt32(reader["guests_count"]),
            ReservationAmount = resAmtOrd >= 0 && !reader.IsDBNull(resAmtOrd) ? Convert.ToDecimal(reader.GetValue(resAmtOrd)) : 0m,
            AdvanceAmount = advOrd >= 0 && !reader.IsDBNull(advOrd) ? Convert.ToDecimal(reader.GetValue(advOrd)) : 0m,
            PaidAmount = paidOrd >= 0 && !reader.IsDBNull(paidOrd) ? Convert.ToDecimal(reader.GetValue(paidOrd)) : 0m,
            RemainingAmount = remOrd >= 0 && !reader.IsDBNull(remOrd) ? Convert.ToDecimal(reader.GetValue(remOrd)) : 0m,
            PaymentStatus = payStatusOrd >= 0 && !reader.IsDBNull(payStatusOrd) ? reader.GetString(payStatusOrd) : "UNPAID",
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

    #endregion
}

// Aliases for backward compatibility
public class CreateReservationRequest : CreateReservationDto { }
public class UpdateReservationStatusRequest : UpdateReservationStatusDto { }
