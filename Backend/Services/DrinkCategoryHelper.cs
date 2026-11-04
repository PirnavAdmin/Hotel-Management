using System;
using System.Linq;

namespace HMS.Services;

public static class DrinkCategoryHelper
{
    private static readonly string[] NonDrinkCategories = new[]
    {
        "biryani", "curries", "curry", "starters", "starter", "desserts", "dessert",
        "rice", "breads", "bread", "roti", "naan", "tandoori", "tandoor", "chinese",
        "south indian", "north indian", "snacks", "main course", "soups", "soup", "salads", "salad"
    };

    private static readonly string[] DrinkCategoryKeywords = new[]
    {
        "beverage", "beverages",
        "drink", "drinks",
        "cocktail", "cocktails",
        "mocktail", "mocktails",
        "juice", "juices",
        "soft drink", "soft drinks", "softdrink", "softdrinks", "soda", "sodas",
        "tea", "coffee", "tea & coffee", "tea and coffee", "hot beverage", "hot beverages",
        "cold beverage", "cold beverages",
        "alcoholic", "alcoholic beverage", "alcoholic beverages", "alcohol",
        "beer", "beers",
        "whiskey", "whisky", "bourbon", "scotch",
        "vodka", "vodka & gin", "gin",
        "rum", "rum & brandy", "brandy",
        "wine", "wine & champagne", "champagne",
        "tequila", "liqueur", "liquor", "spirits", "shots", "shooters",
        "shake", "shakes", "smoothie", "smoothies"
    };

    private static readonly string[] AlcoholicKeywords = new[]
    {
        "alcoholic", "alcoholic beverage", "alcoholic beverages", "alcohol",
        "beer", "beers",
        "whiskey", "whisky", "bourbon", "scotch",
        "vodka", "vodka & gin", "gin",
        "rum", "rum & brandy", "brandy",
        "wine", "wine & champagne", "champagne",
        "cocktail", "cocktails",
        "tequila", "liqueur", "liquor", "spirits", "shots", "shooters"
    };

    public static bool IsFoodCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return false;
        var normalized = category.Trim().ToLowerInvariant();
        return NonDrinkCategories.Any(kw => normalized == kw || normalized.Contains(kw));
    }

    public static bool IsDrinkCategory(string? category, string? drinkType = null, bool isBarItem = false)
    {
        if (IsFoodCategory(category)) return false;
        if (isBarItem) return true;
        if (!string.IsNullOrWhiteSpace(drinkType)) return true;
        if (string.IsNullOrWhiteSpace(category)) return false;

        var normalized = category.Trim().ToLowerInvariant();
        return DrinkCategoryKeywords.Any(kw => normalized == kw || normalized.Contains(kw));
    }

    public static bool IsAlcoholicCategory(string? category, string? drinkType = null, decimal? alcoholPct = null)
    {
        if (!string.IsNullOrWhiteSpace(drinkType))
        {
            if (drinkType.Trim().Equals("Alcoholic", StringComparison.OrdinalIgnoreCase)) return true;
            if (drinkType.Trim().Equals("Non-Alcoholic", StringComparison.OrdinalIgnoreCase)) return false;
        }

        if (alcoholPct.HasValue && alcoholPct.Value > 0) return true;

        if (string.IsNullOrWhiteSpace(category)) return false;

        var normalized = category.Trim().ToLowerInvariant();
        return AlcoholicKeywords.Any(kw => normalized == kw || normalized.Contains(kw));
    }

    /// <summary>
    /// Requirement 1:
    /// If Drink Type = Alcoholic -> Automatically set Dietary Type = Veg.
    /// If Drink Type = Non-Alcoholic -> Automatically set Dietary Type = Non-Veg.
    /// </summary>
    public static string GetDrinkDietaryType(string? drinkType, string? category = null, decimal? alcoholPct = null)
    {
        return IsAlcoholicCategory(category, drinkType, alcoholPct) ? "Veg" : "Non-Veg";
    }

    public static string NormalizeDietaryType(string? rawDietaryType, string? category, string? drinkType = null, bool isBarItem = false, bool? isVeg = null, decimal? alcoholPct = null)
    {
        if (IsDrinkCategory(category, drinkType, isBarItem))
        {
            return GetDrinkDietaryType(drinkType, category, alcoholPct);
        }

        // Food items: retain existing Veg / Non-Veg classification
        if (!string.IsNullOrWhiteSpace(rawDietaryType))
        {
            var clean = rawDietaryType.Trim();
            if (clean.Contains("🟢") || clean.Equals("veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("pure veg", StringComparison.OrdinalIgnoreCase))
            {
                return "Veg";
            }
            if (clean.Contains("🔴") || clean.Equals("non-veg", StringComparison.OrdinalIgnoreCase) || clean.Equals("non veg", StringComparison.OrdinalIgnoreCase))
            {
                return "Non-Veg";
            }
            return clean.Length > 20 ? clean.Substring(0, 20) : clean;
        }

        if (isVeg.HasValue)
        {
            return isVeg.Value ? "Veg" : "Non-Veg";
        }

        return "Non-Veg";
    }
}
