using System;
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
        get => !string.IsNullOrWhiteSpace(_phone) ? _phone : (CustomerPhone ?? string.Empty);
        set => _phone = value;
    }
    public string? CustomerPhone { get; set; }

    [Required]
    public long TableId { get; set; }

    public long? BranchId { get; set; } = 1;

    private int _guestsCount = 2;
    public int GuestsCount
    {
        get => _guestsCount > 0 ? _guestsCount : (Guests > 0 ? Guests : 2);
        set => _guestsCount = value;
    }
    public int Guests { get; set; }

    public DateTime? ReservationDate { get; set; }

    public string? ReservationTime { get; set; }

    public DateTime? ReservationDateTime { get; set; }

    public string Status { get; set; } = "booked";

    public string? Notes { get; set; }
}

public class UpdateReservationStatusDto
{
    [Required]
    public string Status { get; set; } = "confirmed";
}

public class ReservationResponseDto
{
    public long ReservationId { get; set; }
    public long? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Phone => CustomerPhone;
    public long? TableId { get; set; }
    public string? TableNumber { get; set; }
    public string? Location { get; set; }
    public long BranchId { get; set; } = 1;
    public string ReservationDate { get; set; } = string.Empty;
    public string ReservationTime { get; set; } = string.Empty;
    public int GuestsCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
