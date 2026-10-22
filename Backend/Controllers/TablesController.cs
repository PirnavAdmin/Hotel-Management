using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/tables")]
[Route("api/Tables")]
public class TablesController : ControllerBase
{
    private readonly TableService _tableService;
    private readonly ILogger<TablesController> _logger;

    public TablesController(TableService tableService, ILogger<TablesController> logger)
    {
        _tableService = tableService;
        _logger = logger;
    }

    // GET /api/v1/tables?branchId=1&section=Main+Hall&status=available
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetTables([FromQuery] string? section, [FromQuery] string? status, [FromQuery] long? branchId)
    {
        _logger.LogInformation("GET /api/v1/tables requested: branchId={BranchId}, section={Section}, status={Status}", branchId, section, status);
        var tables = await _tableService.GetTablesAsync(section, status, branchId);
        _logger.LogInformation("GET /api/v1/tables returning {Count} tables", tables.Count);

        return Ok(new
        {
            success = true,
            message = "Tables retrieved successfully.",
            count = tables.Count,
            tables = tables,
            data = tables
        });
    }

    // GET /api/v1/tables/summary?branchId=1
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetTableSummary([FromQuery] long? branchId)
    {
        _logger.LogInformation("GET /api/v1/tables/summary requested: branchId={BranchId}", branchId);
        var summary = await _tableService.GetTableSummaryAsync(branchId);
        return Ok(new
        {
            success = true,
            data = summary
        });
    }

    // GET /api/v1/tables/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTableById(long id, [FromQuery] long? branchId)
    {
        _logger.LogInformation("GET /api/v1/tables/{Id} requested: branchId={BranchId}", id, branchId);
        var table = await _tableService.GetTableByIdAsync(id, branchId);
        if (table == null)
        {
            _logger.LogWarning("GET /api/v1/tables/{Id} not found", id);
            return NotFound(new { success = false, message = $"Table with ID {id} not found." });
        }
        return Ok(new { success = true, data = table });
    }

    // POST /api/v1/tables
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateTable([FromBody] CreateTableDto dto)
    {
        _logger.LogInformation("POST /api/v1/tables received request: TableNumber='{TableNumber}', TableName='{TableName}', Name='{Name}', BranchId={BranchId}, Capacity={Capacity}",
            dto.TableNumber, dto.TableName, dto.Name, dto.BranchId, dto.CapacityChairs);

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("POST /api/v1/tables validation failed: {@Errors}", ModelState);
            return BadRequest(new { success = false, message = "Invalid table data.", errors = ModelState });
        }

        try
        {
            var created = await _tableService.CreateTableAsync(dto);

            _logger.LogInformation("POST /api/v1/tables completed successfully: TableId={TableId}, TableNumber='{TableNumber}', TableName='{TableName}', BranchId={BranchId}",
                created.TableId, created.TableNumber, created.TableName, created.BranchId);

            return CreatedAtAction(nameof(GetTableById), new { id = created.TableId }, new
            {
                success = true,
                message = "Table added successfully.",
                data = created
            });
        }
        catch (DuplicateTableException ex)
        {
            _logger.LogWarning("POST /api/v1/tables duplicate conflict: {Message}", ex.Message);
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("POST /api/v1/tables bad request: {Message}", ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "POST /api/v1/tables unexpected error occurred.");
            return StatusCode(500, new { success = false, message = "An internal server error occurred while creating the table." });
        }
    }

    // PUT /api/v1/tables/{id}
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateTable(long id, [FromBody] UpdateTableDto dto)
    {
        _logger.LogInformation("PUT /api/v1/tables/{Id} received request: TableNumber='{TableNumber}', Status='{Status}'", id, dto.TableNumber, dto.Status);

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/v1/tables/{Id} validation failed: {@Errors}", id, ModelState);
            return BadRequest(new { success = false, message = "Invalid table data.", errors = ModelState });
        }

        try
        {
            var updated = await _tableService.UpdateTableAsync(id, dto);
            if (updated == null)
            {
                _logger.LogWarning("PUT /api/v1/tables/{Id} not found", id);
                return NotFound(new { success = false, message = $"Table with ID {id} not found." });
            }
            return Ok(new
            {
                success = true,
                message = "Table updated successfully.",
                data = updated
            });
        }
        catch (DuplicateTableException ex)
        {
            _logger.LogWarning("PUT /api/v1/tables/{Id} duplicate conflict: {Message}", id, ex.Message);
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("PUT /api/v1/tables/{Id} bad request: {Message}", id, ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PUT /api/v1/tables/{Id} unexpected error occurred.", id);
            return StatusCode(500, new { success = false, message = "An internal server error occurred while updating the table." });
        }
    }

    // PATCH /api/v1/tables/{id}/status OR PUT /api/v1/tables/{id}/status
    [AllowAnonymous]
    [HttpPatch("{id}/status")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTableStatus(string id, [FromBody] UpdateTableStatusDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        var table = await _tableService.GetTableByIdOrIdentifierAsync(id);
        if (table == null)
        {
            return NotFound(new { success = false, message = $"Table with identifier '{id}' not found." });
        }

        _logger.LogInformation("Updating table {Id} ({TableName}) status to {Status}", table.TableId, table.TableName, dto.Status);
        var updated = await _tableService.UpdateTableStatusAsync(table.TableId, dto.Status);
        return Ok(new
        {
            success = true,
            message = "Table status updated successfully.",
            data = updated
        });
    }

    // DELETE /api/v1/tables/{id} or /api/Tables/{id}
    [AllowAnonymous]
    [HttpDelete("{id}")]
    [HttpDelete("/api/Tables/{id}")]
    public async Task<IActionResult> DeleteTable(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Table ID or identifier is required." });
        }

        _logger.LogInformation("DELETE /api/v1/tables/{Id} initiated", id);
        var success = await _tableService.DeleteTableByIdOrIdentifierAsync(id);
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

        _logger.LogInformation("Transferring table from {Source} to {Target}", dto.SourceTableId, dto.TargetTableId);
        var result = await _tableService.TransferTableAsync(dto.SourceTableId, dto.TargetTableId);
        if (!result.Success)
        {
            return BadRequest(new { success = false, message = result.Message });
        }

        return Ok(new { success = true, message = result.Message });
    }

    // POST /api/v1/tables/{id}/vacate OR /api/Tables/{id}/vacate
    [HttpPost("{id}/vacate")]
    public async Task<IActionResult> VacateTable(string id)
    {
        var existing = await _tableService.GetTableByIdOrIdentifierAsync(id);
        if (existing == null)
        {
            return NotFound(new { success = false, message = $"Table with identifier '{id}' not found." });
        }

        _logger.LogInformation("Vacating table {Id} ({TableName})", existing.TableId, existing.TableName);
        var updated = await _tableService.UpdateTableStatusAsync(existing.TableId, "available");

        return Ok(new
        {
            success = true,
            message = $"Table {existing.TableName} vacated successfully.",
            data = updated
        });
    }
}
