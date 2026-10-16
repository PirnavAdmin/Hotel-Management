namespace HMS.DTOs;

public class RoleResponseDto
{
    public long RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}