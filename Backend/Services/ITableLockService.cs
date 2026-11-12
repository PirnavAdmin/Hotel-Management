using System.Collections.Generic;
using HMS.DTOs;

namespace HMS.Services;

public interface ITableLockService
{
    AcquireLockResponseDto AcquireLock(string tableId, TableLockDto dto);
    bool ReleaseLock(string tableId, string? userId = null);
    void ReleaseAllLocksForUser(string userId);
    Dictionary<string, TableLockDto> GetAllActiveLocks();
    void SyncLocks(Dictionary<string, TableLockDto> locks);
}
