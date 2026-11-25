using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace HMS.Services;

public interface ISseBroadcaster
{
    Task BroadcastAsync(string eventType, object? payload, long? branchId = null);
    Task BroadcastRawAsync(string sseData, long? branchId = null);
    IAsyncEnumerable<string> SubscribeAsync(CancellationToken cancellationToken, long? authorizedBranchId = null);
    int ActiveClientCount { get; }
}
