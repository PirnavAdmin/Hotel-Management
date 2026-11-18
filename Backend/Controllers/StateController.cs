using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1")]
[Route("api")]
public class StateController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly TableService _tableService;
    private readonly MenuItemService _menuItemService;
    private readonly StaffService _staffService;
    private readonly RestaurantSettingsService _settingsService;
    private readonly InventoryService _inventoryService;
    private readonly ITableLockService _tableLockService;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly ILogger<StateController> _logger;

    public StateController(
        AppDbContext context,
        SpService spService,
        TableService tableService,
        MenuItemService menuItemService,
        StaffService staffService,
        RestaurantSettingsService settingsService,
        InventoryService inventoryService,
        ITableLockService tableLockService,
        ISseBroadcaster sseBroadcaster,
        IRealtimeSyncService realtimeSync,
        ILogger<StateController> logger)
    {
        _context = context;
        _spService = spService;
        _tableService = tableService;
        _menuItemService = menuItemService;
        _staffService = staffService;
        _settingsService = settingsService;
        _inventoryService = inventoryService;
        _tableLockService = tableLockService;
        _sseBroadcaster = sseBroadcaster;
        _realtimeSync = realtimeSync;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves full POS runtime state (tables, active orders, past orders, categories, menu items, staff, table locks).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        try
        {
            _logger.LogInformation("Fetching complete POS state via SPs.");

            var rawTables = await _tableService.GetTablesAsync();
            var tables = rawTables.ConvertAll(t => new
            {
                id = t.TableId,
                tableId = t.TableId,
                name = !string.IsNullOrWhiteSpace(t.TableNumber) ? t.TableNumber : (!string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : $"Table-{t.TableId}"),
                tableName = !string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : t.TableNumber,
                tableNumber = !string.IsNullOrWhiteSpace(t.TableNumber) ? t.TableNumber : t.TableName,
                branchId = t.BranchId,
                section = !string.IsNullOrWhiteSpace(t.SectionArea) ? t.SectionArea : t.Location,
                location = !string.IsNullOrWhiteSpace(t.Location) ? t.Location : t.SectionArea,
                capacity = t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity,
                status = t.Status,
                server = t.AssignedServerName ?? "Staff",
                assignedServerId = t.AssignedServerId,
                assignedServerName = t.AssignedServerName,
                assignedServerRole = t.AssignedServerRole
            });

            var categoriesList = await _menuItemService.GetCategoriesAsync();
            var categories = categoriesList.ConvertAll(c => new { id = Guid.NewGuid().ToString(), name = c, displayOrder = 0 });

            var rawMenuItems = await _menuItemService.GetMenuItemsAsync();
            var menuItems = rawMenuItems.ConvertAll(m => new
            {
                id = m.MenuItemId.ToString(),
                name = m.DishName,
                category = m.Category,
                price = m.Price,
                isVeg = m.DietaryType.ToLower() == "veg",
                spiceLevel = m.SpiceLevel == 0 ? "Mild" : (m.SpiceLevel == 1 ? "Medium" : "Spicy"),
                description = m.ShortDescription,
                prepTimeMinutes = m.PrepTimeMinutes ?? 15,
                isAvailable = m.IsAvailable,
                imageUrl = m.ImageUrl
            });

            var rawStaff = await _staffService.GetStaffListAsync();
            var staff = rawStaff.ConvertAll(s => new
            {
                id = s.StaffId,
                name = s.FullName,
                role = s.RoleTitle,
                phone = s.Phone,
                shift = s.Shift,
                status = s.IsActive ? "active" : "inactive"
            });

            var rawIngredients = await _spService.ExecuteQueryAsync("sp_GetIngredients", InventoryController.MapIngredientFromReader);
            var ingredients = rawIngredients.ConvertAll(i => new
            {
                id = i.IngredientId.ToString(),
                ingredientId = i.IngredientId,
                name = i.Name,
                unit = i.Unit,
                stock = i.CurrentStock,
                currentStock = i.CurrentStock,
                minThreshold = i.MinimumThreshold,
                minimumThreshold = i.MinimumThreshold,
                mrp = i.UnitCost,
                unitCost = i.UnitCost,
                category = i.Category,
                subCategory = i.Subcategory,
                supplier = i.Supplier
            });

            var rawActiveOrders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .Where(o => o.IsActive && !o.IsDeleted &&
                    (o.Status == "Active" || o.Status == "active" || o.Status == "Billed" || o.Status == "billed"))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            var activeOrders = rawActiveOrders.ConvertAll(o => new
            {
                id = o.Id,
                orderId = o.Id,
                orderNumber = o.OrderNumber,
                tableId = o.TableId,
                tableName = !string.IsNullOrWhiteSpace(o.TableName) ? o.TableName : $"Table {o.TableId}",
                status = o.Status,
                orderType = o.OrderType,
                totalAmount = o.GrandTotal > 0 ? o.GrandTotal : o.Subtotal,
                grandTotal = o.GrandTotal > 0 ? o.GrandTotal : o.Subtotal,
                subtotal = o.Subtotal,
                taxAmount = o.TaxAmount,
                discountAmount = o.DiscountAmount,
                server = !string.IsNullOrWhiteSpace(o.ServerName) ? o.ServerName : "Staff",
                createdAt = o.CreatedAt,
                items = o.Items.Where(i => !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase)).Select(i => new
                {
                    id = i.Id,
                    menuItemId = i.MenuItemId,
                    name = i.Name,
                    price = i.Price,
                    quantity = i.Quantity,
                    kotStatus = i.KotStatus
                })
            });

            var rawInvoices = await _context.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .OrderByDescending(i => i.CreatedAt)
                .Take(250)
                .ToListAsync();

            var pastOrders = rawInvoices.ConvertAll(inv => new
            {
                id = inv.InvoiceId,
                invoiceId = inv.InvoiceId,
                invoiceNo = inv.InvoiceNumber,
                invoiceNumber = inv.InvoiceNumber,
                orderId = inv.OrderId,
                tableName = !string.IsNullOrWhiteSpace(inv.TableName) ? inv.TableName : "Dining Table",
                server = !string.IsNullOrWhiteSpace(inv.ServerName) ? inv.ServerName : "Staff",
                status = !string.IsNullOrWhiteSpace(inv.Status) ? inv.Status : "Paid",
                isPaid = true,
                grandTotal = inv.TotalAmount,
                totalAmount = inv.TotalAmount,
                subtotal = inv.Subtotal > 0 ? inv.Subtotal : inv.TotalAmount,
                taxAmount = inv.TaxAmount,
                discountAmount = inv.DiscountAmount,
                paidAmount = inv.PaidAmount > 0 ? inv.PaidAmount : inv.TotalAmount,
                paymentMethod = inv.Payments != null && inv.Payments.Count > 0 ? inv.Payments.Last().PaymentMode : (!string.IsNullOrWhiteSpace(inv.PaymentMethod) ? inv.PaymentMethod : "Cash"),
                createdAt = inv.CreatedAt,
                date = inv.CreatedAt.ToString("yyyy-MM-dd"),
                settledAt = inv.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            });

            var restaurantSettings = await _settingsService.GetSettingsAsync();
            var activeTableLocks = _tableLockService.GetAllActiveLocks();

            var stateData = new
            {
                tables,
                activeOrders,
                categories,
                menuItems,
                staff,
                pastOrders,
                ingredients,
                gourmet_pos_inventory_v2 = ingredients,
                gourmet_pos_inventory_v1 = ingredients,
                restaurantSettings,
                gourmet_pos_settings_v1 = restaurantSettings,
                tableLocks = activeTableLocks,
                avsr_table_locks_v1 = activeTableLocks
            };

            return Ok(new PosStateResponseDto
            {
                Success = true,
                Message = "POS state loaded successfully.",
                Tables = tables,
                ActiveOrders = activeOrders,
                Categories = categories,
                MenuItems = menuItems,
                Staff = staff,
                PastOrders = pastOrders,
                Ingredients = ingredients,
                GourmetPosInventoryV2 = ingredients,
                RestaurantSettings = restaurantSettings,
                GourmetPosSettingsV1 = restaurantSettings,
                Data = stateData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching POS state.");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving POS state." });
        }
    }

    /// <summary>
    /// Synchronizes POS client changes to the database and broadcasts to all connected clients.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncState([FromBody] JsonElement syncPayload)
    {
        try
        {
            _logger.LogInformation("Processing POS sync payload.");

            if (syncPayload.ValueKind == JsonValueKind.Object)
            {
                // 1. Restaurant Settings
                JsonElement settingsElement = default;
                bool hasSettings = syncPayload.TryGetProperty("gourmet_pos_settings_v1", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurantSettings", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurant_settings", out settingsElement);

                if (hasSettings && settingsElement.ValueKind == JsonValueKind.Object)
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var settingsDto = JsonSerializer.Deserialize<RestaurantSettingsDto>(settingsElement.GetRawText(), options);
                    if (settingsDto != null && !string.IsNullOrWhiteSpace(settingsDto.RestaurantName))
                    {
                        _logger.LogInformation("Syncing restaurant settings via /api/sync. Restaurant Name: {Name}", settingsDto.RestaurantName);
                        await _settingsService.SaveSettingsAsync(settingsDto);
                    }
                }

                // 2. Inventory Items
                JsonElement invElement = default;
                bool hasInv = syncPayload.TryGetProperty("gourmet_pos_inventory_v2", out invElement) ||
                              syncPayload.TryGetProperty("gourmet_pos_inventory_v1", out invElement) ||
                              syncPayload.TryGetProperty("inventory", out invElement) ||
                              syncPayload.TryGetProperty("ingredients", out invElement);

                if (hasInv)
                {
                    var items = _inventoryService.ParseJsonPayload(invElement);
                    if (items.Count > 0)
                    {
                        _logger.LogInformation("Syncing {Count} inventory items via /api/sync through InventoryService.", items.Count);
                        await _inventoryService.ProcessInventorySubmissionAsync(items, atomic: false);
                    }
                }

                // 3. Table Concurrency Locks
                JsonElement locksElement = default;
                bool hasLocks = syncPayload.TryGetProperty("avsr_table_locks_v1", out locksElement) ||
                                syncPayload.TryGetProperty("tableLocks", out locksElement) ||
                                syncPayload.TryGetProperty("SYNC_TABLE_LOCKS", out locksElement);

                if (hasLocks && locksElement.ValueKind == JsonValueKind.Object)
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var incomingLocks = JsonSerializer.Deserialize<Dictionary<string, TableLockDto>>(locksElement.GetRawText(), options);
                    if (incomingLocks != null)
                    {
                        _tableLockService.SyncLocks(incomingLocks);
                    }
                }

                // 4. Restaurant Tables - Merge local table definitions into database
                JsonElement tablesElement = default;
                bool hasTables = syncPayload.TryGetProperty("gourmet_pos_tables_v1", out tablesElement) ||
                                 syncPayload.TryGetProperty("tables", out tablesElement);

                if (hasTables && tablesElement.ValueKind == JsonValueKind.Array)
                {
                    try
                    {
                        var existingTables = await _context.RestaurantTables.ToListAsync();
                        foreach (var tbl in tablesElement.EnumerateArray())
                        {
                            string? name = tbl.TryGetProperty("name", out var np) ? np.GetString() : (tbl.TryGetProperty("tableName", out var tnp) ? tnp.GetString() : null);
                            if (string.IsNullOrWhiteSpace(name)) continue;
                            name = name.Trim();
                            string section = tbl.TryGetProperty("section", out var sp) ? sp.GetString() ?? "Main Hall" : "Main Hall";
                            int capacity = tbl.TryGetProperty("capacity", out var cp) && cp.TryGetInt32(out var cVal) ? cVal : 4;
                            string status = tbl.TryGetProperty("status", out var stp) ? stp.GetString() ?? "available" : "available";
                            if (status == "vacant") status = "available";

                            var match = existingTables.FirstOrDefault(et =>
                                string.Equals(et.TableName, name, StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(et.TableNumber, name, StringComparison.OrdinalIgnoreCase));

                            if (match == null)
                            {
                                var newTbl = new RestaurantTable
                                {
                                    BranchId = 1,
                                    TableNumber = name,
                                    TableName = name,
                                    Capacity = capacity,
                                    CapacityChairs = capacity,
                                    Location = section,
                                    SectionArea = section,
                                    Status = status,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.RestaurantTables.Add(newTbl);
                                existingTables.Add(newTbl);
                            }
                            else
                            {
                                match.Capacity = capacity;
                                match.CapacityChairs = capacity;
                                match.Location = section;
                                match.SectionArea = section;
                                if (!string.IsNullOrWhiteSpace(status)) match.Status = status;
                                match.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Synchronized restaurant tables to database.");
                    }
                    catch (Exception tex)
                    {
                        _logger.LogWarning(tex, "Non-fatal error while syncing tables to database.");
                    }
                }

                // 5. Menu Items - Merge local menu items into database
                JsonElement menuElement = default;
                bool hasMenu = syncPayload.TryGetProperty("gourmet_pos_menu_v1", out menuElement) ||
                               syncPayload.TryGetProperty("menuItems", out menuElement);

                if (hasMenu && menuElement.ValueKind == JsonValueKind.Array)
                {
                    try
                    {
                        var existingMenu = await _context.MenuItems.ToListAsync();
                        foreach (var item in menuElement.EnumerateArray())
                        {
                            string? dishName = item.TryGetProperty("name", out var np) ? np.GetString() : (item.TryGetProperty("dishName", out var dnp) ? dnp.GetString() : null);
                            if (string.IsNullOrWhiteSpace(dishName)) continue;
                            dishName = dishName.Trim();
                            string category = item.TryGetProperty("category", out var cp) ? cp.GetString() ?? "Main Course" : "Main Course";
                            decimal price = item.TryGetProperty("price", out var pp) && pp.TryGetDecimal(out var pVal) ? pVal : 0;
                            string dietary = item.TryGetProperty("isVeg", out var vp) && vp.GetBoolean() ? "VEG" : (item.TryGetProperty("dietaryType", out var dtp) ? dtp.GetString() ?? "NON-VEG" : "NON-VEG");
                            bool isAvailable = !item.TryGetProperty("isAvailable", out var ap) || ap.GetBoolean();
                            string? imageUrl = item.TryGetProperty("image", out var ip) ? ip.GetString() : (item.TryGetProperty("imageUrl", out var iup) ? iup.GetString() : null);

                            var match = existingMenu.FirstOrDefault(em => string.Equals(em.DishName, dishName, StringComparison.OrdinalIgnoreCase));
                            if (match == null && price > 0)
                            {
                                var newMenuItem = new MenuItem
                                {
                                    DishName = dishName,
                                    Category = category,
                                    Price = price,
                                    DietaryType = dietary,
                                    IsAvailable = isAvailable,
                                    ImageUrl = imageUrl,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.MenuItems.Add(newMenuItem);
                                existingMenu.Add(newMenuItem);
                            }
                            else if (match != null)
                            {
                                if (price > 0) match.Price = price;
                                match.IsAvailable = isAvailable;
                                if (!string.IsNullOrWhiteSpace(category)) match.Category = category;
                                if (!string.IsNullOrWhiteSpace(imageUrl)) match.ImageUrl = imageUrl;
                                match.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Synchronized menu items to database.");
                    }
                    catch (Exception mex)
                    {
                        _logger.LogWarning(mex, "Non-fatal error while syncing menu items to database.");
                    }
                }

                // 6. Staff List - Merge local staff into database
                JsonElement staffElement = default;
                bool hasStaff = syncPayload.TryGetProperty("gourmet_pos_staff_v1", out staffElement) ||
                                syncPayload.TryGetProperty("staff", out staffElement) ||
                                syncPayload.TryGetProperty("staffList", out staffElement);

                if (hasStaff && staffElement.ValueKind == JsonValueKind.Array)
                {
                    try
                    {
                        var existingStaff = await _context.StaffPersons.ToListAsync();
                        foreach (var s in staffElement.EnumerateArray())
                        {
                            string? name = s.TryGetProperty("name", out var np) ? np.GetString() : (s.TryGetProperty("fullName", out var fnp) ? fnp.GetString() : null);
                            if (string.IsNullOrWhiteSpace(name)) continue;
                            name = name.Trim();
                            string role = s.TryGetProperty("role", out var rp) ? rp.GetString() ?? "Staff" : (s.TryGetProperty("roleTitle", out var rtp) ? rtp.GetString() ?? "Staff" : "Staff");
                            string phone = s.TryGetProperty("phone", out var php) ? php.GetString() ?? "" : "";
                            string shift = s.TryGetProperty("shift", out var shp) ? shp.GetString() ?? "Full Day" : "Full Day";

                            var match = existingStaff.FirstOrDefault(es => string.Equals(es.FullName, name, StringComparison.OrdinalIgnoreCase));
                            if (match == null)
                            {
                                var newStaff = new StaffPerson
                                {
                                    FullName = name,
                                    RoleTitle = role,
                                    Phone = phone,
                                    Shift = shift,
                                    IsActive = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.StaffPersons.Add(newStaff);
                                existingStaff.Add(newStaff);
                            }
                        }
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Synchronized staff list to database.");
                    }
                    catch (Exception stex)
                    {
                        _logger.LogWarning(stex, "Non-fatal error while syncing staff to database.");
                    }
                }

                // 7. Invoices & Settled Orders - Merge local invoices into database
                JsonElement ordersElement = default;
                bool hasOrders = syncPayload.TryGetProperty("gourmet_pos_past_orders_v2_inr", out ordersElement) ||
                                 syncPayload.TryGetProperty("pastOrders", out ordersElement);

                if (hasOrders && ordersElement.ValueKind == JsonValueKind.Array)
                {
                    try
                    {
                        var existingInvoices = await _context.Invoices.Select(i => i.InvoiceNumber).ToListAsync();
                        var existingSet = new HashSet<string>(existingInvoices, StringComparer.OrdinalIgnoreCase);

                        foreach (var ord in ordersElement.EnumerateArray())
                        {
                            string? invNo = ord.TryGetProperty("invoiceNo", out var inp) ? inp.GetString() : (ord.TryGetProperty("invoiceNumber", out var inump) ? inump.GetString() : null);
                            if (string.IsNullOrWhiteSpace(invNo) || existingSet.Contains(invNo)) continue;

                            decimal total = ord.TryGetProperty("grandTotal", out var gp) && gp.TryGetDecimal(out var gVal) ? gVal : (ord.TryGetProperty("totalAmount", out var tp) && tp.TryGetDecimal(out var tVal) ? tVal : 0);
                            decimal subtotal = ord.TryGetProperty("subtotal", out var subp) && subp.TryGetDecimal(out var subVal) ? subVal : total;
                            decimal tax = ord.TryGetProperty("taxAmount", out var taxp) && taxp.TryGetDecimal(out var taxVal) ? taxVal : 0;
                            string paymentMethod = ord.TryGetProperty("paymentMethod", out var pmp) ? pmp.GetString() ?? "CASH" : "CASH";
                            string tableName = ord.TryGetProperty("tableName", out var tnp) ? tnp.GetString() ?? "Dining" : "Dining";

                            var invoice = new Invoice
                            {
                                InvoiceNumber = invNo,
                                OrderId = 0,
                                TotalAmount = total,
                                Subtotal = subtotal,
                                TaxAmount = tax,
                                PaidAmount = total,
                                AmountPaid = total,
                                PaymentMethod = paymentMethod,
                                TableName = tableName,
                                Status = "PAID",
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.Invoices.Add(invoice);
                            existingSet.Add(invNo);
                        }
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Synchronized past orders/invoices to database.");
                    }
                    catch (Exception oex)
                    {
                        _logger.LogWarning(oex, "Non-fatal error while syncing invoices to database.");
                    }
                }
            }

            // Real-time broadcast to all connected clients over SSE & SignalR!
            await _sseBroadcaster.BroadcastAsync("SYNC", syncPayload);
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "state:synced",
                Module = "State",
                Action = "synced",
                BranchId = 1,
                Data = syncPayload
            });

            return Ok(new
            {
                success = true,
                message = "POS state synchronized successfully.",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing POS sync.");
            return StatusCode(500, new { success = false, message = "An error occurred while synchronizing POS state." });
        }
    }

    /// <summary>
    /// Server-Sent Events (SSE) stream endpoint for live real-time POS & Kitchen updates.
    /// </summary>
    [HttpGet("events")]
    public async Task GetEvents(CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        _logger.LogInformation("Client connected to SSE event stream.");

        try
        {
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            // Periodically emit a lightweight heartbeat in the background
            _ = Task.Run(async () =>
            {
                while (!linkedCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(15000, linkedCts.Token);
                        var heartbeat = JsonSerializer.Serialize(new { eventType = "heartbeat", timestamp = DateTime.UtcNow });
                        await Response.WriteAsync($"data: {heartbeat}\n\n", linkedCts.Token);
                        await Response.Body.FlushAsync(linkedCts.Token);
                    }
                    catch { break; }
                }
            }, linkedCts.Token);

            await foreach (var sseFrame in _sseBroadcaster.SubscribeAsync(cancellationToken))
            {
                await Response.WriteAsync(sseFrame, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (TaskCanceledException)
        {
            _logger.LogInformation("SSE client disconnected from event stream.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SSE event stream.");
        }
    }
}
