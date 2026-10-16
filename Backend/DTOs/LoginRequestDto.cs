using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class LoginRequestDto
{
    private string _usernameOrEmail = string.Empty;

    public string UsernameOrEmail
    {
        get => !string.IsNullOrWhiteSpace(_usernameOrEmail) ? _usernameOrEmail : (!string.IsNullOrWhiteSpace(Username) ? Username : (Email ?? string.Empty));
        set => _usernameOrEmail = value;
    }

    /// <summary>
    /// Property alias for UsernameOrEmail (supports frontend clients sending 'username').
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// Property alias for UsernameOrEmail (supports frontend clients sending 'email').
    /// </summary>
    public string? Email { get; set; }

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}