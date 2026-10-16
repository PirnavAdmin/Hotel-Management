using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class SendOtpRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Purpose { get; set; }
}
