namespace HMS.Tests;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

public static class Phase2B1OrderCreationTests
{
    public static async Task<int> RunAsync(string[]? args = null)
    {
        Console.WriteLine("=======================================================================");
        Console.WriteLine("  STARTING PHASE 2B.1 SELF SERVICE ORDER CREATION VERIFICATION SUITE");
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
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"       Inner: {ex.InnerException.Message}");
                }
                Console.ResetColor();
                failed++;
            }
        }

        // 1. Valid Self Service Order Creation
        await RunTest("1. Valid Self Service order creates order with SelfService type & authoritative prices", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                CustomerName = "John Doe",
                CustomerPhone = "9876543210",
                CustomerEmail = "john.doe@example.com",
                IdempotencyKey = "IDEMP-TEST-001",
                Items = new List<SelfServiceOrderItemInput>
                {
                    new() { MenuItemId = 1, Quantity = 2 }, // Paneer Tikka @ 250 = 500
                    new() { MenuItemId = 2, Quantity = 4 }  // Butter Naan @ 40 = 160
                }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, 1);
            if (actionResult is not ObjectResult objResult || objResult.StatusCode != 201)
            {
                throw new Exception($"Expected 201 Created, got {actionResult.GetType().Name}");
            }

            var savedOrder = await harness.Db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.IdempotencyKey == "IDEMP-TEST-001");
            if (savedOrder == null) throw new Exception("Order was not saved to database.");
            if (savedOrder.OrderType != "SelfService") throw new Exception($"Expected OrderType 'SelfService', got '{savedOrder.OrderType}'");
            if (savedOrder.Status != "PendingPayment") throw new Exception($"Expected Status 'PendingPayment', got '{savedOrder.Status}'");
            if (savedOrder.PaymentStatus != "Pending") throw new Exception($"Expected PaymentStatus 'Pending', got '{savedOrder.PaymentStatus}'");
            if (savedOrder.TableId != null) throw new Exception("Self Service order should not lock a dining table.");

            if (savedOrder.Items.Count != 2) throw new Exception($"Expected 2 items, got {savedOrder.Items.Count}");
            var item1 = savedOrder.Items.First(i => i.MenuItemId == 1);
            if (item1.Price != 250m) throw new Exception($"Expected authoritative price 250, got {item1.Price}");
            if (item1.TotalPrice != 500m) throw new Exception($"Expected total price 500, got {item1.TotalPrice}");
            if (item1.KotStatus != "Queued") throw new Exception($"Expected KotStatus 'Queued', got '{item1.KotStatus}'");
        });

        // 2. Reject Cross-Branch Menu Items
        await RunTest("2. Reject order if any requested item belongs to another branch", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                CustomerName = "Cross Branch Tester",
                Items = new List<SelfServiceOrderItemInput>
                {
                    new() { MenuItemId = 1, Quantity = 1 }, // Branch 1 item
                    new() { MenuItemId = 5, Quantity = 1 }  // Branch 2 item (cross-branch!)
                }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, 1);
            if (actionResult is not BadRequestObjectResult badReq)
            {
                throw new Exception($"Expected BadRequestObjectResult for cross-branch menu item, got {actionResult.GetType().Name}");
            }
        });

        // 3. Reject Inactive / Unavailable / Deleted Items
        await RunTest("3. Reject unavailable or soft-deleted menu items with HTTP 400", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            
            // Unavailable item
            var req1 = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 3, Quantity = 1 } }
            };
            var res1 = await controller.CreateSelfServiceOrder(req1, 1);
            if (res1 is not BadRequestObjectResult) throw new Exception("Expected BadRequestObjectResult for unavailable item.");

            // Soft-deleted item
            var req2 = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 4, Quantity = 1 } }
            };
            var res2 = await controller.CreateSelfServiceOrder(req2, 1);
            if (res2 is not BadRequestObjectResult) throw new Exception("Expected BadRequestObjectResult for deleted item.");
        });

        // 4. Reject Empty Order Items
        await RunTest("4. Empty order items or invalid quantity rejected with HTTP 400", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var emptyReq = new CreateSelfServiceOrderRequest { Items = new List<SelfServiceOrderItemInput>() };
            var res1 = await controller.CreateSelfServiceOrder(emptyReq, 1);
            if (res1 is not BadRequestObjectResult) throw new Exception("Expected BadRequest for empty items.");

            var invalidQtyReq = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 0 } }
            };
            var res2 = await controller.CreateSelfServiceOrder(invalidQtyReq, 1);
            if (res2 is not BadRequestObjectResult) throw new Exception("Expected BadRequest for quantity 0.");
        });

        // 5. SuperAdmin Active Branch Selection
        await RunTest("5. SuperAdmin can explicitly select an active branch (Branch 2)", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.GlobalSuperAdmin);
            var req = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "SUPERADMIN-BRANCH-2",
                Items = new List<SelfServiceOrderItemInput>
                {
                    new() { MenuItemId = 5, Quantity = 1 } // Branch 2 item
                }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, branchId: 2);
            if (actionResult is not ObjectResult objResult || objResult.StatusCode != 201)
            {
                throw new Exception($"Expected 201 Created for SuperAdmin selecting active Branch 2, got {actionResult.GetType().Name}");
            }

            var saved = await harness.Db.Orders.FirstOrDefaultAsync(o => o.IdempotencyKey == "SUPERADMIN-BRANCH-2");
            if (saved == null || saved.BranchId != 2) throw new Exception("Order was not saved with BranchId = 2.");
        });

        // 6. SuperAdmin Inactive Branch Rejection
        await RunTest("6. SuperAdmin selecting inactive branch (Branch 3) is rejected with HTTP 403", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.GlobalSuperAdmin);
            var req = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, branchId: 3);
            if (actionResult is not ObjectResult objResult || objResult.StatusCode != 403)
            {
                throw new Exception($"Expected 403 Forbidden for inactive branch, got {actionResult.GetType().Name}");
            }
        });

        // 7. Branch-Scoped User Locked to Assigned Branch
        await RunTest("7. Branch-scoped cashier attempting to create order for Branch 2 is rejected with HTTP 403", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, branchId: 2);
            if (actionResult is not ObjectResult objResult || objResult.StatusCode != 403)
            {
                throw new Exception($"Expected 403 Forbidden for cross-branch attempt, got {actionResult.GetType().Name}");
            }
        });

        // 8. Missing Branch Context Rejection (No Branch 1 Fallback)
        await RunTest("8. Missing branch context rejected; never silently defaults to Branch 1", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            // SuperAdmin without branchId in request
            var adminController = harness.CreateOrdersController(harness.GlobalSuperAdmin);
            var req1 = new CreateSelfServiceOrderRequest
            {
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };
            var res1 = await adminController.CreateSelfServiceOrder(req1, branchId: null);
            if (res1 is not ObjectResult obj1 || obj1.StatusCode != 400)
            {
                throw new Exception($"Expected 400 Bad Request for SuperAdmin with no branchId, got {res1.GetType().Name}");
            }

            // User with no branch assigned
            var unassignedController = harness.CreateOrdersController(harness.UserWithNoBranch);
            var res2 = await unassignedController.CreateSelfServiceOrder(req1, branchId: null);
            if (res2 is not ObjectResult obj2 || obj2.StatusCode != 403)
            {
                throw new Exception($"Expected 403 Forbidden for unassigned staff, got {res2.GetType().Name}");
            }
        });

        // 9. Idempotent Retry Returns Existing Order
        await RunTest("9. Repeated request with identical IdempotencyKey returns existing order with 200 OK", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "IDEMP-DUP-TEST",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            var firstCall = await controller.CreateSelfServiceOrder(req, 1);
            if (firstCall is not ObjectResult firstObj || firstObj.StatusCode != 201)
            {
                throw new Exception("First call failed to create order.");
            }

            var secondCall = await controller.CreateSelfServiceOrder(req, 1);
            if (secondCall is not OkObjectResult secondObj)
            {
                throw new Exception($"Expected 200 OK on duplicate call, got {secondCall.GetType().Name}");
            }

            var count = await harness.Db.Orders.CountAsync(o => o.IdempotencyKey == "IDEMP-DUP-TEST");
            if (count != 1) throw new Exception($"Duplicate order was created! Count = {count}");
        });

        // 10. Concurrent Duplicate Submissions Handled Safely
        await RunTest("10. Concurrent duplicate submissions with same idempotency key handled safely without error", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller1 = harness.CreateOrdersController(harness.Branch1Cashier);
            var controller2 = harness.CreateOrdersController(harness.Branch1Cashier);

            var req = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "RACE-CONDITION-KEY",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 2 } }
            };

            var task1 = controller1.CreateSelfServiceOrder(req, 1);
            var task2 = controller2.CreateSelfServiceOrder(req, 1);
            var results = await Task.WhenAll(task1, task2);

            foreach (var r in results)
            {
                if (r is ObjectResult obj && (obj.StatusCode == 201 || obj.StatusCode == 200))
                {
                    // Success
                }
                else
                {
                    throw new Exception($"Concurrent call failed with {r.GetType().Name}");
                }
            }

            var orderCount = await harness.Db.Orders.CountAsync(o => o.IdempotencyKey == "RACE-CONDITION-KEY");
            if (orderCount != 1) throw new Exception($"Expected exactly 1 order, found {orderCount}");
        });

        // 11. Financial Recalculation Ignores Client-Submitted Totals
        await RunTest("11. Client-submitted prices and totals are completely ignored; DB prices enforced", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "PRICE-TAMPER-TEST",
                ClientSuppliedSubtotal = 1.00m,
                ClientSuppliedGrandTotal = 1.00m,
                Items = new List<SelfServiceOrderItemInput>
                {
                    new() { MenuItemId = 1, Quantity = 1, ClientSuppliedPrice = 1.00m } // Real price = 250.00
                }
            };

            var actionResult = await controller.CreateSelfServiceOrder(req, 1);
            if (actionResult is not ObjectResult objResult || objResult.StatusCode != 201)
            {
                throw new Exception("Expected 201 Created");
            }

            var saved = await harness.Db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.IdempotencyKey == "PRICE-TAMPER-TEST");
            if (saved == null) throw new Exception("Order not found.");
            var item = saved.Items.First();
            if (item.Price != 250.00m || item.TotalPrice != 250.00m)
            {
                throw new Exception($"Price tampering succeeded! Price = {item.Price}");
            }
        });

        // 12. Unauthorized Arbitrary Discount Rejected & Fixed/Percent Discounts
        await RunTest("12. Arbitrary customer discount rejected; fixed & percentage promo codes and staff discounts accepted", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var cashierController = harness.CreateOrdersController(harness.Branch1Cashier);
            var reqArbitrary = new CreateSelfServiceOrderRequest
            {
                RequestedDiscountPercent = 20m, // Arbitrary discount by non-admin
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            var res1 = await cashierController.CreateSelfServiceOrder(reqArbitrary, 1);
            if (res1 is not BadRequestObjectResult)
            {
                throw new Exception("Expected BadRequest for arbitrary discount from cashier.");
            }

            // Valid percentage promo code SAVE10 (10%)
            var reqPromo = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "PROMO-SUCCESS-001",
                DiscountCode = "SAVE10",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };
            var res2 = await cashierController.CreateSelfServiceOrder(reqPromo, 1);
            if (res2 is not ObjectResult obj2 || obj2.StatusCode != 201)
            {
                throw new Exception("Valid promotion code SAVE10 was rejected.");
            }

            // Valid fixed discount promo code FLAT50 (flat ₹50 off)
            var reqPromoFlat = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "PROMO-FLAT50-001",
                DiscountCode = "FLAT50",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } } // 250.00
            };
            var resPromoFlat = await cashierController.CreateSelfServiceOrder(reqPromoFlat, 1);
            if (resPromoFlat is not ObjectResult objFlat || objFlat.StatusCode != 201)
            {
                throw new Exception("Valid flat promotion code FLAT50 was rejected.");
            }
            var flatDto = objFlat.Value!.GetType().GetProperty("data")!.GetValue(objFlat.Value) as SelfServiceOrderResponseDto;
            if (flatDto!.Financials.DiscountAmount != 50.00m)
            {
                throw new Exception($"Expected flat discount 50.00, got {flatDto.Financials.DiscountAmount}");
            }
        });

        // 13. Service Charge, 5% and 18% GST, CGST/SGST Split, and Rounding Modes
        await RunTest("13. Comprehensive Financial: 5% & 18% GST, CGST/SGST split, service charge, and rounding modes (nearest, five, none)", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var settings = await harness.Db.RestaurantSettings.FirstAsync(s => s.Id == 1);
            var controller = harness.CreateOrdersController(harness.Branch1Cashier);

            // Case A: 5% GST, Service Charge Disabled, "nearest" rounding
            settings.FoodGstRate = 5m;
            settings.ServiceChargeEnabled = false;
            settings.RoundingMode = "nearest";
            await harness.Db.SaveChangesAsync();

            var reqA = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "CASE-A-5PCT",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } } // 250.00
            };
            var resA = await controller.CreateSelfServiceOrder(reqA, 1) as ObjectResult;
            var dtoA = resA!.Value!.GetType().GetProperty("data")!.GetValue(resA.Value) as SelfServiceOrderResponseDto;
            if (dtoA!.Financials.Subtotal != 250.00m) throw new Exception($"Subtotal mismatch: {dtoA.Financials.Subtotal}");
            if (dtoA.Financials.TaxAmount != 12.50m) throw new Exception($"Tax mismatch: {dtoA.Financials.TaxAmount}");
            if (dtoA.Financials.CgstAmount != 6.25m || dtoA.Financials.SgstAmount != 6.25m) throw new Exception($"Split mismatch: CGST {dtoA.Financials.CgstAmount}, SGST {dtoA.Financials.SgstAmount}");
            if (dtoA.Financials.FinalPayable != 263.00m) throw new Exception($"Nearest rounding mismatch: {dtoA.Financials.FinalPayable}");

            // Case B: 18% GST, Service Charge 10% Enabled in branch settings (must remain 0% for Self Service), "five" rounding
            settings.FoodGstRate = 18m;
            settings.ServiceChargeEnabled = true;
            settings.ServiceChargeRate = 10m;
            settings.RoundingMode = "five";
            await harness.Db.SaveChangesAsync();

            var reqB = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "CASE-B-18PCT",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } } // 250.00
            };
            var resB = await controller.CreateSelfServiceOrder(reqB, 1) as ObjectResult;
            var dtoB = resB!.Value!.GetType().GetProperty("data")!.GetValue(resB.Value) as SelfServiceOrderResponseDto;
            if (dtoB!.Financials.TaxAmount != 45.00m) throw new Exception($"18% Tax mismatch: {dtoB.Financials.TaxAmount}");
            if (dtoB.Financials.CgstAmount != 22.50m || dtoB.Financials.SgstAmount != 22.50m) throw new Exception($"18% Split mismatch: {dtoB.Financials.CgstAmount}");
            if (dtoB.Financials.ServiceChargeRate != 0m || dtoB.Financials.ServiceChargeAmount != 0m) throw new Exception($"Self Service SC must be 0, got rate={dtoB.Financials.ServiceChargeRate}, amount={dtoB.Financials.ServiceChargeAmount}");
            if (dtoB.Financials.FinalPayable != 295.00m) throw new Exception($"Payable mismatch: {dtoB.Financials.FinalPayable}");

            // Case C: Decimal edge case with odd paise and "none" rounding
            settings.FoodGstRate = 5m;
            settings.ServiceChargeEnabled = false;
            settings.RoundingMode = "none";
            await harness.Db.SaveChangesAsync();

            var reqC = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "CASE-C-DECIMAL-NONE",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 6, Quantity = 1 } } // 99.95
            };
            var resC = await controller.CreateSelfServiceOrder(reqC, 1) as ObjectResult;
            var dtoC = resC!.Value!.GetType().GetProperty("data")!.GetValue(resC.Value) as SelfServiceOrderResponseDto;
            if (dtoC!.Financials.Subtotal != 99.95m) throw new Exception($"Edge subtotal mismatch: {dtoC.Financials.Subtotal}");
            if (dtoC.Financials.FinalPayable != 104.95m) throw new Exception($"Exact 'none' rounding mismatch: {dtoC.Financials.FinalPayable}");
        });

        // 14. Pending State: No Table Lock, No Premature KOT
        await RunTest("14. Pending self service order does not lock table or generate premature KOT", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = "NO-TABLE-LOCK-001",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            await controller.CreateSelfServiceOrder(req, 1);
            var order = await harness.Db.Orders.FirstAsync(o => o.IdempotencyKey == "NO-TABLE-LOCK-001");

            if (order.TableId != null) throw new Exception("TableId should be null for self service order.");
            if (order.KitchenKotNumber != null) throw new Exception("KitchenKotNumber should be null for pending self service order.");
            if (order.Items.Any(i => i.KotId != null)) throw new Exception("OrderItem KotId should be null for pending order.");
            if (order.Items.Any(i => i.KotStatus != "Queued")) throw new Exception("OrderItem KotStatus should be Queued.");
            
            var tables = await harness.Db.DiningTables.ToListAsync();
            if (tables.Any(t => t.Status == "occupied"))
            {
                throw new Exception("A dining table was unexpectedly locked!");
            }
        });

        // 15. Realtime Event Scoped and Customer PII Masked
        await RunTest("15. Realtime event is strictly scoped to authorized branch and customer PII is masked", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req = new CreateSelfServiceOrderRequest
            {
                CustomerName = "Alice Smith",
                CustomerPhone = "9876543210",
                CustomerEmail = "alice.smith@pos.com",
                IdempotencyKey = "REALTIME-PII-001",
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };

            await controller.CreateSelfServiceOrder(req, 1);

            if (harness.PublishedEvents.Count == 0)
            {
                throw new Exception("No realtime events were published.");
            }

            foreach (var evt in harness.PublishedEvents)
            {
                if (evt.BranchId != 1)
                {
                    throw new Exception($"Realtime event was not scoped to Branch 1! BranchId = {evt.BranchId}");
                }

                if (evt.Data is SelfServiceOrderResponseDto broadcastDto)
                {
                    if (broadcastDto.CustomerPhone == "9876543210")
                    {
                        throw new Exception("Plaintext phone number was leaked in realtime broadcast!");
                    }
                    if (broadcastDto.CustomerEmail == "alice.smith@pos.com")
                    {
                        throw new Exception("Plaintext customer email was leaked in realtime broadcast!");
                    }
                    if (!broadcastDto.CustomerPhone!.Contains('*'))
                    {
                        throw new Exception($"Phone number was not masked properly: {broadcastDto.CustomerPhone}");
                    }
                }
            }
        });

        // 16. Multiple Orders With Null IdempotencyKey
        await RunTest("16. Multiple orders with null IdempotencyKey succeed without duplicate index collision", async () =>
        {
            using var harness = new TestHarness();
            await harness.SeedAsync();

            var controller = harness.CreateOrdersController(harness.Branch1Cashier);
            var req1 = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = null,
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 1, Quantity = 1 } }
            };
            var req2 = new CreateSelfServiceOrderRequest
            {
                IdempotencyKey = null,
                Items = new List<SelfServiceOrderItemInput> { new() { MenuItemId = 2, Quantity = 2 } }
            };

            var res1 = await controller.CreateSelfServiceOrder(req1, 1);
            var res2 = await controller.CreateSelfServiceOrder(req2, 1);

            if (res1 is not ObjectResult o1 || o1.StatusCode != 201) throw new Exception("First order with null key failed.");
            if (res2 is not ObjectResult o2 || o2.StatusCode != 201) throw new Exception("Second order with null key failed.");

            var count = await harness.Db.Orders.CountAsync(o => o.BranchId == 1 && o.IdempotencyKey == null);
            if (count != 2) throw new Exception($"Expected 2 orders with null idempotency key, found {count}");
        });

        Console.WriteLine("=======================================================================");
        Console.WriteLine($"  PHASE 2B.1 VERIFICATION SUITE FINISHED: {passed} PASSED, {failed} FAILED");
        Console.WriteLine("=======================================================================");

        return failed == 0 ? 0 : 1;
    }

    private class TestHarness : IDisposable
    {
        public AppDbContext Db { get; }
        public User Branch1Cashier { get; private set; } = null!;
        public User Branch2Waiter { get; private set; } = null!;
        public User GlobalSuperAdmin { get; private set; } = null!;
        public User UserWithNoBranch { get; private set; } = null!;
        public List<RealtimeEvent> PublishedEvents { get; } = new();

        public TestHarness()
        {
            var dbName = "phase2b1_test_db_" + Guid.NewGuid().ToString("N");
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;

            Db = new AppDbContext(options);
        }

        public async Task SeedAsync()
        {
            // Branches
            Db.Branches.Add(new Branch { BranchId = 1, BranchName = "Branch 1", IsActive = true });
            Db.Branches.Add(new Branch { BranchId = 2, BranchName = "Branch 2", IsActive = true });
            Db.Branches.Add(new Branch { BranchId = 3, BranchName = "Inactive Branch", IsActive = false });

            // Roles
            var roleCashier = new Role { RoleId = 1, RoleName = "Cashier" };
            var roleWaiter = new Role { RoleId = 2, RoleName = "Waiter" };
            var roleSuperAdmin = new Role { RoleId = 3, RoleName = "SuperAdmin" };
            Db.Roles.AddRange(roleCashier, roleWaiter, roleSuperAdmin);

            // Users
            Branch1Cashier = new User { UserId = 10, UserName = "cashier1", Email = "cashier1@pos.com", BranchId = 1, IsActive = true, RoleId = 1, Role = roleCashier };
            Branch2Waiter = new User { UserId = 20, UserName = "waiter2", Email = "waiter2@pos.com", BranchId = 2, IsActive = true, RoleId = 2, Role = roleWaiter };
            GlobalSuperAdmin = new User { UserId = 30, UserName = "superadmin", Email = "superadmin@pos.com", BranchId = null, IsActive = true, RoleId = 3, Role = roleSuperAdmin };
            UserWithNoBranch = new User { UserId = 50, UserName = "nobranchuser", Email = "nobranch@pos.com", BranchId = null, IsActive = true, RoleId = 1, Role = roleCashier };
            Db.Users.AddRange(Branch1Cashier, Branch2Waiter, GlobalSuperAdmin, UserWithNoBranch);

            // Dining Table
            Db.DiningTables.Add(new DiningTable { Id = 1, Name = "Table 1", Status = "available", IsActive = true, IsDeleted = false });

            // Restaurant Settings
            Db.RestaurantSettings.Add(new RestaurantSetting
            {
                Id = 1,
                RestaurantId = "restaurant_1",
                RestaurantName = "The Rustic Spin",
                FoodGstRate = 5m,
                ServiceChargeRate = 5m,
                ServiceChargeEnabled = false,
                RoundingMode = "nearest"
            });
            Db.RestaurantSettings.Add(new RestaurantSetting
            {
                Id = 2,
                RestaurantId = "restaurant_2",
                RestaurantName = "Branch 2 Restaurant",
                FoodGstRate = 5m,
                ServiceChargeRate = 0m,
                ServiceChargeEnabled = false,
                RoundingMode = "nearest"
            });

            // Menu Items
            Db.MenuItems.Add(new MenuItem { MenuItemId = 1, DishName = "Paneer Tikka", Price = 250m, IsAvailable = true, BranchId = 1 });
            Db.MenuItems.Add(new MenuItem { MenuItemId = 2, DishName = "Butter Naan", Price = 40m, IsAvailable = true, BranchId = 1 });
            Db.MenuItems.Add(new MenuItem { MenuItemId = 3, DishName = "Seasonal Sweet", Price = 120m, IsAvailable = false, BranchId = 1 }); // Unavailable
            Db.MenuItems.Add(new MenuItem { MenuItemId = 4, DishName = "Archived Curry", Price = 300m, IsAvailable = true, DeletedAt = DateTime.UtcNow, BranchId = 1 }); // Soft deleted
            Db.MenuItems.Add(new MenuItem { MenuItemId = 5, DishName = "Branch 2 Special", Price = 450m, IsAvailable = true, BranchId = 2 }); // Cross-branch
            Db.MenuItems.Add(new MenuItem { MenuItemId = 6, DishName = "Edge Item", Price = 99.95m, IsAvailable = true, BranchId = 1 });

            // Promotions
            Db.Promotions.Add(new Promotion
            {
                PromotionId = 1,
                Code = "SAVE10",
                DiscountPercentage = 10m,
                IsActive = true,
                ValidUntil = DateTime.UtcNow.AddDays(10)
            });
            Db.Promotions.Add(new Promotion
            {
                PromotionId = 2,
                Code = "EXPIRED20",
                DiscountPercentage = 20m,
                IsActive = true,
                ValidUntil = DateTime.UtcNow.AddDays(-5)
            });
            Db.Promotions.Add(new Promotion
            {
                PromotionId = 3,
                Code = "FLAT50",
                FlatDiscount = 50m,
                IsActive = true,
                ValidUntil = DateTime.UtcNow.AddDays(10)
            });

            await Db.SaveChangesAsync();
        }

        public OrdersController CreateOrdersController(User? user)
        {
            var syncService = new CapturingRealtimeSyncService(PublishedEvents);
            var controller = new OrdersController(
                Db,
                new SpService(Db),
                null!,
                null!,
                new TestHubContext(),
                syncService,
                NullLogger<OrdersController>.Instance);

            var httpContext = new DefaultHttpContext();
            if (user != null)
            {
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Name, user.UserName),
                    new Claim(ClaimTypes.Email, user.Email ?? ""),
                    new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "User"),
                    new Claim("roleName", user.Role?.RoleName ?? "User"),
                    new Claim("branchId", user.BranchId?.ToString() ?? ""),
                    new Claim("restaurantId", user.BranchId?.ToString() ?? "")
                };
                var identity = new ClaimsIdentity(claims, "TestAuth");
                httpContext.User = new ClaimsPrincipal(identity);
            }
            else
            {
                httpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        public void Dispose()
        {
            Db.Dispose();
        }
    }

    private class CapturingRealtimeSyncService : IRealtimeSyncService
    {
        private readonly List<RealtimeEvent> _events;

        public CapturingRealtimeSyncService(List<RealtimeEvent> events)
        {
            _events = events;
        }

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
}
