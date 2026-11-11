using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HMS.Middleware;

/// <summary>
/// Transparently rewrites legacy and unversioned frontend API request paths
/// to their canonical /api/v1/{module}/{resource} equivalents before endpoint routing executes.
/// This ensures 100% backward compatibility for all frontend components without polluting Swagger.
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
        }

        return path;
    }
}
