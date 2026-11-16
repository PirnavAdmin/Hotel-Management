using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/realtime")]
[Route("api/realtime")]
[Tags("Real-Time Synchronization")]
public class RealtimeController : ControllerBase
{
    private readonly IRealtimeSyncService _syncService;
    private readonly ILogger<RealtimeController> _logger;

    public RealtimeController(IRealtimeSyncService syncService, ILogger<RealtimeController> logger)
    {
        _syncService = syncService;
        _logger = logger;
    }

    /// <summary>
    /// Returns real-time communication system status, active connection counts, and buffer diagnostics.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var diagnostics = _syncService.GetDiagnostics();
        return Ok(new
        {
            success = true,
            status = "healthy",
            protocol = "WebSocket (SignalR) + Server-Sent Events (SSE)",
            activeConnections = _syncService.ActiveConnectionCount,
            diagnostics = diagnostics,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Recovers missed real-time events after network disconnection or client restart.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("missed-events")]
    public IActionResult GetMissedEvents(
        [FromQuery] long? branchId = 1,
        [FromQuery] string? lastEventId = null,
        [FromQuery] string? sinceEventId = null,
        [FromQuery] int limit = 50)
    {
        var effectiveLastEventId = !string.IsNullOrWhiteSpace(lastEventId) ? lastEventId : sinceEventId;
        var missed = _syncService.GetMissedEvents(branchId, effectiveLastEventId, limit);
        return Ok(new
        {
            success = true,
            branchId = branchId,
            lastEventId = effectiveLastEventId,
            count = missed.Count,
            events = missed,
            data = missed
        });
    }

    /// <summary>
    /// Retrieves recent real-time events for inspection or debugging.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("recent-events")]
    public IActionResult GetRecentEvents(
        [FromQuery] long? branchId = 1,
        [FromQuery] int limit = 50)
    {
        var recent = _syncService.GetRecentEvents(branchId, limit);
        return Ok(new
        {
            success = true,
            branchId = branchId,
            count = recent.Count,
            events = recent,
            data = recent
        });
    }

    /// <summary>
    /// Heartbeat ping endpoint to verify real-time API availability.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("ping")]
    [HttpPost("ping")]
    public IActionResult Ping()
    {
        return Ok(new
        {
            success = true,
            message = "pong",
            timestamp = DateTime.UtcNow
        });
    }
}
