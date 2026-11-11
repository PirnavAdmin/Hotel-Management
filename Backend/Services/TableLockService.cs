using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using HMS.DTOs;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class TableLockService : ITableLockService
{
    private readonly ConcurrentDictionary<string, TableLockDto> _locks = new();
    private readonly ILogger<TableLockService> _logger;
    private const long LockTimeoutMs = 5 * 60 * 1000; // 5 minutes

    public TableLockService(ILogger<TableLockService> logger)
    {
        _logger = logger;
    }

    public AcquireLockResponseDto AcquireLock(string tableId, TableLockDto dto)
    {
        var key = tableId.Trim();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // Clean expired
        if (_locks.TryGetValue(key, out var existing))
        {
            if (now - existing.Timestamp >= LockTimeoutMs)
            {
                _locks.TryRemove(key, out _);
                existing = null;
            }
        }

        if (existing != null && !string.Equals(existing.UserId, dto.UserId, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Table {TableId} lock rejected for {User}; held by {ExistingUser}", key, dto.Username, existing.ServerName);
            return new AcquireLockResponseDto
            {
                Success = false,
                Message = $"Table is currently in use by {existing.ServerName}.",
                LockedBy = existing
            };
        }

        var lockInfo = new TableLockDto
        {
            TableId = key,
            UserId = dto.UserId,
            Username = dto.Username,
            ServerName = string.IsNullOrWhiteSpace(dto.ServerName) ? dto.Username : dto.ServerName,
            Timestamp = now
        };

        _locks[key] = lockInfo;
        _logger.LogInformation("Table {TableId} locked by {User} ({ServerName})", key, dto.Username, dto.ServerName);

        return new AcquireLockResponseDto
        {
            Success = true,
            Message = "Table lock acquired successfully.",
            LockedBy = lockInfo
        };
    }

    public bool ReleaseLock(string tableId, string? userId = null)
    {
        var key = tableId.Trim();
        if (!_locks.TryGetValue(key, out var existing))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(existing.UserId, userId, StringComparison.OrdinalIgnoreCase))
        {
            // Do not release if held by someone else, unless admin
            if (!string.Equals(userId, "admin", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        var removed = _locks.TryRemove(key, out _);
        if (removed)
        {
            _logger.LogInformation("Table {TableId} lock released", key);
        }
        return removed;
    }

    public void ReleaseAllLocksForUser(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;

        foreach (var pair in _locks)
        {
            if (string.Equals(pair.Value.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                _locks.TryRemove(pair.Key, out _);
                _logger.LogInformation("Released table {TableId} lock on user {UserId} logout", pair.Key, userId);
            }
        }
    }

    public Dictionary<string, TableLockDto> GetAllActiveLocks()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var result = new Dictionary<string, TableLockDto>();

        foreach (var pair in _locks)
        {
            if (now - pair.Value.Timestamp < LockTimeoutMs)
            {
                result[pair.Key] = pair.Value;
            }
            else
            {
                _locks.TryRemove(pair.Key, out _);
            }
        }

        return result;
    }

    public void SyncLocks(Dictionary<string, TableLockDto> locks)
    {
        if (locks == null) return;
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        foreach (var pair in locks)
        {
            if (pair.Value != null && now - pair.Value.Timestamp < LockTimeoutMs)
            {
                _locks[pair.Key] = pair.Value;
            }
        }
    }
}
