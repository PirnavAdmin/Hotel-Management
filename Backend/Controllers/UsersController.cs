using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly SpService _spService;
    private readonly AppDbContext _context;
    private readonly LoginManagementService _loginManagementService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        SpService spService,
        AppDbContext context,
        LoginManagementService loginManagementService,
        ILogger<UsersController> logger)
    {
        _spService = spService;
        _context = context;
        _loginManagementService = loginManagementService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            _logger.LogInformation("Fetching all users via SP.");
            var users = await _spService.ExecuteQueryAsync("sp_GetUsers", MapUserDtoFromReader);

            return Ok(new
            {
                success = true,
                message = "Users retrieved successfully.",
                count = users.Count,
                data = users
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching users.");
            return StatusCode(500, new { success = false, message = "An error occurred while processing your request." });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        try
        {
            _logger.LogInformation("Fetching user by identifier {UserId} via SP.", id);
            var users = await _spService.ExecuteQueryAsync("sp_GetUserByIdentifier", MapUserDtoFromReader, new Dictionary<string, object?> { { "p_identifier", id } });

            if (users.Count == 0)
            {
                _logger.LogWarning("User {UserId} not found.", id);
                return NotFound(new { success = false, message = $"User with identifier '{id}' not found." });
            }

            return Ok(new
            {
                success = true,
                message = "User retrieved successfully.",
                data = users[0]
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching user {UserId}", id);
            return StatusCode(500, new { success = false, message = "An error occurred while fetching the user." });
        }
    }

    [HttpPut("{id}/password")]
    public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Invalid input data.", errors = ModelState });
        }

        try
        {
            _logger.LogInformation("Changing password for user {UserId} via SP.", id);
            var users = await _spService.ExecuteQueryAsync("sp_GetUserByIdentifier", MapUserFromReader, new Dictionary<string, object?> { { "p_identifier", id } });

            if (users.Count == 0)
            {
                _logger.LogWarning("User {UserId} not found for password change.", id);
                return NotFound(new { success = false, message = $"User with identifier '{id}' not found." });
            }

            var user = users[0];
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            var parameters = new Dictionary<string, object?>
            {
                { "p_user_id", user.UserId },
                { "p_password", request.NewPassword },
                { "p_password_hash", passwordHash }
            };

            await _spService.ExecuteNonQueryAsync("sp_UpdateUserPassword", parameters);

            _logger.LogInformation("Password updated successfully for user {UserId}", id);
            return Ok(new { success = true, message = "Password updated successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating password for user {UserId}", id);
            return StatusCode(500, new { success = false, message = "An error occurred while updating the password." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        try
        {
            _logger.LogInformation("Deleting user {UserId} via SP.", id);
            var users = await _spService.ExecuteQueryAsync("sp_GetUserByIdentifier", MapUserFromReader, new Dictionary<string, object?> { { "p_identifier", id } });

            if (users.Count == 0)
            {
                _logger.LogWarning("User {UserId} not found for deletion.", id);
                return NotFound(new { success = false, message = $"User with identifier '{id}' not found." });
            }

            var user = users[0];
            await _spService.ExecuteNonQueryAsync("sp_DeleteUser", new Dictionary<string, object?> { { "p_user_id", user.UserId } });

            _logger.LogInformation("User {UserId} soft-deleted successfully.", id);
            return Ok(new { success = true, message = "User deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting user {UserId}", id);
            return StatusCode(500, new { success = false, message = "An error occurred while deleting the user." });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserApiRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { success = false, message = "Username and password are required." });
        }

        var dto = new CreateLoginDto
        {
            UserName = request.Username.Trim(),
            FullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName.Trim() : (!string.IsNullOrWhiteSpace(request.Name) ? request.Name.Trim() : request.Username.Trim()),
            Email = request.Email?.Trim(),
            Phone = !string.IsNullOrWhiteSpace(request.Phone) ? request.Phone.Trim() : (request.PhoneNumber?.Trim() ?? string.Empty),
            Password = request.Password,
            AccountRole = !string.IsNullOrWhiteSpace(request.Role) ? request.Role.Trim() : "User POS"
        };

        var result = await _loginManagementService.CreateLoginAsync(dto);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserApiRequest request)
    {
        try
        {
            long? numericId = null;
            if (long.TryParse(id, out long parsedId)) numericId = parsedId;
            else if (Guid.TryParse(id, out Guid guid))
            {
                byte[] bytes = guid.ToByteArray();
                numericId = BitConverter.ToInt64(bytes, 0);
            }

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                (numericId.HasValue && u.UserId == numericId.Value) ||
                u.UserName == id ||
                u.Email == id);

            if (user == null)
            {
                return NotFound(new { success = false, message = $"User with identifier '{id}' not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.FullName) || !string.IsNullOrWhiteSpace(request.Name))
            {
                user.FullName = request.FullName ?? request.Name;
            }
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                user.Email = request.Email.Trim();
            }
            if (!string.IsNullOrWhiteSpace(request.Phone) || !string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                user.Phone = request.Phone ?? request.PhoneNumber;
            }
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == request.Role || r.RoleName.Contains(request.Role));
                if (role != null) user.RoleId = role.RoleId;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "User details updated successfully.", data = user });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating user {UserId}", id);
            return StatusCode(500, new { success = false, message = "An error occurred while updating the user: " + ex.Message });
        }
    }

    private static UserDto MapUserDtoFromReader(DbDataReader reader)
    {
        long userId = reader.GetInt64(reader.GetOrdinal("user_id"));
        string username = reader.GetString(reader.GetOrdinal("user_name"));
        var fnOrd = reader.GetOrdinal("full_name");
        string fullName = reader.IsDBNull(fnOrd) ? username : reader.GetString(fnOrd);
        var phoneOrd = reader.GetOrdinal("phone");
        string phone = reader.IsDBNull(phoneOrd) ? string.Empty : reader.GetString(phoneOrd);
        var rNameOrd = reader.GetOrdinal("role_name");
        string role = reader.IsDBNull(rNameOrd) ? "User" : reader.GetString(rNameOrd);

        return new UserDto
        {
            Id = LongToGuid(userId),
            Name = !string.IsNullOrWhiteSpace(fullName) ? fullName : username,
            Username = username,
            Email = reader.GetString(reader.GetOrdinal("email")),
            Phone = phone,
            Role = role,
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }

    private static User MapUserFromReader(DbDataReader reader)
    {
        return new User
        {
            UserId = reader.GetInt64(reader.GetOrdinal("user_id")),
            RoleId = reader.GetInt64(reader.GetOrdinal("role_id")),
            UserName = reader.GetString(reader.GetOrdinal("user_name")),
            Email = reader.GetString(reader.GetOrdinal("email")),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active"))
        };
    }

    private static Guid LongToGuid(long value)
    {
        byte[] bytes = new byte[16];
        BitConverter.GetBytes(value).CopyTo(bytes, 0);
        return new Guid(bytes);
    }
}

public class CreateUserApiRequest
{
    public string? Username { get; set; }
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Password { get; set; }
    public string? Role { get; set; }
}

public class UpdateUserApiRequest
{
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
}
