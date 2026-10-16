namespace HMS.DTOs;

public class RegisterResponseDto
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public UserRegisterDto? User { get; set; }
}

public class UserRegisterDto
{
    public long UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public long RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public long? BranchId { get; set; }

    public bool IsActive { get; set; }
}