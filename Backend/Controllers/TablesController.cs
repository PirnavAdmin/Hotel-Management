using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/tables")]
[Route("api/Tables")]
public class TablesController : ControllerBase
{
    private readonly TableService _tableService;

    public TablesController(TableService tableService)
    {
        _tableService = tableService;
    }

    // GET /api/v1/tables
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetTables([FromQuery] string? section, [FromQuery] string? status)
    {
        var tables = await _tableService.GetTablesAsync(section, status);
        return Ok(new
        {
            success = true,
            message = "Tables retrieved successfully.",
            count = tables.Count,
            tables = tables,
            data = tables
        });
    }

    // GET /api/v1/tables/summary
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetTableSummary()
    {
        var summary = await _tableService.GetTableSummaryAsync();
        return Ok(new
        {
            success = true,
            data = summary
        });
    }

    // GET /api/v1/tables/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTableById(long id)
    {
        var table = await _tableService.GetTableByIdAsync(id);
        if (table == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }
        return Ok(new { success = true, data = table });
    }

    // POST /api/v1/tables
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateTable([FromBody] CreateTableDto dto)
    {
        var created = await _tableService.CreateTableAsync(dto);
        return CreatedAtAction(nameof(GetTableById), new { id = created.TableId }, new
        {
            success = true,
            message = "Table added successfully.",
            data = created
        });
    }

    // PUT /api/v1/tables/{id}
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateTable(long id, [FromBody] UpdateTableDto dto)
    {
        var updated = await _tableService.UpdateTableAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }
        return Ok(new
        {
            success = true,
            message = "Table updated successfully.",
            data = updated
        });
    }

    // DELETE /api/v1/tables/{id}
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteTable(long id)
    {
        var success = await _tableService.DeleteTableAsync(id);
        if (!success)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }
        return Ok(new { success = true, message = "Table removed successfully." });
    }

    // POST /api/Tables/transfer or /api/v1/tables/transfer
    [HttpPost("transfer")]
    public async Task<IActionResult> TransferTable([FromBody] TransferTableRequestDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Invalid input data.", errors = ModelState });
        }

        var result = await _tableService.TransferTableAsync(dto.SourceTableId, dto.TargetTableId);
        if (!result.Success)
        {
            return BadRequest(new { success = false, message = result.Message });
        }

        return Ok(new { success = true, message = result.Message });
    }

    // POST /api/v1/tables/{id}/vacate OR /api/Tables/{id}/vacate
    [HttpPost("{id:long}/vacate")]
    public async Task<IActionResult> VacateTable(long id)
    {
        var existing = await _tableService.GetTableByIdAsync(id);
        if (existing == null)
        {
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }

        var updated = await _tableService.UpdateTableAsync(id, new UpdateTableDto
        {
            TableName = existing.TableName,
            SectionArea = existing.SectionArea,
            CapacityChairs = existing.CapacityChairs,
            OccupiedChairs = 0,
            Status = "VACANT",
            AssignedServerId = existing.AssignedServerId
        });

        return Ok(new
        {
            success = true,
            message = $"Table {existing.TableName} vacated successfully.",
            data = updated
        });
    }
}
