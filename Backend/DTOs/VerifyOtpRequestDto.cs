using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class VerifyOtpRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Otp { get; set; } = string.Empty;
}