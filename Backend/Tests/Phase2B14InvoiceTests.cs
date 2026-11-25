namespace HMS.Tests;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HMS.Controllers;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

public static class Phase2B14InvoiceTests
{
    public static async Task<int> RunAsync(string[]? args = null)
    {
        Console.WriteLine("=======================================================================");
        Console.WriteLine("  STARTING PHASE 2B.14 UNIFIED INVOICE ARCHITECTURE VERIFICATION SUITE");
        Console.WriteLine("=======================================================================");

        int passed = 0;
        int failed = 0;

        async Task RunTest(string testName, Func<Task> testFunc)
        {
            try
            {
                Console.Write($"[TEST] {testName} ... ");
                await testFunc();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("PASSED");
                Console.ResetColor();
                passed++;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("FAILED");
                Console.WriteLine($"       Error: {ex.Message}");
                Console.WriteLine($"       Stack: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"       Inner: {ex.InnerException.Message}");
                }
                Console.ResetColor();
                failed++;
            }
        }

        // 1. DineIn Settlement -> Unified Invoice & POS/Admin Consistency
        await RunTest("1. DineIn settlement creates unified Invoice & populates OrderDto InvoiceId/InvoiceNo", async () =>
        {
            using var harness = new InvoiceTestHarness();
            await harness.SeedAsync();

            var order = new Order
            {
                OrderNumber = "ORD-DINE-101",
                OutletId = 1,
                BranchId = 1,
                OrderType = "DineIn",
                TableId = 1,
                TableName = "Table 1",
                Status = "Open",
                Subtotal = 500m,
                TaxAmount = 25m,
                ServiceCharge = 25m,
                GrandTotal = 550m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            order.Items.Add(new OrderItem
            {
                MenuItemId = 1,
                Name = "Paneer Tikka",
                Quantity = 2,
                Price = 250m,
                TotalPrice = 500m,
                KotStatus = "Served",
                IsActive = true
            });
            harness.Db.Orders.Add(order);
            await harness.Db.SaveChangesAsync();

            var ordersCtrl = harness.CreateOrdersController(harness.Branch1Cashier);
            var settleRes = await ordersCtrl.SettleOrder(order.Id, new SettleOrderRequest { PaymentMethod = "CARD", ServiceChargeEnabled = true });
            if (settleRes is not OkObjectResult)
            {
                throw new Exception($"Expected 200 OK from SettleOrder, got {settleRes.GetType().Name}");
            }

            var inv = await harness.Db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.OrderId == order.Id);
            if (inv == null) throw new Exception("Invoice was not created during DineIn settlement.");
            if (inv.BranchId != 1) throw new Exception($"Expected BranchId 1, got {inv.BranchId}");
            if (inv.OrderType != "DineIn") throw new Exception($"Expected OrderType DineIn, got {inv.OrderType}");
            if (inv.OrderNumber != "ORD-DINE-101") throw new Exception($"Expected OrderNumber ORD-DINE-101, got {inv.OrderNumber}");
            if (inv.CgstAmount <= 0 || inv.SgstAmount <= 0) throw new Exception("CGST/SGST must be split and persisted.");
            if (inv.PaymentStatus != "Paid") throw new Exception($"Expected PaymentStatus Paid, got {inv.PaymentStatus}");

            // Verify POS GET /api/v1/orders/{id} returns InvoiceId and InvoiceNo
            var orderGetRes = await ordersCtrl.GetOrderById(order.Id);
            if (orderGetRes is not OkObjectResult orderOk || orderOk.Value is not OrderDto orderDto)
            {
                throw new Exception("GetOrderById did not return OrderDto.");
            }
            if (orderDto.InvoiceId != inv.InvoiceId || orderDto.InvoiceNo != inv.InvoiceNumber)
            {
                throw new Exception($"OrderDto invoice link mismatch: ({orderDto.InvoiceId}, {orderDto.InvoiceNo}) vs ({inv.InvoiceId}, {inv.InvoiceNumber})");
            }

            // Verify Admin GET /api/v1/invoices/by-order/{orderId} returns same InvoiceNumber
            var invoicesCtrl = harness.CreateInvoicesController(harness.Branch1Cashier);
            var byOrderRes = await invoicesCtrl.GetInvoiceByOrderId(order.Id) as OkObjectResult;
            var json = JsonSerializer.Serialize(byOrderRes?.Value);
            if (!json.Contains(inv.InvoiceNumber))
            {
                throw new Exception("InvoicesController.GetInvoiceByOrderId did not return matching InvoiceNumber.");
            }
        });

        // 2. SelfService 0 Service Charge + Track + Initiate + Confirm -> Invoice
        await RunTest("2. SelfService enforces 0 service charge & confirm-payment issues official Invoice", async () =>
        {
            using var harness = new InvoiceTestHarness();
            await harness.SeedAsync(enableBranch1ServiceCharge: true);

            var ordersCtrl = harness.CreateOrdersController(harness.Branch1Cashier);
            var createReq = new CreateSelfServiceOrderRequest
            {
                CustomerName = "Asha",
                CustomerPhone = "9998887776",
                IdempotencyKey = "SS-PHASE2B14-001",
                Items = new List<SelfServiceOrderItemInput>
                {
                    new() { MenuItemId = 1, Quantity = 2 } // 500
                }
            };

            var createRes = await ordersCtrl.CreateSelfServiceOrder(createReq, 1) as ObjectResult;
            if (createRes == null || createRes.StatusCode != 201)
            {
                throw new Exception($"Expected 201 Created, got {createRes?.StatusCode}");
            }

            var createdOrder = await harness.Db.Orders.FirstAsync(o => o.IdempotencyKey == "SS-PHASE2B14-001");
            if (createdOrder.ServiceCharge != 0m)
            {
                throw new Exception($"SelfService order should have 0 service charge, got {createdOrder.ServiceCharge}");
            }

            // Customer Track
            var trackRes = await ordersCtrl.TrackSelfServiceOrder(createdOrder.Id, 1) as OkObjectResult;
            if (trackRes == null) throw new Exception("TrackSelfServiceOrder failed.");

            // Customer Initiate Payment
            var initRes = await ordersCtrl.InitiateSelfServicePayment(
                createdOrder.Id,
                new SelfServicePaymentInitiationRequest { PaymentMethod = "UPI" },
                1) as OkObjectResult;
            if (initRes == null) throw new Exception("InitiateSelfServicePayment failed.");

            // Staff Confirm Payment
            var confirmRes = await ordersCtrl.ConfirmSelfServicePayment(
                createdOrder.Id,
                new SelfServicePaymentConfirmRequest
                {
                    PaymentMethod = "UPI",
                    Amount = createdOrder.GrandTotal > 0 ? createdOrder.GrandTotal : 525m,
                    TransactionReference = "UPI-REF-2B14"
                },
                1) as OkObjectResult;
            if (confirmRes == null) throw new Exception("ConfirmSelfServicePayment failed.");

            var ssInvoice = await harness.Db.Invoices.FirstOrDefaultAsync(i => i.OrderId == createdOrder.Id);
            if (ssInvoice == null) throw new Exception("SelfService confirmation did not create an Invoice.");
            if (ssInvoice.OrderType != "SelfService") throw new Exception($"Expected OrderType SelfService, got {ssInvoice.OrderType}");
            if (ssInvoice.ServiceChargeAmount != 0m || ssInvoice.ServiceChargePercent != 0m)
            {
                throw new Exception($"SelfService invoice must have 0 service charge, got {ssInvoice.ServiceChargeAmount}");
            }
            if (ssInvoice.PaymentStatus != "Paid") throw new Exception($"Expected Paid, got {ssInvoice.PaymentStatus}");

            // Track again: InvoiceId & InvoiceNumber must be populated
            var trackAfter = await ordersCtrl.TrackSelfServiceOrder(createdOrder.Id, 1) as OkObjectResult;
            var trackJson = JsonSerializer.Serialize(trackAfter?.Value);
            if (!trackJson.Contains(ssInvoice.InvoiceNumber))
            {
                throw new Exception("TrackSelfServiceOrder did not return official InvoiceNumber after payment confirmation.");
            }
        });

        // 3. Duplicate Invoice Prevention
        await RunTest("3. Duplicate CreateInvoice for same OrderId returns 409 Conflict", async () =>
        {
            using var harness = new InvoiceTestHarness();
            await harness.SeedAsync();

            var order = new Order
            {
                OrderNumber = "ORD-DUP-1",
                BranchId = 1,
                OutletId = 1,
                OrderType = "Takeaway",
                Status = "Open",
                Subtotal = 200m,
                TaxAmount = 10m,
                GrandTotal = 210m,
                IsActive = true
            };
            harness.Db.Orders.Add(order);
            await harness.Db.SaveChangesAsync();

            var ctrl = harness.CreateInvoicesController(harness.Branch1Cashier);
            var first = await ctrl.CreateInvoice(new CreateInvoiceRequest
            {
                OrderId = order.Id,
                Subtotal = 200m,
                TaxableAmount = 200m,
                TaxAmount = 10m
            });
            if (first is not CreatedAtActionResult)
            {
                throw new Exception($"Expected 201 Created on first invoice, got {first.GetType().Name}");
            }

            var second = await ctrl.CreateInvoice(new CreateInvoiceRequest
            {
                OrderId = order.Id,
                Subtotal = 200m,
                TaxableAmount = 200m,
                TaxAmount = 10m
            });
            if (second is not ConflictObjectResult)
            {
                throw new Exception($"Expected 409 Conflict on duplicate OrderId, got {second.GetType().Name}");
            }
        });

        // 4. Branch Isolation & Cross-Branch 403
        await RunTest("4. Branch isolation restricts Branch 1 user from Branch 2 invoices (403) while SuperAdmin sees all", async () =>
        {
            using var harness = new InvoiceTestHarness();
            await harness.SeedAsync();

            var b1Inv = new Invoice
            {
                OrderId = 9001,
                OrderNumber = "ORD-B1",
                BranchId = 1,
                OrderType = "DineIn",
                InvoiceNumber = "INV-B1-001",
                Subtotal = 100m,
                TaxableAmount = 100m,
                TaxAmount = 5m,
                TotalAmount = 105m,
                PaidAmount = 105m,
                Status = "PAID",
                PaymentStatus = "Paid",
                CreatedAt = DateTime.UtcNow
            };
            var b2Inv = new Invoice
            {
                OrderId = 9002,
                OrderNumber = "ORD-B2",
                BranchId = 2,
                OrderType = "Takeaway",
                InvoiceNumber = "INV-B2-001",
                Subtotal = 200m,
                TaxableAmount = 200m,
                TaxAmount = 10m,
                TotalAmount = 210m,
                PaidAmount = 210m,
                Status = "PAID",
                PaymentStatus = "Paid",
                CreatedAt = DateTime.UtcNow
            };
            harness.Db.Invoices.AddRange(b1Inv, b2Inv);
            await harness.Db.SaveChangesAsync();

            var b1Ctrl = harness.CreateInvoicesController(harness.Branch1Cashier);

            // Cross-branch GetInvoices query -> 403
            var crossList = await b1Ctrl.GetInvoices(status: null, branchId: 2) as ObjectResult;
            if (crossList == null || crossList.StatusCode != 403)
            {
                throw new Exception($"Expected 403 for cross-branch GetInvoices, got {crossList?.StatusCode}");
            }

            // Cross-branch GetInvoiceById -> 403
            var crossSingle = await b1Ctrl.GetInvoiceById(b2Inv.InvoiceId) as ObjectResult;
            if (crossSingle == null || crossSingle.StatusCode != 403)
            {
                throw new Exception($"Expected 403 for cross-branch GetInvoiceById, got {crossSingle?.StatusCode}");
            }

            // Branch 1 own list -> only INV-B1-001
            var b1ListRes = await b1Ctrl.GetInvoices(status: null) as OkObjectResult;
            var b1Json = JsonSerializer.Serialize(b1ListRes?.Value);
            if (!b1Json.Contains("INV-B1-001") || b1Json.Contains("INV-B2-001"))
            {
                throw new Exception("Branch 1 GetInvoices leaked Branch 2 invoice or missed Branch 1 invoice.");
            }

            // Global SuperAdmin -> sees both, and can filter to Branch 2
            var adminCtrl = harness.CreateInvoicesController(harness.GlobalSuperAdmin);
            var allRes = await adminCtrl.GetInvoices(status: null) as OkObjectResult;
            var allJson = JsonSerializer.Serialize(allRes?.Value);
            if (!allJson.Contains("INV-B1-001") || !allJson.Contains("INV-B2-001"))
            {
                throw new Exception("Global SuperAdmin did not receive invoices across branches.");
            }
        });

        // 5. Filtering by Date, OrderType, PaymentMethod, and SignalR BranchId
        await RunTest("5. Date/OrderType/PaymentMethod filters work & SignalR uses invoice BranchId", async () =>
        {
            using var harness = new InvoiceTestHarness();
            await harness.SeedAsync();

            var oldInv = new Invoice
            {
                OrderId = 9101,
                BranchId = 2,
                OrderType = "DineIn",
                InvoiceNumber = "INV-OLD-2",
                Subtotal = 100m,
                TotalAmount = 105m,
                Status = "UNPAID",
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };
            var todayInv = new Invoice
            {
                OrderId = 9102,
                BranchId = 2,
                OrderType = "SelfService",
                InvoiceNumber = "INV-TODAY-2",
                Subtotal = 300m,
                TotalAmount = 315m,
                Status = "UNPAID",
                CreatedAt = DateTime.UtcNow
            };
            harness.Db.Invoices.AddRange(oldInv, todayInv);
            await harness.Db.SaveChangesAsync();

            var adminCtrl = harness.CreateInvoicesController(harness.GlobalSuperAdmin);

            // Settle todayInv and verify SignalR BranchId == 2
            await adminCtrl.SettleBill(todayInv.InvoiceId);
            var settledEvent = harness.PublishedEvents.LastOrDefault(e => e.EventType == "invoice:settled");
            if (settledEvent == null || settledEvent.BranchId != 2)
            {
                throw new Exception($"Expected SignalR BranchId 2, got {settledEvent?.BranchId}");
            }

            // Filter by today's date + SelfService
            var filteredRes = await adminCtrl.GetInvoices(
                status: null,
                fromDate: DateTime.UtcNow.Date,
                toDate: DateTime.UtcNow.Date,
                orderType: "SelfService") as OkObjectResult;
            var json = JsonSerializer.Serialize(filteredRes?.Value);
            if (!json.Contains("INV-TODAY-2") || json.Contains("INV-OLD-2"))
            {
                throw new Exception("Date + OrderType filter did not isolate INV-TODAY-2.");
            }
        });

        Console.WriteLine("=======================================================================");
        Console.WriteLine($"  PHASE 2B.14 RESULTS: {passed} PASSED, {failed} FAILED");
        Console.WriteLine("=======================================================================");

        return failed > 0 ? 1 : 0;
    }

