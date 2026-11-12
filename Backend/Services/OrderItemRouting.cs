using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public static class OrderItemRouting
{
    private static readonly string[] BeverageKeywords =
    {
        "beverage", "beverages", "drink", "drinks", "mocktail", "mocktails", "cocktail", "cocktails",
        "beer", "beers", "wine", "wines", "spirit", "spirits", "whisky", "whiskey", "whiskeys", "vodka", "vodkas",
        "rum", "rums", "gin", "gins", "brandy", "cognac", "liquor", "juice", "juices", "soda", "sodas", "tonic",
        "cider", "ciders", "champagne", "tea", "chai", "coffee", "latte", "espresso", "cappuccino", "shake", "shakes",
        "smoothie", "smoothies", "bar", "tequila", "mezcal", "liqueur", "liqueurs", "shot", "shots", "shooter",
        "aperitif", "bitters", "mojito", "margarita", "martini", "daiquiri", "cosmopolitan", "sangria", "pina colada",
        "long island", "scotch", "bourbon", "breezer", "coke", "pepsi", "sprite", "fanta", "limca", "thums up",
        "red bull", "lemonade", "lassi", "water", "corona", "budweiser", "heineken", "kingfisher", "carlsberg"
    };

    private static readonly string[] FoodKeywords =
    {
        "biryani", "curries", "curry", "starters", "starter", "rice", "breads", "bread", "roti", "naan", "kulcha",
        "desserts", "dessert", "chicken", "mutton", "fish", "prawns", "paneer", "main course", "tandoor", "tandoori",
        "chinese", "south indian", "north indian", "snacks", "soup", "soups", "salad", "salads", "appetizer", "appetizers",
        "tikka", "kebab", "kabab", "fry", "masala", "dal", "pulao", "fried rice", "noodles", "gravy"
    };

    public static bool ContainsBeverageTerm(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        return BeverageKeywords.Any(term => Regex.IsMatch(text, $@"\b{Regex.Escape(term)}\b", RegexOptions.IgnoreCase));
    }

    public static bool ContainsFoodTerm(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        return FoodKeywords.Any(term => Regex.IsMatch(text, $@"\b{Regex.Escape(term)}\b", RegexOptions.IgnoreCase));
    }

    public static bool IsBarItem(string? itemName, string? category = null, string? drinkType = null, bool isBarItem = false)
    {
        if (isBarItem || !string.IsNullOrWhiteSpace(drinkType))
        {
            return true;
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            if (ContainsFoodTerm(cat) && !ContainsBeverageTerm(cat))
            {
                return false;
            }
            if (ContainsBeverageTerm(cat))
            {
                return true;
            }
        }

        if (!string.IsNullOrWhiteSpace(itemName))
        {
            var name = itemName.Trim();
            if (ContainsFoodTerm(name) && !ContainsBeverageTerm(name))
            {
                return false;
            }
            if (ContainsBeverageTerm(name))
            {
                return true;
            }
        }

        return false;
    }

    public static bool IsBarItem(bool isBarItem, string? drinkType, string? category, string? itemName = null)
    {
        return IsBarItem(itemName, category, drinkType, isBarItem);
    }

    public static async Task<HashSet<long>> GetBarMenuItemIdsAsync(
        AppDbContext context,
        IEnumerable<long> menuItemIds)
    {
        var ids = menuItemIds.Where(id => id > 0).Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new HashSet<long>();
        }

        var menuItems = await context.MenuItems
            .AsNoTracking()
            .Where(item => ids.Contains(item.MenuItemId))
            .Select(item => new
            {
                item.MenuItemId,
                item.DishName,
                item.Category,
                item.DrinkType,
                item.IsBarItem
            })
            .ToListAsync();

        return menuItems
            .Where(item => IsBarItem(item.DishName, item.Category, item.DrinkType, item.IsBarItem))
            .Select(item => item.MenuItemId)
            .ToHashSet();
    }

    public static async Task<(List<OrderItem> kitchenItems, List<OrderItem> barItems)> ClassifyOrderItemsAsync(
        AppDbContext context,
        IEnumerable<OrderItem> items)
    {
        var itemList = items.ToList();
        if (itemList.Count == 0)
        {
            return (new List<OrderItem>(), new List<OrderItem>());
        }

        var menuItemIds = itemList.Where(i => i.MenuItemId > 0).Select(i => i.MenuItemId).Distinct().ToList();
        var menuItemsById = await context.MenuItems
            .AsNoTracking()
            .Where(m => menuItemIds.Contains(m.MenuItemId))
            .ToDictionaryAsync(m => m.MenuItemId);

        var namesToQuery = itemList
            .Where(i => i.MenuItemId <= 0 || !menuItemsById.ContainsKey(i.MenuItemId))
            .Select(i => i.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .ToList();

        Dictionary<string, MenuItem> menuItemsByName = new(StringComparer.OrdinalIgnoreCase);
        if (namesToQuery.Count > 0)
        {
            var foundByName = await context.MenuItems
                .AsNoTracking()
                .Where(m => namesToQuery.Contains(m.DishName))
                .ToListAsync();
            foreach (var m in foundByName)
            {
                if (!menuItemsByName.ContainsKey(m.DishName))
                {
                    menuItemsByName[m.DishName] = m;
                }
            }
        }

        var kitchenItems = new List<OrderItem>();
        var barItems = new List<OrderItem>();

        foreach (var item in itemList)
        {
            if (IsBarItem(item.Name))
            {
                barItems.Add(item);
                continue;
            }

            MenuItem? menu = null;
            if (item.MenuItemId > 0 && menuItemsById.TryGetValue(item.MenuItemId, out var foundMenu))
            {
                menu = foundMenu;
            }
            else if (!string.IsNullOrWhiteSpace(item.Name) && menuItemsByName.TryGetValue(item.Name, out var foundByName))
            {
                menu = foundByName;
            }

            // Check if item already has bot_id set
            bool isBar = (item.BotId.HasValue && item.BotId.Value > 0) || (menu != null
                ? IsBarItem(menu.DishName, menu.Category, menu.DrinkType, menu.IsBarItem)
                : IsBarItem(item.Name));

            if (isBar)
            {
                barItems.Add(item);
            }
            else
            {
                kitchenItems.Add(item);
            }
        }

        return (kitchenItems, barItems);
    }
    public static async Task<long> ResolveMenuItemIdAsync(
        AppDbContext context,
        long? providedId,
        string? itemName,
        bool? isBarHint = null)
    {
        var cleanName = (itemName ?? string.Empty).Trim();
        bool isDrink = isBarHint ?? IsBarItem(cleanName);

        // 1. If provided ID is valid, check if it matches in database
        if (providedId.HasValue && providedId.Value > 0)
        {
            var existing = await context.MenuItems
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MenuItemId == providedId.Value);

            if (existing != null)
            {
                bool existingIsBar = IsBarItem(existing.DishName, existing.Category, existing.DrinkType, existing.IsBarItem);
                if (isDrink == existingIsBar)
                {
                    return existing.MenuItemId;
                }
            }
        }

        // 2. Lookup by exact dish name
        if (!string.IsNullOrWhiteSpace(cleanName))
        {
            var exact = await context.MenuItems
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.DishName.ToLower() == cleanName.ToLower());
            if (exact != null)
            {
                return exact.MenuItemId;
            }

            // 3. Lookup by partial name / token match
            var allMenu = await context.MenuItems.AsNoTracking().ToListAsync();
            if (isDrink)
            {
                var barItems = allMenu.Where(m => IsBarItem(m.DishName, m.Category, m.DrinkType, m.IsBarItem)).ToList();

                foreach (var b in barItems)
                {
                    if (cleanName.IndexOf(b.DishName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                        b.DishName.IndexOf(cleanName, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        return b.MenuItemId;
                    }
                }

                // Token heuristics for common beverage families
                var tokenMatch = barItems.FirstOrDefault(b =>
                    (cleanName.Contains("vodka", StringComparison.OrdinalIgnoreCase) && (b.DishName.Contains("vodka", StringComparison.OrdinalIgnoreCase) || (b.Category != null && b.Category.Contains("Vodka", StringComparison.OrdinalIgnoreCase)))) ||
                    (cleanName.Contains("beer", StringComparison.OrdinalIgnoreCase) && (b.DishName.Contains("beer", StringComparison.OrdinalIgnoreCase) || (b.Category != null && b.Category.Contains("Beer", StringComparison.OrdinalIgnoreCase)))) ||
                    (cleanName.Contains("whiskey", StringComparison.OrdinalIgnoreCase) && (b.DishName.Contains("stag", StringComparison.OrdinalIgnoreCase) || (b.Category != null && b.Category.Contains("Whiskey", StringComparison.OrdinalIgnoreCase)))) ||
                    (cleanName.Contains("mojito", StringComparison.OrdinalIgnoreCase) && b.DishName.Contains("mojito", StringComparison.OrdinalIgnoreCase)) ||
                    (cleanName.Contains("coffee", StringComparison.OrdinalIgnoreCase) && b.DishName.Contains("coffee", StringComparison.OrdinalIgnoreCase)) ||
                    (cleanName.Contains("juice", StringComparison.OrdinalIgnoreCase) && (b.Category != null && b.Category.Contains("Juices", StringComparison.OrdinalIgnoreCase))) ||
                    (cleanName.Contains("cocktail", StringComparison.OrdinalIgnoreCase) && (b.Category != null && b.Category.Contains("Cocktails", StringComparison.OrdinalIgnoreCase))));

                if (tokenMatch != null) return tokenMatch.MenuItemId;
                if (barItems.Count > 0) return barItems[0].MenuItemId;
            }
            else
            {
                var foodItems = allMenu.Where(m => !IsBarItem(m.DishName, m.Category, m.DrinkType, m.IsBarItem)).ToList();

                foreach (var f in foodItems)
                {
                    if (cleanName.IndexOf(f.DishName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                        f.DishName.IndexOf(cleanName, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        return f.MenuItemId;
                    }
                }

                var tokenMatch = foodItems.FirstOrDefault(f =>
                    (cleanName.Contains("biryani", StringComparison.OrdinalIgnoreCase) && f.DishName.Contains("biryani", StringComparison.OrdinalIgnoreCase)) ||
                    (cleanName.Contains("chicken", StringComparison.OrdinalIgnoreCase) && f.DishName.Contains("chicken", StringComparison.OrdinalIgnoreCase)) ||
                    (cleanName.Contains("mutton", StringComparison.OrdinalIgnoreCase) && f.DishName.Contains("mutton", StringComparison.OrdinalIgnoreCase)) ||
                    (cleanName.Contains("paneer", StringComparison.OrdinalIgnoreCase) && f.DishName.Contains("paneer", StringComparison.OrdinalIgnoreCase)));

                if (tokenMatch != null) return tokenMatch.MenuItemId;
                if (foodItems.Count > 0) return foodItems[0].MenuItemId;
            }
        }

        // 4. Default fallback: 13 (vodka) for bar, 1 (biryani) for food
        return isDrink ? 13 : 1;
    }
}
