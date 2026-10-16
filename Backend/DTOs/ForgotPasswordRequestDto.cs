using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class ForgotPasswordRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}