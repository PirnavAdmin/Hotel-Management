using System;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/staff")]
[Route("api/Staff")]
public class StaffController : ControllerBase
{
    private readonly StaffService _staffService;
    private readonly ILogger<StaffController> _logger;

    public StaffController(StaffService staffService, ILogger<StaffController> logger)
    {
        _staffService = staffService;
        _logger = logger;
    }

    // GET /api/v1/staff
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetStaffList()
    {
        try
        {
            var staffList = await _staffService.GetStaffListAsync();
            return Ok(new
            {
                success = true,
                message = "Staff members retrieved successfully.",
                count = staffList.Count,
                staff = staffList,
                data = staffList
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve staff list.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve staff list.", error = ex.Message });
        }
    }

    // GET /api/v1/staff/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetStaffById(long id)
    {
        try
        {
            var staff = await _staffService.GetStaffByIdAsync(id);
            if (staff == null)
            {
                return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
            }
            return Ok(new { success = true, data = staff });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve staff member by ID: {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to retrieve staff member.", error = ex.Message });
        }
    }

    // POST /api/v1/staff
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state on CreateStaff: {Errors}", ModelState);
            return BadRequest(new { success = false, message = "Invalid staff data.", errors = ModelState });
        }

        try
        {
            _logger.LogInformation("Creating staff person: {FullName}, Role: {RoleTitle}", dto.FullName, dto.RoleTitle);
            var created = await _staffService.CreateStaffAsync(dto);
            _logger.LogInformation("Staff person successfully created with ID: {StaffId}", created.StaffId);

            return CreatedAtAction(nameof(GetStaffById), new { id = created.StaffId }, new
            {
                success = true,
                message = "Staff member added successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create staff person: {FullName}", dto.FullName);
            return StatusCode(500, new { success = false, message = "Failed to create staff person.", error = ex.Message });
        }
    }

    // PUT /api/v1/staff/{id}
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateStaff(long id, [FromBody] UpdateStaffDto dto)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state on UpdateStaff for ID {Id}: {Errors}", id, ModelState);
            return BadRequest(new { success = false, message = "Invalid staff data.", errors = ModelState });
        }

        try
        {
            _logger.LogInformation("Updating staff person ID: {Id}, FullName: {FullName}", id, dto.FullName);
            var updated = await _staffService.UpdateStaffAsync(id, dto);
            if (updated == null)
            {
                _logger.LogWarning("Staff person ID {Id} not found for update.", id);
                return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
            }
            return Ok(new
            {
                success = true,
                message = "Staff member updated successfully.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update staff person ID: {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to update staff person.", error = ex.Message });
        }
    }

    // DELETE /api/v1/staff/{id}
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteStaff(long id)
    {
        try
        {
            _logger.LogInformation("Deleting staff person ID: {Id}", id);
            var success = await _staffService.DeleteStaffAsync(id);
            if (!success)
            {
                _logger.LogWarning("Staff person ID {Id} not found for delete.", id);
                return NotFound(new { success = false, message = $"Staff member with ID {id} not found." });
            }
            return Ok(new { success = true, message = "Staff member removed successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete staff person ID: {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete staff person.", error = ex.Message });
        }
    }
}
