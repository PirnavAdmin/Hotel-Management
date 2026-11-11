using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HMS.Middleware;

/// <summary>
/// Transparently rewrites legacy and unversioned frontend API request paths
/// to their canonical /api/v1/{module}/{resource} equivalents before endpoint routing executes.
<<<<<<< HEAD
/// This ensures 100% backward compatibility for all frontend components without exposing duplicates in Swagger.
=======
/// This ensures 100% backward compatibility for all frontend components without polluting Swagger.
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
/// </summary>
public class LegacyApiRewriteMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LegacyApiRewriteMiddleware> _logger;

    public LegacyApiRewriteMiddleware(RequestDelegate next, ILogger<LegacyApiRewriteMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var originalPath = context.Request.Path.Value;
        if (!string.IsNullOrEmpty(originalPath) && originalPath.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            var rewrittenPath = RewritePath(originalPath);
            if (!string.Equals(originalPath, rewrittenPath, StringComparison.Ordinal))
            {
                _logger.LogInformation("[LegacyRewrite] Rewriting legacy path {Original} -> {Rewritten}", originalPath, rewrittenPath);
                context.Request.Path = new PathString(rewrittenPath);
                context.SetEndpoint(null);
            }
        }

        await _next(context);
    }

    public static string RewritePath(string path)
    {
        if (string.IsNullOrEmpty(path)) return path;

        // Exact shortcuts
        if (path.Equals("/api/state", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/pos/state", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/pos/state", StringComparison.OrdinalIgnoreCase))
        {
            return "/api/v1/state";
        }

        if (path.Equals("/api/sync", StringComparison.OrdinalIgnoreCase))
        {
            return "/api/v1/sync";
        }

        if (path.Equals("/api/events", StringComparison.OrdinalIgnoreCase))
        {
            return "/api/v1/events";
        }

<<<<<<< HEAD
        // ============================================================
        // 1. Kitchen: /api/Kitchen/* -> /api/v1/kitchen/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/kitchen(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/kitchen", "/api/v1/kitchen", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 2. Bills & Invoices: /api/v1/bills/* or /api/bills/* -> /api/v1/invoices/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api(/v1)?/bills(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/bills", "/api/v1/invoices", RegexOptions.IgnoreCase);
        }

        if (Regex.IsMatch(path, @"^/api/invoices(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/invoices", "/api/v1/invoices", RegexOptions.IgnoreCase);
        }

        // Invoice aliases
        if (Regex.IsMatch(path, @"^/api/v1/invoices/([^/]+)/cash-payment$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/invoices/([^/]+)/cash-payment$", "/api/v1/invoices/$1/payments", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/invoices/([^/]+)/download$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/invoices/([^/]+)/download$", "/api/v1/invoices/$1/pdf", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/invoices/history", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/invoices";
        }

        // ============================================================
        // 3. Menu: /api/menu(/.*)? -> /api/v1/menu-items$1
        // ============================================================
        if (Regex.IsMatch(path, @"^/api(/v1)?/menu(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/menu", "/api/v1/menu-items", RegexOptions.IgnoreCase);
        }

        if (Regex.IsMatch(path, @"^/api/menu-items(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/menu-items", "/api/v1/menu-items", RegexOptions.IgnoreCase);
        }

        // Menu item sub-resource aliases
        if (Regex.IsMatch(path, @"^/api/v1/menu-items/items/(.*)$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/menu-items/items/(.*)$", "/api/v1/menu-items/$1", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/menu-items/items", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/menu-items";
        }
        if (path.Equals("/api/v1/menu-items/upload", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/menu-items/upload-image";
        }

        // ============================================================
        // 4. Users: /api/users/* -> /api/v1/users/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/users(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/users", "/api/v1/users", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 5. Staff: /api/staff/* -> /api/v1/staff/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/staff(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/staff", "/api/v1/staff", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 6. Tables: /api/tables/* -> /api/v1/tables/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/tables(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/tables", "/api/v1/tables", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 7. Orders: /api/orders/* -> /api/v1/orders/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/orders(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/orders", "/api/v1/orders", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/orders/active", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/orders";
        }
        if (Regex.IsMatch(path, @"^/api/v1/orders/([^/]+)/send-kot$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/orders/([^/]+)/send-kot$", "/api/v1/orders/$1/kot", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 8. Auth: /api/auth/* -> /api/v1/auth/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/auth(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/auth", "/api/v1/auth", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 9. Reports: /api/reports/* -> /api/v1/reports/*
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/reports(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/reports", "/api/v1/reports", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/reports", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/reports/dashboard-summary", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/reports/sales-summary", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/reports/summary", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/reports/dashboard";
        }
        if (path.Equals("/api/v1/reports/revenue", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/reports/sales";
        }

        // ============================================================
        // 10. Bar unversioned & aliases
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/bar(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/bar", "/api/v1/bar", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api(/v1)?/bar-reports(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/bar-reports", "/api/v1/bar/reports", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/reports/bar(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/reports/bar", "/api/v1/bar/reports", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/bar/report", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/reports";
        }
        if (path.Equals("/api/v1/bar/reports/screens", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/bar/screens", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/screen-feed";
        }
        if (path.Equals("/api/v1/bar/dashboard", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/overview";
        }
        if (path.Equals("/api/v1/bar/recent-orders", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/bar/overview/recent-orders", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/orders";
        }
        if (Regex.IsMatch(path, @"^/api/v1/bar/drinks/([^/]+)/toggle-status$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/bar/drinks/([^/]+)/toggle-status$", "/api/v1/bar/drinks/$1/availability", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/bar/drinks/([^/]+)/toggle-special$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/bar/drinks/([^/]+)/toggle-special$", "/api/v1/bar/drinks/$1/special", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/bar/inventory/screens", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/inventory/screen-feed";
        }
        if (path.Equals("/api/v1/bar/invoices/screens", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/invoices/screen-feed";
        }
        if (Regex.IsMatch(path, @"^/api/v1/bar/reports/(export-csv|export\.csv|csv|download)$", RegexOptions.IgnoreCase))
        {
            path = "/api/v1/bar/reports/export";
        }

        // Bar KOT/BOT aliases
        if (Regex.IsMatch(path, @"^/api/v1/bar/kot(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/bar/kot", "/api/v1/bar/bot", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/bar/bot", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/bar/bot/tickets";
        }

        // ============================================================
        // 11. Inventory / Ingredients aliases
        // ============================================================
        if (Regex.IsMatch(path, @"^/api(/v1)?/ingredients(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/ingredients", "/api/v1/inventory", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/inventory(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/inventory", "/api/v1/inventory", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/inventory/ingredients(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/inventory/ingredients", "/api/v1/inventory", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/inventory/stock-adjustment", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/inventory/adjust";
        }

        // ============================================================
        // 12. KOT aliases
        // ============================================================
        if (Regex.IsMatch(path, @"^/api(/v1)?/kot[-_]orders(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/kot[-_]orders", "/api/v1/kot", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/kot(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/kot", "/api/v1/kot", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/kot/orders", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/kot";
        }
        if (path.Equals("/api/v1/kot/orders/summary", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/kot/summary";
        }
        if (path.Equals("/api/v1/kot/orders/screen-feed", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/v1/kot/screens", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/kot/screen-feed";
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/(orders/)?([^/]+)/mark-all-prepared$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/(orders/)?([^/]+)/mark-all-prepared$", "/api/v1/kot/$2/mark-all-prepared", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/(orders/)?([^/]+)/status$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/(orders/)?([^/]+)/status$", "/api/v1/kot/$2/status", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)/status$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)/status$", "/api/v1/kot/items/$3/status", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)/advance$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)/advance$", "/api/v1/kot/items/$3/advance", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/(orders/)?([^/]+)/items/([^/]+)$", "/api/v1/kot/items/$3", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/v1/kot/orders/([^/]+)$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/v1/kot/orders/([^/]+)$", "/api/v1/kot/$1", RegexOptions.IgnoreCase);
        }

        // KOT order items
        if (Regex.IsMatch(path, @"^/api(/v1)?/kot[-_]order[-_]items(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1)?/kot[-_]order[-_]items", "/api/v1/kot-order-items", RegexOptions.IgnoreCase);
        }

        // ============================================================
        // 13. Other modules
        // ============================================================
        if (Regex.IsMatch(path, @"^/api/salaries(/.*)?$", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(path, @"^/api/v1/staff/salaries(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api(/v1/staff)?/salaries", "/api/v1/salaries", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/reservations(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/reservations", "/api/v1/reservations", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/restaurant-settings(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/restaurant-settings", "/api/v1/restaurant-settings", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/suppliers(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/suppliers", "/api/v1/suppliers", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/customers(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/customers", "/api/v1/customers", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/promotions(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/promotions", "/api/v1/promotions", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/takeaway(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/takeaway", "/api/v1/takeaway", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/upload(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/upload", "/api/v1/upload", RegexOptions.IgnoreCase);
        }
        if (path.Equals("/api/v1/upload/image", StringComparison.OrdinalIgnoreCase))
        {
            path = "/api/v1/upload";
        }
        if (Regex.IsMatch(path, @"^/api/accounting(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/accounting", "/api/v1/accounting", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/dashboard(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/dashboard", "/api/v1/dashboard", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/ledger(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/ledger", "/api/v1/ledger", RegexOptions.IgnoreCase);
        }
        if (Regex.IsMatch(path, @"^/api/payments(/.*)?$", RegexOptions.IgnoreCase))
        {
            path = Regex.Replace(path, @"^/api/payments", "/api/v1/payments", RegexOptions.IgnoreCase);
=======
        // Module-specific rewrite rules
        // 1. Kitchen: /api/Kitchen/* -> /api/v1/kitchen/*
        if (Regex.IsMatch(path, @"^/api/kitchen(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/kitchen", "/api/v1/kitchen", RegexOptions.IgnoreCase);
        }

        // 2. Bills: /api/v1/bills/* or /api/bills/* -> /api/v1/invoices/*
        if (Regex.IsMatch(path, @"^/api(/v1)?/bills(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/bills", "/api/v1/invoices", RegexOptions.IgnoreCase);
        }

        // 3. Invoices legacy: /api/invoices/* -> /api/v1/invoices/*
        if (Regex.IsMatch(path, @"^/api/invoices(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/invoices", "/api/v1/invoices", RegexOptions.IgnoreCase);
        }

        // 4. Menu: /api/menu(/.*)? -> /api/v1/menu-items$1
        if (Regex.IsMatch(path, @"^/api(/v1)?/menu(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/menu", "/api/v1/menu-items", RegexOptions.IgnoreCase);
        }

        // 5. Unversioned menu-items: /api/menu-items/* -> /api/v1/menu-items/*
        if (Regex.IsMatch(path, @"^/api/menu-items(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/menu-items", "/api/v1/menu-items", RegexOptions.IgnoreCase);
        }

        // 6. Users: /api/users/* -> /api/v1/users/*
        if (Regex.IsMatch(path, @"^/api/users(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/users", "/api/v1/users", RegexOptions.IgnoreCase);
        }

        // 7. Staff: /api/staff/* -> /api/v1/staff/*
        if (Regex.IsMatch(path, @"^/api/staff(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/staff", "/api/v1/staff", RegexOptions.IgnoreCase);
        }

        // 8. Tables: /api/tables/* -> /api/v1/tables/*
        if (Regex.IsMatch(path, @"^/api/tables(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/tables", "/api/v1/tables", RegexOptions.IgnoreCase);
        }

        // 9. Orders: /api/orders/* -> /api/v1/orders/*
        if (Regex.IsMatch(path, @"^/api/orders(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/orders", "/api/v1/orders", RegexOptions.IgnoreCase);
        }

        // 10. Auth: /api/auth/* -> /api/v1/auth/*
        if (Regex.IsMatch(path, @"^/api/auth(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/auth", "/api/v1/auth", RegexOptions.IgnoreCase);
        }

        // 11. Reports: /api/reports/* -> /api/v1/reports/*
        if (Regex.IsMatch(path, @"^/api/reports(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/reports", "/api/v1/reports", RegexOptions.IgnoreCase);
        }

        // 12. Bar unversioned: /api/bar/* -> /api/v1/bar/*
        if (Regex.IsMatch(path, @"^/api/bar(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/bar", "/api/v1/bar", RegexOptions.IgnoreCase);
        }

        // 13. Bar reports aliases: /api(/v1)?/bar-reports/* -> /api/v1/bar/reports/*
        if (Regex.IsMatch(path, @"^/api(/v1)?/bar-reports(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/bar-reports", "/api/v1/bar/reports", RegexOptions.IgnoreCase);
        }

        // 14. Inventory / Ingredients aliases: /api(/v1)?/ingredients/* -> /api/v1/inventory/*
        if (Regex.IsMatch(path, @"^/api(/v1)?/ingredients(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/ingredients", "/api/v1/inventory", RegexOptions.IgnoreCase);
        }

        // Unversioned inventory: /api/inventory/* -> /api/v1/inventory/*
        if (Regex.IsMatch(path, @"^/api/inventory(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/inventory", "/api/v1/inventory", RegexOptions.IgnoreCase);
        }

        // 15. KOT aliases: /api(/v1)?/kot(-|_)?orders(/.*)? -> /api/v1/kot$2
        if (Regex.IsMatch(path, @"^/api(/v1)?/kot[-_]orders(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/kot[-_]orders", "/api/v1/kot", RegexOptions.IgnoreCase);
        }

        if (Regex.IsMatch(path, @"^/api/kot(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/kot", "/api/v1/kot", RegexOptions.IgnoreCase);
        }

        // KOT order items: /api(/v1)?/kot[-_]order[-_]items(/.*)? -> /api/v1/kot-order-items$2
        if (Regex.IsMatch(path, @"^/api(/v1)?/kot[-_]order[-_]items(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1)?/kot[-_]order[-_]items", "/api/v1/kot-order-items", RegexOptions.IgnoreCase);
        }

        // 16. Salaries aliases: /api/salaries/* or /api/v1/staff/salaries/* -> /api/v1/salaries/*
        if (Regex.IsMatch(path, @"^/api/salaries(/.*)?$", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(path, @"^/api/v1/staff/salaries(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api(/v1/staff)?/salaries", "/api/v1/salaries", RegexOptions.IgnoreCase);
        }

        // 17. Reservations unversioned: /api/reservations/* -> /api/v1/reservations/*
        if (Regex.IsMatch(path, @"^/api/reservations(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/reservations", "/api/v1/reservations", RegexOptions.IgnoreCase);
        }

        // 18. Restaurant settings unversioned: /api/restaurant-settings/* -> /api/v1/restaurant-settings/*
        if (Regex.IsMatch(path, @"^/api/restaurant-settings(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/restaurant-settings", "/api/v1/restaurant-settings", RegexOptions.IgnoreCase);
        }

        // 19. Suppliers unversioned: /api/suppliers/* -> /api/v1/suppliers/*
        if (Regex.IsMatch(path, @"^/api/suppliers(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/suppliers", "/api/v1/suppliers", RegexOptions.IgnoreCase);
        }

        // 20. Customers unversioned: /api/customers/* -> /api/v1/customers/*
        if (Regex.IsMatch(path, @"^/api/customers(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/customers", "/api/v1/customers", RegexOptions.IgnoreCase);
        }

        // 21. Promotions unversioned: /api/promotions/* -> /api/v1/promotions/*
        if (Regex.IsMatch(path, @"^/api/promotions(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/promotions", "/api/v1/promotions", RegexOptions.IgnoreCase);
        }

        // 22. Upload unversioned: /api/upload(/.*)? -> /api/v1/upload$1
        if (Regex.IsMatch(path, @"^/api/upload(/.*)?$", RegexOptions.IgnoreCase))
        {
            return Regex.Replace(path, @"^/api/upload", "/api/v1/upload", RegexOptions.IgnoreCase);
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
        }

        return path;
    }
}
