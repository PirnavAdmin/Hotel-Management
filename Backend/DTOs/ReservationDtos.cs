using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateReservationDto
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

    private string _phone = string.Empty;
    public string Phone
    {
        get => !string.IsNullOrWhiteSpace(_phone) ? _phone : (!string.IsNullOrWhiteSpace(CustomerPhone) ? CustomerPhone : (MobileNumber ?? string.Empty));
        set => _phone = value;
    }
    public string? CustomerPhone { get; set; }
    public string? MobileNumber { get; set; }

    [EmailAddress]
    [MaxLength(120)]
    public string? Email { get; set; }

    [Required]
    public long TableId { get; set; }

    public long? BranchId { get; set; } = 1;

    private int _guestsCount = 0;
    public int GuestsCount
    {
        get => _guestsCount > 0 ? _guestsCount : (Guests > 0 ? Guests : 2);
        set => _guestsCount = value;
    }
    public int Guests { get; set; }

    public DateTime? ReservationDate { get; set; }
    public string? Date { get; set; }

    public string? ReservationTime { get; set; }
    public string? Time { get; set; }

    public DateTime? ReservationDateTime { get; set; }

    public string Status { get; set; } = "booked";

    public string? TablePreference { get; set; }
    public string? SeatingPreference { get; set; }
    public string? Preference { get; set; }

    public string? Notes { get; set; }
    public string? SpecialRequests { get; set; }

    [MaxLength(100)]
    public string? IdempotencyKey { get; set; }

    [MaxLength(30)]
    public string? Source { get; set; }

    public bool SkipAdvancePayment { get; set; } = false;
}

public class UpdateReservationStatusDto
{
    [Required]
    public string Status { get; set; } = "confirmed";
}

