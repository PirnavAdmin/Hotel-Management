using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HMS.Services;

public class ReservationNotFoundException : Exception
{
    public ReservationNotFoundException(string message) : base(message) { }
}

public class ReservationConflictException : Exception
{
    public ReservationConflictException(string message) : base(message) { }
}

public class ReservationForbiddenException : Exception
{
    public ReservationForbiddenException(string message) : base(message) { }
}

public class ReservationUnauthorizedException : Exception
{
    public ReservationUnauthorizedException(string message) : base(message) { }
}

public class ReservationCallerContext
{
    public bool IsAuthenticated { get; set; }
    public bool IsStaff { get; set; }
    public string? Role { get; set; }
    public string? TokenScope { get; set; }
    public long? UserId { get; set; }
    public long? CustomerId { get; set; }
    public string? Phone { get; set; }
    public string? ScopedReservationNumber { get; set; }
    public long? ScopedReservationId { get; set; }
    public string? ActorName { get; set; }
    public string? IpAddress { get; set; }
}

public class ReservationService
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<ReservationService> _logger;

    private static readonly string[] BlockingStatuses =
    {
        "PENDING_PAYMENT", "PENDING", "BOOKED", "CONFIRMED", "SEATED"
    };

    private static readonly string[] TerminalStatuses =
    {
        "CANCELLED", "REFUNDED", "COMPLETED", "NO_SHOW"
    };

    private static readonly string[] DefaultCandidateSlotTimes =
    {
        "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM",
        "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM"
    };

    private static readonly HashSet<string> StaffRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Admin", "Super Admin", "Branch Manager", "Manager", "Staff",
        "POS Cashier", "Cashier", "Waiter", "Waitstaff", "Head Chef", "User POS", "Kitchen KOT", "BarStaff"
    };

    public ReservationService(
        AppDbContext context,
        SpService spService,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<ReservationService> logger)
    {
        _context = context;
        _spService = spService;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    #region Settings Helpers

    private int SlotDurationMinutes => Math.Max(30, _configuration.GetValue<int>("ReservationSettings:SlotDurationMinutes", 120));
    private decimal EstimatedChargePerGuest => Math.Max(100m, _configuration.GetValue<decimal>("ReservationSettings:EstimatedChargePerGuest", 1000m));
    private decimal AdvancePaymentPercentage => Math.Clamp(_configuration.GetValue<decimal>("ReservationSettings:AdvancePaymentPercentage", 20m), 0m, 100m);
    private decimal MinimumAdvanceAmount => Math.Max(0m, _configuration.GetValue<decimal>("ReservationSettings:MinimumAdvanceAmount", 0m));
    private bool RequireAdvancePayment => _configuration.GetValue<bool>("ReservationSettings:RequireAdvancePayment", true);
    private double FullRefundCutoffHours => Math.Max(0d, _configuration.GetValue<double>("ReservationSettings:FullRefundCutoffHours", 4d));
    private double PartialRefundCutoffHours => Math.Max(0d, _configuration.GetValue<double>("ReservationSettings:PartialRefundCutoffHours", 1d));
    private decimal PartialRefundPercentage => Math.Clamp(_configuration.GetValue<decimal>("ReservationSettings:PartialRefundPercentage", 50m), 0m, 100m);
    private int GuestTokenExpiryMinutes => Math.Max(15, _configuration.GetValue<int>("ReservationSettings:GuestTokenExpiryMinutes", 120));
    private int OtpExpiryMinutes => Math.Max(2, _configuration.GetValue<int>("ReservationSettings:OtpExpiryMinutes", 10));
    private int PendingPaymentHoldMinutes => Math.Max(5, _configuration.GetValue<int>("ReservationSettings:PendingPaymentHoldMinutes", 30));

    private (decimal EstimatedTotal, decimal AdvanceAmount) CalculateAmounts(int guests)
    {
        decimal estimatedTotal = Math.Round(guests * EstimatedChargePerGuest, 2, MidpointRounding.AwayFromZero);
        decimal advance = Math.Round(estimatedTotal * (AdvancePaymentPercentage / 100m), 2, MidpointRounding.AwayFromZero);
        if (MinimumAdvanceAmount > 0m && advance < MinimumAdvanceAmount)
        {
            advance = Math.Min(estimatedTotal, MinimumAdvanceAmount);
        }
        return (estimatedTotal, advance);
    }

    #endregion

    #region Caller Authorization Helpers

    public static ReservationCallerContext ExtractCallerContext(ClaimsPrincipal? user, string? ipAddress)
    {
        if (user == null || user.Identity?.IsAuthenticated != true)
        {
            return new ReservationCallerContext { IsAuthenticated = false, IpAddress = ipAddress };
        }

        string? role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("roleName");
        string? scope = user.FindFirstValue("tokenScope");
        long? userId = TryParsePositiveLong(user.FindFirstValue("userId") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub));
        long? customerId = TryParsePositiveLong(user.FindFirstValue("customerId"));
        string? phone = user.FindFirstValue("phone") ?? user.FindFirstValue(ClaimTypes.MobilePhone);
        string? scopedResNo = user.FindFirstValue("reservationNumber");
        long? scopedResId = TryParsePositiveLong(user.FindFirstValue("reservationId"));
        string? actorName = user.FindFirstValue("fullName") ?? user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue(JwtRegisteredClaimNames.UniqueName);

        bool isStaff = !string.IsNullOrWhiteSpace(role) && StaffRoles.Contains(role.Trim()) &&
                       !string.Equals(scope, "reservation_checkout", StringComparison.OrdinalIgnoreCase) &&
                       !string.Equals(scope, "reservation_otp", StringComparison.OrdinalIgnoreCase);

        return new ReservationCallerContext
        {
            IsAuthenticated = true,
            IsStaff = isStaff,
            Role = role,
            TokenScope = scope,
            UserId = userId,
            CustomerId = customerId,
            Phone = phone,
            ScopedReservationNumber = scopedResNo,
            ScopedReservationId = scopedResId,
            ActorName = actorName ?? phone ?? "Guest",
            IpAddress = ipAddress
        };
    }

    private void EnsureAuthorizedForReservation(Reservation reservation, ReservationCallerContext caller, bool allowCheckoutScope)
    {
        if (!caller.IsAuthenticated)
        {
            throw new ReservationUnauthorizedException("Authentication is required to access this reservation.");
        }

        if (caller.IsStaff)
        {
            return;
        }

        if (string.Equals(caller.TokenScope, "reservation_checkout", StringComparison.OrdinalIgnoreCase))
        {
            if (!allowCheckoutScope)
            {
                throw new ReservationForbiddenException("OTP verification is required to modify or cancel reservations.");
            }

            if (caller.ScopedReservationId.HasValue && caller.ScopedReservationId.Value == reservation.ReservationId)
            {
                return;
            }

            throw new ReservationForbiddenException("You are not authorized to access another reservation.");
        }

        // OTP-verified or Customer JWT
        string callerPhoneKey = PhoneKey(caller.Phone);
        string resPhoneKey = PhoneKey(reservation.Phone);
        bool phoneMatches = !string.IsNullOrWhiteSpace(callerPhoneKey) &&
                            !string.IsNullOrWhiteSpace(resPhoneKey) &&
                            string.Equals(callerPhoneKey, resPhoneKey, StringComparison.Ordinal);

        bool customerIdMatches = caller.CustomerId.HasValue &&
                                 reservation.CustomerId.HasValue &&
                                 caller.CustomerId.Value == reservation.CustomerId.Value;

        if (!phoneMatches && !customerIdMatches)
        {
            throw new ReservationForbiddenException("You do not have permission to access or modify this reservation.");
        }
    }

    #endregion

    #region Availability & Tables Endpoints

    public async Task<ReservationAvailabilityResponseDto> CheckAvailabilityAsync(
        string? dateStr,
        string? timeStr,
        int guests,
        string? preference,
        long branchId = 1)
    {
        if (!string.IsNullOrWhiteSpace(timeStr))
        {
            return await ComputeSlotAvailabilityAsync(dateStr, timeStr, guests, preference, branchId);
        }

        return await ComputeDaySlotsOverviewAsync(dateStr, guests, preference, branchId);
    }

    public async Task<ReservationAvailabilityResponseDto> GetAvailableTablesAsync(
        string? dateStr,
        string? timeStr,
        int guests,
        string? preference,
        long branchId = 1)
    {
        return await ComputeSlotAvailabilityAsync(dateStr, timeStr, guests, preference, branchId);
    }

    public async Task<ReservationTableDetailDto> GetTableDetailAsync(
        long tableId,
        string? dateStr = null,
        string? timeStr = null,
        int? guests = null)
    {
        if (tableId <= 0)
        {
            throw new ArgumentException("A valid tableId is required.");
        }

        var table = await _context.RestaurantTables
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TableId == tableId && t.DeletedAt == null);

        if (table == null)
        {
            throw new ReservationNotFoundException($"Table with ID {tableId} was not found.");
        }

        int cap = EffectiveCapacity(table);
        string section = ResolveTableSection(table);
        string category = ClassifySeatingCategory(section);

        var detail = new ReservationTableDetailDto
        {
            TableId = table.TableId,
            BranchId = table.BranchId,
            TableNumber = ResolveTableNumber(table),
            TableName = ResolveTableName(table),
            Capacity = cap,
            Location = table.Location,
            SectionArea = section,
            SeatingCategory = category,
            FloorStatus = table.Status
        };

        int targetGuests = guests.HasValue && guests.Value > 0 ? guests.Value : Math.Min(2, cap);
        var (estTotal, advAmt) = CalculateAmounts(targetGuests);
        detail.EstimatedTotalAmount = estTotal;
        detail.AdvanceAmount = advAmt;

        if (!string.IsNullOrWhiteSpace(dateStr))
        {
            DateTime reqDate = ParseDateRequired(dateStr);
            detail.Date = reqDate.ToString("yyyy-MM-dd");

            var dayReservations = await LoadActiveReservationsInWindowAsync(
                reqDate.AddDays(-1),
                reqDate.AddDays(1),
                new[] { table.TableId });

            detail.ReservedSlotWindowsOnDate = dayReservations
                .Where(r => r.ReservationDate.Date == reqDate.Date)
                .OrderBy(r => r.ReservationTime)
                .Select(r =>
                {
                    int dur = r.SlotDurationMinutes > 0 ? r.SlotDurationMinutes : SlotDurationMinutes;
                    var s = r.ReservationDate.Date + r.ReservationTime;
                    var e = s.AddMinutes(dur);
                    return $"{s:hh:mm tt} - {e:hh:mm tt}";
                })
                .ToList();

            if (!string.IsNullOrWhiteSpace(timeStr))
            {
                TimeSpan reqTime = ParseTimeRequired(timeStr);
                DateTime reqStart = reqDate.Date + reqTime;
                DateTime reqEnd = reqStart.AddMinutes(SlotDurationMinutes);
                detail.Time = FormatTimeDisplay(reqTime);
                detail.SlotWindow = $"{reqStart:hh:mm tt} - {reqEnd:hh:mm tt}";

                if (string.Equals(table.Status, "inactive", StringComparison.OrdinalIgnoreCase))
                {
                    detail.IsAvailableForSlot = false;
                    detail.SlotStatus = "inactive";
                    detail.ConflictReason = "Table is currently inactive for reservations.";
                }
                else if (guests.HasValue && guests.Value > cap)
                {
                    detail.IsAvailableForSlot = false;
                    detail.SlotStatus = "insufficient_capacity";
                    detail.ConflictReason = $"Table capacity is {cap} guests, which cannot accommodate {guests.Value} guests.";
                }
                else
                {
                    var conflict = FindOverlappingReservation(dayReservations, table.TableId, reqStart, reqEnd);
                    detail.IsAvailableForSlot = conflict == null;
                    detail.SlotStatus = conflict == null ? "available" : "reserved";
                    if (conflict != null)
                    {
                        int dur = conflict.SlotDurationMinutes > 0 ? conflict.SlotDurationMinutes : SlotDurationMinutes;
                        var cs = conflict.ReservationDate.Date + conflict.ReservationTime;
                        detail.ConflictReason = $"Reserved from {cs:hh:mm tt} to {cs.AddMinutes(dur):hh:mm tt}.";
                    }
                }
            }
        }

        return detail;
    }

    private async Task<ReservationAvailabilityResponseDto> ComputeDaySlotsOverviewAsync(
        string? dateStr,
        int guests,
        string? preference,
        long branchId)
    {
        if (guests < 1 || guests > 50)
        {
            throw new ArgumentException("Guests count must be between 1 and 50.");
        }

        DateTime reqDate = ParseDateRequired(dateStr);
        if (reqDate.Date < DateTime.Now.Date)
        {
            throw new ArgumentException("Selected date must not be in the past.");
        }

        long targetBranch = branchId > 0 ? branchId : 1;
        string normalizedPref = string.IsNullOrWhiteSpace(preference) ? "Any" : preference.Trim();
        var (estimatedTotal, advanceAmount) = CalculateAmounts(guests);

        var activeTables = await _context.RestaurantTables
            .AsNoTracking()
            .Where(t => t.DeletedAt == null &&
                        (t.BranchId == targetBranch || t.BranchId <= 0))
            .ToListAsync();

        activeTables = activeTables
            .Where(t => !string.Equals(t.Status, "inactive", StringComparison.OrdinalIgnoreCase))
            .ToList();

        int maxCapacity = activeTables.Count > 0 ? activeTables.Max(EffectiveCapacity) : 0;
        var matchingSectionTables = activeTables.Where(t => MatchesPreference(t, normalizedPref)).ToList();
        var tableIds = activeTables.Select(t => t.TableId).ToList();
        var dayReservations = tableIds.Count > 0
            ? await LoadActiveReservationsInWindowAsync(reqDate.AddDays(-1), reqDate.AddDays(1), tableIds)
            : new List<Reservation>();

        var openSlots = new List<AlternativeSlotSuggestionDto>();
        foreach (var label in DefaultCandidateSlotTimes)
        {
            TimeSpan candTime = ParseTimeRequired(label);
            DateTime candStart = reqDate.Date + candTime;
            if (candStart < DateTime.Now.AddMinutes(-5)) continue;

            DateTime candEnd = candStart.AddMinutes(SlotDurationMinutes);
            var freeTables = matchingSectionTables
                .Where(t => EffectiveCapacity(t) >= guests &&
                            FindOverlappingReservation(dayReservations, t.TableId, candStart, candEnd) == null)
                .OrderBy(EffectiveCapacity)
                .ToList();

            if (freeTables.Count > 0)
            {
                openSlots.Add(new AlternativeSlotSuggestionDto
                {
                    Time = FormatTimeDisplay(candTime),
                    NormalizedTime = candTime.ToString(@"hh\:mm\:ss"),
                    AvailableTablesCount = freeTables.Count,
                    BestMatchTable = ResolveTableName(freeTables[0]),
                    BestMatchTableId = freeTables[0].TableId
                });
            }
        }

        string msg = openSlots.Count > 0
            ? $"{openSlots.Count} time slot(s) available on {reqDate:yyyy-MM-dd} for {guests} guest(s)."
            : (guests > maxCapacity
                ? $"No single table accommodates {guests} guests (max single table capacity: {maxCapacity})."
                : $"No available slots found on {reqDate:yyyy-MM-dd} for {guests} guest(s).");

        return new ReservationAvailabilityResponseDto
        {
            IsAvailable = openSlots.Count > 0,
            Date = reqDate.ToString("yyyy-MM-dd"),
            Time = "All Slots",
            NormalizedTime = string.Empty,
            Guests = guests,
            Preference = normalizedPref,
            SlotDurationMinutes = SlotDurationMinutes,
            SlotWindow = $"{SlotDurationMinutes} mins per booking",
            EstimatedChargePerGuest = EstimatedChargePerGuest,
            EstimatedTotalAmount = estimatedTotal,
            AdvancePaymentPercentage = AdvancePaymentPercentage,
            AdvanceAmount = advanceAmount,
            MaxSingleTableCapacity = maxCapacity,
            AvailableTablesCount = openSlots.Count > 0 ? openSlots.Max(s => s.AvailableTablesCount) : 0,
            MatchingTablesCount = matchingSectionTables.Count,
            Message = msg,
            AlternativeSlots = openSlots
        };
    }

    private async Task<ReservationAvailabilityResponseDto> ComputeSlotAvailabilityAsync(
        string? dateStr,
        string? timeStr,
        int guests,
        string? preference,
        long branchId)
    {
        if (guests < 1 || guests > 50)
        {
            throw new ArgumentException("Guests count must be between 1 and 50.");
        }

        DateTime reqDate = ParseDateRequired(dateStr);
        TimeSpan reqTime = ParseTimeRequired(timeStr);
        DateTime reqStart = reqDate.Date + reqTime;
        DateTime reqEnd = reqStart.AddMinutes(SlotDurationMinutes);

        if (reqStart < DateTime.Now.AddMinutes(-5))
        {
            throw new ArgumentException("Selected date and time must be in the future.");
        }

        long targetBranch = branchId > 0 ? branchId : 1;
        string normalizedPref = string.IsNullOrWhiteSpace(preference) ? "Any" : preference.Trim();
        var (estimatedTotal, advanceAmount) = CalculateAmounts(guests);

        var allBranchTables = await _context.RestaurantTables
            .AsNoTracking()
            .Where(t => t.DeletedAt == null &&
                        (t.BranchId == targetBranch || t.BranchId <= 0))
            .OrderBy(t => t.CapacityChairs)
            .ThenBy(t => t.TableId)
            .ToListAsync();

        var activeTables = allBranchTables
            .Where(t => !string.Equals(t.Status, "inactive", StringComparison.OrdinalIgnoreCase))
            .ToList();

        int maxCapacity = activeTables.Count > 0 ? activeTables.Max(EffectiveCapacity) : 0;

        var matchingSectionTables = activeTables
            .Where(t => MatchesPreference(t, normalizedPref))
            .ToList();

        var tableIds = activeTables.Select(t => t.TableId).ToList();
        var overlappingCandidates = tableIds.Count > 0
            ? await LoadActiveReservationsInWindowAsync(reqDate.AddDays(-1), reqDate.AddDays(1), tableIds)
            : new List<Reservation>();

        var tableOptions = new List<ReservationTableOptionDto>();
        foreach (var table in matchingSectionTables)
        {
            int cap = EffectiveCapacity(table);
            string section = ResolveTableSection(table);
            string category = ClassifySeatingCategory(section);
            Reservation? conflict = FindOverlappingReservation(overlappingCandidates, table.TableId, reqStart, reqEnd);

            bool fitsGuests = cap >= guests;
            bool isAvailable = fitsGuests && conflict == null;

            string slotStatus = conflict != null
                ? "reserved"
                : (!fitsGuests ? "insufficient_capacity" : "available");

            string? conflictReason = null;
            if (conflict != null)
            {
                int dur = conflict.SlotDurationMinutes > 0 ? conflict.SlotDurationMinutes : SlotDurationMinutes;
                var cs = conflict.ReservationDate.Date + conflict.ReservationTime;
                conflictReason = $"Already booked for {cs:hh:mm tt} - {cs.AddMinutes(dur):hh:mm tt}.";
            }
            else if (!fitsGuests)
            {
                conflictReason = $"Seats up to {cap} guests (requested {guests}).";
            }

            tableOptions.Add(new ReservationTableOptionDto
            {
                TableId = table.TableId,
                BranchId = table.BranchId,
                TableNumber = ResolveTableNumber(table),
                TableName = ResolveTableName(table),
                Capacity = cap,
                Location = table.Location,
                SectionArea = section,
                SeatingCategory = category,
                FloorStatus = table.Status,
                IsAvailableForSlot = isAvailable,
                SlotStatus = slotStatus,
                ConflictReason = conflictReason,
                SlotWindow = $"{reqStart:hh:mm tt} - {reqEnd:hh:mm tt}",
                EstimatedTotalAmount = estimatedTotal,
                AdvanceAmount = advanceAmount,
                AdvancePercentage = AdvancePaymentPercentage
            });
        }

        // Order available tables with tightest capacity fit first so 2-guest bookings see 2/4 seaters first
        var availableTables = tableOptions
            .Where(t => t.IsAvailableForSlot)
            .OrderBy(t => t.Capacity)
            .ThenBy(t => t.TableNumber)
            .ToList();

        var sectionSummary = activeTables
            .GroupBy(t => ClassifySeatingCategory(ResolveTableSection(t)))
            .Select(g =>
            {
                var fitTables = g.Where(t => EffectiveCapacity(t) >= guests).ToList();
                int free = fitTables.Count(t => FindOverlappingReservation(overlappingCandidates, t.TableId, reqStart, reqEnd) == null);
                return new ReservationSectionSummaryDto
                {
                    Section = g.Key,
                    TotalMatchingTables = fitTables.Count,
                    AvailableTables = free
                };
            })
            .OrderBy(s => s.Section)
            .ToList();

        var alternativeSlots = new List<AlternativeSlotSuggestionDto>();
        if (availableTables.Count == 0 && guests <= maxCapacity)
        {
            foreach (var candidateTimeLabel in DefaultCandidateSlotTimes)
            {
                TimeSpan candTime = ParseTimeRequired(candidateTimeLabel);
                DateTime candStart = reqDate.Date + candTime;
                if (candStart < DateTime.Now || candTime == reqTime) continue;

                DateTime candEnd = candStart.AddMinutes(SlotDurationMinutes);
                var candTables = activeTables
                    .Where(t => EffectiveCapacity(t) >= guests &&
                                (normalizedPref.Equals("Any", StringComparison.OrdinalIgnoreCase) ||
                                 normalizedPref.Equals("All", StringComparison.OrdinalIgnoreCase) ||
                                 MatchesPreference(t, normalizedPref)) &&
                                FindOverlappingReservation(overlappingCandidates, t.TableId, candStart, candEnd) == null)
                    .OrderBy(EffectiveCapacity)
                    .ToList();

                if (candTables.Count > 0)
                {
                    var best = candTables[0];
                    alternativeSlots.Add(new AlternativeSlotSuggestionDto
                    {
                        Time = FormatTimeDisplay(candTime),
                        NormalizedTime = candTime.ToString(@"hh\:mm\:ss"),
                        AvailableTablesCount = candTables.Count,
                        BestMatchTable = ResolveTableName(best),
                        BestMatchTableId = best.TableId
                    });
                }
            }
        }

        string message;
        if (availableTables.Count > 0)
        {
            message = $"{availableTables.Count} table(s) available for {guests} guest(s) on {reqDate:yyyy-MM-dd} at {FormatTimeDisplay(reqTime)}.";
        }
        else if (guests > maxCapacity)
        {
            message = maxCapacity > 0
                ? $"No single table can accommodate {guests} guests. Maximum single-table capacity is {maxCapacity} guests."
                : "No active tables are currently configured for reservations.";
        }
        else if (!normalizedPref.Equals("Any", StringComparison.OrdinalIgnoreCase) &&
                 !normalizedPref.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                 matchingSectionTables.All(t => EffectiveCapacity(t) < guests))
        {
            message = $"No '{normalizedPref}' tables accommodate {guests} guests. Please try 'Any' seating preference.";
        }
        else
        {
            message = alternativeSlots.Count > 0
                ? $"All matching tables are reserved around {FormatTimeDisplay(reqTime)}. Suggested alternative time slots are included."
                : $"No matching tables are available on {reqDate:yyyy-MM-dd} at {FormatTimeDisplay(reqTime)} for {guests} guest(s).";
        }

        return new ReservationAvailabilityResponseDto
        {
            IsAvailable = availableTables.Count > 0,
            Date = reqDate.ToString("yyyy-MM-dd"),
            Time = FormatTimeDisplay(reqTime),
            NormalizedTime = reqTime.ToString(@"hh\:mm\:ss"),
            Guests = guests,
            Preference = normalizedPref,
            SlotDurationMinutes = SlotDurationMinutes,
            SlotWindow = $"{reqStart:hh:mm tt} - {reqEnd:hh:mm tt}",
            EstimatedChargePerGuest = EstimatedChargePerGuest,
            EstimatedTotalAmount = estimatedTotal,
            AdvancePaymentPercentage = AdvancePaymentPercentage,
            AdvanceAmount = advanceAmount,
            MaxSingleTableCapacity = maxCapacity,
            AvailableTablesCount = availableTables.Count,
            MatchingTablesCount = tableOptions.Count,
            Message = message,
            AvailableTables = availableTables,
            Tables = tableOptions,
            SectionSummary = sectionSummary,
            AlternativeSlots = alternativeSlots
        };
    }

    #endregion

    #region Create & Detail

    public async Task<(ReservationResponseDto Reservation, bool AlreadyProcessed)> CreateReservationAsync(
        CreateReservationDto request,
        ReservationCallerContext caller)
    {
        if (request == null)
        {
            throw new ArgumentException("Reservation request payload is required.");
        }

        string customerName = (request.CustomerName ?? string.Empty).Trim();
        string rawPhone = (request.Phone ?? string.Empty).Trim();
        string? email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();

        if (string.IsNullOrWhiteSpace(customerName))
        {
            throw new ArgumentException("Customer name is required.");
        }
        if (customerName.Length > 100)
        {
            throw new ArgumentException("Customer name must not exceed 100 characters.");
        }

        ValidatePhoneNumber(rawPhone);

        if (request.TableId <= 0)
        {
            throw new ArgumentException("A valid TableId is required.");
        }

        int guests = request.GuestsCount > 0 ? request.GuestsCount : (request.Guests > 0 ? request.Guests : 2);
        if (guests < 1 || guests > 50)
        {
            throw new ArgumentException("Guests count must be between 1 and 50.");
        }

        DateTime resDate = ResolveCreateDate(request);
        TimeSpan resTime = ResolveCreateTime(request);
        DateTime slotStart = resDate.Date + resTime;

        if (slotStart < DateTime.Now.AddMinutes(-5))
        {
            throw new ArgumentException("Reservation date and time must be in the future.");
        }

        string preference = !string.IsNullOrWhiteSpace(request.SeatingPreference)
            ? request.SeatingPreference.Trim()
            : (!string.IsNullOrWhiteSpace(request.Preference)
                ? request.Preference.Trim()
                : (!string.IsNullOrWhiteSpace(request.TablePreference) ? request.TablePreference.Trim() : "Any"));

        if (preference.Length > 50 || preference.Any(char.IsControl))
        {
            throw new ArgumentException("Enter a valid seating preference of at most 50 characters.");
        }

        string? notes = !string.IsNullOrWhiteSpace(request.SpecialRequests)
            ? request.SpecialRequests.Trim()
            : (!string.IsNullOrWhiteSpace(request.Notes) ? request.Notes.Trim() : null);
        if (notes != null && notes.Length > 500)
        {
            throw new ArgumentException("Special requests / notes must not exceed 500 characters.");
        }

        string? idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var existingIdem = await _context.Reservations
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.IdempotencyKey == idempotencyKey);

            if (existingIdem != null)
            {
                var dtoExisting = await BuildReservationResponseAsync(existingIdem, includeToken: true);
                return (dtoExisting, true);
            }
        }

        long branchId = request.BranchId.HasValue && request.BranchId.Value > 0 ? request.BranchId.Value : 1;
        var (estimatedTotal, advanceAmount) = CalculateAmounts(guests);

        bool skipAdvance = request.SkipAdvancePayment && caller.IsStaff &&
                           string.Equals(request.Source, "POS", StringComparison.OrdinalIgnoreCase);

        string initialStatus = (!RequireAdvancePayment || advanceAmount <= 0m || skipAdvance)
            ? (string.Equals(request.Source, "POS", StringComparison.OrdinalIgnoreCase) ? "booked" : "CONFIRMED")
            : "PENDING_PAYMENT";

        string initialPaymentStatus = initialStatus == "CONFIRMED" || initialStatus == "booked" ? "NOT_REQUIRED" : "UNPAID";
        decimal remainingAmount = initialStatus == "PENDING_PAYMENT" ? advanceAmount : 0m;

        Reservation? savedEntity = null;
        RestaurantTable? bookedTable = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                bool rowLocked = await LockTableRowForUpdateAsync(request.TableId);
                if (!rowLocked)
                {
                    throw new ReservationNotFoundException($"Selected table ID {request.TableId} was not found.");
                }

                var table = await _context.RestaurantTables
                    .FirstOrDefaultAsync(t => t.TableId == request.TableId && t.DeletedAt == null);

                if (table == null)
                {
                    throw new ReservationNotFoundException($"Selected table ID {request.TableId} was not found.");
                }

                if (string.Equals(table.Status, "inactive", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException($"Table {ResolveTableName(table)} is inactive and cannot be reserved.");
                }

                int cap = EffectiveCapacity(table);
                if (guests > cap)
                {
                    throw new ArgumentException($"Selected table {ResolveTableName(table)} accommodates up to {cap} guests, but {guests} guests were requested.");
                }

                DateTime slotEnd = slotStart.AddMinutes(SlotDurationMinutes);
                var tableReservations = await LoadActiveReservationsInWindowAsync(
                    resDate.AddDays(-1),
                    resDate.AddDays(1),
                    new[] { table.TableId });

                var conflict = FindOverlappingReservation(tableReservations, table.TableId, slotStart, slotEnd);
                if (conflict != null)
                {
                    int dur = conflict.SlotDurationMinutes > 0 ? conflict.SlotDurationMinutes : SlotDurationMinutes;
                    var cs = conflict.ReservationDate.Date + conflict.ReservationTime;
                    throw new ReservationConflictException(
                        $"Table {ResolveTableName(table)} is already reserved from {cs:hh:mm tt} to {cs.AddMinutes(dur):hh:mm tt}. Please choose another table or time slot.");
                }

                long? resolvedCustomerId = await ResolveOrUpsertCustomerAsync(
                    request.CustomerId ?? caller.CustomerId,
                    customerName,
                    rawPhone,
                    email,
                    branchId);

                DateTime utcNow = DateTime.UtcNow;
                var reservation = new Reservation
                {
                    BranchId = branchId,
                    OutletId = 1,
                    CustomerId = resolvedCustomerId,
                    CustomerName = customerName,
                    Phone = rawPhone,
                    Email = email,
                    TableId = table.TableId,
                    GuestsCount = guests,
                    SeatingPreference = string.Equals(preference, "Any", StringComparison.OrdinalIgnoreCase)
                        ? ClassifySeatingCategory(ResolveTableSection(table))
                        : preference,
                    ReservationDate = resDate.Date,
                    ReservationTime = resTime,
                    SlotDurationMinutes = SlotDurationMinutes,
                    ReservationAmount = estimatedTotal,
                    AdvanceAmount = advanceAmount,
                    PaidAmount = 0.00m,
                    RemainingAmount = remainingAmount,
                    PaymentStatus = initialPaymentStatus,
                    Status = initialStatus,
                    Notes = notes,
                    IdempotencyKey = idempotencyKey,
                    ConfirmedAt = initialStatus == "CONFIRMED" ? utcNow : null,
                    CreatedBy = caller.UserId,
                    UpdatedBy = caller.UserId,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                };

                _context.Reservations.Add(reservation);
                await _context.SaveChangesAsync();

                reservation.ReservationNumber = $"RES-{1000 + reservation.ReservationId}";
                await _context.SaveChangesAsync();

                // Update live floor status ONLY if immediate slot starts within 30 minutes and table is free
                if (initialStatus is "CONFIRMED" or "booked" &&
                    slotStart <= DateTime.Now.AddMinutes(30) &&
                    slotEnd >= DateTime.Now &&
                    table.Status.ToLowerInvariant() is "available" or "vacant")
                {
                    table.Status = "reserved";
                    table.UpdatedAt = utcNow;
                    await _context.SaveChangesAsync();
                }

                await RecordAuditLogAsync(
                    caller.UserId,
                    "RESERVATION_CREATED",
                    "reservations",
                    reservation.ReservationId,
                    null,
                    new
                    {
                        reservation.ReservationNumber,
                        reservation.TableId,
                        reservation.GuestsCount,
                        reservationDate = reservation.ReservationDate.ToString("yyyy-MM-dd"),
                        reservationTime = reservation.ReservationTime.ToString(@"hh\:mm\:ss"),
                        reservation.Status,
                        reservation.PaymentStatus,
                        reservation.AdvanceAmount
                    },
                    caller.IpAddress);

                await transaction.CommitAsync();

                savedEntity = reservation;
                bookedTable = table;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        var responseDto = await BuildReservationResponseAsync(savedEntity!, includeToken: true, tableOverride: bookedTable);
        return (responseDto, false);
    }

    public async Task<ReservationResponseDto> GetReservationByIdAsync(string reservationIdOrNumber, ReservationCallerContext caller)
    {
        var reservation = await FindReservationAsync(reservationIdOrNumber);
        if (reservation == null)
        {
            throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
        }

        EnsureAuthorizedForReservation(reservation, caller, allowCheckoutScope: true);
        return await BuildReservationResponseAsync(reservation, includeToken: false);
    }

    #endregion

    #region Advance Payment, Payment Status & Webhook

    public async Task<ReservationPaymentResultDto> ProcessPaymentAsync(
        string reservationIdOrNumber,
        ReservationPaymentRequestDto request,
        ReservationCallerContext caller)
    {
        if (request == null)
        {
            throw new ArgumentException("Payment request payload is required.");
        }

        var precheck = await FindReservationAsync(reservationIdOrNumber);
        if (precheck == null)
        {
            throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
        }

        EnsureAuthorizedForReservation(precheck, caller, allowCheckoutScope: true);

        string method = PaymentVerificationHelper.NormalizePaymentMethod(request.PaymentMethod);
        string outcome = PaymentVerificationHelper.NormalizeGatewayStatus(request.PaymentStatus);
        string? idemKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();

        ReservationPaymentResultDto? resultDto = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var reservation = await FindReservationForUpdateAsync(precheck.ReservationId);
                if (reservation == null)
                {
                    throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
                }

                // 1. Check idempotency key replay first
                if (!string.IsNullOrWhiteSpace(idemKey))
                {
                    var existingByKey = await _context.ReservationPayments
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.ReservationId == reservation.ReservationId && p.IdempotencyKey == idemKey);

                    if (existingByKey != null)
                    {
                        await transaction.CommitAsync();
                        var resDtoReplay = await BuildReservationResponseAsync(reservation, includeToken: false);
                        resultDto = BuildPaymentResultDto(
                            success: string.Equals(existingByKey.PaymentStatus, "success", StringComparison.OrdinalIgnoreCase),
                            alreadyProcessed: true,
                            pending: string.Equals(existingByKey.PaymentStatus, "pending", StringComparison.OrdinalIgnoreCase),
                            message: $"Payment already processed with idempotency key '{idemKey}'.",
                            reservation: reservation,
                            payment: existingByKey,
                            reservationDto: resDtoReplay);
                        return;
                    }
                }

                // 2. Reject cancelled / completed states
                if (TerminalStatuses.Contains(reservation.Status, StringComparer.OrdinalIgnoreCase))
                {
                    throw new ReservationConflictException($"Cannot accept payment because reservation {reservation.ReservationNumber} is already '{reservation.Status}'.");
                }

                // 3. Determine remaining payable advance & block duplicate payments
                decimal dueAmount = reservation.RemainingAmount > 0m
                    ? reservation.RemainingAmount
                    : Math.Max(0m, reservation.AdvanceAmount - reservation.PaidAmount);

                if (dueAmount <= 0m && string.Equals(reservation.PaymentStatus, "PAID", StringComparison.OrdinalIgnoreCase))
                {
                    throw new DuplicatePaymentException($"Reservation {reservation.ReservationNumber} advance payment is already fully paid. Duplicate payment rejected.");
                }

                if (dueAmount <= 0m)
                {
                    dueAmount = reservation.AdvanceAmount;
                }

                // 4. Reject duplicate gatewayPaymentId
                string? gwPayId = string.IsNullOrWhiteSpace(request.GatewayPaymentId) ? null : request.GatewayPaymentId.Trim();
                if (!string.IsNullOrWhiteSpace(gwPayId))
                {
                    bool dupGwPay = await _context.ReservationPayments
                        .AnyAsync(p => p.GatewayPaymentId == gwPayId && p.PaymentStatus == "success");
                    if (dupGwPay)
                    {
                        throw new DuplicatePaymentException($"Gateway payment ID '{gwPayId}' has already been captured.");
                    }
                }

                decimal attemptAmount = request.Amount ?? dueAmount;
                string txnRef = !string.IsNullOrWhiteSpace(request.TransactionReference)
                    ? request.TransactionReference.Trim()
                    : (!string.IsNullOrWhiteSpace(gwPayId) ? gwPayId : $"RESPAY-{reservation.ReservationId}-{DateTime.UtcNow:yyyyMMddHHmmss}");

                DateTime utcNow = DateTime.UtcNow;

                // 5. Verify gateway payload unless explicitly recording a failed callback
                if (outcome == "success")
                {
                    PaymentVerificationHelper.VerifyGatewayPayment(
                        _configuration,
                        method,
                        dueAmount,
                        request.Amount,
                        request.GatewayProvider,
                        request.GatewayOrderId,
                        gwPayId,
                        request.GatewaySignature,
                        request.PaymentStatus,
                        txnRef);
                }
                else
                {
                    if (attemptAmount <= 0m)
                    {
                        throw new PaymentVerificationException("Payment amount must be greater than zero.");
                    }
                }

                string paymentType = reservation.PaidAmount > 0m ? "ADDITIONAL" : "ADVANCE";
                var paymentRecord = new ReservationPayment
                {
                    ReservationId = reservation.ReservationId,
                    CustomerId = reservation.CustomerId,
                    PaymentType = paymentType,
                    Amount = attemptAmount,
                    PaymentMethod = method,
                    PaymentStatus = outcome,
                    GatewayProvider = string.IsNullOrWhiteSpace(request.GatewayProvider) ? "INTERNAL" : request.GatewayProvider.Trim(),
                    GatewayOrderId = string.IsNullOrWhiteSpace(request.GatewayOrderId) ? null : request.GatewayOrderId.Trim(),
                    GatewayPaymentId = gwPayId,
                    GatewaySignature = string.IsNullOrWhiteSpace(request.GatewaySignature) ? null : request.GatewaySignature.Trim(),
                    TransactionReference = txnRef,
                    IdempotencyKey = idemKey,
                    FailureReason = outcome == "failed"
                        ? (string.IsNullOrWhiteSpace(request.FailureReason) ? "Payment was declined or failed at gateway." : request.FailureReason.Trim())
                        : null,
                    PaidAt = outcome == "success" ? utcNow : null,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                };

                _context.ReservationPayments.Add(paymentRecord);

                var oldState = new { reservation.Status, reservation.PaymentStatus, reservation.PaidAmount, reservation.RemainingAmount };

                if (outcome == "success")
                {
                    reservation.PaidAmount = Math.Round(reservation.PaidAmount + attemptAmount, 2, MidpointRounding.AwayFromZero);
                    reservation.RemainingAmount = Math.Max(0m, Math.Round(reservation.AdvanceAmount - reservation.PaidAmount, 2, MidpointRounding.AwayFromZero));
                    bool fullyCovered = reservation.PaidAmount + 0.01m >= reservation.AdvanceAmount;
                    reservation.PaymentStatus = fullyCovered ? "PAID" : "PARTIAL";

                    if (fullyCovered)
                    {
                        reservation.Status = "CONFIRMED";
                        reservation.ConfirmedAt ??= utcNow;
                    }

                    // Conditionally mark physical table as 'reserved' if imminent & free
                    if (fullyCovered && reservation.TableId.HasValue)
                    {
                        DateTime slotStart = reservation.ReservationDate.Date + reservation.ReservationTime;
                        DateTime slotEnd = slotStart.AddMinutes(reservation.SlotDurationMinutes > 0 ? reservation.SlotDurationMinutes : SlotDurationMinutes);
                        if (slotStart <= DateTime.Now.AddMinutes(30) && slotEnd >= DateTime.Now)
                        {
                            var tbl = await _context.RestaurantTables.FirstOrDefaultAsync(t => t.TableId == reservation.TableId.Value && t.DeletedAt == null);
                            if (tbl != null && tbl.Status.ToLowerInvariant() is "available" or "vacant")
                            {
                                tbl.Status = "reserved";
                                tbl.UpdatedAt = utcNow;
                            }
                        }
                    }
                }
                else if (outcome == "pending")
                {
                    if (reservation.PaidAmount <= 0m)
                    {
                        reservation.PaymentStatus = "PENDING";
                        reservation.Status = "PENDING_PAYMENT";
                    }
                }
                else // failed
                {
                    if (reservation.PaidAmount <= 0m)
                    {
                        reservation.PaymentStatus = "FAILED";
                        reservation.Status = "PENDING_PAYMENT";
                    }
                }

                reservation.UpdatedBy = caller.UserId;
                reservation.UpdatedAt = utcNow;
                await _context.SaveChangesAsync();

                await RecordAuditLogAsync(
                    caller.UserId,
                    outcome == "success" ? "RESERVATION_PAYMENT_CONFIRMED" : $"RESERVATION_PAYMENT_{outcome.ToUpperInvariant()}",
                    "reservations",
                    reservation.ReservationId,
                    oldState,
                    new
                    {
                        reservation.Status,
                        reservation.PaymentStatus,
                        reservation.PaidAmount,
                        reservation.RemainingAmount,
                        paymentRecord.PaymentId,
                        paymentRecord.PaymentMethod,
                        paymentRecord.TransactionReference
                    },
                    caller.IpAddress);

                await transaction.CommitAsync();

                var updatedResDto = await BuildReservationResponseAsync(reservation, includeToken: false);
                string message = outcome switch
                {
                    "success" => $"Advance payment of {attemptAmount:F2} verified via {method}. Reservation {reservation.ReservationNumber} is now CONFIRMED.",
                    "pending" => $"Payment is currently PENDING verification. Reservation {reservation.ReservationNumber} remains unconfirmed until gateway confirmation.",
                    _ => $"Payment failed ({paymentRecord.FailureReason}). Reservation {reservation.ReservationNumber} remains unconfirmed ({reservation.Status})."
                };

                resultDto = BuildPaymentResultDto(
                    success: outcome == "success",
                    alreadyProcessed: false,
                    pending: outcome == "pending",
                    message: message,
                    reservation: reservation,
                    payment: paymentRecord,
                    reservationDto: updatedResDto);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return resultDto!;
    }

    public async Task<ReservationPaymentStatusDto> GetPaymentStatusAsync(string reservationIdOrNumber, ReservationCallerContext caller)
    {
        var reservation = await FindReservationAsync(reservationIdOrNumber);
        if (reservation == null)
        {
            throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
        }

        EnsureAuthorizedForReservation(reservation, caller, allowCheckoutScope: true);

        var payments = await _context.ReservationPayments
            .AsNoTracking()
            .Where(p => p.ReservationId == reservation.ReservationId)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.PaymentId)
            .Select(p => MapPaymentItemDto(p))
            .ToListAsync();

        return new ReservationPaymentStatusDto
        {
            ReservationId = reservation.ReservationId,
            ReservationNumber = ResolveReservationNumber(reservation),
            ReservationStatus = reservation.Status,
            PaymentStatus = reservation.PaymentStatus,
            ReservationAmount = reservation.ReservationAmount,
            AdvanceAmount = reservation.AdvanceAmount,
            PaidAmount = reservation.PaidAmount,
            RemainingAmount = reservation.RemainingAmount,
            RefundAmount = reservation.RefundAmount,
            RefundStatus = reservation.RefundStatus,
            RefundReference = reservation.RefundReference,
            ConfirmedAt = reservation.ConfirmedAt,
            Payments = payments
        };
    }

    public async Task<ReservationPaymentResultDto> ProcessWebhookAsync(
        string rawBody,
        ReservationWebhookRequestDto request,
        string? headerSignature,
        string? ipAddress)
    {
        if (request == null)
        {
            throw new ArgumentException("Webhook payload is required.");
        }

        string? providedSig = !string.IsNullOrWhiteSpace(headerSignature) ? headerSignature : request.GatewaySignature;
        PaymentVerificationHelper.VerifyWebhookSignature(
            _configuration,
            rawBody,
            providedSig,
            request.GatewayOrderId,
            request.GatewayPaymentId);

        string? lookupKey = !string.IsNullOrWhiteSpace(request.ReservationNumber)
            ? request.ReservationNumber.Trim()
            : request.ReservationId?.Trim();

        if (string.IsNullOrWhiteSpace(lookupKey))
        {
            throw new ArgumentException("Webhook payload must identify reservationId or reservationNumber.");
        }

        var reservation = await FindReservationAsync(lookupKey);
        if (reservation == null)
        {
            throw new ReservationNotFoundException($"Reservation '{lookupKey}' referenced by webhook was not found.");
        }

        string mappedStatus = request.PaymentStatus ?? request.Event switch
        {
            "payment.captured" or "order.paid" => "SUCCESS",
            "payment.failed" => "FAILED",
            "payment.authorized" => "PENDING",
            _ => "SUCCESS"
        };

        var webhookCaller = new ReservationCallerContext
        {
            IsAuthenticated = true,
            IsStaff = true,
            ActorName = $"Webhook:{request.GatewayProvider ?? "Gateway"}",
            IpAddress = ipAddress
        };

        // Avoid failing webhook with 409 if gateway retries the exact same captured event
        if (!string.IsNullOrWhiteSpace(request.GatewayPaymentId))
        {
            var existingCaptured = await _context.ReservationPayments
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReservationId == reservation.ReservationId &&
                                          p.GatewayPaymentId == request.GatewayPaymentId &&
                                          p.PaymentStatus == "success");
            if (existingCaptured != null)
            {
                var resDto = await BuildReservationResponseAsync(reservation, includeToken: false);
                return BuildPaymentResultDto(true, true, false, "Webhook event already processed.", reservation, existingCaptured, resDto);
            }
        }

        var payReq = new ReservationPaymentRequestDto
        {
            Amount = request.Amount,
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "UPI" : request.PaymentMethod,
            PaymentStatus = mappedStatus,
            GatewayProvider = request.GatewayProvider ?? "GatewayWebhook",
            GatewayOrderId = request.GatewayOrderId,
            GatewayPaymentId = request.GatewayPaymentId,
            GatewaySignature = providedSig,
            TransactionReference = request.TransactionReference ?? request.GatewayPaymentId,
            IdempotencyKey = !string.IsNullOrWhiteSpace(request.GatewayPaymentId) ? $"wh_{request.GatewayPaymentId}" : null,
            FailureReason = request.FailureReason
        };

        return await ProcessPaymentAsync(reservation.ReservationId.ToString(), payReq, webhookCaller);
    }

    #endregion

    #region Guest OTP Authentication & My Reservations

    public async Task<SendReservationOtpResponseDto> SendGuestOtpAsync(SendReservationOtpRequestDto? request)
    {
        string rawPhone = request?.Phone ?? request?.MobileNumber ?? request?.CustomerPhone ?? string.Empty;
        rawPhone = rawPhone.Trim();
        ValidatePhoneNumber(rawPhone);

        string normalizedPhoneKey = PhoneKey(rawPhone);
        string otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(CultureInfo.InvariantCulture);
        string otpHash = BCrypt.Net.BCrypt.HashPassword(otp);

        DateTime utcNow = DateTime.UtcNow;
        var tokenEntity = new ReservationOtpToken
        {
            Phone = normalizedPhoneKey,
            OtpHash = otpHash,
            ExpiresAt = utcNow.AddMinutes(OtpExpiryMinutes),
            Attempts = 0,
            CreatedAt = utcNow
        };

        _context.ReservationOtpTokens.Add(tokenEntity);
        await _context.SaveChangesAsync();

        bool includeDevOtp = _environment.IsDevelopment() &&
                             _configuration.GetValue<bool>("ReservationSettings:IncludeDevOtpInResponse", false);

        return new SendReservationOtpResponseDto
        {
            Success = true,
            Message = $"OTP sent to {MaskPhone(rawPhone)}. Valid for {OtpExpiryMinutes} minutes.",
            MaskedPhone = MaskPhone(rawPhone),
            ExpiresInMinutes = OtpExpiryMinutes,
            DevOtp = includeDevOtp ? otp : null
        };
    }

    public async Task<VerifyReservationOtpResponseDto> VerifyGuestOtpAsync(VerifyReservationOtpRequestDto? request)
    {
        if (request == null)
        {
            throw new ArgumentException("OTP verification payload is required.");
        }

        string rawPhone = request.Phone ?? request.MobileNumber ?? request.CustomerPhone ?? string.Empty;
        rawPhone = rawPhone.Trim();
        ValidatePhoneNumber(rawPhone);

        if (string.IsNullOrWhiteSpace(request.Otp))
        {
            throw new ArgumentException("OTP code is required.");
        }

        string normalizedPhoneKey = PhoneKey(rawPhone);

        var latestToken = await _context.ReservationOtpTokens
            .Where(t => t.Phone == normalizedPhoneKey && t.VerifiedAt == null)
            .OrderByDescending(t => t.OtpId)
            .FirstOrDefaultAsync();

        if (latestToken == null)
        {
            throw new ArgumentException("No active OTP request found for this phone number.");
        }

        if (DateTime.UtcNow > latestToken.ExpiresAt)
        {
            throw new ArgumentException("OTP has expired. Please request a new OTP.");
        }

        if (latestToken.Attempts >= 5)
        {
            throw new ArgumentException("Maximum OTP verification attempts exceeded. Please request a new OTP.");
        }

        bool validOtp = BCrypt.Net.BCrypt.Verify(request.Otp.Trim(), latestToken.OtpHash);
        if (!validOtp)
        {
            latestToken.Attempts += 1;
            await _context.SaveChangesAsync();
            throw new ArgumentException("Invalid OTP code.");
        }

        latestToken.VerifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        Customer? customer = await FindCustomerByPhoneAsync(rawPhone);
        var (jwt, expiresAt) = GenerateGuestJwt(
            phone: rawPhone,
            customerId: customer?.CustomerId,
            scope: "reservation_otp",
            reservationId: null,
            reservationNumber: null,
            expiryMinutes: GuestTokenExpiryMinutes);

        return new VerifyReservationOtpResponseDto
        {
            Success = true,
            Message = "Phone number verified successfully.",
            Token = jwt,
            ExpiresAt = expiresAt,
            Phone = rawPhone,
            CustomerId = customer?.CustomerId
        };
    }

    public async Task<MyReservationsResponseDto> GetMyReservationsAsync(
        string? queryPhone,
        string? tab,
        int page,
        int pageSize,
        ReservationCallerContext caller)
    {
        if (!caller.IsAuthenticated)
        {
            throw new ReservationUnauthorizedException("Authentication is required to view reservation history.");
        }

        if (string.Equals(caller.TokenScope, "reservation_checkout", StringComparison.OrdinalIgnoreCase))
        {
            throw new ReservationForbiddenException("OTP authentication is required before viewing reservation history.");
        }

        string? targetPhone = caller.IsStaff && !string.IsNullOrWhiteSpace(queryPhone)
            ? queryPhone.Trim()
            : caller.Phone;

        if (!caller.IsStaff && !string.IsNullOrWhiteSpace(queryPhone))
        {
            string queryPhoneKey = PhoneKey(queryPhone);
            string callerPhoneKey = PhoneKey(caller.Phone);
            if (!string.IsNullOrWhiteSpace(queryPhoneKey) &&
                !string.Equals(queryPhoneKey, callerPhoneKey, StringComparison.Ordinal))
            {
                throw new ReservationForbiddenException("You cannot query another customer's reservations.");
            }
        }

        if (string.IsNullOrWhiteSpace(targetPhone) && !caller.CustomerId.HasValue)
        {
            throw new ReservationUnauthorizedException("Verified phone number or customer identity is required.");
        }

        string targetPhoneKey = PhoneKey(targetPhone);
        string suffix = targetPhoneKey.Length >= 4 ? targetPhoneKey[^4..] : targetPhoneKey;

        var candidates = await _context.Reservations
            .AsNoTracking()
            .Where(r =>
                (caller.CustomerId.HasValue && r.CustomerId == caller.CustomerId.Value) ||
                (!string.IsNullOrEmpty(suffix) && r.Phone != null && r.Phone.Contains(suffix)))
            .OrderByDescending(r => r.ReservationDate)
            .ThenByDescending(r => r.ReservationTime)
            .ThenByDescending(r => r.ReservationId)
            .ToListAsync();

        var owned = candidates
            .Where(r =>
                (caller.CustomerId.HasValue && r.CustomerId == caller.CustomerId.Value) ||
                (!string.IsNullOrWhiteSpace(targetPhoneKey) && PhoneKey(r.Phone) == targetPhoneKey))
            .ToList();

        var tableMap = await LoadTableLookupAsync(owned.Where(r => r.TableId.HasValue).Select(r => r.TableId!.Value).Distinct());
        var resIds = owned.Select(r => r.ReservationId).ToList();
        var paymentsByRes = await _context.ReservationPayments
            .AsNoTracking()
            .Where(p => resIds.Contains(p.ReservationId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var paymentLookup = paymentsByRes.GroupBy(p => p.ReservationId).ToDictionary(g => g.Key, g => g.Select(MapPaymentItemDto).ToList());

        DateTime cutoffNow = DateTime.Now.AddMinutes(-30);
        var upcoming = new List<ReservationResponseDto>();
        var pastAndCancelled = new List<ReservationResponseDto>();

        foreach (var r in owned)
        {
            RestaurantTable? tbl = r.TableId.HasValue && tableMap.TryGetValue(r.TableId.Value, out var t) ? t : null;
            paymentLookup.TryGetValue(r.ReservationId, out var payList);
            var dto = MapReservationDto(r, tbl, payList ?? new List<ReservationPaymentItemDto>(), null);

            DateTime slotStart = r.ReservationDate.Date + r.ReservationTime;
            bool isTerminal = TerminalStatuses.Contains(r.Status, StringComparer.OrdinalIgnoreCase);

            if (!isTerminal && slotStart >= cutoffNow)
            {
                upcoming.Add(dto);
            }
            else
            {
                pastAndCancelled.Add(dto);
            }
        }

        upcoming = upcoming.OrderBy(r => r.ReservationDate).ThenBy(r => r.ReservationTime).ToList();
        pastAndCancelled = pastAndCancelled.OrderByDescending(r => r.ReservationDate).ThenByDescending(r => r.ReservationTime).ToList();

        List<ReservationResponseDto> combined = (tab ?? "all").Trim().ToLowerInvariant() switch
        {
            "upcoming" => upcoming,
            "past" or "cancelled" or "past_and_cancelled" => pastAndCancelled,
            _ => upcoming.Concat(pastAndCancelled).ToList()
        };

        int safePage = Math.Max(1, page);
        int safePageSize = Math.Clamp(pageSize, 1, 100);
        var pagedItems = combined.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToList();

        return new MyReservationsResponseDto
        {
            Phone = targetPhone,
            CustomerId = caller.CustomerId,
            Total = combined.Count,
            UpcomingCount = upcoming.Count,
            PastAndCancelledCount = pastAndCancelled.Count,
            Upcoming = upcoming,
            PastAndCancelled = pastAndCancelled,
            Items = pagedItems
        };
    }

    #endregion

    #region Modify Reservation

    public async Task<ModifyReservationResponseDto> ModifyReservationAsync(
        string reservationIdOrNumber,
        ModifyReservationDto request,
        ReservationCallerContext caller)
    {
        if (request == null)
        {
            throw new ArgumentException("Modification payload is required.");
        }

        var precheck = await FindReservationAsync(reservationIdOrNumber);
        if (precheck == null)
        {
            throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
        }

        EnsureAuthorizedForReservation(precheck, caller, allowCheckoutScope: false);

        ModifyReservationResponseDto? responseDto = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var reservation = await FindReservationForUpdateAsync(precheck.ReservationId);
                if (reservation == null)
                {
                    throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
                }

                if (TerminalStatuses.Contains(reservation.Status, StringComparer.OrdinalIgnoreCase))
                {
                    throw new ReservationConflictException($"Cannot modify reservation {reservation.ReservationNumber} because it is already '{reservation.Status}'.");
                }

                string prevDate = reservation.ReservationDate.ToString("yyyy-MM-dd");
                string prevTime = FormatTimeDisplay(reservation.ReservationTime);
                int prevGuests = reservation.GuestsCount;
                long? prevTableId = reservation.TableId;
                decimal prevEstAmount = reservation.ReservationAmount;
                decimal prevAdvAmount = reservation.AdvanceAmount;

                DateTime newDate = ResolveModifyDate(request, reservation.ReservationDate);
                TimeSpan newTime = ResolveModifyTime(request, reservation.ReservationTime);
                int newGuests = request.GuestsCount ?? request.Guests ?? reservation.GuestsCount;
                long targetTableId = request.TableId ?? reservation.TableId ?? 0;

                if (newGuests < 1 || newGuests > 50)
                {
                    throw new ArgumentException("Guests count must be between 1 and 50.");
                }

                if (targetTableId <= 0)
                {
                    throw new ArgumentException("A valid TableId is required.");
                }

                DateTime newSlotStart = newDate.Date + newTime;
                if (newSlotStart < DateTime.Now.AddMinutes(-5))
                {
                    throw new ArgumentException("Updated reservation date and time must be in the future.");
                }

                bool rowLocked = await LockTableRowForUpdateAsync(targetTableId);
                if (!rowLocked)
                {
                    throw new ReservationNotFoundException($"Selected table ID {targetTableId} was not found.");
                }

                var table = await _context.RestaurantTables
                    .FirstOrDefaultAsync(t => t.TableId == targetTableId && t.DeletedAt == null);

                if (table == null)
                {
                    throw new ReservationNotFoundException($"Selected table ID {targetTableId} was not found.");
                }

                if (string.Equals(table.Status, "inactive", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException($"Table {ResolveTableName(table)} is inactive and cannot be reserved.");
                }

                int cap = EffectiveCapacity(table);
                if (newGuests > cap)
                {
                    throw new ArgumentException($"Selected table {ResolveTableName(table)} accommodates up to {cap} guests, cannot fit {newGuests} guests.");
                }

                int duration = reservation.SlotDurationMinutes > 0 ? reservation.SlotDurationMinutes : SlotDurationMinutes;
                DateTime newSlotEnd = newSlotStart.AddMinutes(duration);

                var activeOnTable = await LoadActiveReservationsInWindowAsync(
                    newDate.AddDays(-1),
                    newDate.AddDays(1),
                    new[] { targetTableId },
                    excludeReservationId: reservation.ReservationId);

                var conflict = FindOverlappingReservation(activeOnTable, targetTableId, newSlotStart, newSlotEnd);
                if (conflict != null)
                {
                    int dur = conflict.SlotDurationMinutes > 0 ? conflict.SlotDurationMinutes : SlotDurationMinutes;
                    var cs = conflict.ReservationDate.Date + conflict.ReservationTime;
                    throw new ReservationConflictException(
                        $"Table {ResolveTableName(table)} is already booked from {cs:hh:mm tt} to {cs.AddMinutes(dur):hh:mm tt}.");
                }

                var (newEstAmount, newAdvAmount) = CalculateAmounts(newGuests);
                decimal delta = Math.Round(newAdvAmount - reservation.PaidAmount, 2, MidpointRounding.AwayFromZero);
                decimal additionalRequired = delta > 0m ? delta : 0m;
                decimal refundDue = delta < 0m && reservation.PaidAmount > 0m ? Math.Abs(delta) : 0m;

                string? updatedNotes = request.SpecialRequests ?? request.Notes;
                if (updatedNotes != null)
                {
                    updatedNotes = updatedNotes.Trim();
                    if (updatedNotes.Length > 500)
                    {
                        throw new ArgumentException("Special requests / notes must not exceed 500 characters.");
                    }
                }

                string? updatedPref = request.SeatingPreference ?? request.Preference ?? request.TablePreference;

                DateTime utcNow = DateTime.UtcNow;
                reservation.ReservationDate = newDate.Date;
                reservation.ReservationTime = newTime;
                reservation.GuestsCount = newGuests;
                reservation.TableId = targetTableId;
                reservation.SeatingPreference = !string.IsNullOrWhiteSpace(updatedPref)
                    ? updatedPref.Trim()
                    : ClassifySeatingCategory(ResolveTableSection(table));
                if (updatedNotes != null)
                {
                    reservation.Notes = string.IsNullOrWhiteSpace(updatedNotes) ? null : updatedNotes;
                }

                reservation.ReservationAmount = newEstAmount;
                reservation.AdvanceAmount = newAdvAmount;
                reservation.RemainingAmount = additionalRequired;

                if (reservation.PaidAmount > 0m)
                {
                    reservation.PaymentStatus = additionalRequired > 0m ? "PARTIAL" : "PAID";
                }

                reservation.ModifiedAt = utcNow;
                reservation.UpdatedBy = caller.UserId;
                reservation.UpdatedAt = utcNow;

                await _context.SaveChangesAsync();

                await RecordAuditLogAsync(
                    caller.UserId,
                    "RESERVATION_MODIFIED",
                    "reservations",
                    reservation.ReservationId,
                    new
                    {
                        date = prevDate,
                        time = prevTime,
                        guests = prevGuests,
                        tableId = prevTableId,
                        advanceAmount = prevAdvAmount
                    },
                    new
                    {
                        date = reservation.ReservationDate.ToString("yyyy-MM-dd"),
                        time = FormatTimeDisplay(reservation.ReservationTime),
                        guests = reservation.GuestsCount,
                        tableId = reservation.TableId,
                        advanceAmount = reservation.AdvanceAmount,
                        additionalRequired,
                        refundDue
                    },
                    caller.IpAddress);

                await transaction.CommitAsync();

                var updatedDto = await BuildReservationResponseAsync(reservation, includeToken: false, tableOverride: table);

                string? deltaMessage = null;
                if (additionalRequired > 0m && reservation.PaidAmount > 0m)
                {
                    deltaMessage = $"Additional advance payment of {additionalRequired:F2} is required for increased guest count.";
                }
                else if (refundDue > 0m)
                {
                    deltaMessage = $"Advance requirement decreased; excess paid amount of {refundDue:F2} will be adjusted at billing/settlement.";
                }

                responseDto = new ModifyReservationResponseDto
                {
                    Success = true,
                    Message = $"Reservation {reservation.ReservationNumber} updated successfully.",
                    Reservation = updatedDto,
                    ModificationSummary = new ReservationModificationSummaryDto
                    {
                        PreviousDate = prevDate,
                        PreviousTime = prevTime,
                        PreviousGuestsCount = prevGuests,
                        PreviousTableId = prevTableId,
                        PreviousEstimatedAmount = prevEstAmount,
                        NewEstimatedAmount = newEstAmount,
                        PreviousAdvanceAmount = prevAdvAmount,
                        NewAdvanceAmount = newAdvAmount,
                        PaidAmount = reservation.PaidAmount,
                        AdditionalPaymentRequired = additionalRequired,
                        RefundDue = refundDue,
                        PaymentDeltaMessage = deltaMessage
                    }
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return responseDto!;
    }

    #endregion

    #region Cancel & Refund

    public async Task<CancelReservationResponseDto> CancelReservationAsync(
        string reservationIdOrNumber,
        CancelReservationDto? request,
        ReservationCallerContext caller)
    {
        var precheck = await FindReservationAsync(reservationIdOrNumber);
        if (precheck == null)
        {
            throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
        }

        EnsureAuthorizedForReservation(precheck, caller, allowCheckoutScope: false);

        string? reason = !string.IsNullOrWhiteSpace(request?.CancellationReason)
            ? request!.CancellationReason!.Trim()
            : (!string.IsNullOrWhiteSpace(request?.Reason) ? request!.Reason!.Trim() : null);

        CancelReservationResponseDto? cancelDto = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var reservation = await FindReservationForUpdateAsync(precheck.ReservationId);
                if (reservation == null)
                {
                    throw new ReservationNotFoundException($"Reservation '{reservationIdOrNumber}' was not found.");
                }

                if (string.Equals(reservation.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(reservation.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ReservationConflictException($"Reservation {reservation.ReservationNumber} is already '{reservation.Status}'.");
                }

                if (string.Equals(reservation.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ReservationConflictException($"Completed reservation {reservation.ReservationNumber} cannot be cancelled.");
                }

                var oldState = new
                {
                    reservation.Status,
                    reservation.PaymentStatus,
                    reservation.PaidAmount,
                    reservation.TableId
                };

                DateTime slotStart = reservation.ReservationDate.Date + reservation.ReservationTime;
                double hoursUntil = Math.Round((slotStart - DateTime.Now).TotalHours, 2);

                decimal refundPct = 0m;
                decimal refundAmount = 0m;
                string refundStatus = "NONE";
                string? refundRef = null;
                string finalStatus = "CANCELLED";
                string refundMessage;

                if (reservation.PaidAmount <= 0m)
                {
                    refundStatus = "NOT_APPLICABLE";
                    refundMessage = "No advance payment was collected; no refund required.";
                }
                else if (hoursUntil >= FullRefundCutoffHours)
                {
                    refundPct = 100m;
                    refundAmount = reservation.PaidAmount;
                    refundStatus = "PROCESSED";
                    finalStatus = "REFUNDED";
                    refundRef = $"RFND-{reservation.ReservationId}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                    refundMessage = $"Full refund of {refundAmount:F2} initiated (cancelled {hoursUntil:F1}h before reservation; cutoff >= {FullRefundCutoffHours}h).";
                }
                else if (hoursUntil >= PartialRefundCutoffHours)
                {
                    refundPct = PartialRefundPercentage;
                    refundAmount = Math.Round(reservation.PaidAmount * (PartialRefundPercentage / 100m), 2, MidpointRounding.AwayFromZero);
                    refundStatus = refundAmount > 0m ? "PROCESSED" : "NONE";
                    finalStatus = refundAmount > 0m ? "REFUNDED" : "CANCELLED";
                    refundRef = refundAmount > 0m ? $"RFND-{reservation.ReservationId}-{DateTime.UtcNow:yyyyMMddHHmmss}" : null;
                    refundMessage = $"Partial refund ({PartialRefundPercentage:F0}%) of {refundAmount:F2} initiated (cancelled {hoursUntil:F1}h before reservation).";
                }
                else
                {
                    refundPct = 0m;
                    refundAmount = 0m;
                    refundStatus = "NONE";
                    finalStatus = "CANCELLED";
                    refundMessage = $"Cancelled within {PartialRefundCutoffHours}h of reservation time; advance payment is non-refundable.";
                }

                DateTime utcNow = DateTime.UtcNow;

                if (refundAmount > 0m)
                {
                    var latestSuccess = await _context.ReservationPayments
                        .AsNoTracking()
                        .Where(p => p.ReservationId == reservation.ReservationId && p.PaymentStatus == "success")
                        .OrderByDescending(p => p.PaymentId)
                        .FirstOrDefaultAsync();

                    _context.ReservationPayments.Add(new ReservationPayment
                    {
                        ReservationId = reservation.ReservationId,
                        CustomerId = reservation.CustomerId,
                        PaymentType = "REFUND",
                        Amount = refundAmount,
                        PaymentMethod = latestSuccess?.PaymentMethod ?? "UPI",
                        PaymentStatus = "refunded",
                        GatewayProvider = latestSuccess?.GatewayProvider ?? "INTERNAL",
                        GatewayPaymentId = latestSuccess?.GatewayPaymentId,
                        TransactionReference = refundRef,
                        RefundReference = refundRef,
                        PaidAt = utcNow,
                        CreatedAt = utcNow,
                        UpdatedAt = utcNow
                    });

                    reservation.PaymentStatus = "REFUNDED";
                }

                reservation.Status = finalStatus;
                reservation.CancellationReason = reason;
                reservation.CancelledAt = utcNow;
                reservation.CancelledBy = caller.ActorName ?? caller.Phone ?? "Customer";
                reservation.RefundAmount = refundAmount;
                reservation.RefundStatus = refundStatus;
                reservation.RefundReference = refundRef;
                reservation.RemainingAmount = 0m;
                reservation.UpdatedBy = caller.UserId;
                reservation.UpdatedAt = utcNow;

                await _context.SaveChangesAsync();

                // Conditionally release restaurant_tables.status ONLY if it is currently 'reserved'
                // AND has no active POS order AND no other imminent reservation holding it
                bool tableReleased = false;
                if (reservation.TableId.HasValue)
                {
                    long tblId = reservation.TableId.Value;
                    var table = await _context.RestaurantTables
                        .FirstOrDefaultAsync(t => t.TableId == tblId && t.DeletedAt == null);

                    if (table != null && string.Equals(table.Status, "reserved", StringComparison.OrdinalIgnoreCase))
                    {
                        bool hasActivePosOrder = await _context.Orders
                            .AnyAsync(o => !o.IsDeleted &&
                                           o.TableId == tblId &&
                                           o.Status != "Completed" &&
                                           o.Status != "Cancelled" &&
                                           o.Status != "Paid" &&
                                           o.Status != "Settled");

                        if (!hasActivePosOrder)
                        {
                            DateTime nowWindowStart = DateTime.Now.AddMinutes(-SlotDurationMinutes);
                            DateTime nowWindowEnd = DateTime.Now.AddMinutes(30);
                            var otherActive = await LoadActiveReservationsInWindowAsync(
                                DateTime.Now.Date.AddDays(-1),
                                DateTime.Now.Date.AddDays(1),
                                new[] { tblId },
                                excludeReservationId: reservation.ReservationId);

                            bool heldByOtherImminent = FindOverlappingReservation(otherActive, tblId, nowWindowStart, nowWindowEnd) != null;
                            if (!heldByOtherImminent)
                            {
                                table.Status = "available";
                                table.UpdatedAt = utcNow;
                                await _context.SaveChangesAsync();
                                tableReleased = true;
                            }
                        }
                    }
                }

                await RecordAuditLogAsync(
                    caller.UserId,
                    "RESERVATION_CANCELLED",
                    "reservations",
                    reservation.ReservationId,
                    oldState,
                    new
                    {
                        reservation.Status,
                        reservation.PaymentStatus,
                        reservation.CancellationReason,
                        reservation.RefundAmount,
                        reservation.RefundStatus,
                        reservation.RefundReference,
                        hoursUntil,
                        tableReleased
                    },
                    caller.IpAddress);

                await transaction.CommitAsync();

                var updatedDto = await BuildReservationResponseAsync(reservation, includeToken: false);

                cancelDto = new CancelReservationResponseDto
                {
                    Success = true,
                    Message = $"Reservation {reservation.ReservationNumber} cancelled successfully.",
                    ReservationId = reservation.ReservationId,
                    ReservationNumber = ResolveReservationNumber(reservation),
                    Status = reservation.Status,
                    PaymentStatus = reservation.PaymentStatus,
                    PaidAmount = reservation.PaidAmount,
                    RefundAmount = reservation.RefundAmount,
                    RefundPercentage = refundPct,
                    RefundStatus = reservation.RefundStatus,
                    RefundReference = reservation.RefundReference,
                    RefundMessage = refundMessage,
                    HoursUntilReservation = hoursUntil,
                    TableReleased = tableReleased,
                    CancelledAt = utcNow,
                    Reservation = updatedDto
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return cancelDto!;
    }

    #endregion

    #region Private Database & Mapping Helpers

    private async Task<bool> LockTableRowForUpdateAsync(long tableId)
    {
        var conn = _context.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
        }

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();
        cmd.CommandText = "SELECT table_id FROM restaurant_tables WHERE table_id = @tid AND deleted_at IS NULL FOR UPDATE;";
        var p = cmd.CreateParameter();
        p.ParameterName = "@tid";
        p.Value = tableId;
        cmd.Parameters.Add(p);

        object? scalar = await cmd.ExecuteScalarAsync();
        return scalar != null && scalar != DBNull.Value;
    }

    private async Task<Reservation?> FindReservationAsync(string idOrNumber)
    {
        if (string.IsNullOrWhiteSpace(idOrNumber)) return null;
        string trimmed = idOrNumber.Trim();

        if (long.TryParse(trimmed, out long numericId) && numericId > 0)
        {
            return await _context.Reservations
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ReservationId == numericId);
        }

        string upper = trimmed.ToUpperInvariant();
        var byNumber = await _context.Reservations
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ReservationNumber != null && r.ReservationNumber.ToUpper() == upper);

        if (byNumber != null) return byNumber;

        // Support RES-1004 -> numeric lookup if reservation_number wasn't backfilled
        if (upper.StartsWith("RES-", StringComparison.OrdinalIgnoreCase) &&
            long.TryParse(upper[4..], out long codeNum))
        {
            if (codeNum > 1000)
            {
                var candidate = await _context.Reservations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ReservationId == (codeNum - 1000));
                if (candidate != null) return candidate;
            }
        }

        return null;
    }

    private async Task<Reservation?> FindReservationForUpdateAsync(long reservationId)
    {
        var conn = _context.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();
            cmd.CommandText = "SELECT reservation_id FROM reservations WHERE reservation_id = @rid FOR UPDATE;";
            var p = cmd.CreateParameter();
            p.ParameterName = "@rid";
            p.Value = reservationId;
            cmd.Parameters.Add(p);
            await cmd.ExecuteScalarAsync();
        }

        return await _context.Reservations.FirstOrDefaultAsync(r => r.ReservationId == reservationId);
    }

    private async Task<List<Reservation>> LoadActiveReservationsInWindowAsync(
        DateTime startDate,
        DateTime endDate,
        IEnumerable<long> tableIds,
        long? excludeReservationId = null)
    {
        var tableIdList = tableIds.ToList();
        if (tableIdList.Count == 0) return new List<Reservation>();

        DateTime sDate = startDate.Date;
        DateTime eDate = endDate.Date.AddDays(1);
        DateTime pendingHoldCutoff = DateTime.UtcNow.AddMinutes(-PendingPaymentHoldMinutes);

        var rows = await _context.Reservations
            .AsNoTracking()
            .Where(r => r.TableId.HasValue &&
                        tableIdList.Contains(r.TableId.Value) &&
                        r.ReservationDate >= sDate &&
                        r.ReservationDate < eDate &&
                        (!excludeReservationId.HasValue || r.ReservationId != excludeReservationId.Value))
            .ToListAsync();

        return rows
            .Where(r =>
            {
                string st = (r.Status ?? string.Empty).Trim().ToUpperInvariant();
                if (!BlockingStatuses.Contains(st)) return false;
                if (st == "PENDING_PAYMENT" && r.PaidAmount <= 0m && r.CreatedAt < pendingHoldCutoff)
                {
                    return false;
                }
                return true;
            })
            .ToList();
    }

    private Reservation? FindOverlappingReservation(
        List<Reservation> candidates,
        long tableId,
        DateTime reqStart,
        DateTime reqEnd)
    {
        foreach (var existing in candidates)
        {
            if (existing.TableId != tableId) continue;

            int dur = existing.SlotDurationMinutes > 0 ? existing.SlotDurationMinutes : SlotDurationMinutes;
            DateTime existingStart = existing.ReservationDate.Date + existing.ReservationTime;
            DateTime existingEnd = existingStart.AddMinutes(dur);

            if (reqStart < existingEnd && existingStart < reqEnd)
            {
                return existing;
            }
        }
        return null;
    }

    private async Task<long?> ResolveOrUpsertCustomerAsync(
        long? requestedCustomerId,
        string fullName,
        string phone,
        string? email,
        long branchId)
    {
        try
        {
            Customer? customer = null;
            if (requestedCustomerId.HasValue && requestedCustomerId.Value > 0)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == requestedCustomerId.Value);
            }

            customer ??= await FindCustomerByPhoneAsync(phone, tracked: true);

            if (customer != null)
            {
                bool dirty = false;
                if (!string.IsNullOrWhiteSpace(fullName) && !string.Equals(customer.FullName, fullName, StringComparison.Ordinal))
                {
                    customer.FullName = fullName;
                    dirty = true;
                }
                if (!string.IsNullOrWhiteSpace(email) && !string.Equals(customer.Email, email, StringComparison.OrdinalIgnoreCase))
                {
                    customer.Email = email;
                    dirty = true;
                }
                if (dirty)
                {
                    customer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                return customer.CustomerId;
            }

            var newCustomer = new Customer
            {
                FullName = fullName,
                Phone = phone,
                Email = email,
                LoyaltyPoints = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();
            return newCustomer.CustomerId;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal warning upserting customer record during reservation.");
            var fallback = await FindCustomerByPhoneAsync(phone, tracked: false);
            return fallback?.CustomerId ?? requestedCustomerId;
        }
    }

    private async Task<Customer?> FindCustomerByPhoneAsync(string rawPhone, bool tracked = false)
    {
        string trimmed = rawPhone.Trim();
        IQueryable<Customer> query = tracked ? _context.Customers : _context.Customers.AsNoTracking();

        var exact = await query.FirstOrDefaultAsync(c => c.Phone == trimmed);
        if (exact != null) return exact;

        string targetKey = PhoneKey(trimmed);
        if (string.IsNullOrWhiteSpace(targetKey)) return null;

        string suffix = targetKey.Length >= 4 ? targetKey[^4..] : targetKey;
        var candidates = await query.Where(c => c.Phone.Contains(suffix)).ToListAsync();
        return candidates.FirstOrDefault(c => PhoneKey(c.Phone) == targetKey);
    }

    private (string Token, DateTime ExpiresAt) GenerateGuestJwt(
        string phone,
        long? customerId,
        string scope,
        long? reservationId,
        string? reservationNumber,
        int expiryMinutes)
    {
        string? jwtKey = _configuration["Jwt:Key"];
        string? jwtIssuer = _configuration["Jwt:Issuer"];
        string? jwtAudience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException("JWT key is missing in configuration.");
        }

        DateTime expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Role, "Customer"),
            new Claim("tokenScope", scope),
            new Claim("phone", phone)
        };

        if (customerId.HasValue && customerId.Value > 0)
        {
            claims.Add(new Claim("customerId", customerId.Value.ToString(CultureInfo.InvariantCulture)));
            claims.Add(new Claim(JwtRegisteredClaimNames.Sub, customerId.Value.ToString(CultureInfo.InvariantCulture)));
        }
        else
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Sub, $"guest:{PhoneKey(phone)}"));
        }

        if (reservationId.HasValue && reservationId.Value > 0)
        {
            claims.Add(new Claim("reservationId", reservationId.Value.ToString(CultureInfo.InvariantCulture)));
        }

        if (!string.IsNullOrWhiteSpace(reservationNumber))
        {
            claims.Add(new Claim("reservationNumber", reservationNumber));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    private async Task<ReservationResponseDto> BuildReservationResponseAsync(
        Reservation reservation,
        bool includeToken,
        RestaurantTable? tableOverride = null)
    {
        RestaurantTable? table = tableOverride;
        if (table == null && reservation.TableId.HasValue)
        {
            table = await _context.RestaurantTables
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TableId == reservation.TableId.Value);
        }

        var payments = await _context.ReservationPayments
            .AsNoTracking()
            .Where(p => p.ReservationId == reservation.ReservationId)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.PaymentId)
            .Select(p => MapPaymentItemDto(p))
            .ToListAsync();

        string? guestToken = null;
        if (includeToken && !string.IsNullOrWhiteSpace(reservation.Phone))
        {
            (guestToken, _) = GenerateGuestJwt(
                phone: reservation.Phone,
                customerId: reservation.CustomerId,
                scope: "reservation_checkout",
                reservationId: reservation.ReservationId,
                reservationNumber: ResolveReservationNumber(reservation),
                expiryMinutes: GuestTokenExpiryMinutes);
        }

        return MapReservationDto(reservation, table, payments, guestToken);
    }

    private async Task<Dictionary<long, RestaurantTable>> LoadTableLookupAsync(IEnumerable<long> tableIds)
    {
        var ids = tableIds.ToList();
        if (ids.Count == 0) return new Dictionary<long, RestaurantTable>();
        return await _context.RestaurantTables
            .AsNoTracking()
            .Where(t => ids.Contains(t.TableId))
            .ToDictionaryAsync(t => t.TableId);
    }

    private ReservationResponseDto MapReservationDto(
        Reservation r,
        RestaurantTable? table,
        List<ReservationPaymentItemDto> payments,
        string? guestToken)
    {
        string section = table != null ? ResolveTableSection(table) : (r.SeatingPreference ?? "Main Hall");
        string category = ClassifySeatingCategory(section);
        decimal estTotal = r.ReservationAmount > 0m ? r.ReservationAmount : CalculateAmounts(r.GuestsCount).EstimatedTotal;

        return new ReservationResponseDto
        {
            ReservationId = r.ReservationId,
            ReservationNumber = ResolveReservationNumber(r),
            CustomerId = r.CustomerId,
            CustomerName = r.CustomerName ?? "Guest",
            CustomerPhone = r.Phone ?? string.Empty,
            Email = r.Email,
            TableId = r.TableId,
            TableNumber = table != null ? ResolveTableNumber(table) : (r.TableId.HasValue ? $"T-{r.TableId}" : null),
            TableName = table != null ? ResolveTableName(table) : null,
            Location = table?.Location ?? section,
            SectionArea = section,
            SeatingCategory = category,
            BranchId = r.BranchId,
            ReservationDate = r.ReservationDate.ToString("yyyy-MM-dd"),
            ReservationTime = r.ReservationTime.ToString(@"hh\:mm\:ss"),
            FormattedTime = FormatTimeDisplay(r.ReservationTime),
            SlotDurationMinutes = r.SlotDurationMinutes > 0 ? r.SlotDurationMinutes : SlotDurationMinutes,
            GuestsCount = r.GuestsCount,
            SeatingPreference = r.SeatingPreference ?? category,
            ReservationAmount = estTotal,
            AdvanceAmount = r.AdvanceAmount,
            PaidAmount = r.PaidAmount,
            RemainingAmount = r.RemainingAmount,
            EstimatedBalanceAtRestaurant = Math.Max(0m, estTotal - r.PaidAmount),
            PaymentStatus = r.PaymentStatus,
            Status = r.Status,
            Notes = r.Notes,
            CancellationReason = r.CancellationReason,
            CancelledAt = r.CancelledAt,
            CancelledBy = r.CancelledBy,
            RefundAmount = r.RefundAmount,
            RefundStatus = r.RefundStatus,
            RefundReference = r.RefundReference,
            ConfirmedAt = r.ConfirmedAt,
            ModifiedAt = r.ModifiedAt,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            Payments = payments,
            GuestToken = guestToken
        };
    }

    private static ReservationPaymentItemDto MapPaymentItemDto(ReservationPayment p)
    {
        return new ReservationPaymentItemDto
        {
            PaymentId = p.PaymentId,
            PaymentType = p.PaymentType,
            Amount = p.Amount,
            PaymentMethod = p.PaymentMethod,
            PaymentStatus = p.PaymentStatus,
            GatewayProvider = p.GatewayProvider,
            GatewayOrderId = p.GatewayOrderId,
            GatewayPaymentId = p.GatewayPaymentId,
            TransactionReference = p.TransactionReference,
            RefundReference = p.RefundReference,
            FailureReason = p.FailureReason,
            PaidAt = p.PaidAt,
            CreatedAt = p.CreatedAt
        };
    }

    private static ReservationPaymentResultDto BuildPaymentResultDto(
        bool success,
        bool alreadyProcessed,
        bool pending,
        string message,
        Reservation reservation,
        ReservationPayment payment,
        ReservationResponseDto reservationDto)
    {
        return new ReservationPaymentResultDto
        {
            Success = success,
            AlreadyProcessed = alreadyProcessed,
            Pending = pending,
            Message = message,
            ReservationId = reservation.ReservationId,
            ReservationNumber = ResolveReservationNumber(reservation),
            ReservationStatus = reservation.Status,
            PaymentStatus = reservation.PaymentStatus,
            PaymentId = payment.PaymentId,
            PaymentType = payment.PaymentType,
            Amount = payment.Amount,
            PaidAmount = reservation.PaidAmount,
            RemainingAmount = reservation.RemainingAmount,
            AdvanceAmount = reservation.AdvanceAmount,
            ReservationAmount = reservation.ReservationAmount,
            PaymentMethod = payment.PaymentMethod,
            TransactionReference = payment.TransactionReference,
            GatewayProvider = payment.GatewayProvider,
            GatewayOrderId = payment.GatewayOrderId,
            GatewayPaymentId = payment.GatewayPaymentId,
            ConfirmedAt = reservation.ConfirmedAt,
            Reservation = reservationDto
        };
    }

    private async Task RecordAuditLogAsync(
        long? userId,
        string action,
        string tableName,
        long recordId,
        object? oldValue,
        object? newValue,
        string? ipAddress)
    {
        try
        {
            string? oldJson = oldValue != null ? JsonSerializer.Serialize(oldValue) : null;
            string? newJson = newValue != null ? JsonSerializer.Serialize(newValue) : null;
            string? cleanIp = !string.IsNullOrWhiteSpace(ipAddress)
                ? (ipAddress.Length > 45 ? ipAddress[..45] : ipAddress)
                : null;

            const string sql = @"
                INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
                VALUES (@uid, @act, @tbl, @rid, @oldv, @newv, @ip, UTC_TIMESTAMP());";

            await _spService.ExecuteSqlNonQueryAsync(sql, new Dictionary<string, object?>
            {
                { "@uid", userId },
                { "@act", action },
                { "@tbl", tableName },
                { "@rid", recordId },
                { "@oldv", oldJson },
                { "@newv", newJson },
                { "@ip", cleanIp }
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal error writing audit log ({Action} on {Table} #{RecordId}).", action, tableName, recordId);
        }
    }

    #endregion

    #region Parsing & Matching Utilities

    private static DateTime ResolveCreateDate(CreateReservationDto req)
    {
        if (req.ReservationDate.HasValue) return req.ReservationDate.Value.Date;
        if (!string.IsNullOrWhiteSpace(req.Date)) return ParseDateRequired(req.Date);
        if (req.ReservationDateTime.HasValue) return req.ReservationDateTime.Value.Date;
        throw new ArgumentException("Reservation date is required (yyyy-MM-dd).");
    }

    private static TimeSpan ResolveCreateTime(CreateReservationDto req)
    {
        string? rawTime = !string.IsNullOrWhiteSpace(req.ReservationTime) ? req.ReservationTime : req.Time;
        if (!string.IsNullOrWhiteSpace(rawTime)) return ParseTimeRequired(rawTime);
        if (req.ReservationDateTime.HasValue) return req.ReservationDateTime.Value.TimeOfDay;
        throw new ArgumentException("Reservation time is required (e.g. '07:30 PM' or '19:30').");
    }

    private static DateTime ResolveModifyDate(ModifyReservationDto req, DateTime fallback)
    {
        if (req.ReservationDate.HasValue) return req.ReservationDate.Value.Date;
        if (!string.IsNullOrWhiteSpace(req.Date)) return ParseDateRequired(req.Date);
        if (req.ReservationDateTime.HasValue) return req.ReservationDateTime.Value.Date;
        return fallback.Date;
    }

    private static TimeSpan ResolveModifyTime(ModifyReservationDto req, TimeSpan fallback)
    {
        string? rawTime = !string.IsNullOrWhiteSpace(req.ReservationTime) ? req.ReservationTime : req.Time;
        if (!string.IsNullOrWhiteSpace(rawTime)) return ParseTimeRequired(rawTime);
        if (req.ReservationDateTime.HasValue) return req.ReservationDateTime.Value.TimeOfDay;
        return fallback;
    }

    private static DateTime ParseDateRequired(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr))
        {
            throw new ArgumentException("Date parameter is required (yyyy-MM-dd).");
        }

        string trimmed = dateStr.Trim();
        string[] formats = { "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ssZ" };
        if (DateTime.TryParseExact(trimmed, formats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var exact))
        {
            return exact.Date;
        }
        if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsed))
        {
            return parsed.Date;
        }

        throw new ArgumentException($"Invalid date '{dateStr}'. Use format yyyy-MM-dd.");
    }

    private static TimeSpan ParseTimeRequired(string? timeStr)
    {
        if (string.IsNullOrWhiteSpace(timeStr))
        {
            throw new ArgumentException("Time parameter is required (e.g. '07:30 PM' or '19:30').");
        }

        string cleaned = timeStr.Trim();
        // Strip descriptive suffix like "07:30 PM (Dinner)"
        int parenIdx = cleaned.IndexOf('(');
        if (parenIdx > 0)
        {
            cleaned = cleaned[..parenIdx].Trim();
        }

        if (TimeSpan.TryParse(cleaned, CultureInfo.InvariantCulture, out var ts) && ts >= TimeSpan.Zero && ts < TimeSpan.FromDays(1))
        {
            return ts;
        }

        string[] formats = { "h:mm tt", "hh:mm tt", "h:mmtt", "hh:mmtt", "h tt", "hh tt", "H:mm", "HH:mm", "H:mm:ss", "HH:mm:ss" };
        if (DateTime.TryParseExact(cleaned, formats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var dt))
        {
            return dt.TimeOfDay;
        }

        throw new ArgumentException($"Invalid time '{timeStr}'. Use formats like '07:30 PM' or '19:30'.");
    }

    private static string FormatTimeDisplay(TimeSpan ts)
    {
        return DateTime.Today.Add(ts).ToString("hh:mm tt", CultureInfo.InvariantCulture);
    }

    private static int EffectiveCapacity(RestaurantTable table)
    {
        return Math.Max(1, Math.Max(table.Capacity, table.CapacityChairs));
    }

    private static string ResolveTableSection(RestaurantTable table)
    {
        return !string.IsNullOrWhiteSpace(table.SectionArea)
            ? table.SectionArea.Trim()
            : (!string.IsNullOrWhiteSpace(table.Location) ? table.Location.Trim() : "Main Hall");
    }

    private static string ResolveTableNumber(RestaurantTable table)
    {
        return !string.IsNullOrWhiteSpace(table.TableNumber)
            ? table.TableNumber.Trim()
            : (!string.IsNullOrWhiteSpace(table.TableName) ? table.TableName.Trim() : $"T-{table.TableId}");
    }

    private static string ResolveTableName(RestaurantTable table)
    {
        return !string.IsNullOrWhiteSpace(table.TableName) ? table.TableName.Trim() : ResolveTableNumber(table);
    }

    private static string ClassifySeatingCategory(string sectionOrLocation)
    {
        string s = (sectionOrLocation ?? string.Empty).ToLowerInvariant();
        if (s.Contains("terrace") || s.Contains("roof") || s.Contains("garden") || s.Contains("courtyard") || s.Contains("patio") || s.Contains("outdoor") || s.Contains("outside"))
        {
            return "Outdoor";
        }
        return "Indoor";
    }

    private static bool MatchesPreference(RestaurantTable table, string? preference)
    {
        if (string.IsNullOrWhiteSpace(preference)) return true;
        string pref = preference.Trim();
        if (pref.Equals("Any", StringComparison.OrdinalIgnoreCase) || pref.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        string section = ResolveTableSection(table);
        string location = (table.Location ?? string.Empty).Trim();
        string category = ClassifySeatingCategory(section);

        string prefLower = pref.ToLowerInvariant();
        if (prefLower.StartsWith("indoor") || prefLower == "inside" || prefLower == "ac")
        {
            return category.Equals("Indoor", StringComparison.OrdinalIgnoreCase);
        }

        if (prefLower.StartsWith("outdoor") || prefLower == "outside" || prefLower.Contains("courtyard"))
        {
            return category.Equals("Outdoor", StringComparison.OrdinalIgnoreCase);
        }

        if (prefLower.Contains("family"))
        {
            return section.Contains("family", StringComparison.OrdinalIgnoreCase) ||
                   section.Contains("main", StringComparison.OrdinalIgnoreCase) ||
                   location.Contains("family", StringComparison.OrdinalIgnoreCase);
        }

        if (prefLower.Contains("window"))
        {
            return category.Equals("Indoor", StringComparison.OrdinalIgnoreCase);
        }

        if (prefLower.Contains("garden"))
        {
            return section.Contains("garden", StringComparison.OrdinalIgnoreCase) ||
                   category.Equals("Outdoor", StringComparison.OrdinalIgnoreCase);
        }

        return section.Equals(pref, StringComparison.OrdinalIgnoreCase) ||
               location.Equals(pref, StringComparison.OrdinalIgnoreCase) ||
               section.Contains(pref, StringComparison.OrdinalIgnoreCase) ||
               location.Contains(pref, StringComparison.OrdinalIgnoreCase);
    }

    private static string ResolveReservationNumber(Reservation r)
    {
        return !string.IsNullOrWhiteSpace(r.ReservationNumber)
            ? r.ReservationNumber
            : $"RES-{1000 + r.ReservationId}";
    }

    private static void ValidatePhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            throw new ArgumentException("Mobile / phone number is required.");
        }

        string digits = Regex.Replace(phone, @"[^\d]", "");
        if (digits.Length < 7 || digits.Length > 15)
        {
            throw new ArgumentException("Enter a valid mobile number (7 to 15 digits).");
        }
    }

    private static string PhoneKey(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        string digits = Regex.Replace(phone, @"[^\d]", "");
        return digits.Length > 10 ? digits[^10..] : digits;
    }

    private static string MaskPhone(string phone)
    {
        string digits = Regex.Replace(phone, @"[^\d]", "");
        if (digits.Length <= 4) return "****";
        return $"*****{digits[^4..]}";
    }

    private static long? TryParsePositiveLong(string? raw)
    {
        return long.TryParse(raw, out var val) && val > 0 ? val : null;
    }

    #endregion
}
