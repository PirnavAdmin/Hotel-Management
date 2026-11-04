using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;

namespace HMS.Services;

public class KotService
{
    private readonly SpService _spService;

    public KotService(SpService spService)
    {
        _spService = spService;
    }

    public async Task<List<KotOrderResponseDto>> GetActiveKotOrdersAsync(long? tableId = null, string? status = null)
    {
        var orders = new List<KotOrderResponseDto>();
        var itemsList = new List<KotOrderItemResponseDto>();

        var parameters = new Dictionary<string, object?>
        {
            { "p_table_id", tableId ?? 0 },
            { "p_status", status }
        };

        await _spService.ExecuteQueryMultipleAsync("sp_GetActiveKotOrders", parameters,
            reader =>
            {
                while (reader.Read())
                {
                    orders.Add(MapOrderFromReader(reader));
                }
            },
            reader =>
            {
                while (reader.Read())
                {
                    itemsList.Add(MapItemFromReader(reader));
                }
            });

        foreach (var order in orders)
        {
            order.Items = itemsList.Where(i => i.OrderId == order.OrderId).ToList();
        }

        return orders;
    }

    public async Task<KotOrderResponseDto?> GetKotOrderByIdAsync(long orderId)
    {
        KotOrderResponseDto? order = null;
        var itemsList = new List<KotOrderItemResponseDto>();

        var parameters = new Dictionary<string, object?> { { "p_order_id", orderId } };

        await _spService.ExecuteQueryMultipleAsync("sp_GetKotOrderById", parameters,
            reader =>
            {
                if (reader.Read())
                {
                    order = MapOrderFromReader(reader);
                }
            },
            reader =>
            {
                while (reader.Read())
                {
                    itemsList.Add(MapItemFromReader(reader));
                }
            });

        if (order != null)
        {
            order.Items = itemsList;
        }

        return order;
    }

    public async Task<KotOrderResponseDto> CreateKotOrderAsync(CreateKotOrderDto dto)
    {
        // Resolve TableId if not provided or 0
        long? tableId = dto.TableId;
        if (!tableId.HasValue || tableId.Value <= 0)
        {
            if (!string.IsNullOrWhiteSpace(dto.TableName))
            {
                try
                {
                    var resolvedId = await _spService.ExecuteSqlScalarAsync<long?>(
                        "SELECT table_id FROM restaurant_tables WHERE table_number = @tname OR table_name = @tname LIMIT 1;",
                        new Dictionary<string, object?> { { "tname", dto.TableName.Trim() } });
                    if (resolvedId.HasValue && resolvedId.Value > 0)
                    {
                        tableId = resolvedId.Value;
                    }
                }
                catch { }
            }
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_table_id", tableId },
            { "p_table_name", dto.TableName.Trim() },
            { "p_section_area", string.IsNullOrWhiteSpace(dto.SectionArea) ? "Main Hall" : dto.SectionArea.Trim() },
            { "p_server_name", string.IsNullOrWhiteSpace(dto.ServerName) ? "Staff" : dto.ServerName.Trim() },
            { "p_order_status", "PENDING" }
        };

        long orderId = await _spService.ExecuteScalarAsync<long>("sp_CreateKotOrder", parameters);

        // Update kot_number and table_number if supported
        try
        {
            var kotNum = $"KOT-{orderId:D4}";
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE kot_orders SET kot_number = @knum, table_number = @tnum, status = 'PENDING' WHERE order_id = @oid;",
                new Dictionary<string, object?> { { "knum", kotNum }, { "tnum", dto.TableName.Trim() }, { "oid", orderId } });
        }
        catch { }