public class ReservationPaymentItemDto
{
    public long PaymentId { get; set; }
    public string PaymentType { get; set; } = "ADVANCE";
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "UPI";
    public string PaymentStatus { get; set; } = "pending";
    public string? GatewayProvider { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? TransactionReference { get; set; }
    public string? RefundReference { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReservationResponseDto
{
    public long ReservationId { get; set; }
    public string ReservationNumber { get; set; } = string.Empty;
    public long? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Phone => CustomerPhone;
    public string? Email { get; set; }
    public long? TableId { get; set; }
    public string? TableNumber { get; set; }
    public string? TableName { get; set; }
    public string? Location { get; set; }
    public string? SectionArea { get; set; }
    public string? SeatingCategory { get; set; }
    public long BranchId { get; set; } = 1;
    public string ReservationDate { get; set; } = string.Empty;
    public string ReservationTime { get; set; } = string.Empty;
    public string FormattedTime { get; set; } = string.Empty;
    public int SlotDurationMinutes { get; set; } = 120;
    public int GuestsCount { get; set; }
    public int Guests => GuestsCount;
    public string? SeatingPreference { get; set; }
    public decimal ReservationAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal EstimatedBalanceAtRestaurant { get; set; }
    public string PaymentStatus { get; set; } = "UNPAID";
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? SpecialRequests => Notes;
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelledBy { get; set; }
    public decimal RefundAmount { get; set; }
    public string RefundStatus { get; set; } = "NONE";
    public string? RefundReference { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<ReservationPaymentItemDto> Payments { get; set; } = new();
    public string? GuestToken { get; set; }
}

public class ReservationTableOptionDto
{
    public long TableId { get; set; }
    public long BranchId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Location { get; set; } = string.Empty;
    public string SectionArea { get; set; } = string.Empty;
    public string SeatingCategory { get; set; } = "Indoor";
    public string FloorStatus { get; set; } = "available";
    public bool IsAvailableForSlot { get; set; }
    public string SlotStatus { get; set; } = "available";
    public string? ConflictReason { get; set; }
    public string? SlotWindow { get; set; }
    public decimal EstimatedTotalAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public decimal AdvancePercentage { get; set; }
}

public class ReservationSectionSummaryDto
{
    public string Section { get; set; } = string.Empty;
    public int TotalMatchingTables { get; set; }
    public int AvailableTables { get; set; }
}

public class AlternativeSlotSuggestionDto
{
    public string Time { get; set; } = string.Empty;
    public string NormalizedTime { get; set; } = string.Empty;
    public int AvailableTablesCount { get; set; }
    public string? BestMatchTable { get; set; }
    public long? BestMatchTableId { get; set; }
}

public class ReservationAvailabilityResponseDto
{
    public bool IsAvailable { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string NormalizedTime { get; set; } = string.Empty;
    public int Guests { get; set; }
    public string Preference { get; set; } = "Any";
    public int SlotDurationMinutes { get; set; } = 120;
    public string SlotWindow { get; set; } = string.Empty;
    public decimal EstimatedChargePerGuest { get; set; }
    public decimal EstimatedTotalAmount { get; set; }
    public decimal AdvancePaymentPercentage { get; set; }
    public decimal AdvanceAmount { get; set; }
    public int MaxSingleTableCapacity { get; set; }
    public int AvailableTablesCount { get; set; }
    public int MatchingTablesCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<ReservationTableOptionDto> AvailableTables { get; set; } = new();
    public List<ReservationTableOptionDto> Tables { get; set; } = new();
    public List<ReservationSectionSummaryDto> SectionSummary { get; set; } = new();
    public List<AlternativeSlotSuggestionDto> AlternativeSlots { get; set; } = new();
}

public class ReservationTableDetailDto
{
    public long TableId { get; set; }
    public long BranchId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Location { get; set; } = string.Empty;
    public string SectionArea { get; set; } = string.Empty;
    public string SeatingCategory { get; set; } = "Indoor";
    public string FloorStatus { get; set; } = "available";
    public bool? IsAvailableForSlot { get; set; }
    public string? SlotStatus { get; set; }
    public string? ConflictReason { get; set; }
    public string? Date { get; set; }
    public string? Time { get; set; }
    public string? SlotWindow { get; set; }
    public decimal? EstimatedTotalAmount { get; set; }
    public decimal? AdvanceAmount { get; set; }
    public List<string> ReservedSlotWindowsOnDate { get; set; } = new();
}

public class ReservationPaymentRequestDto
{
    public decimal? Amount { get; set; }

    [Required]
    [MaxLength(30)]
    public string PaymentMethod { get; set; } = "UPI";

    [MaxLength(30)]
    public string? PaymentStatus { get; set; } = "SUCCESS";

    [MaxLength(40)]
    public string? GatewayProvider { get; set; }

    [MaxLength(100)]
    public string? GatewayOrderId { get; set; }

    [MaxLength(100)]
    public string? GatewayPaymentId { get; set; }

    [MaxLength(255)]
    public string? GatewaySignature { get; set; }

    [MaxLength(100)]
    public string? TransactionReference { get; set; }

    [MaxLength(100)]
    public string? IdempotencyKey { get; set; }

    [MaxLength(255)]
    public string? FailureReason { get; set; }
}

public class ReservationPaymentResultDto
{
    public bool Success { get; set; }
    public bool AlreadyProcessed { get; set; }
    public bool Pending { get; set; }
    public string Message { get; set; } = string.Empty;
    public long ReservationId { get; set; }
    public string ReservationNumber { get; set; } = string.Empty;
    public string ReservationStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public long PaymentId { get; set; }
    public string PaymentType { get; set; } = "ADVANCE";
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public decimal ReservationAmount { get; set; }
    public string PaymentMethod { get; set; } = "UPI";
    public string? TransactionReference { get; set; }
    public string? GatewayProvider { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public ReservationResponseDto? Reservation { get; set; }
}

public class ReservationPaymentStatusDto
{
    public long ReservationId { get; set; }
    public string ReservationNumber { get; set; } = string.Empty;
    public string ReservationStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = "UNPAID";
    public decimal ReservationAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public string RefundStatus { get; set; } = "NONE";
    public string? RefundReference { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public List<ReservationPaymentItemDto> Payments { get; set; } = new();
}

public class ReservationWebhookRequestDto
{
    public string? Event { get; set; }
    public string? ReservationId { get; set; }
    public string? ReservationNumber { get; set; }
    public decimal? Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentStatus { get; set; }
    public string? GatewayProvider { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? GatewaySignature { get; set; }
    public string? TransactionReference { get; set; }
    public string? FailureReason { get; set; }
}

public class SendReservationOtpRequestDto
{
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? CustomerPhone { get; set; }
}

public class SendReservationOtpResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string MaskedPhone { get; set; } = string.Empty;
    public int ExpiresInMinutes { get; set; }
    public string? DevOtp { get; set; }
}

public class VerifyReservationOtpRequestDto
{
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? CustomerPhone { get; set; }

    [Required]
    [MaxLength(10)]
    public string Otp { get; set; } = string.Empty;
}

public class VerifyReservationOtpResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Phone { get; set; } = string.Empty;
    public long? CustomerId { get; set; }
}

public class MyReservationsResponseDto
{
    public string? Phone { get; set; }
    public long? CustomerId { get; set; }
    public int Total { get; set; }
    public int UpcomingCount { get; set; }
    public int PastAndCancelledCount { get; set; }
    public List<ReservationResponseDto> Upcoming { get; set; } = new();
    public List<ReservationResponseDto> PastAndCancelled { get; set; } = new();
    public List<ReservationResponseDto> Items { get; set; } = new();
}

public class ModifyReservationDto
{
    public DateTime? ReservationDate { get; set; }
    public string? Date { get; set; }
    public string? ReservationTime { get; set; }
    public string? Time { get; set; }
    public DateTime? ReservationDateTime { get; set; }
    public int? GuestsCount { get; set; }
    public int? Guests { get; set; }
    public long? TableId { get; set; }
    public string? Preference { get; set; }
    public string? SeatingPreference { get; set; }
    public string? TablePreference { get; set; }
    public string? Notes { get; set; }
    public string? SpecialRequests { get; set; }
}

public class ReservationModificationSummaryDto
{
    public string PreviousDate { get; set; } = string.Empty;
    public string PreviousTime { get; set; } = string.Empty;
    public int PreviousGuestsCount { get; set; }
    public long? PreviousTableId { get; set; }
    public decimal PreviousEstimatedAmount { get; set; }
    public decimal NewEstimatedAmount { get; set; }
    public decimal PreviousAdvanceAmount { get; set; }
    public decimal NewAdvanceAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal AdditionalPaymentRequired { get; set; }
    public decimal RefundDue { get; set; }
    public string? PaymentDeltaMessage { get; set; }
}

public class ModifyReservationResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public ReservationResponseDto Reservation { get; set; } = new();
    public ReservationModificationSummaryDto ModificationSummary { get; set; } = new();
}

public class CancelReservationDto
{
    [MaxLength(255)]
    public string? Reason { get; set; }

    [MaxLength(255)]
    public string? CancellationReason { get; set; }
}

public class CancelReservationResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long ReservationId { get; set; }
    public string ReservationNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "CANCELLED";
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal RefundPercentage { get; set; }
    public string RefundStatus { get; set; } = "NONE";
    public string? RefundReference { get; set; }
    public string RefundMessage { get; set; } = string.Empty;
    public double HoursUntilReservation { get; set; }
    public bool TableReleased { get; set; }
    public DateTime CancelledAt { get; set; }
    public ReservationResponseDto Reservation { get; set; } = new();
}
