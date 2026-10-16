namespace HMS.DTOs;

public class DashboardReportDto
{
    public decimal TodayRevenue { get; set; }
    public int TodayTotalOrders { get; set; }
    public int TodaySettledOrders { get; set; }
    public int ActiveTablesCount { get; set; }
    public decimal AverageOrderValue { get; set; }
    public List<TopSellingDishDto> TopSellingDishes { get; set; } = new List<TopSellingDishDto>();
    public Dictionary<string, decimal> PaymentMethodBreakdown { get; set; } = new Dictionary<string, decimal>();
    public Dictionary<string, int> CategorySalesBreakdown { get; set; } = new Dictionary<string, int>();
}

public class TopSellingDishDto
{
    public string ItemName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}
