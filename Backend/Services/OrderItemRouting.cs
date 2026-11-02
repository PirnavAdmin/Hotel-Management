using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public static class OrderItemRouting
{
    private static readonly string[] BeverageCategoryTerms =
    {
        "beverage", "beverages", "drink", "drinks", "mocktail", "mocktails", "cocktail", "cocktails",
        "beer", "beers", "wine", "wines", "spirit", "spirits", "whisky", "whiskey", "vodka", "rum", "gin",
        "brandy", "liquor", "juice", "juices", "soda", "sodas", "tonic", "cider", "champagne", "tea", "coffee",
        "shake", "smoothie", "bar", "tequila", "mezcal", "liqueur", "shot", "shots", "shooter", "aperitif", "bitters",
        "mojito", "margarita", "martini", "daiquiri", "cosmopolitan", "sangria", "pina colada", "long island",
        "scotch", "bourbon", "breezer", "coke", "pepsi", "sprite", "fanta", "limca", "thums up", "red bull",
        "lemonade", "lassi", "water", "corona", "budweiser", "heineken", "kingfisher", "carlsberg"
    };

    private static readonly string[] FoodCategoryTerms =
    {
        "biryani", "curries", "curry", "starters", "starter", "rice", "breads", "bread", "roti", "naan", "kulcha",
        "desserts", "dessert", "chicken", "mutton", "fish", "prawns", "paneer", "main course", "tandoor", "tandoori",
        "chinese", "south indian", "north indian", "snacks", "soup", "soups", "salad", "salads", "appetizer", "appetizers"
    };

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
            .Where(item => IsBarItem(item.IsBarItem, item.DrinkType, item.Category, item.DishName))
            .Select(item => item.MenuItemId)
            .ToHashSet();
    }

    private static bool ContainsWord(string text, string term)
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(term)) return false;
        if (term.Contains(' '))
        {
            return text.Contains(term, StringComparison.OrdinalIgnoreCase);
        }
        var words = text.Split(new[] { ' ', '-', '_', '/', '&', ',', '(', ')', '.', '\'' }, StringSplitOptions.RemoveEmptyEntries);
        return words.Any(w => string.Equals(w, term, StringComparison.OrdinalIgnoreCase) || 
                              (term.Length >= 4 && w.StartsWith(term, StringComparison.OrdinalIgnoreCase)));
    }

    public static bool IsBarItem(bool isBarItem, string? drinkType, string? category, string? itemName = null)
    {
        if (isBarItem || !string.IsNullOrWhiteSpace(drinkType))
        {
            return true;
        }

        // Prioritize distinct beverage names
        if (!string.IsNullOrWhiteSpace(itemName))
        {
            var normalizedName = itemName.Trim().ToLowerInvariant();
            if (BeverageCategoryTerms.Any(term => ContainsWord(normalizedName, term)))
            {
                if (!FoodCategoryTerms.Any(term => ContainsWord(normalizedName, term)))
                {
                    return true;
                }
            }
        }

        var normalizedCategory = (category ?? string.Empty).Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(normalizedCategory))
        {
            if (FoodCategoryTerms.Any(term => ContainsWord(normalizedCategory, term)))
            {
                return false;
            }

            if (BeverageCategoryTerms.Any(term => ContainsWord(normalizedCategory, term)))
            {
                return true;
            }
        }

        return false;
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
            if (IsBarItem(false, null, null, item.Name))
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
                ? IsBarItem(menu.IsBarItem, menu.DrinkType, menu.Category, item.Name)
                : IsBarItem(false, null, null, item.Name));

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
}
