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
    private readonly ConcurrentDictionary<Guid, Channel<string>> _clients = new();
    private readonly ILogger<SseBroadcaster> _logger;

    public SseBroadcaster(ILogger<SseBroadcaster> logger)
    {
        _logger = logger;
    }

    public int ActiveClientCount => _clients.Count;

    public async Task BroadcastAsync(string eventType, object? payload)
    {
        try
        {
            var envelope = new
            {
                type = eventType,
                payload = payload,
                timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(envelope);
            await BroadcastRawAsync($"data: {json}\n\n");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serializing SSE payload for event {EventType}", eventType);
        }
    }

    public async Task BroadcastRawAsync(string sseData)
    {
        foreach (var (id, channel) in _clients)
        {
            try
            {
                await channel.Writer.WriteAsync(sseData);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write SSE to client {ClientId}; dropping", id);
                _clients.TryRemove(id, out _);
            }
        }
    }

    public async IAsyncEnumerable<string> SubscribeAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var clientId = Guid.NewGuid();
        var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.DropOldest
        });

        _clients[clientId] = channel;
        _logger.LogInformation("SSE Client {ClientId} connected. Total active clients: {Count}", clientId, _clients.Count);

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
