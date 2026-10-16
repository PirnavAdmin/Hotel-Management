using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;

namespace HMS.Services;

public class StaffService
{
    private readonly SpService _spService;

    public StaffService(SpService spService)
    {
        _spService = spService;
    }

    public async Task<List<StaffResponseDto>> GetStaffListAsync()
    {
        return await _spService.ExecuteQueryAsync("sp_GetStaffList", MapFromReader);
    }

    public async Task<StaffResponseDto?> GetStaffByIdAsync(long id)
    {
        var parameters = new Dictionary<string, object?> { { "p_staff_id", id } };
        var list = await _spService.ExecuteQueryAsync("sp_GetStaffById", MapFromReader, parameters);
        return list.Count > 0 ? list[0] : null;
    }

    public async Task<StaffResponseDto> CreateStaffAsync(CreateStaffDto dto)
    {
        var parameters = new Dictionary<string, object?>
        {
            { "p_full_name", dto.FullName.Trim() },
            { "p_role_title", dto.RoleTitle.Trim() },
            { "p_phone", dto.Phone.Trim() },
            { "p_shift", dto.Shift.Trim() },
            { "p_is_active", dto.IsActive ? 1 : 0 }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreateStaff", parameters);
        return (await GetStaffByIdAsync(id))!;
    }

    public async Task<StaffResponseDto?> UpdateStaffAsync(long id, UpdateStaffDto dto)
    {
        var existing = await GetStaffByIdAsync(id);
        if (existing == null) return null;

        var parameters = new Dictionary<string, object?>
        {
            { "p_staff_id", id },
            { "p_full_name", dto.FullName.Trim() },
            { "p_role_title", dto.RoleTitle.Trim() },
            { "p_phone", dto.Phone.Trim() },
            { "p_shift", dto.Shift.Trim() },
            { "p_is_active", dto.IsActive ? 1 : 0 }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateStaff", parameters);
        return await GetStaffByIdAsync(id);
    }

    public async Task<bool> DeleteStaffAsync(long id)
    {
        var existing = await GetStaffByIdAsync(id);
        if (existing == null) return false;

        var parameters = new Dictionary<string, object?> { { "p_staff_id", id } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteStaff", parameters);
        return true;
    }

    private static StaffResponseDto MapFromReader(DbDataReader reader)
    {
        var fullName = reader.GetString(reader.GetOrdinal("full_name"));
        var nameParts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var initial = nameParts.Length > 0 ? nameParts[0][0].ToString().ToUpper() : "S";

        return new StaffResponseDto
        {
            StaffId = reader.GetInt64(reader.GetOrdinal("staff_id")),
            FullName = fullName,
            RoleTitle = reader.GetString(reader.GetOrdinal("role_title")),
            Phone = reader.GetString(reader.GetOrdinal("phone")),
            Shift = reader.GetString(reader.GetOrdinal("shift")),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
            AssignedTablesCount = Convert.ToInt32(reader.GetValue(reader.GetOrdinal("assigned_tables_count"))),
            AvatarInitial = initial,
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }
}
