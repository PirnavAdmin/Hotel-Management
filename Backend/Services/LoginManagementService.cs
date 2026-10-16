using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;

namespace HMS.Services;

public class LoginManagementService
{
    private readonly SpService _spService;

    public LoginManagementService(SpService spService)
    {
        _spService = spService;
    }

    public async Task<LoginManagementSummaryDto> GetLoginManagementSummaryAsync()
    {
        var users = await _spService.ExecuteQueryAsync("sp_GetLoginManagementSummary", MapUserFromReader);

        var posUsers = users
            .Where(u => u.Role != null && (u.Role.RoleName == "User POS" || u.Role.RoleName.Contains("POS")))
            .Select(MapToUserAccountDto)
            .ToList();

        var kotUsers = users
            .Where(u => u.Role != null && (u.Role.RoleName == "Kitchen KOT" || u.Role.RoleName.Contains("KOT")))
            .Select(MapToUserAccountDto)
            .ToList();

        var admins = users
            .Where(u => u.Role != null && u.Role.RoleName == "Admin")
            .Select(MapToUserAccountDto)
            .ToList();

        return new LoginManagementSummaryDto
        {
            PosUsersCount = posUsers.Count,
            KotUsersCount = kotUsers.Count,
            AdminsCount = admins.Count,
            PosUsers = posUsers,
            KotUsers = kotUsers,
            Admins = admins
        };
    }

    public async Task<object> CreateLoginAsync(CreateLoginDto dto)
    {
        var username = dto.UserName.Trim();
        var roleNameInput = dto.AccountRole.Trim();

        int exists = await _spService.ExecuteScalarAsync<int>("sp_CheckUsernameExists", new Dictionary<string, object?> { { "p_username", username } });
        if (exists > 0)
        {
            return new { success = false, message = "Username already exists." };
        }

        var targetRoleName = roleNameInput.Contains("POS", StringComparison.OrdinalIgnoreCase) ? "User POS" :
                             roleNameInput.Contains("KOT", StringComparison.OrdinalIgnoreCase) ? "Kitchen KOT" :
                             roleNameInput;

        var roles = await _spService.ExecuteQueryAsync("sp_GetRoleByName", MapRoleFromReader, new Dictionary<string, object?> { { "p_role_name", targetRoleName } });

        if (roles.Count == 0)
        {
            return new { success = false, message = $"Role '{dto.AccountRole}' not found or inactive." };
        }

        var role = roles[0];
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var email = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim().ToLower() : $"{username.ToLower()}@avsrfoodcourt.com";

        var parameters = new Dictionary<string, object?>
        {
            { "p_role_id", role.RoleId },
            { "p_branch_id", null },
            { "p_user_name", username },
            { "p_password", dto.Password },
            { "p_password_hash", passwordHash },
            { "p_full_name", dto.DisplayName.Trim() },
            { "p_email", email },
            { "p_phone", dto.Phone?.Trim() },
            { "p_pin_code", null }
        };

        long userId = await _spService.ExecuteScalarAsync<long>("sp_CreateUser", parameters);

        return new
        {
            success = true,
            message = $"{role.RoleName} account created successfully.",
            user = new UserAccountDto
            {
                UserId = userId,
                FullName = dto.DisplayName.Trim(),
                UserName = username,
                Email = email,
                Phone = dto.Phone?.Trim(),
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };
    }

    private static User MapUserFromReader(DbDataReader reader)
    {
        var fnOrd = reader.GetOrdinal("full_name");
        var phoneOrd = reader.GetOrdinal("phone");

        var user = new User
        {
            UserId = reader.GetInt64(reader.GetOrdinal("user_id")),
            RoleId = reader.GetInt64(reader.GetOrdinal("role_id")),
            UserName = reader.GetString(reader.GetOrdinal("user_name")),
            FullName = reader.IsDBNull(fnOrd) ? null : reader.GetString(fnOrd),
            Email = reader.GetString(reader.GetOrdinal("email")),
            Phone = reader.IsDBNull(phoneOrd) ? null : reader.GetString(phoneOrd),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            LastLogin = reader.IsDBNull(reader.GetOrdinal("last_login")) ? null : reader.GetDateTime(reader.GetOrdinal("last_login"))
        };

        try
        {
            var rNameOrd = reader.GetOrdinal("role_name");
            if (!reader.IsDBNull(rNameOrd))
            {
                user.Role = new Role
                {
                    RoleId = user.RoleId,
                    RoleName = reader.GetString(rNameOrd),
                    IsActive = true
                };
            }
        }
        catch { }

        return user;
    }

    private static Role MapRoleFromReader(DbDataReader reader)
    {
        return new Role
        {
            RoleId = reader.GetInt64(reader.GetOrdinal("role_id")),
            RoleName = reader.GetString(reader.GetOrdinal("role_name")),
            Description = reader.IsDBNull(reader.GetOrdinal("description")) ? null : reader.GetString(reader.GetOrdinal("description")),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active"))
        };
    }

    private static UserAccountDto MapToUserAccountDto(User u)
    {
        return new UserAccountDto
        {
            UserId = u.UserId,
            FullName = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : u.UserName,
            UserName = u.UserName,
            Email = u.Email,
            Phone = u.Phone,
            RoleId = u.RoleId,
            RoleName = u.Role?.RoleName ?? "User",
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt,
            LastLogin = u.LastLogin
        };
    }
}
