using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/reports")]
[Microsoft.AspNetCore.Authorization.AllowAnonymous]
public class ReportsController : ControllerBase
{
    private readonly SpService _spService;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(SpService spService, ILogger<ReportsController> logger)
    {
        _spService = spService;
        _logger = logger;
    }

    [HttpGet]
    [HttpGet("dashboard")]
    [HttpGet("dashboard-summary")]
    [HttpGet("sales-summary")]
    [HttpGet("summary")]
    public async Task<IActionResult> GetDashboardReport()
    {
        try
        {
            decimal todayRevenue = 0.00m;
            int settledOrdersCount = 0;
            int totalOrdersCount = 0;
            int activeTablesCount = 0;
            var topSellingDishes = new List<TopSellingDishDto>();
            var paymentMethodBreakdown = new Dictionary<string, decimal>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                reader =>
                {
                    if (reader.Read())
                    {
                        todayRevenue = reader.GetDecimal(0);
                        settledOrdersCount = Convert.ToInt32(reader[1]);
                    }
                },
                reader =>
                {
                    if (reader.Read())
                    {
                        totalOrdersCount = Convert.ToInt32(reader[0]);
                    }
                },
                reader =>
                {
                    if (reader.Read())
                    {
                        activeTablesCount = Convert.ToInt32(reader[0]);
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        topSellingDishes.Add(new TopSellingDishDto
                        {
                            ItemName = reader.GetString(0),
                            QuantitySold = Convert.ToInt32(reader[1]),
                            TotalRevenue = reader.GetDecimal(2)
                        });
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        paymentMethodBreakdown[reader.GetString(0)] = reader.GetDecimal(1);
                    }
                });

            decimal avgOrderValue = settledOrdersCount > 0 ? Math.Round(todayRevenue / settledOrdersCount, 2) : 0;

            return Ok(new DashboardReportDto
            {
                TodayRevenue = todayRevenue,
                TodayTotalOrders = totalOrdersCount,
                TodaySettledOrders = settledOrdersCount,
                ActiveTablesCount = activeTablesCount,
                AverageOrderValue = avgOrderValue,
                TopSellingDishes = topSellingDishes,
                PaymentMethodBreakdown = paymentMethodBreakdown,
                CategorySalesBreakdown = new Dictionary<string, int>()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDailySalesReport([FromQuery] int? days)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { { "p_days", days ?? 30 } };
            var list = await _spService.ExecuteQueryAsync("sp_GetDailySalesReport", reader => new
            {
                saleDate = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                totalInvoices = reader.GetInt64(1),
                paidInvoices = Convert.ToInt64(reader[2]),
                subtotal = reader.GetDecimal(3),
                taxAmount = reader.GetDecimal(4),
                discountAmount = reader.GetDecimal(5),
                totalAmount = reader.GetDecimal(6),
                paidAmount = reader.GetDecimal(7)
            }, parameters);

            return Ok(new
            {
                success = true,
                message = "Daily sales report retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlySalesReport([FromQuery] int? year)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { { "p_year", year ?? DateTime.UtcNow.Year } };
            var list = await _spService.ExecuteQueryAsync("sp_GetMonthlySalesReport", reader => new
            {
                saleMonth = reader.GetString(0),
                totalInvoices = reader.GetInt64(1),
                paidInvoices = Convert.ToInt64(reader[2]),
                subtotal = reader.GetDecimal(3),
                taxAmount = reader.GetDecimal(4),
                discountAmount = reader.GetDecimal(5),
                totalAmount = reader.GetDecimal(6),
                paidAmount = reader.GetDecimal(7)
            }, parameters);

            return Ok(new
            {
                success = true,
                message = "Monthly sales report retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting monthly sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("kot")]
    public async Task<IActionResult> GetKotReport()
    {
        try
        {
            object? summary = null;
            var recentTickets = new List<object>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetKotReport", null,
                reader =>
                {
                    if (reader.Read())
                    {
                        summary = new
                        {
                            totalTickets = Convert.ToInt64(reader[0]),
                            completedTickets = Convert.ToInt64(reader[1]),
                            activeTickets = Convert.ToInt64(reader[2]),
                            totalItemsOrdered = Convert.ToInt64(reader[3]),
                            totalItemsPrepared = Convert.ToInt64(reader[4])
                        };
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        recentTickets.Add(new
                        {
                            orderId = reader.GetInt64(0),
                            kotNumber = reader.GetString(1),
                            tableName = reader.IsDBNull(2) ? "Table" : reader.GetString(2),
                            sectionArea = reader.IsDBNull(3) ? "Main Hall" : reader.GetString(3),
                            serverName = reader.IsDBNull(4) ? "Staff" : reader.GetString(4),
                            orderStatus = reader.IsDBNull(5) ? "Pending" : reader.GetString(5),
                            totalItems = reader.GetInt32(6),
                            preparedItems = reader.GetInt32(7),
                            createdAt = reader.GetDateTime(8)
                        });
                    }
                });

            return Ok(new
            {
                success = true,
                message = "KOT performance report retrieved successfully.",
                summary,
                recentTickets
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting KOT report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryReport()
    {
        try
        {
            var categorySummary = new List<object>();
            var ingredientStocks = new List<object>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetInventoryReport", null,
                reader =>
                {
                    while (reader.Read())
                    {
                        categorySummary.Add(new
                        {
                            category = reader.IsDBNull(0) ? "Uncategorized" : reader.GetString(0),
                            totalItems = Convert.ToInt64(reader[1]),
                            lowStockItems = Convert.ToInt64(reader[2]),
                            outOfStockItems = Convert.ToInt64(reader[3]),
                            totalInventoryValuation = reader.GetDecimal(4)
                        });
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        ingredientStocks.Add(new
                        {
                            ingredientId = reader.GetInt64(0),
                            name = reader.GetString(1),
                            category = reader.IsDBNull(2) ? "General" : reader.GetString(2),
                            supplier = reader.IsDBNull(3) ? "Local" : reader.GetString(3),
                            unit = reader.GetString(4),
                            currentStock = reader.GetDecimal(5),
                            minimumThreshold = reader.GetDecimal(6),
                            unitCost = reader.GetDecimal(7),
                            stockValue = reader.GetDecimal(8),
                            stockStatus = reader.GetString(9)
                        });
                    }
                });

            return Ok(new
            {
                success = true,
                message = "Inventory valuation report retrieved successfully.",
                categorySummary,
                ingredientStocks
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockReport()
    {
        try
        {
            var list = await _spService.ExecuteQueryAsync("sp_GetLowStockIngredients", reader => new
            {
                ingredientId = reader.GetInt64(0),
                name = reader.GetString(1),
                unit = reader.GetString(2),
                currentStock = reader.GetDecimal(3),
                minimumThreshold = reader.GetDecimal(4),
                unitCost = reader.GetDecimal(5),
                category = reader.FieldCount > 6 && !reader.IsDBNull(6) ? reader.GetString(6) : "General",
                supplier = reader.FieldCount > 7 && !reader.IsDBNull(7) ? reader.GetString(7) : "Local"
            });

            return Ok(new
            {
                success = true,
                message = "Low stock alert ingredients retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting low stock report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("top-selling")]
    public async Task<IActionResult> GetTopSellingReport()
    {
        try
        {
            var topSellingDishes = new List<TopSellingDishDto>();
            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                _ => { }, _ => { }, _ => { },
                reader =>
                {
                    while (reader.Read())
                    {
                        topSellingDishes.Add(new TopSellingDishDto
                        {
                            ItemName = reader.GetString(0),
                            QuantitySold = Convert.ToInt32(reader[1]),
                            TotalRevenue = reader.GetDecimal(2)
                        });
                    }
                },
                _ => { });

            return Ok(new
            {
                success = true,
                message = "Top selling dishes retrieved successfully.",
                count = topSellingDishes.Count,
                data = topSellingDishes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top selling report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPaymentsReport()
    {
        try
        {
            var paymentMethodBreakdown = new Dictionary<string, decimal>();
            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                _ => { }, _ => { }, _ => { }, _ => { },
                reader =>
                {
                    while (reader.Read())
                    {
                        paymentMethodBreakdown[reader.GetString(0)] = reader.GetDecimal(1);
                    }
                });

            return Ok(new
            {
                success = true,
                message = "Payment breakdown retrieved successfully.",
                data = paymentMethodBreakdown
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payments report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategorySalesReport()
    {
        try
        {
            var list = await _spService.ExecuteQueryAsync("sp_GetCategorySalesReport", reader => new
            {
                category = reader.GetString(0),
                itemsSold = Convert.ToInt64(reader[1]),
                quantity = Convert.ToInt64(reader[2]),
                revenue = reader.GetDecimal(3)
            });

            return Ok(new
            {
                success = true,
                message = "Category sales breakdown retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("revenue")]
    [HttpGet("sales")]
    public async Task<IActionResult> GetRevenueReport()
    {
        return await GetDashboardReport();
    }
}