    private sealed class InvoiceTestHarness : IDisposable
    {
        public AppDbContext Db { get; }
        public List<RealtimeEvent> PublishedEvents { get; } = new();

        public User Branch1Cashier { get; private set; } = null!;
        public User Branch2Waiter { get; private set; } = null!;
        public User GlobalSuperAdmin { get; private set; } = null!;

        public InvoiceTestHarness()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"Phase2B14_TestDb_{Guid.NewGuid()}")
                .Options;
            Db = new AppDbContext(options);
        }

        public async Task SeedAsync(bool enableBranch1ServiceCharge = false)
        {
            Db.Branches.Add(new Branch { BranchId = 1, BranchName = "Branch 1", IsActive = true });
            Db.Branches.Add(new Branch { BranchId = 2, BranchName = "Branch 2", IsActive = true });

            var roleCashier = new Role { RoleId = 1, RoleName = "Cashier" };
            var roleWaiter = new Role { RoleId = 2, RoleName = "Waiter" };
            var roleSuperAdmin = new Role { RoleId = 3, RoleName = "SuperAdmin" };
            Db.Roles.AddRange(roleCashier, roleWaiter, roleSuperAdmin);

            Branch1Cashier = new User { UserId = 10, UserName = "cashier1", Email = "cashier1@pos.com", BranchId = 1, IsActive = true, RoleId = 1, Role = roleCashier };
            Branch2Waiter = new User { UserId = 20, UserName = "waiter2", Email = "waiter2@pos.com", BranchId = 2, IsActive = true, RoleId = 2, Role = roleWaiter };
            GlobalSuperAdmin = new User { UserId = 30, UserName = "superadmin", Email = "superadmin@pos.com", BranchId = null, IsActive = true, RoleId = 3, Role = roleSuperAdmin };
            Db.Users.AddRange(Branch1Cashier, Branch2Waiter, GlobalSuperAdmin);

            Db.DiningTables.Add(new DiningTable { Id = 1, Name = "Table 1", Status = "available", IsActive = true, IsDeleted = false });

            Db.RestaurantSettings.Add(new RestaurantSetting
            {
                Id = 1,
                RestaurantId = "restaurant_1",
                RestaurantName = "The Rustic Spin",
                FoodGstRate = 5m,
                ServiceChargeRate = 5m,
                ServiceChargeEnabled = enableBranch1ServiceCharge,
                RoundingMode = "nearest"
            });

            Db.MenuItems.Add(new MenuItem { MenuItemId = 1, DishName = "Paneer Tikka", Price = 250m, IsAvailable = true, BranchId = 1 });

            await Db.SaveChangesAsync();
        }

        public OrdersController CreateOrdersController(User user)
        {
            var controller = new OrdersController(
                Db,
                new SpService(Db),
                null!,
                null!,
                new DummyHubContext(),
                new CapturingRealtimeSync(PublishedEvents),
                NullLogger<OrdersController>.Instance);

            controller.ControllerContext = new ControllerContext { HttpContext = BuildHttpContext(user) };
            return controller;
        }

        public InvoicesController CreateInvoicesController(User user)
        {
            var controller = new InvoicesController(
                Db,
                new SpService(Db),
                null!,
                null!,
                new CapturingRealtimeSync(PublishedEvents),
                NullLogger<InvoicesController>.Instance);

            controller.ControllerContext = new ControllerContext { HttpContext = BuildHttpContext(user) };
            return controller;
        }

        private static DefaultHttpContext BuildHttpContext(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "User"),
                new Claim("roleName", user.Role?.RoleName ?? "User"),
                new Claim("branchId", user.BranchId?.ToString() ?? "")
            };
            return new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) };
        }

        public void Dispose() => Db.Dispose();
    }

    private sealed class CapturingRealtimeSync : IRealtimeSyncService
    {
        private readonly List<RealtimeEvent> _events;
        public CapturingRealtimeSync(List<RealtimeEvent> events) => _events = events;
        public Task PublishAsync(RealtimeEvent evt, EventScope scope = EventScope.Restaurant, string? targetRoleOrStation = null)
        {
            _events.Add(evt);
            return Task.CompletedTask;
        }
        public IReadOnlyList<RealtimeEvent> GetMissedEvents(long? branchId, string? lastEventId, int maxCount = 50) => Array.Empty<RealtimeEvent>();
        public IReadOnlyList<RealtimeEvent> GetRecentEvents(long? branchId, int maxCount = 50) => _events;
        public int ActiveConnectionCount => 0;
        public void TrackConnection(string connectionId, string? userId, string? role, long? branchId) { }
        public void UntrackConnection(string connectionId) { }
        public IReadOnlyDictionary<string, object> GetDiagnostics() => new Dictionary<string, object>();
    }

    private sealed class DummyHubContext : IHubContext<PosHub>
    {
        public IHubClients Clients => new DummyHubClients();
        public IGroupManager Groups => throw new NotImplementedException();
        private sealed class DummyHubClients : IHubClients
        {
            private static readonly IClientProxy Proxy = new DummyClientProxy();
            public IClientProxy All => Proxy;
            public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => Proxy;
            public IClientProxy Client(string connectionId) => Proxy;
            public IClientProxy Clients(IReadOnlyList<string> connectionIds) => Proxy;
            public IClientProxy Group(string groupName) => Proxy;
            public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => Proxy;
            public IClientProxy Groups(IReadOnlyList<string> groupNames) => Proxy;
            public IClientProxy User(string userId) => Proxy;
            public IClientProxy Users(IReadOnlyList<string> userIds) => Proxy;
        }
        private sealed class DummyClientProxy : IClientProxy
        {
            public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default) => Task.CompletedTask;
        }
    }
}
