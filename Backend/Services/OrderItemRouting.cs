using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public static class OrderItemRouting
{
    private static readonly string[] BeverageCategoryTerms =
    {
        "beverage", "drink", "mocktail", "cocktail", "beer", "wine",
        "spirit", "whisky", "whiskey", "vodka", "rum", "gin", "brandy",
        "liquor", "juice", "soda", "tonic", "cider", "champagne", "tea",
        "coffee", "shake", "smoothie", "bar"
    };

    private static readonly string[] FoodCategoryTerms =
    {
        "biryani", "curry", "starter", "rice", "bread", "dessert",
        "chicken", "mutton", "main course", "tandoor", "soup", "salad"
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
                item.Category,
                item.DrinkType,
                item.IsBarItem
            })
            .ToListAsync();

        return menuItems
            .Where(item => IsBarItem(item.IsBarItem, item.DrinkType, item.Category))
            .Select(item => item.MenuItemId)
            .ToHashSet();
    }

    private static bool IsBarItem(bool isBarItem, string? drinkType, string? category)
    {
        if (isBarItem || !string.IsNullOrWhiteSpace(drinkType))
        {
            return true;
        }

        var normalizedCategory = (category ?? string.Empty).Trim().ToLowerInvariant();
        if (FoodCategoryTerms.Any(term => normalizedCategory.Contains(term, StringComparison.Ordinal)))
        {
            return false;
        }

        return BeverageCategoryTerms.Any(term => normalizedCategory.Contains(term, StringComparison.Ordinal));
    }
}
