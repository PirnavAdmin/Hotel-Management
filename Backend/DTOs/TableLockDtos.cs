using System;

namespace HMS.DTOs;

public class TableLockDto
{
    public string TableId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

public class AcquireLockResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public TableLockDto? LockedBy { get; set; }
}
