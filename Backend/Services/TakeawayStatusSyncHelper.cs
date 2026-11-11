using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public static class TakeawayStatusSyncHelper
{
    public static string NormalizeFulfillmentStatus(string? rawStatus)
    {
        if (string.IsNullOrWhiteSpace(rawStatus)) return "New";
        var key = rawStatus.Trim().ToLowerInvariant().Replace("_", " ").Replace("-", " ");
        return key switch
        {
            "new" or "placed" or "pending" or "queued" => "New",
            "preparing" or "cooking" or "in preparation" or "in prep" or "mixing" => "Preparing",
            "ready" or "ready for pickup" or "prepared" => "Ready",
            "pickedup" or "picked up" or "dispatched" => "PickedUp",
            "completed" or "complete" or "delivered" => "Completed",
            "cancelled" or "canceled" or "cancel" => "Cancelled",
            _ => throw new ArgumentException($"Unsupported takeaway status '{rawStatus}'. Valid values: New, Preparing, Ready, PickedUp, Completed, Cancelled.")
        };
    }

    public static string ResolveEffectiveFulfillmentStatus(Order order)
    {
        if (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return "Cancelled";
        }

        if (!string.IsNullOrWhiteSpace(order.FulfillmentStatus))
        {
            return order.FulfillmentStatus;
        }

        var items = order.Items?.Where(i => i.IsActive && !i.IsDeleted).ToList() ?? new List<OrderItem>();
        if (items.Count == 0)
        {
            return string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase) ? "Completed" : "New";
        }

        bool allServed = items.All(i =>
            string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Completed", StringComparison.OrdinalIgnoreCase));
        if (allServed)
        {
            return string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase) ? "Completed" : "PickedUp";
        }

        bool allReadyOrServed = items.All(i =>
            string.Equals(i.KotStatus, "Ready", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Completed", StringComparison.OrdinalIgnoreCase));
        if (allReadyOrServed)
        {
            return "Ready";
        }

        bool anyStarted = items.Any(i =>
            string.Equals(i.KotStatus, "Cooking", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Mixing", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Preparing", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Ready", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase));
        if (anyStarted)
        {
            return "Preparing";
        }

        return "New";
    }

    public static async Task SyncTakeawayFromItemsAsync(AppDbContext context, long orderId)
    {
        var order = await context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

        if (order == null || !string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var items = order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();
        if (items.Count == 0) return;

        string derived;
        if (items.All(i => string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(i.KotStatus, "Completed", StringComparison.OrdinalIgnoreCase)))
        {
            derived = string.Equals(order.FulfillmentStatus, "Completed", StringComparison.OrdinalIgnoreCase)
                ? "Completed"
                : "PickedUp";
        }
        else if (items.All(i => string.Equals(i.KotStatus, "Ready", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Completed", StringComparison.OrdinalIgnoreCase)))
        {
            derived = "Ready";
        }
        else if (items.Any(i => string.Equals(i.KotStatus, "Cooking", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Mixing", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Preparing", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Ready", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase)))
        {
            derived = "Preparing";
        }
        else
        {
            derived = "New";
        }

        if (!string.Equals(order.FulfillmentStatus, derived, StringComparison.OrdinalIgnoreCase))
        {
            order.FulfillmentStatus = derived;
            order.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    public static async Task SyncTakeawayFromItemsSqlAsync(SpService spService, long orderId)
    {
        if (orderId <= 0) return;
        try
        {
            const string sql = @"
                UPDATE restaurant_orders ro
                SET ro.fulfillment_status = CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM order_items oi
                        WHERE oi.order_id = ro.order_id AND oi.is_active = 1 AND oi.is_deleted = 0
                          AND LOWER(oi.item_status) NOT IN ('served', 'completed', 'cancelled')
                    ) THEN IF(ro.fulfillment_status = 'Completed', 'Completed', 'PickedUp')
                    WHEN NOT EXISTS (
                        SELECT 1 FROM order_items oi
                        WHERE oi.order_id = ro.order_id AND oi.is_active = 1 AND oi.is_deleted = 0
                          AND LOWER(oi.item_status) NOT IN ('ready', 'served', 'completed', 'cancelled')
                    ) THEN 'Ready'
                    WHEN EXISTS (
                        SELECT 1 FROM order_items oi
                        WHERE oi.order_id = ro.order_id AND oi.is_active = 1 AND oi.is_deleted = 0
                          AND LOWER(oi.item_status) IN ('cooking', 'mixing', 'preparing', 'ready', 'served')
                    ) THEN 'Preparing'
                    ELSE 'New'
                END,
                ro.updated_at = UTC_TIMESTAMP()
                WHERE ro.order_id = @oid
                  AND LOWER(ro.order_type) = 'takeaway'
                  AND LOWER(ro.order_status) <> 'cancelled'
                  AND COALESCE(LOWER(ro.fulfillment_status), '') <> 'cancelled';
            ";
            await spService.ExecuteSqlNonQueryAsync(sql, new Dictionary<string, object?> { { "@oid", orderId } });
        }
        catch { }
    }
}