        // Mark table as occupied in restaurant_tables
        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE restaurant_tables SET status = 'occupied', updated_at = NOW() WHERE (table_id = @tid AND @tid > 0) OR table_number = @tname OR table_name = @tname;",
                new Dictionary<string, object?> { { "tid", tableId ?? 0 }, { "tname", dto.TableName.Trim() } });
        }
        catch { }

        foreach (var item in dto.Items)
        {
            long? menuItemId = item.MenuItemId;
            if (!menuItemId.HasValue || menuItemId.Value <= 0)
            {
                try
                {
                    var resolvedMenuId = await _spService.ExecuteSqlScalarAsync<long?>(
                        "SELECT menu_item_id FROM menu_items WHERE dish_name = @dname LIMIT 1;",
                        new Dictionary<string, object?> { { "dname", item.DishName.Trim() } });
                    if (resolvedMenuId.HasValue && resolvedMenuId.Value > 0)
                    {
                        menuItemId = resolvedMenuId.Value;
                    }
                }
                catch { }
            }

            var itemParams = new Dictionary<string, object?>
            {
                { "p_order_id", orderId },
                { "p_menu_item_id", menuItemId },
                { "p_dish_name", item.DishName.Trim() },
                { "p_quantity", item.Quantity > 0 ? item.Quantity : 1 },
                { "p_item_status", "PENDING" }
            };
            await _spService.ExecuteNonQueryAsync("sp_CreateKotOrderItem", itemParams);
        }

        return (await GetKotOrderByIdAsync(orderId))!;
    }

    public async Task<KotOrderResponseDto?> UpdateOrderStatusAsync(long orderId, string status)
    {
        var existing = await GetKotOrderByIdAsync(orderId);
        if (existing == null)
        {
            var activeList = await GetActiveKotOrdersAsync(orderId, null);
            if (activeList != null && activeList.Count > 0)
            {
                orderId = activeList[0].OrderId;
                existing = activeList[0];
            }
        }
        if (existing == null) return null;

        var parameters = new Dictionary<string, object?>
        {
            { "p_order_id", orderId },
            { "p_status", status.Trim().ToUpper() }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateKotOrderStatus", parameters);
        return await GetKotOrderByIdAsync(orderId);
    }

    public async Task<KotOrderResponseDto?> UpdateItemStatusAsync(long orderId, long itemId, string status)
    {
        var existing = await GetKotOrderByIdAsync(orderId);
        if (existing == null)
        {
            var activeList = await GetActiveKotOrdersAsync(orderId, null);
            if (activeList != null && activeList.Count > 0)
            {
                orderId = activeList[0].OrderId;
                existing = activeList[0];
            }
        }
        if (existing == null) return null;

        var cleanStatus = status.Trim().ToUpper();
        if (cleanStatus == "COOKING" || cleanStatus == "IN PREPARATION") cleanStatus = "IN PREP";
        if (cleanStatus == "PREPARATION COMPLETED" || cleanStatus == "COMPLETED") cleanStatus = "READY";

        var parameters = new Dictionary<string, object?>
        {
            { "p_order_id", orderId },
            { "p_item_id", itemId },
            { "p_status", cleanStatus }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateKotItemStatus", parameters);

        // Auto-synchronize parent kot_order status
        try
        {
            var pendingCount = await _spService.ExecuteSqlScalarAsync<int>(
                "SELECT COUNT(*) FROM kot_order_items WHERE order_id = @oid AND UPPER(item_status) NOT IN ('READY', 'SERVED', 'COMPLETED', 'CANCELLED');",
                new Dictionary<string, object?> { { "oid", orderId } });

            if (pendingCount == 0)
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "UPDATE kot_orders SET order_status = 'PREPARATION COMPLETED', updated_at = NOW() WHERE order_id = @oid AND UPPER(order_status) NOT IN ('SERVED', 'CANCELLED');",
                    new Dictionary<string, object?> { { "oid", orderId } });
            }
            else if (cleanStatus == "IN PREP")
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "UPDATE kot_orders SET order_status = 'IN PREPARATION', updated_at = NOW() WHERE order_id = @oid AND UPPER(order_status) = 'PENDING';",
                    new Dictionary<string, object?> { { "oid", orderId } });
            }
        }
        catch { }

        return await GetKotOrderByIdAsync(orderId);
    }

    public async Task<List<KotOrderItemResponseDto>> GetKotOrderItemsAsync(long? orderId = null, string? status = null)
    {
        var sql = @"SELECT i.order_item_id, i.order_id, i.menu_item_id, i.dish_name, i.quantity, i.item_status, i.created_at, i.updated_at,
                           o.table_name, o.section_area
                    FROM kot_order_items i
                    LEFT JOIN kot_orders o ON i.order_id = o.order_id
                    WHERE (o.deleted_at IS NULL)
                      AND (@oid = 0 OR i.order_id = @oid)
                      AND (@status IS NULL OR @status = '' OR UPPER(i.item_status) = UPPER(@status))
                    ORDER BY i.order_item_id DESC;";

        var parameters = new Dictionary<string, object?>
        {
            { "oid", orderId ?? 0 },
            { "status", status }
        };

        return await _spService.ExecuteSqlQueryAsync(sql, reader =>
        {
            var menuIdOrd = reader.GetOrdinal("menu_item_id");
            return new KotOrderItemResponseDto
            {
                OrderItemId = reader.GetInt64(reader.GetOrdinal("order_item_id")),
                OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
                MenuItemId = reader.IsDBNull(menuIdOrd) ? null : reader.GetInt64(menuIdOrd),
                DishName = reader.GetString(reader.GetOrdinal("dish_name")),
                Quantity = reader.GetInt32(reader.GetOrdinal("quantity")),
                ItemStatus = reader.GetString(reader.GetOrdinal("item_status")),
                TableName = SafeGetString(reader, "table_name"),
                SectionArea = SafeGetString(reader, "section_area"),
                CreatedAt = SafeGetDateTime(reader, "created_at"),
                UpdatedAt = SafeGetDateTime(reader, "updated_at")
            };
        }, parameters);
    }

    public async Task<KotOrderItemResponseDto?> GetKotOrderItemByIdAsync(long itemId)
    {
        var sql = @"SELECT i.order_item_id, i.order_id, i.menu_item_id, i.dish_name, i.quantity, i.item_status, i.created_at, i.updated_at,
                           o.table_name, o.section_area
                    FROM kot_order_items i
                    LEFT JOIN kot_orders o ON i.order_id = o.order_id
                    WHERE i.order_item_id = @id
                    LIMIT 1;";

        var parameters = new Dictionary<string, object?> { { "id", itemId } };

        var list = await _spService.ExecuteSqlQueryAsync(sql, reader =>
        {
            var menuIdOrd = reader.GetOrdinal("menu_item_id");
            return new KotOrderItemResponseDto
            {
                OrderItemId = reader.GetInt64(reader.GetOrdinal("order_item_id")),
                OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
                MenuItemId = reader.IsDBNull(menuIdOrd) ? null : reader.GetInt64(menuIdOrd),
                DishName = reader.GetString(reader.GetOrdinal("dish_name")),
                Quantity = reader.GetInt32(reader.GetOrdinal("quantity")),
                ItemStatus = reader.GetString(reader.GetOrdinal("item_status")),
                TableName = SafeGetString(reader, "table_name"),
                SectionArea = SafeGetString(reader, "section_area"),
                CreatedAt = SafeGetDateTime(reader, "created_at"),
                UpdatedAt = SafeGetDateTime(reader, "updated_at")
            };
        }, parameters);

        return list.Count > 0 ? list[0] : null;
    }

    public async Task<KotOrderItemResponseDto> AddKotOrderItemAsync(long orderId, CreateKotOrderItemDto dto)
    {
        long? menuItemId = dto.MenuItemId;
        if (!menuItemId.HasValue || menuItemId.Value <= 0)
        {
            try
            {
                var resolvedMenuId = await _spService.ExecuteSqlScalarAsync<long?>(
                    "SELECT menu_item_id FROM menu_items WHERE dish_name = @dname LIMIT 1;",
                    new Dictionary<string, object?> { { "dname", dto.DishName.Trim() } });
                if (resolvedMenuId.HasValue && resolvedMenuId.Value > 0)
                {
                    menuItemId = resolvedMenuId.Value;
                }
            }
            catch { }
        }

        var insertSql = @"INSERT INTO kot_order_items (order_id, menu_item_id, dish_name, quantity, item_status, created_at, updated_at)
                          VALUES (@oid, @mid, @dname, @qty, 'PENDING', NOW(), NOW());
                          SELECT LAST_INSERT_ID();";

        var parameters = new Dictionary<string, object?>
        {
            { "oid", orderId },
            { "mid", menuItemId },
            { "dname", dto.DishName.Trim() },
            { "qty", dto.Quantity > 0 ? dto.Quantity : 1 }
        };

        var newItemId = await _spService.ExecuteSqlScalarAsync<long>(insertSql, parameters);

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE kot_orders SET total_items = (SELECT COUNT(*) FROM kot_order_items WHERE order_id = @oid), updated_at = NOW() WHERE order_id = @oid;",
                new Dictionary<string, object?> { { "oid", orderId } });
        }
        catch { }

        return (await GetKotOrderItemByIdAsync(newItemId))!;
    }

    public async Task<KotOrderItemResponseDto?> UpdateItemStatusDirectAsync(long itemId, string status, long? orderId = null)
    {
        if (!orderId.HasValue || orderId.Value <= 0)
        {
            var found = await _spService.ExecuteSqlScalarAsync<long?>(
                "SELECT order_id FROM kot_order_items WHERE order_item_id = @id LIMIT 1;",
                new Dictionary<string, object?> { { "id", itemId } });
            orderId = found;
        }

        if (!orderId.HasValue || orderId.Value <= 0) return null;

        var cleanStatus = status.Trim().ToUpper();
        if (cleanStatus == "COOKING" || cleanStatus == "IN PREPARATION") cleanStatus = "IN PREP";
        if (cleanStatus == "PREPARATION COMPLETED" || cleanStatus == "COMPLETED") cleanStatus = "READY";

        await _spService.ExecuteSqlNonQueryAsync(
            "UPDATE kot_order_items SET item_status = @status, updated_at = NOW() WHERE order_item_id = @id;",
            new Dictionary<string, object?> { { "status", cleanStatus }, { "id", itemId } });

        try
        {
            var pendingCount = await _spService.ExecuteSqlScalarAsync<int>(
                "SELECT COUNT(*) FROM kot_order_items WHERE order_id = @oid AND UPPER(item_status) NOT IN ('READY', 'SERVED', 'COMPLETED', 'CANCELLED');",
                new Dictionary<string, object?> { { "oid", orderId.Value } });

            if (pendingCount == 0)
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "UPDATE kot_orders SET order_status = 'PREPARATION COMPLETED', updated_at = NOW() WHERE order_id = @oid AND UPPER(order_status) NOT IN ('SERVED', 'CANCELLED');",
                    new Dictionary<string, object?> { { "oid", orderId.Value } });
            }
            else if (cleanStatus == "IN PREP")
            {
                await _spService.ExecuteSqlNonQueryAsync(
                    "UPDATE kot_orders SET order_status = 'IN PREPARATION', updated_at = NOW() WHERE order_id = @oid AND UPPER(order_status) = 'PENDING';",
                    new Dictionary<string, object?> { { "oid", orderId.Value } });
            }
        }
        catch { }

        return await GetKotOrderItemByIdAsync(itemId);
    }

    public async Task<KotOrderItemResponseDto?> AdvanceItemStatusDirectAsync(long itemId, long? orderId = null)
    {
        var item = await GetKotOrderItemByIdAsync(itemId);
        if (item == null) return null;

        var cur = item.ItemStatus.ToUpper().Trim();
        string nextStatus;
        if (cur == "PENDING" || cur == "QUEUED")
            nextStatus = "IN PREP";
        else if (cur == "IN PREP" || cur == "COOKING" || cur == "IN PREPARATION")
            nextStatus = "READY";
        else if (cur == "READY")
            nextStatus = "SERVED";
        else
            nextStatus = "COMPLETED";

        return await UpdateItemStatusDirectAsync(itemId, nextStatus, orderId ?? item.OrderId);
    }

    public async Task<bool> DeleteKotOrderItemAsync(long itemId, long? orderId = null)
    {
        var existing = await GetKotOrderItemByIdAsync(itemId);
        if (existing == null) return false;

        var targetOrderId = orderId ?? existing.OrderId;

        await _spService.ExecuteSqlNonQueryAsync(
            "DELETE FROM kot_order_items WHERE order_item_id = @id;",
            new Dictionary<string, object?> { { "id", itemId } });

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE kot_orders SET total_items = (SELECT COUNT(*) FROM kot_order_items WHERE order_id = @oid), updated_at = NOW() WHERE order_id = @oid;",
                new Dictionary<string, object?> { { "oid", targetOrderId } });
        }
        catch { }

        return true;
    }

    public async Task<bool> DeleteKotOrderAsync(long orderId)
    {
        var existing = await GetKotOrderByIdAsync(orderId);
        if (existing == null) return false;

        var parameters = new Dictionary<string, object?> { { "p_order_id", orderId } };
        await _spService.ExecuteNonQueryAsync("sp_DeleteKotOrder", parameters);
        return true;
    }

    public async Task<KotSummaryDto> GetKotSummaryAsync()
    {
        var summaries = await _spService.ExecuteQueryAsync("sp_GetKotSummary", reader => new KotSummaryDto
        {
            TotalTickets = Convert.ToInt32(reader["total_tickets"]),
            PendingTickets = Convert.ToInt32(reader["pending_tickets"]),
            InPrepTickets = Convert.ToInt32(reader["in_prep_tickets"]),
            ReadyTickets = Convert.ToInt32(reader["ready_tickets"]),
            CancelledTickets = Convert.ToInt32(reader["cancelled_tickets"]),
            AveragePrepTimeMinutes = 15.0
        });

        return summaries.Count > 0 ? summaries[0] : new KotSummaryDto();
    }

    public async Task<KotOrderResponseDto?> MarkAllPreparedAsync(long orderId)
    {
        return await UpdateOrderStatusAsync(orderId, "PREPARATION COMPLETED");
    }

    public async Task<KotOrderResponseDto?> AdvanceItemStatusAsync(long orderId, long itemId)
    {
        var order = await GetKotOrderByIdAsync(orderId);
        if (order == null)
        {
            var activeList = await GetActiveKotOrdersAsync(orderId, null);
            if (activeList != null && activeList.Count > 0)
            {
                orderId = activeList[0].OrderId;
                order = activeList[0];
            }
        }
        if (order == null) return null;

        var item = order.Items.FirstOrDefault(i => i.OrderItemId == itemId || i.MenuItemId == itemId);
        if (item == null) return null;

        var currentStatus = item.ItemStatus.ToUpper().Trim();
        var nextStatus = currentStatus == "PENDING" ? "IN PREP" : "READY";

        return await UpdateItemStatusAsync(orderId, item.OrderItemId, nextStatus);
    }

    public async Task<KotScreenFeedDto> GetScreenFeedAsync(long? tableId = null, string? status = null)
    {
        var summary = await GetKotSummaryAsync();
        var orders = await GetActiveKotOrdersAsync(tableId, status);
        var totalItems = orders.Sum(o => o.Items.Count);

        return new KotScreenFeedDto
        {
            Summary = summary,
            Orders = orders,
            TotalActiveOrders = orders.Count,
            TotalActiveItems = totalItems,
            ServerTimeUtc = DateTime.UtcNow,
            ServerTimeFormatted = DateTime.Now.ToString("hh:mm:ss tt")
        };
    }

    private static KotOrderResponseDto MapOrderFromReader(DbDataReader reader)
    {
        var receivedAt = reader.GetDateTime(reader.GetOrdinal("order_received_at"));
        var tableIdOrd = reader.GetOrdinal("table_id");

        return new KotOrderResponseDto
        {
            OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
            TableId = reader.IsDBNull(tableIdOrd) ? null : reader.GetInt64(tableIdOrd),
            TableName = reader.GetString(reader.GetOrdinal("table_name")),
            SectionArea = reader.GetString(reader.GetOrdinal("section_area")),
            ServerName = reader.GetString(reader.GetOrdinal("server_name")),
            OrderStatus = reader.GetString(reader.GetOrdinal("order_status")),
            OrderReceivedAt = receivedAt,
            OrderReceivedFormatted = receivedAt.ToString("hh:mm tt"),
            KotNumber = SafeGetString(reader, "kot_number") ?? $"KOT-{reader.GetInt64(reader.GetOrdinal("order_id")):D4}",
            OrderType = SafeGetString(reader, "order_type") ?? "DINE_IN",
            TableNumber = SafeGetString(reader, "table_number"),
            SpecialInstructions = SafeGetString(reader, "special_instructions"),
            TotalItems = SafeGetInt32(reader, "total_items"),
            PreparedItems = SafeGetInt32(reader, "prepared_items"),
            CreatedAt = SafeGetDateTime(reader, "created_at"),
            UpdatedAt = SafeGetDateTime(reader, "updated_at"),
            Items = new List<KotOrderItemResponseDto>()
        };
    }

    private static KotOrderItemResponseDto MapItemFromReader(DbDataReader reader)
    {
        var menuIdOrd = reader.GetOrdinal("menu_item_id");
        var itemIdOrd = reader.GetOrdinal("item_id");

        return new KotOrderItemResponseDto
        {
            OrderItemId = reader.GetInt64(itemIdOrd),
            OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
            MenuItemId = reader.IsDBNull(menuIdOrd) ? null : reader.GetInt64(menuIdOrd),
            DishName = reader.GetString(reader.GetOrdinal("dish_name")),
            Quantity = reader.GetInt32(reader.GetOrdinal("quantity")),
            ItemStatus = reader.GetString(reader.GetOrdinal("item_status")),
            TableName = SafeGetString(reader, "table_name"),
            SectionArea = SafeGetString(reader, "section_area"),
            CreatedAt = SafeGetDateTime(reader, "created_at"),
            UpdatedAt = SafeGetDateTime(reader, "updated_at")
        };
    }

    private static string? SafeGetString(DbDataReader reader, string column)
    {
        try
        {
            var ord = reader.GetOrdinal(column);
            return reader.IsDBNull(ord) ? null : reader.GetString(ord);
        }
        catch { return null; }
    }

    private static int SafeGetInt32(DbDataReader reader, string column, int defaultVal = 0)
    {
        try
        {
            var ord = reader.GetOrdinal(column);
            return reader.IsDBNull(ord) ? defaultVal : reader.GetInt32(ord);
        }
        catch { return defaultVal; }
    }

    private static DateTime? SafeGetDateTime(DbDataReader reader, string column)
    {
        try
        {
            var ord = reader.GetOrdinal(column);
            return reader.IsDBNull(ord) ? null : reader.GetDateTime(ord);
        }
        catch { return null; }
    }
}

