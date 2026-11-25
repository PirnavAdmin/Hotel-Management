using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/kot")]
public class KotController : ControllerBase
{
    private readonly KotService _kotService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly AppDbContext _db;

    private const string KotStaffRoles = "Admin,Super Admin,SuperAdmin,Manager,Branch Manager,Cashier,POS Cashier,User POS,Waiter,Waitstaff,Kitchen,Kitchen KOT,Head Chef,Sous Chef,Chef";

    public KotController(
        KotService kotService,
        IHubContext<PosHub> hubContext,
        ISseBroadcaster sseBroadcaster,
        IRealtimeSyncService realtimeSync,
        AppDbContext db)
    {
        _kotService = kotService;
        _hubContext = hubContext;
        _sseBroadcaster = sseBroadcaster;
        _realtimeSync = realtimeSync;
        _db = db;
    }

    private bool IsGlobalAdmin()
    {
        var role = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return User.IsInRole("SuperAdmin") ||
               User.IsInRole("Super Admin") ||
               string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase);
    }

    private long? GetUserBranchId()
    {
        var claim = User.FindFirstValue("branchId")
                 ?? User.FindFirstValue("restaurantId")
                 ?? User.FindFirstValue("branch_id")
                 ?? User.FindFirstValue("restaurant_id");

        if (!string.IsNullOrWhiteSpace(claim))
        {
            var sanitized = claim.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (long.TryParse(sanitized, out var bId) && bId > 0)
            {
                return bId;
            }
        }
        return null;
    }

    private async Task<(bool Allowed, long BranchId, string? ErrorMessage)> AuthorizeBranchContextAsync(long targetBranchId)
    {
        if (targetBranchId <= 0)
        {
            return (false, 0, "Invalid branch context.");
        }

        var branchExists = await _db.Branches.AsNoTracking().AnyAsync(b => b.BranchId == targetBranchId && b.IsActive && b.DeletedAt == null);
        if (!branchExists)
        {
            return (false, 0, $"Branch {targetBranchId} does not exist or is inactive.");
        }

        if (IsGlobalAdmin())
        {
            return (true, targetBranchId, null);
        }

        var userBranchId = GetUserBranchId();
        if (!userBranchId.HasValue)
        {
            return (false, 0, "Authenticated user account is not associated with any restaurant branch.");
        }

        if (userBranchId.Value != targetBranchId)
        {
            return (false, 0, "Cross-branch access forbidden. Your account is not authorized for this branch.");
        }

        return (true, targetBranchId, null);
    }

    private async Task<(bool Allowed, long BranchId, string? ErrorMessage)> AuthorizeTableBranchAsync(long? tableId)
    {
        if (!tableId.HasValue || tableId.Value <= 0)
        {
            return (false, 0, "Valid tableId is required to determine branch context.");
        }

        var table = await _db.RestaurantTables.AsNoTracking().FirstOrDefaultAsync(t => t.TableId == tableId.Value);
        if (table == null)
        {
            return (false, 0, $"Table {tableId.Value} does not exist in the database.");
        }

        var targetBranchId = table.BranchId;
        return await AuthorizeBranchContextAsync(targetBranchId);
    }

    private async Task<(bool Allowed, long BranchId, string? ErrorMessage)> AuthorizeOrderBranchAsync(long orderId)
    {
        var order = await _db.KotOrders.AsNoTracking().FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order != null)
        {
            if (order.TableId.HasValue && order.TableId.Value > 0)
            {
                return await AuthorizeTableBranchAsync(order.TableId.Value);
            }

            // For Takeaway or quick-serve orders without a table:
            // 1. Resolve from linked restaurant_orders record if exists
            var linkedOrder = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(ro => ro.Id == orderId);
            if (linkedOrder?.BranchId != null && linkedOrder.BranchId.Value > 0)
            {
                return await AuthorizeBranchContextAsync(linkedOrder.BranchId.Value);
            }

            // 2. Resolve from authenticated user's assigned active branch
            var userBranchId = GetUserBranchId();
            if (userBranchId.HasValue)
            {
                return await AuthorizeBranchContextAsync(userBranchId.Value);
            }

            if (IsGlobalAdmin())
            {
                return (true, 1, null);
            }

            return (false, 0, "Takeaway KOT order has no associated branch context.");
        }

        // Also check direct restaurant_orders table
        var ro = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(r => r.Id == orderId);
        if (ro != null)
        {
            if (ro.TableId.HasValue && ro.TableId.Value > 0)
            {
                return await AuthorizeTableBranchAsync(ro.TableId.Value);
            }
            if (ro.BranchId.HasValue && ro.BranchId.Value > 0)
            {
                return await AuthorizeBranchContextAsync(ro.BranchId.Value);
            }
        }

        return (false, 0, $"KOT order {orderId} not found.");
    }

    private async Task<(bool Allowed, long BranchId, string? ErrorMessage)> AuthorizeOrderItemBranchAsync(long orderItemId, long? orderId = null)
    {
        long targetOrderId = orderId ?? 0;
        if (targetOrderId <= 0)
        {
            var item = await _db.KotOrderItems.AsNoTracking().FirstOrDefaultAsync(i => i.OrderItemId == orderItemId);
            if (item == null)
            {
                return (false, 0, $"KOT item {orderItemId} not found.");
            }
            targetOrderId = item.OrderId;
        }

        return await AuthorizeOrderBranchAsync(targetOrderId);
    }

    // ============================================================
    // 1. KOT ORDERS APIS
    // ============================================================

    // GET /api/v1/kot/orders OR /api/v1/kot OR /api/v1/kot-orders OR /api/kot_orders
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("orders")]
    [HttpGet]
    public async Task<IActionResult> GetActiveKotOrders([FromQuery] long? tableId, [FromQuery] string? status)
    {
        if (tableId.HasValue && tableId.Value > 0)
        {
            var (tableAllowed, _, tableError) = await AuthorizeTableBranchAsync(tableId);
            if (!tableAllowed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = tableError });
            }
        }

        var orders = await _kotService.GetActiveKotOrdersAsync(tableId, status);

        // Branch-scoped staff can only see KOT records belonging to their assigned branch
        if (!IsGlobalAdmin())
        {
            var userBranchId = GetUserBranchId();
            if (userBranchId.HasValue)
            {
                var branchTableIds = await _db.RestaurantTables.AsNoTracking()
                    .Where(t => t.BranchId == userBranchId.Value)
                    .Select(t => (long?)t.TableId)
                    .ToListAsync();
                var branchOrderIds = await _db.Orders.AsNoTracking()
                    .Where(o => o.BranchId == userBranchId.Value)
                    .Select(o => o.Id)
                    .ToListAsync();

                orders = orders.Where(o =>
                    (o.TableId.HasValue && branchTableIds.Contains(o.TableId)) ||
                    branchOrderIds.Contains(o.OrderId)
                ).ToList();
            }
        }

        return Ok(new
        {
            success = true,
            message = "Active KOT orders retrieved successfully.",
            count = orders.Count,
            orders = orders,
            tickets = orders,
            data = orders
        });
    }

    // GET /api/v1/kot/summary OR /api/v1/kot/orders/summary
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("summary")]
    public async Task<IActionResult> GetKotSummary()
    {
        var summary = await _kotService.GetKotSummaryAsync();
        return Ok(new
        {
            success = true,
            message = "KOT summary retrieved successfully.",
            data = summary
        });
    }

    // GET /api/v1/kot/screen-feed OR /api/v1/kot/screens (Together for Kitchen & POS Screens)
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("screen-feed")]
    public async Task<IActionResult> GetKotScreenFeed([FromQuery] long? tableId, [FromQuery] string? status)
    {
        if (tableId.HasValue && tableId.Value > 0)
        {
            var (tableAllowed, _, tableError) = await AuthorizeTableBranchAsync(tableId);
            if (!tableAllowed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = tableError });
            }
        }

        var feed = await _kotService.GetScreenFeedAsync(tableId, status);
        return Ok(new
        {
            success = true,
            message = "KOT screen feed retrieved successfully.",
            data = feed
        });
    }

    // GET /api/v1/kot/{id} OR /api/v1/kot/orders/{id}
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("orders/{id:long}")]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetKotOrderById(long id)
    {
        var (allowed, _, error) = await AuthorizeOrderBranchAsync(id);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var order = await _kotService.GetKotOrderByIdAsync(id);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new { success = true, data = order });
    }

    // POST /api/v1/kot/orders OR /api/v1/kot OR /api/v1/kot-orders
    [Authorize(Roles = KotStaffRoles)]
    [HttpPost("orders")]
    [HttpPost]
    public async Task<IActionResult> CreateKotOrder([FromBody] CreateKotOrderDto dto)
    {
        bool allowed;
        long branchId;
        string? error;

        if (dto.TableId.HasValue && dto.TableId.Value > 0)
        {
            (allowed, branchId, error) = await AuthorizeTableBranchAsync(dto.TableId);
        }
        else
        {
            // Takeaway / counter order without table assignment:
            long targetBranchId = 0;
            if (Request.Query.TryGetValue("branchId", out var qb) && long.TryParse(qb, out var b) && b > 0)
            {
                targetBranchId = b;
            }

            var userBranchId = GetUserBranchId();
            if (!IsGlobalAdmin())
            {
                if (!userBranchId.HasValue)
                {
                    allowed = false;
                    branchId = 0;
                    error = "Authenticated user account is not associated with any restaurant branch.";
                }
                else if (targetBranchId > 0 && targetBranchId != userBranchId.Value)
                {
                    allowed = false;
                    branchId = 0;
                    error = "Cross-branch access forbidden. You cannot create a KOT for another branch.";
                }
                else
                {
                    (allowed, branchId, error) = await AuthorizeBranchContextAsync(userBranchId.Value);
                }
            }
            else
            {
                // Global Admin: validate explicitly selected branch
                if (targetBranchId > 0)
                {
                    (allowed, branchId, error) = await AuthorizeBranchContextAsync(targetBranchId);
                }
                else if (userBranchId.HasValue)
                {
                    (allowed, branchId, error) = await AuthorizeBranchContextAsync(userBranchId.Value);
                }
                else
                {
                    allowed = false;
                    branchId = 0;
                    error = "Global Admin must specify a valid branch ID for takeaway KOT creation.";
                }
            }
        }

        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var created = await _kotService.CreateKotOrderAsync(dto);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("ReceiveNewKOT", created);
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderCreated", created);
            await _sseBroadcaster.BroadcastAsync("KOT_CREATED", created, branchId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:created",
                Module = "Kitchen",
                Action = "created",
                BranchId = branchId,
                RecordId = created.OrderId.ToString(),
                Data = created
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderById), new { id = created.OrderId }, new
        {
            success = true,
            message = "KOT order dispatched successfully.",
            data = created
        });
    }

    // PUT/PATCH /api/v1/kot/orders/{id}/status OR /api/v1/kot/{id}/status
    [Authorize(Roles = KotStaffRoles)]
    [HttpPatch("orders/{id:long}/status")]
    [HttpPatch("{id:long}/status")]
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateOrderStatus(long id, [FromBody] UpdateOrderStatusDto dto)
    {
        var (allowed, branchId, error) = await AuthorizeOrderBranchAsync(id);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var updated = await _kotService.UpdateOrderStatusAsync(id, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_STATUS_UPDATED", updated, branchId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:statusChanged",
                Module = "Kitchen",
                Action = "statusChanged",
                BranchId = branchId,
                RecordId = updated.OrderId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order status updated successfully.",
            data = updated
        });
    }

    // POST /api/v1/kot/{id}/mark-all-prepared OR /api/v1/kot/orders/{id}/mark-all-prepared
    [Authorize(Roles = KotStaffRoles)]
    [HttpPost("orders/{id:long}/mark-all-prepared")]
    [HttpPost("{id:long}/mark-all-prepared")]
    public async Task<IActionResult> MarkAllPrepared(long id)
    {
        var (allowed, branchId, error) = await AuthorizeOrderBranchAsync(id);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var updated = await _kotService.MarkAllPreparedAsync(id);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_STATUS_UPDATED", updated, branchId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:statusChanged",
                Module = "Kitchen",
                Action = "statusChanged",
                BranchId = branchId,
                RecordId = updated.OrderId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "All items in KOT order marked as prepared.",
            data = updated
        });
    }

    // DELETE /api/v1/kot/orders/{id} OR /api/v1/kot/{id}
    [Authorize(Roles = KotStaffRoles)]
    [HttpDelete("orders/{id:long}")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteKotOrder(long id)
    {
        var (allowed, branchId, error) = await AuthorizeOrderBranchAsync(id);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var result = await _kotService.DeleteKotOrderAsync(id);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderCancelled", new { orderId = id });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:cancelled",
                Module = "Kitchen",
                Action = "cancelled",
                BranchId = branchId,
                RecordId = id.ToString(),
                Data = new { orderId = id }
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new { success = true, message = $"KOT order with ID {id} has been cancelled/deleted successfully." });
    }

    // ============================================================
    // 2. KOT ORDER ITEMS APIS
    // ============================================================

    // GET /api/v1/kot/items OR /api/v1/kot/orders/{orderId}/items
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("orders/{orderId:long}/items")]
    [HttpGet("items")]
    public async Task<IActionResult> GetKotOrderItems([FromRoute] long? orderId, [FromQuery] long? orderIdQuery, [FromQuery] string? status)
    {
        var targetOrderId = orderId ?? orderIdQuery;
        if (targetOrderId.HasValue && targetOrderId.Value > 0)
        {
            var (allowed, _, error) = await AuthorizeOrderBranchAsync(targetOrderId.Value);
            if (!allowed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
            }
        }

        var items = await _kotService.GetKotOrderItemsAsync(targetOrderId, status);
        return Ok(new
        {
            success = true,
            message = "KOT order items retrieved successfully.",
            count = items.Count,
            data = items
        });
    }

    // GET /api/v1/kot/items/{itemId} OR /api/v1/kot/orders/{orderId}/items/{itemId}
    [Authorize(Roles = KotStaffRoles)]
    [HttpGet("orders/{orderId:long}/items/{itemId:long}")]
    [HttpGet("items/{itemId:long}")]
    public async Task<IActionResult> GetKotOrderItemById(long itemId)
    {
        var (allowed, _, error) = await AuthorizeOrderItemBranchAsync(itemId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var item = await _kotService.GetKotOrderItemByIdAsync(itemId);
        if (item == null)
        {
            return NotFound(new { success = false, message = $"KOT order item with ID {itemId} not found." });
        }
        return Ok(new { success = true, data = item });
    }

    // POST /api/v1/kot/orders/{orderId}/items
    [Authorize(Roles = KotStaffRoles)]
    [HttpPost("orders/{orderId:long}/items")]
    public async Task<IActionResult> AddKotOrderItem(long orderId, [FromBody] CreateKotOrderItemDto dto)
    {
        var (allowed, branchId, error) = await AuthorizeOrderBranchAsync(orderId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var createdItem = await _kotService.AddKotOrderItemAsync(orderId, dto);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemAdded", createdItem);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemAdded",
                Module = "Kitchen",
                Action = "itemAdded",
                BranchId = branchId,
                RecordId = createdItem.OrderItemId.ToString(),
                Data = createdItem
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderItemById), new { itemId = createdItem.OrderItemId }, new
        {
            success = true,
            message = "KOT item added successfully.",
            data = createdItem
        });
    }

    // POST /api/v1/kot/items (with orderId in body)
    [Authorize(Roles = KotStaffRoles)]
    [HttpPost("items")]
    public async Task<IActionResult> CreateKotOrderItemDirect([FromBody] AddKotItemRequestDto dto)
    {
        if (dto.OrderId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid orderId is required." });
        }

        var (allowed, branchId, error) = await AuthorizeOrderBranchAsync(dto.OrderId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var itemDto = new CreateKotOrderItemDto
        {
            MenuItemId = dto.MenuItemId,
            DishName = dto.DishName,
            Quantity = dto.Quantity
        };

        var createdItem = await _kotService.AddKotOrderItemAsync(dto.OrderId, itemDto);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemAdded", createdItem);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemAdded",
                Module = "Kitchen",
                Action = "itemAdded",
                BranchId = branchId,
                RecordId = createdItem.OrderItemId.ToString(),
                Data = createdItem
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderItemById), new { itemId = createdItem.OrderItemId }, new
        {
            success = true,
            message = "KOT item created successfully.",
            data = createdItem
        });
    }

    // PUT/PATCH /api/v1/kot/items/{itemId}/status OR /api/v1/kot/orders/{orderId}/items/{itemId}/status
    [Authorize(Roles = KotStaffRoles)]
    [HttpPatch("orders/{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("items/{itemId:long}/status")]
    [HttpPut("items/{itemId:long}/status")]
    public async Task<IActionResult> UpdateItemStatus([FromRoute] long itemId, [FromRoute] long? orderId, [FromBody] UpdateItemStatusDto dto)
    {
        var (allowed, branchId, error) = await AuthorizeOrderItemBranchAsync(itemId, orderId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var updated = await _kotService.UpdateItemStatusDirectAsync(itemId, dto.Status, orderId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {itemId} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_ITEM_UPDATED", updated, branchId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemUpdated",
                Module = "Kitchen",
                Action = "itemUpdated",
                BranchId = branchId,
                RecordId = updated.OrderItemId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order item status updated successfully.",
            data = updated
        });
    }

    // POST /api/v1/kot/items/{itemId}/advance OR /api/v1/kot/orders/{orderId}/items/{itemId}/advance
    [Authorize(Roles = KotStaffRoles)]
    [HttpPost("orders/{orderId:long}/items/{itemId:long}/advance")]
    [HttpPost("{orderId:long}/items/{itemId:long}/advance")]
    [HttpPost("items/{itemId:long}/advance")]
    public async Task<IActionResult> AdvanceItemStatus([FromRoute] long itemId, [FromRoute] long? orderId)
    {
        var (allowed, branchId, error) = await AuthorizeOrderItemBranchAsync(itemId, orderId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var updated = await _kotService.AdvanceItemStatusDirectAsync(itemId, orderId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = "KOT item not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_ITEM_UPDATED", updated, branchId);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemUpdated",
                Module = "Kitchen",
                Action = "itemUpdated",
                BranchId = branchId,
                RecordId = updated.OrderItemId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT item status advanced successfully.",
            data = updated
        });
    }

    // DELETE /api/v1/kot/items/{itemId} OR /api/v1/kot/orders/{orderId}/items/{itemId}
    [Authorize(Roles = KotStaffRoles)]
    [HttpDelete("orders/{orderId:long}/items/{itemId:long}")]
    [HttpDelete("items/{itemId:long}")]
    public async Task<IActionResult> DeleteKotOrderItem([FromRoute] long itemId, [FromRoute] long? orderId)
    {
        var (allowed, branchId, error) = await AuthorizeOrderItemBranchAsync(itemId, orderId);
        if (!allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = error });
        }

        var result = await _kotService.DeleteKotOrderItemAsync(itemId, orderId);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {itemId} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemDeleted", new { itemId, orderId });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemDeleted",
                Module = "Kitchen",
                Action = "itemDeleted",
                BranchId = branchId,
                RecordId = itemId.ToString(),
                Data = new { itemId, orderId }
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new { success = true, message = $"KOT item {itemId} removed successfully." });
    }
}

public class AddKotItemRequestDto
{
    public long OrderId { get; set; }
    public long? MenuItemId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
}
