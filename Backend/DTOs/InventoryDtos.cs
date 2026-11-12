using System;
using System.Collections.Generic;

namespace HMS.DTOs;

public class InventoryItemInputDto
{
    public long? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string? Subcategory { get; set; }
    public string? Brand { get; set; }
    public string Unit { get; set; } = "KG";
    public decimal Stock { get; set; }
    public decimal MinThreshold { get; set; } = 5.00m;
    public decimal UnitCost { get; set; }
    public decimal? Mrp { get; set; }
    public string Supplier { get; set; } = "Local Supplier";
    public decimal? Abv { get; set; }
    public decimal? VolumeMl { get; set; }
    public string? StorageLocation { get; set; }
    public decimal? SellingPrice { get; set; }
    public bool? IsBarItem { get; set; }
}

public class InventoryItemResultDto
{
    public long Id { get; set; }
    public long IngredientId => Id;
    public string Name { get; set; } = string.Empty;
    public string ItemName => Name;
    public string Category { get; set; } = string.Empty;
    public string? Subcategory { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal Stock { get; set; }
    public decimal CurrentStock => Stock;
    public decimal MinThreshold { get; set; }
    public decimal MinimumThreshold => MinThreshold;
    public decimal UnitCost { get; set; }
    public decimal CostPerUnit => UnitCost;
    public decimal? Mrp { get; set; }
    public string Supplier { get; set; } = string.Empty;
    public string Classification { get; set; } = "Food"; // "Food" or "Bar"
    public bool IsBarItem { get; set; }
    public string Action { get; set; } = "inserted"; // "inserted" or "updated"
    public DateTime UpdatedAt { get; set; }
}

public class InventoryBatchResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TotalReceived { get; set; }
    public int InsertedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int FailedCount { get; set; }
    public int FoodCount { get; set; }
    public int BarCount { get; set; }
    public List<InventoryItemResultDto> Items { get; set; } = new();
    public List<InventoryItemErrorDto> Errors { get; set; } = new();
    public object? Data { get; set; }
}

public class InventoryItemErrorDto
{
    public int Index { get; set; }
    public string? Name { get; set; }
    public string Error { get; set; } = string.Empty;
}
