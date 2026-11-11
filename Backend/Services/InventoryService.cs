using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class InventoryService
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ILogger<InventoryService> _logger;

    private static readonly HashSet<string> KnownBarCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Whiskey & Scotch", "Whiskey", "Whisky", "Scotch", "Bourbon",
        "Vodka & Gin", "Vodka", "Gin",
        "Rum & Brandy", "Rum", "Brandy", "Cognac",
        "Beer & Ciders", "Beer", "Cider", "Draught Beer",
        "Wine & Champagne", "Wine", "Red Wine", "White Wine", "Rose Wine", "Sparkling Wine", "Champagne",
        "Tequila & Mezcal", "Tequila", "Mezcal",
        "Liqueurs & Aperitifs", "Liqueur", "Liqueurs", "Aperitif",
        "Mixers & Soft Drinks", "Beverages & Bar", "Beverages", "Beverage", "Bar",
        "Cocktails", "Mocktails", "Liquor", "Spirits", "Drink", "Drinks", "Bottled Drinks", "Hard Liquor"
    };

    private static readonly string[] BarKeywords = new[]
    {
        "whiskey", "whisky", "scotch", "bourbon", "single malt",
        "vodka", "gin", "rum", "brandy", "cognac", "tequila", "mezcal",
        "beer", "cider", "draught", "breezer", "wine", "shiraz", "merlot",
        "cabernet", "chardonnay", "sauvignon", "pinot", "champagne",
        "liqueur", "aperitif", "cocktail", "mocktail", "beverage", "tonic",
        "soda", "glenfiddich", "grey goose", "kingfisher", "sula", "bacardi",
        "budweiser", "corona", "heineken", "carlsberg", "tuborg", "jack daniel",
        "chivas", "black dog", "smirnoff", "absolut", "old monk", "magic moments",
        "signature", "royal stag", "blenders pride", "imperial blue", "mansion house",
        "baileys", "kahlua", "jagermeister", "campari", "martini", "aperol"
    };

    public InventoryService(AppDbContext context, SpService spService, ILogger<InventoryService> logger)
    {
        _context = context;
        _spService = spService;
        _logger = logger;
    }

    /// <summary>
    /// Classifies an inventory item into Food or Bar based on category, name, subcategory, unit, and explicit hints.
    /// </summary>
    public (bool IsBar, string Classification) ClassifyItem(
        string? name,
        string? category,
        string? subcategory = null,
        string? unit = null,
        bool? isBarItemHint = null)
    {
        if (isBarItemHint == true)
        {
            return (true, "Bar");
        }

        // 1. Check category against KnownBarCategories
        if (!string.IsNullOrWhiteSpace(category))
        {
            var trimmedCat = category.Trim();
            if (KnownBarCategories.Contains(trimmedCat))
            {
                return (true, "Bar");
            }

            foreach (var kw in BarKeywords)
            {
                if (trimmedCat.Contains(kw, StringComparison.OrdinalIgnoreCase))
                {
                    return (true, "Bar");
                }
            }
        }

        // 2. Check OrderItemRouting logic
        if (OrderItemRouting.IsBarItem(name, category, null, false))
        {
            return (true, "Bar");
        }

        if (!string.IsNullOrWhiteSpace(subcategory) && OrderItemRouting.IsBarItem(name, subcategory, null, false))
        {
            return (true, "Bar");
        }

        // 3. Check item name for beverage keywords
        if (!string.IsNullOrWhiteSpace(name))
        {
            var trimmedName = name.Trim();
            foreach (var kw in BarKeywords)
            {
                if (trimmedName.Contains(kw, StringComparison.OrdinalIgnoreCase))
                {
                    return (true, "Bar");
                }
            }
        }

        // 4. Check unit patterns typical for bar (peg, pint, keg, bottle of liquor)
        if (!string.IsNullOrWhiteSpace(unit))
        {
            var trimmedUnit = unit.Trim().ToLowerInvariant();
            if (trimmedUnit.Contains("peg") || trimmedUnit.Contains("keg") || trimmedUnit.Contains("pint"))
            {
                return (true, "Bar");
            }
        }

        return (false, "Food");
    }

    /// <summary>
    /// Parses any incoming JSON payload (single item object, array of items, or wrapped batch object).
    /// </summary>
    public List<InventoryItemInputDto> ParseJsonPayload(JsonElement root)
    {
        var list = new List<InventoryItemInputDto>();

        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var elem in root.EnumerateArray())
            {
                var item = ParseItemElement(elem);
                if (item != null) list.Add(item);
            }
        }
        else if (root.ValueKind == JsonValueKind.Object)
        {
            // Check for known array wrapper properties
            string[] wrapperKeys = { "items", "ingredients", "gourmet_pos_inventory_v1", "gourmet_pos_inventory_v2", "data", "inventory", "drinks" };
            bool foundWrapper = false;

            foreach (var key in wrapperKeys)
            {
                if (root.TryGetProperty(key, out var arrElem) && arrElem.ValueKind == JsonValueKind.Array)
                {
                    foundWrapper = true;
                    foreach (var elem in arrElem.EnumerateArray())
                    {
                        var item = ParseItemElement(elem);
                        if (item != null) list.Add(item);
                    }
                    break;
                }
            }

            if (!foundWrapper)
            {
                // Root is a single item object
                var single = ParseItemElement(root);
                if (single != null) list.Add(single);
            }
        }

        return list;
    }

    /// <summary>
    /// Parses a single JSON element into an InventoryItemInputDto, reading all aliases.
    /// </summary>
    public InventoryItemInputDto? ParseItemElement(JsonElement elem)
    {
        if (elem.ValueKind != JsonValueKind.Object) return null;

        var dto = new InventoryItemInputDto();

        // ID
        if (TryGetLong(elem, new[] { "id", "ingredientId", "itemId", "ingredient_id" }, out var id) && id > 0)
        {
            dto.Id = id;
        }

        // Name
        dto.Name = TryGetString(elem, new[] { "name", "itemName", "ingredient_name", "title" })?.Trim() ?? string.Empty;

        // Category
        dto.Category = TryGetString(elem, new[] { "category", "liquorCategory", "cat" })?.Trim() ?? "General";

        // Subcategory & Brand
        dto.Subcategory = TryGetString(elem, new[] { "subcategory", "subCategory", "brand" })?.Trim();
        dto.Brand = TryGetString(elem, new[] { "brand" })?.Trim();

        // Unit
        dto.Unit = TryGetString(elem, new[] { "unit", "stockUnit", "measurementUnit" })?.Trim() ?? "KG";

        // Stock
        dto.Stock = TryGetDecimal(elem, new[] { "stock", "currentStock", "quantity", "qty", "current_stock" }) ?? 0.00m;

        // MinThreshold
        dto.MinThreshold = TryGetDecimal(elem, new[] { "minThreshold", "threshold", "minimumThreshold", "reorder_level", "min_threshold" }) ?? 5.00m;

        // UnitCost
        dto.UnitCost = TryGetDecimal(elem, new[] { "unitCost", "costPerUnit", "cost_per_unit", "costPrice", "cost", "price" }) ?? 0.00m;

        // Mrp / SellingPrice
        dto.Mrp = TryGetDecimal(elem, new[] { "mrp", "sellingPrice", "selling_price" });

        // Supplier
        dto.Supplier = TryGetString(elem, new[] { "supplier", "vendor" })?.Trim() ?? "Local Supplier";

        // ABV & Volume
        dto.Abv = TryGetDecimal(elem, new[] { "abv", "alcoholPct", "alcohol_pct" });
        dto.VolumeMl = TryGetDecimal(elem, new[] { "volumeMl", "volume_ml" });
        dto.StorageLocation = TryGetString(elem, new[] { "storageLocation", "storage_location" })?.Trim();

        // Bar Item Hint
        if (elem.TryGetProperty("isBarItem", out var barProp) && (barProp.ValueKind == JsonValueKind.True || barProp.ValueKind == JsonValueKind.False))
        {
            dto.IsBarItem = barProp.GetBoolean();
        }
        else if (elem.TryGetProperty("isBar", out var bProp) && (bProp.ValueKind == JsonValueKind.True || bProp.ValueKind == JsonValueKind.False))
        {
            dto.IsBarItem = bProp.GetBoolean();
        }

        return dto;
    }

    /// <summary>
    /// Validates an incoming inventory item.
    /// </summary>
    public (bool IsValid, string? Error) ValidateItem(InventoryItemInputDto item, int index)
    {
        if (string.IsNullOrWhiteSpace(item.Name))
        {
            return (false, $"Item at index {index}: Item Name is required.");
        }
        if (item.Name.Trim().Length > 100)
        {
            return (false, $"Item '{item.Name}' at index {index}: Name cannot exceed 100 characters.");
        }
        if (string.IsNullOrWhiteSpace(item.Unit) || item.Unit.Trim().Length > 50)
        {
            return (false, $"Item '{item.Name}' at index {index}: Unit is required and cannot exceed 50 characters.");
        }
        if (item.Category?.Trim().Length > 100)
        {
            return (false, $"Item '{item.Name}' at index {index}: Category cannot exceed 100 characters.");
        }
        if (item.Subcategory?.Trim().Length > 100 || item.Brand?.Trim().Length > 100)
        {
            return (false, $"Item '{item.Name}' at index {index}: Subcategory and brand cannot exceed 100 characters.");
        }
        if (item.Supplier?.Trim().Length > 150)
        {
            return (false, $"Item '{item.Name}' at index {index}: Supplier cannot exceed 150 characters.");
        }

        if (item.Stock < 0)
        {
            return (false, $"Item '{item.Name}' at index {index}: Stock quantity cannot be negative ({item.Stock}).");
        }

        if (item.MinThreshold < 0)
        {
            return (false, $"Item '{item.Name}' at index {index}: Minimum threshold cannot be negative ({item.MinThreshold}).");
        }

        if (item.UnitCost < 0)
        {
            return (false, $"Item '{item.Name}' at index {index}: Unit cost cannot be negative ({item.UnitCost}).");
        }
        if (item.Mrp < 0 || item.SellingPrice < 0)
        {
            return (false, $"Item '{item.Name}' at index {index}: Selling price cannot be negative.");
        }
        if (item.Abv < 0 || item.Abv > 100)
        {
            return (false, $"Item '{item.Name}' at index {index}: ABV must be between 0 and 100.");
        }
        if (item.VolumeMl <= 0)
        {
            return (false, $"Item '{item.Name}' at index {index}: Volume must be greater than zero.");
        }

        return (true, null);
    }

    /// <summary>
    /// Processes inventory items (single or batch), performing classification, duplicate resolution/stock merging,
    /// persistence into MySQL `ingredients` (and sync into `bar_inventory_stock`), transaction safety, and structured reporting.
    /// </summary>
    public async Task<InventoryBatchResultDto> ProcessInventorySubmissionAsync(
        List<InventoryItemInputDto> items,
        bool atomic = false,
        bool replaceStockOnExisting = false)
    {
        var result = new InventoryBatchResultDto
        {
            TotalReceived = items.Count
        };

        if (items.Count == 0)
        {
            result.Success = false;
            result.Message = "No inventory items provided in request.";
            return result;
        }

        _logger.LogInformation("[Inventory] Starting processing of {Count} items. AtomicMode={Atomic}", items.Count, atomic);

        // Pre-validate all items if atomic mode is requested
        if (atomic)
        {
            for (int i = 0; i < items.Count; i++)
            {
                var (isValid, error) = ValidateItem(items[i], i);
                if (!isValid)
                {
                    _logger.LogWarning("[Inventory] Atomic batch pre-validation failed at index {Index}: {Error}", i, error);
                    result.Success = false;
                    result.Message = $"Batch validation failed: {error}";
                    result.FailedCount = items.Count;
                    result.Errors.Add(new InventoryItemErrorDto { Index = i, Name = items[i].Name, Error = error! });
                    return result;
                }
            }
        }

        DbTransaction? transaction = null;
        DbConnection? connection = null;

        try
        {
            if (atomic)
            {
                connection = _context.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }
                transaction = await connection.BeginTransactionAsync();
            }

            for (int i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var (isValid, error) = ValidateItem(item, i);

                if (!isValid)
                {
                    result.FailedCount++;
                    result.Errors.Add(new InventoryItemErrorDto
                    {
                        Index = i,
                        Name = item.Name,
                        Error = error!
                    });
                    _logger.LogWarning("[Inventory] Item {Index} skipped due to validation failure: {Error}", i, error);
                    continue;
                }

                // Sanitize string lengths to prevent MySQL data truncation errors
                string safeName = Truncate(item.Name.Trim(), 100);
                string safeCategory = Truncate(string.IsNullOrWhiteSpace(item.Category) ? "General" : item.Category.Trim(), 100);
                string safeSubcategory = Truncate(item.Subcategory?.Trim() ?? string.Empty, 100);
                string safeUnit = Truncate(string.IsNullOrWhiteSpace(item.Unit) ? "KG" : item.Unit.Trim(), 50);
                string safeSupplier = Truncate(string.IsNullOrWhiteSpace(item.Supplier) ? "Local Supplier" : item.Supplier.Trim(), 150);

                var (isBar, classification) = ClassifyItem(safeName, safeCategory, safeSubcategory, safeUnit, item.IsBarItem);

                if (isBar) result.BarCount++;
                else result.FoodCount++;

                _logger.LogInformation(
                    "[Inventory] Processing item {Index}/{Total}: Name='{Name}', Category='{Category}', Unit='{Unit}', Stock={Stock}, Cost={Cost}, Classification={Classification}",
                    i + 1, items.Count, safeName, safeCategory, safeUnit, item.Stock, item.UnitCost, classification);

                // Check for existing active item (deduplication & stock accumulation)
                ExistingIngredientRecord? existing = null;

                if (item.Id.HasValue && item.Id.Value > 0)
                {
                    existing = await FindExistingByIdAsync(item.Id.Value, connection, transaction);
                }

                if (existing == null)
                {
                    existing = await FindExistingByNameAndCategoryAsync(safeName, safeCategory, connection, transaction);
                }

                long finalId;
                decimal finalStock;
                string action;

                if (existing != null)
                {
                    // Batch receipt submissions add stock; item edits replace the stored stock value.
                    finalId = existing.IngredientId;
                    finalStock = replaceStockOnExisting ? item.Stock : existing.CurrentStock + item.Stock;
                    action = "updated";
                    result.UpdatedCount++;

                    decimal finalCost = replaceStockOnExisting || item.UnitCost > 0 ? item.UnitCost : existing.UnitCost;
                    decimal? finalMrp = item.Mrp ?? existing.Mrp;
                    string finalUnit = !string.IsNullOrWhiteSpace(safeUnit) && !safeUnit.Equals("KG", StringComparison.OrdinalIgnoreCase)
                        ? safeUnit : existing.Unit;
                    string finalSupplier = !string.IsNullOrWhiteSpace(safeSupplier) && !safeSupplier.Equals("Local Supplier", StringComparison.OrdinalIgnoreCase)
                        ? safeSupplier : existing.Supplier;
                    decimal finalThreshold = replaceStockOnExisting || item.MinThreshold > 0
                        ? item.MinThreshold
                        : existing.MinimumThreshold;

                    await UpdateIngredientInDbAsync(
                        finalId, safeName, safeCategory, safeSubcategory, finalUnit,
                        finalStock, finalThreshold, finalCost, finalMrp, finalSupplier,
                        connection, transaction);

                    _logger.LogInformation(
                        "[Inventory] Updated existing ingredient {Id} ('{Name}'). PreviousStock={Prev}, SubmittedStock={Submitted}, NewStock={NewStock}",
                        finalId, safeName, existing.CurrentStock, item.Stock, finalStock);
                }
                else
                {
                    // Insert new item
                    finalStock = item.Stock;
                    action = "inserted";
                    result.InsertedCount++;

                    decimal finalThreshold = item.MinThreshold > 0 ? item.MinThreshold : 5.00m;
                    decimal finalCost = item.UnitCost;
                    decimal? finalMrp = item.Mrp;

                    finalId = await InsertIngredientInDbAsync(
                        safeName, safeCategory, safeSubcategory, safeUnit,
                        finalStock, finalThreshold, finalCost, finalMrp, safeSupplier,
                        connection, transaction);

                    _logger.LogInformation(
                        "[Inventory] Inserted new ingredient {Id} ('{Name}'). Category='{Category}', Unit='{Unit}', Stock={Stock}",
                        finalId, safeName, safeCategory, safeUnit, finalStock);
                }

                // If Bar Item, synchronize bar_inventory_stock if matching brand exists
                if (isBar)
                {
                    await TrySyncBarInventoryStockAsync(safeName, safeCategory, item.Stock, item.UnitCost, connection, transaction);
                }

                var itemResult = new InventoryItemResultDto
                {
                    Id = finalId,
                    Name = safeName,
                    Category = safeCategory,
                    Subcategory = safeSubcategory,
                    Unit = safeUnit,
                    Stock = finalStock,
                    MinThreshold = item.MinThreshold > 0 ? item.MinThreshold : 5.00m,
                    UnitCost = item.UnitCost,
                    Mrp = item.Mrp,
                    Supplier = safeSupplier,
                    Classification = classification,
                    IsBarItem = isBar,
                    Action = action,
                    UpdatedAt = DateTime.UtcNow
                };

                result.Items.Add(itemResult);
            }

            if (transaction != null)
            {
                await transaction.CommitAsync();
                _logger.LogInformation("[Inventory] Atomic transaction successfully committed for {Count} items.", items.Count);
            }

            result.Success = result.Items.Count > 0 || result.FailedCount == 0;
            result.Message = $"Processed {items.Count} items: {result.InsertedCount} inserted, {result.UpdatedCount} updated, {result.FailedCount} failed. ({result.FoodCount} Food, {result.BarCount} Bar)";
            result.Data = result.Items.Count == 1 ? result.Items[0] : result.Items;

            _logger.LogInformation(
                "[Inventory] Batch processing completed. TotalReceived={Total}, Inserted={Inserted}, Updated={Updated}, Failed={Failed}, Food={Food}, Bar={Bar}",
                result.TotalReceived, result.InsertedCount, result.UpdatedCount, result.FailedCount, result.FoodCount, result.BarCount);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Inventory] Fatal error during inventory processing. AtomicMode={Atomic}", atomic);

            if (transaction != null)
            {
                try
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning("[Inventory] Transaction successfully rolled back due to error.");
                }
                catch (Exception rbEx)
                {
                    _logger.LogError(rbEx, "[Inventory] Error during transaction rollback.");
                }
            }

            result.Success = false;
            result.Message = $"Database transaction failed and was rolled back: {ex.Message}";
            result.FailedCount = items.Count - result.Items.Count;
            result.Errors.Add(new InventoryItemErrorDto
            {
                Index = -1,
                Name = "Transaction",
                Error = ex.Message
            });

            return result;
        }
    }

    #region Database Helpers

    private record ExistingIngredientRecord(
        long IngredientId,
        string Name,
        string Category,
        string Unit,
        decimal CurrentStock,
        decimal MinimumThreshold,
        decimal UnitCost,
        decimal? Mrp,
        string Supplier);

    private async Task<ExistingIngredientRecord?> FindExistingByIdAsync(long id, DbConnection? conn, DbTransaction? tx)
    {
        const string sql = @"
            SELECT ingredient_id, name, category, unit, current_stock, minimum_threshold, unit_cost, mrp, supplier
            FROM ingredients
            WHERE ingredient_id = @id AND deleted_at IS NULL AND is_active = 1
            LIMIT 1;
        ";

        return await ExecuteSingleReaderAsync(sql, new Dictionary<string, object?> { { "@id", id } }, conn, tx);
    }

    private async Task<ExistingIngredientRecord?> FindExistingByNameAndCategoryAsync(string name, string category, DbConnection? conn, DbTransaction? tx)
    {
        const string sql = @"
            SELECT ingredient_id, name, category, unit, current_stock, minimum_threshold, unit_cost, mrp, supplier
            FROM ingredients
            WHERE deleted_at IS NULL AND is_active = 1 
              AND LOWER(TRIM(name)) = LOWER(TRIM(@name)) 
              AND LOWER(TRIM(category)) = LOWER(TRIM(@category))
            ORDER BY ingredient_id DESC
            LIMIT 1;
        ";

        return await ExecuteSingleReaderAsync(sql, new Dictionary<string, object?>
        {
            { "@name", name },
            { "@category", category }
        }, conn, tx);
    }

    private async Task<ExistingIngredientRecord?> ExecuteSingleReaderAsync(
        string sql, Dictionary<string, object?> parameters, DbConnection? conn, DbTransaction? tx)
    {
        if (conn == null)
        {
            conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        if (tx != null) cmd.Transaction = tx;

        foreach (var kvp in parameters)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = kvp.Key;
            p.Value = kvp.Value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            int mrpOrd = reader.GetOrdinal("mrp");
            int supOrd = reader.GetOrdinal("supplier");

            return new ExistingIngredientRecord(
                reader.GetInt64(reader.GetOrdinal("ingredient_id")),
                reader.GetString(reader.GetOrdinal("name")),
                reader.GetString(reader.GetOrdinal("category")),
                reader.GetString(reader.GetOrdinal("unit")),
                reader.GetDecimal(reader.GetOrdinal("current_stock")),
                reader.GetDecimal(reader.GetOrdinal("minimum_threshold")),
                reader.GetDecimal(reader.GetOrdinal("unit_cost")),
                reader.IsDBNull(mrpOrd) ? null : reader.GetDecimal(mrpOrd),
                reader.IsDBNull(supOrd) ? "Local Supplier" : reader.GetString(supOrd)
            );
        }
        return null;
    }

    private async Task<long> InsertIngredientInDbAsync(
        string name, string category, string subcategory, string unit,
        decimal stock, decimal minThreshold, decimal unitCost, decimal? mrp, string supplier,
        DbConnection? conn, DbTransaction? tx)
    {
        const string sql = @"
            INSERT INTO ingredients (
                name, ingredient_name, category, subcategory, unit,
                current_stock, minimum_threshold, reorder_level,
                unit_cost, cost_per_unit, mrp, supplier,
                is_active, created_at, updated_at
            ) VALUES (
                @name, @name, @category, @subcategory, @unit,
                @stock, @threshold, @threshold,
                @unit_cost, @unit_cost, @mrp, @supplier,
                1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
            );
            SELECT LAST_INSERT_ID();
        ";

        var parameters = new Dictionary<string, object?>
        {
            { "@name", name },
            { "@category", category },
            { "@subcategory", subcategory },
            { "@unit", unit },
            { "@stock", stock },
            { "@threshold", minThreshold },
            { "@unit_cost", unitCost },
            { "@mrp", mrp },
            { "@supplier", supplier }
        };

        var scalar = await ExecuteScalarInternalAsync(sql, parameters, conn, tx);
        return Convert.ToInt64(scalar);
    }

    private async Task UpdateIngredientInDbAsync(
        long id, string name, string category, string subcategory, string unit,
        decimal stock, decimal minThreshold, decimal unitCost, decimal? mrp, string supplier,
        DbConnection? conn, DbTransaction? tx)
    {
        const string sql = @"
            UPDATE ingredients
            SET name = @name,
                ingredient_name = @name,
                category = @category,
                subcategory = @subcategory,
                unit = @unit,
                current_stock = @stock,
                minimum_threshold = @threshold,
                reorder_level = @threshold,
                unit_cost = @unit_cost,
                cost_per_unit = @unit_cost,
                mrp = @mrp,
                supplier = @supplier,
                updated_at = UTC_TIMESTAMP()
            WHERE ingredient_id = @id;
        ";

        var parameters = new Dictionary<string, object?>
        {
            { "@id", id },
            { "@name", name },
            { "@category", category },
            { "@subcategory", subcategory },
            { "@unit", unit },
            { "@stock", stock },
            { "@threshold", minThreshold },
            { "@unit_cost", unitCost },
            { "@mrp", mrp },
            { "@supplier", supplier }
        };

        await ExecuteNonQueryInternalAsync(sql, parameters, conn, tx);
    }

    private async Task TrySyncBarInventoryStockAsync(
        string itemName, string category, decimal quantity, decimal unitCost,
        DbConnection? conn, DbTransaction? tx)
    {
        try
        {
            // Check if matching liquor brand exists
            const string findBrandSql = @"
                SELECT brand_id 
                FROM bar_liquor_brands
                WHERE is_active = 1 AND deleted_at IS NULL
                  AND (LOWER(TRIM(brand_name)) = LOWER(TRIM(@name)) 
                       OR LOWER(@name) LIKE CONCAT('%', LOWER(TRIM(brand_name)), '%')
                       OR LOWER(TRIM(brand_name)) LIKE CONCAT('%', LOWER(@name), '%'))
                ORDER BY LENGTH(brand_name) DESC
                LIMIT 1;
            ";

            var brandScalar = await ExecuteScalarInternalAsync(findBrandSql, new Dictionary<string, object?> { { "@name", itemName } }, conn, tx);
            if (brandScalar == null || brandScalar == DBNull.Value) return;

            long brandId = Convert.ToInt64(brandScalar);

            // Find matching bottle size
            const string findSizeSql = @"
                SELECT size_id 
                FROM bar_bottle_sizes 
                WHERE brand_id = @brandId AND is_active = 1 
                LIMIT 1;
            ";

            var sizeScalar = await ExecuteScalarInternalAsync(findSizeSql, new Dictionary<string, object?> { { "@brandId", brandId } }, conn, tx);
            if (sizeScalar == null || sizeScalar == DBNull.Value) return;

            long sizeId = Convert.ToInt64(sizeScalar);

            // Check if bar_inventory_stock record exists
            const string findStockSql = @"
                SELECT stock_id 
                FROM bar_inventory_stock 
                WHERE brand_id = @brandId AND size_id = @sizeId
                LIMIT 1;
            ";

            var stockScalar = await ExecuteScalarInternalAsync(findStockSql, new Dictionary<string, object?>
            {
                { "@brandId", brandId },
                { "@sizeId", sizeId }
            }, conn, tx);

            int intQty = (int)Math.Max(0, Math.Round(quantity));

            if (stockScalar != null && stockScalar != DBNull.Value)
            {
                long stockId = Convert.ToInt64(stockScalar);
                const string updateStockSql = @"
                    UPDATE bar_inventory_stock
                    SET sealed_quantity = sealed_quantity + @qty,
                        avg_cost_price = IF(@cost > 0, @cost, avg_cost_price),
                        last_received_at = UTC_TIMESTAMP(),
                        updated_at = UTC_TIMESTAMP()
                    WHERE stock_id = @stockId;
                ";

                await ExecuteNonQueryInternalAsync(updateStockSql, new Dictionary<string, object?>
                {
                    { "@stockId", stockId },
                    { "@qty", intQty },
                    { "@cost", unitCost }
                }, conn, tx);

                _logger.LogInformation("[Inventory] Synced bar_inventory_stock {StockId} for brand {BrandId}. Added sealed qty: {Qty}", stockId, brandId, intQty);
            }
            else
            {
                const string insertStockSql = @"
                    INSERT INTO bar_inventory_stock (
                        branch_id, brand_id, size_id, sealed_quantity,
                        min_reorder_level, max_stock_level, reorder_quantity,
                        avg_cost_price, last_received_at, created_at, updated_at
                    ) VALUES (
                        1, @brandId, @sizeId, @qty,
                        5, 100, 20,
                        @cost, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP()
                    );
                ";

                await ExecuteNonQueryInternalAsync(insertStockSql, new Dictionary<string, object?>
                {
                    { "@brandId", brandId },
                    { "@sizeId", sizeId },
                    { "@qty", intQty },
                    { "@cost", unitCost }
                }, conn, tx);

                _logger.LogInformation("[Inventory] Created new bar_inventory_stock for brand {BrandId}, size {SizeId}. Qty: {Qty}", brandId, sizeId, intQty);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Inventory] Optional sync to bar_inventory_stock for '{Item}' encountered non-fatal notice.", itemName);
        }
    }

    private async Task<object?> ExecuteScalarInternalAsync(
        string sql, Dictionary<string, object?> parameters, DbConnection? conn, DbTransaction? tx)
    {
        if (conn == null)
        {
            conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        if (tx != null) cmd.Transaction = tx;

        foreach (var kvp in parameters)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = kvp.Key;
            p.Value = kvp.Value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        return await cmd.ExecuteScalarAsync();
    }

    private async Task<int> ExecuteNonQueryInternalAsync(
        string sql, Dictionary<string, object?> parameters, DbConnection? conn, DbTransaction? tx)
    {
        if (conn == null)
        {
            conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        if (tx != null) cmd.Transaction = tx;

        foreach (var kvp in parameters)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = kvp.Key;
            p.Value = kvp.Value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    #endregion

    #region String & Json Helpers

    private static string Truncate(string val, int maxLength)
    {
        if (string.IsNullOrEmpty(val)) return val;
        return val.Length <= maxLength ? val : val.Substring(0, maxLength);
    }

    private static string? TryGetString(JsonElement elem, string[] keys)
    {
        foreach (var key in keys)
        {
            if (elem.TryGetProperty(key, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.String) return prop.GetString();
                if (prop.ValueKind == JsonValueKind.Number) return prop.ToString();
            }
        }
        return null;
    }

    private static decimal? TryGetDecimal(JsonElement elem, string[] keys)
    {
        foreach (var key in keys)
        {
            if (elem.TryGetProperty(key, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var d)) return d;
                if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var parsedD)) return parsedD;
            }
        }
        return null;
    }

    private static bool TryGetLong(JsonElement elem, string[] keys, out long value)
    {
        foreach (var key in keys)
        {
            if (elem.TryGetProperty(key, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt64(out value)) return true;
                if (prop.ValueKind == JsonValueKind.String && long.TryParse(prop.GetString(), out value)) return true;
            }
        }
        value = 0;
        return false;
    }

    #endregion
}
