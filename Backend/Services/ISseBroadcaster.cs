using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace HMS.Services;

public interface ISseBroadcaster
{
    Task BroadcastAsync(string eventType, object? payload);
    Task BroadcastRawAsync(string sseData);
    IAsyncEnumerable<string> SubscribeAsync(CancellationToken cancellationToken);
    int ActiveClientCount { get; }
}
