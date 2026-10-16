using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateLoginDto
{
    private string _accountRole = "User POS";
    private string _displayName = string.Empty;
    private string _userName = string.Empty;
    private string _phone = string.Empty;
    private string _email = string.Empty;
    private string _password = string.Empty;

    public string AccountRole
    {
        get => !string.IsNullOrWhiteSpace(_accountRole) ? _accountRole : "User POS";
        set => _accountRole = value?.Trim() ?? "User POS";
    }

    public string? Role
    {
        get => AccountRole;
        set { if (!string.IsNullOrWhiteSpace(value)) AccountRole = value; }
    }

    [Required(ErrorMessage = "Display Name is required.")]
    [MaxLength(100)]
    public string DisplayName
    {
        get => _displayName;
        set => _displayName = value?.Trim() ?? string.Empty;
    }

    public string? FullName
    {
        get => DisplayName;
        set { if (!string.IsNullOrWhiteSpace(value)) DisplayName = value; }
    }

    [Required(ErrorMessage = "Username is required.")]
    [MaxLength(60)]
    public string UserName
    {
        get => _userName;
        set => _userName = value?.Trim() ?? string.Empty;
    }

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(4, ErrorMessage = "Password must be at least 4 characters.")]
    public string Password
    {
        get => _password;
        set => _password = value ?? string.Empty;
    }

    public string? Email
    {
        get => _email;
        set => _email = value?.Trim() ?? string.Empty;
    }

    public string? Phone
    {
        get => _phone;
        set => _phone = value?.Trim() ?? string.Empty;
    }

    public string? MobileNumber
    {
        get => Phone;
        set { if (!string.IsNullOrWhiteSpace(value)) Phone = value; }
    }
}

public class UserAccountDto
{
    public long UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public long RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastLogin { get; set; }
}

public class LoginManagementSummaryDto
{
    public int PosUsersCount { get; set; }

    public int KotUsersCount { get; set; }

    public int AdminsCount { get; set; }

    public List<UserAccountDto> PosUsers { get; set; } = new();

    public List<UserAccountDto> KotUsers { get; set; } = new();

    public List<UserAccountDto> Admins { get; set; } = new();
}
