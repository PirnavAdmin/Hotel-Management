using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/roles")]
[AllowAnonymous]
public class RolesController : ControllerBase
{
    private readonly SpService _spService;

    public RolesController(SpService spService)
    {
        _spService = spService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllRoles()
    {
        var roles = await _spService.ExecuteQueryAsync("sp_GetAllRoles", MapRoleDtoFromReader);

        return Ok(new
        {
            success = true,
            message = "Roles retrieved successfully.",
            data = roles
        });
    }

    [HttpGet("{roleId:long}")]
    public async Task<IActionResult> GetRoleById(long roleId)
    {
        var parameters = new Dictionary<string, object?> { { "p_role_id", roleId } };
        var roles = await _spService.ExecuteQueryAsync("sp_GetRoleById", MapRoleDtoFromReader, parameters);

        if (roles.Count == 0)
        {
            return NotFound(new
            {
                success = false,
                message = "Role not found."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Role retrieved successfully.",
            data = roles[0]
        });
    }

    private static RoleResponseDto MapRoleDtoFromReader(DbDataReader reader)
    {
        var descOrd = reader.GetOrdinal("description");

        return new RoleResponseDto
        {
            RoleId = reader.GetInt64(reader.GetOrdinal("role_id")),
            RoleName = reader.GetString(reader.GetOrdinal("role_name")),
            Description = reader.IsDBNull(descOrd) ? null : reader.GetString(descOrd),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active"))
        };
    }
}