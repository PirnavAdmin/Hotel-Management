using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class SseBroadcaster : ISseBroadcaster
{
    private record SseClientRegistration(Channel<string> Channel, long? AuthorizedBranchId);
    private readonly ConcurrentDictionary<Guid, SseClientRegistration> _clients = new();
    private readonly ILogger<SseBroadcaster> _logger;

    public SseBroadcaster(ILogger<SseBroadcaster> logger)
    {
        _logger = logger;
    }

    public int ActiveClientCount => _clients.Count;

    public async Task BroadcastAsync(string eventType, object? payload, long? branchId = null)
    {
        try
        {
            var envelope = new
            {
                type = eventType,
                payload = payload,
                branchId = branchId,
                timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(envelope);
            await BroadcastRawAsync($"data: {json}\n\n", branchId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serializing SSE payload for event {EventType}", eventType);
        }
    }

    public async Task BroadcastRawAsync(string sseData, long? branchId = null)
    {
        foreach (var (id, reg) in _clients)
        {
            // If event has branch scoping, do not send to clients authorized for a different branch
            if (branchId.HasValue && branchId.Value > 0 && reg.AuthorizedBranchId.HasValue && reg.AuthorizedBranchId.Value != branchId.Value)
            {
                continue;
            }

            try
            {
                await reg.Channel.Writer.WriteAsync(sseData);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write SSE to client {ClientId}; dropping", id);
                _clients.TryRemove(id, out _);
            }
        }
    }

    public async IAsyncEnumerable<string> SubscribeAsync([EnumeratorCancellation] CancellationToken cancellationToken, long? authorizedBranchId = null)
    {
        var clientId = Guid.NewGuid();
        var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.DropOldest
        });

        _clients[clientId] = new SseClientRegistration(channel, authorizedBranchId);
        _logger.LogInformation("SSE Client {ClientId} connected (AuthorizedBranch: {BranchId}). Total active clients: {Count}", clientId, authorizedBranchId?.ToString() ?? "All", _clients.Count);

        try
        {
            // Initial greeting
            var connectedGreeting = JsonSerializer.Serialize(new
            {
                type = "connected",
                message = "Connected to HMS live real-time event feed.",
                clientId = clientId.ToString(),
                timestamp = DateTime.UtcNow
            });
            yield return $"data: {connectedGreeting}\n\n";

            while (!cancellationToken.IsCancellationRequested)
            {
                string message;
                try
                {
                    message = await channel.Reader.ReadAsync(cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }

                yield return message;
            }
        }
        finally
        {
            _clients.TryRemove(clientId, out _);
            channel.Writer.TryComplete();
            _logger.LogInformation("SSE Client {ClientId} disconnected. Remaining active: {Count}", clientId, _clients.Count);
        }
    }
}
