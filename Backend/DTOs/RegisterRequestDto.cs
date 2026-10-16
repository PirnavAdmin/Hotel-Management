using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class RegisterRequestDto
{
    private string _fullName = string.Empty;
    private string _userName = string.Empty;
    private string _phone = string.Empty;
    private string _email = string.Empty;
    private string _password = string.Empty;
    private string _confirmPassword = string.Empty;

    [Required(ErrorMessage = "Full Name is required.")]
    [MaxLength(100)]
    public string FullName
    {
        get => _fullName;
        set => _fullName = value?.Trim() ?? string.Empty;
    }

    [Required(ErrorMessage = "Username is required.")]
    [MaxLength(60)]
    public string UserName
    {
        get => _userName;
        set => _userName = value?.Trim() ?? string.Empty;
    }

    public string Phone
    {
        get => _phone;
        set
        {
            if (string.IsNullOrWhiteSpace(value)) _phone = string.Empty;
            else
            {
                var digits = System.Text.RegularExpressions.Regex.Replace(value, @"[^\d]", "");
                _phone = !string.IsNullOrEmpty(digits) ? digits : value.Trim();
            }
        }
    }

    public string? MobileNumber
    {
        get => Phone;
        set { if (!string.IsNullOrWhiteSpace(value)) Phone = value; }
    }

    [Required(ErrorMessage = "Email Address is required.")]
    [MaxLength(100)]
    public string Email
    {
        get => _email;
        set
        {
            if (string.IsNullOrWhiteSpace(value)) _email = string.Empty;
            else
            {
                var val = value.Trim();
                if (val.EndsWith(".")) val += "com";
                _email = val;
            }
        }
    }

    public string? Otp { get; set; }

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(4, ErrorMessage = "Password must be at least 4 characters.")]
    public string Password
    {
        get => _password;
        set => _password = value ?? string.Empty;
    }

    public string ConfirmPassword
    {
        get => !string.IsNullOrEmpty(_confirmPassword) ? _confirmPassword : _password;
        set => _confirmPassword = value ?? string.Empty;
    }

    public string? Role { get; set; }

    public long? RoleId { get; set; }

    public long? BranchId { get; set; }

    [MaxLength(10)]
    public string? PinCode { get; set; }
}