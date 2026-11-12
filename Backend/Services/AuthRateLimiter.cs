using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace HMS.Services;

public sealed class RateLimitDecision
{
    public bool Allowed { get; init; }
    public int Remaining { get; init; }
    public int RetryAfterSeconds { get; init; }
}

public sealed class AuthRateLimiter
{
    private sealed class Bucket
    {
        public readonly Queue<DateTime> Timestamps = new();
    }

    private readonly ConcurrentDictionary<string, Bucket> _buckets = new(StringComparer.OrdinalIgnoreCase);
    private DateTime _lastCleanupUtc = DateTime.UtcNow;

    public RateLimitDecision CheckAndConsume(string key, int limit, TimeSpan window)
    {
        if (limit <= 0 || window <= TimeSpan.Zero)
        {
            return new RateLimitDecision { Allowed = true, Remaining = int.MaxValue, RetryAfterSeconds = 0 };
        }

        DateTime now = DateTime.UtcNow;
        DateTime cutoff = now - window;
        var bucket = _buckets.GetOrAdd(key, _ => new Bucket());

        RateLimitDecision decision;
        lock (bucket)
        {
            while (bucket.Timestamps.Count > 0 && bucket.Timestamps.Peek() <= cutoff)
            {
                bucket.Timestamps.Dequeue();
            }

            if (bucket.Timestamps.Count >= limit)
            {
                DateTime oldest = bucket.Timestamps.Peek();
                int retrySeconds = Math.Max(1, (int)Math.Ceiling((oldest + window - now).TotalSeconds));
                decision = new RateLimitDecision
                {
                    Allowed = false,
                    Remaining = 0,
                    RetryAfterSeconds = retrySeconds
                };
            }
            else
            {
                bucket.Timestamps.Enqueue(now);
                decision = new RateLimitDecision
                {
                    Allowed = true,
                    Remaining = Math.Max(0, limit - bucket.Timestamps.Count),
                    RetryAfterSeconds = 0
                };
            }
        }

        MaybePruneStaleBuckets(now, window);
        return decision;
    }

    private void MaybePruneStaleBuckets(DateTime now, TimeSpan window)
    {
        if ((now - _lastCleanupUtc) < TimeSpan.FromMinutes(10) && _buckets.Count < 5000)
        {
            return;
        }

        _lastCleanupUtc = now;
        DateTime staleCutoff = now - window - TimeSpan.FromMinutes(15);

        foreach (var kvp in _buckets)
        {
            lock (kvp.Value)
            {
                while (kvp.Value.Timestamps.Count > 0 && kvp.Value.Timestamps.Peek() <= staleCutoff)
                {
                    kvp.Value.Timestamps.Dequeue();
                }

                if (kvp.Value.Timestamps.Count == 0)
                {
                    _buckets.TryRemove(kvp.Key, out _);
                }
            }
        }
    }
}
