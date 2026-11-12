using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace HMS.Middleware;

/// <summary>
/// Enforces strict logical separation between Customer portal JWT principals and Staff/Admin/POS APIs,
/// while preserving anonymous POS/Staff workflows and all explicitly customer-accessible endpoints.
/// </summary>
public class CustomerAdminIsolationMiddleware
{
    private static readonly Regex TakeawayOrderDetailRegex = new(@"^/api/v1/takeaway/orders/\d+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TakeawayOrderPayRegex = new(@"^/api/v1/takeaway/orders/\d+/pay$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TakeawayInvoicePayRegex = new(@"^/api/v1/takeaway/invoices/\d+/pay$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ReservationTableDetailRegex = new(@"^/api/v1/reservations/tables/\d+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ReservationSingleRegex = new(@"^/api/v1/reservations/[^/]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ReservationCancelRegex = new(@"^/api/v1/reservations/[^/]+/cancel$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ReservationPaymentRegex = new(@"^/api/v1/reservations/[^/]+/payment$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ReservationPaymentStatusRegex = new(@"^/api/v1/reservations/[^/]+/payment-status$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MenuItemSingleRegex = new(@"^/api/v1/menu-items/\d+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly RequestDelegate _next;

    public CustomerAdminIsolationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var rawPath = context.Request.Path.Value;
        if (string.IsNullOrEmpty(rawPath) || !rawPath.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        string path = LegacyApiRewriteMiddleware.RewritePath(rawPath).TrimEnd('/');
        if (string.IsNullOrEmpty(path)) path = "/";
        string method = context.Request.Method ?? "GET";

        // Allow public customer auth endpoints (login, register, verify-otp, resend-otp, forgot-password, reset-password, refresh-token, logout)
        if (path.StartsWith("/api/v1/auth/customer/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // If a valid-signature customer_auth JWT failed state checks (inactive/unverified), deny non-public endpoints with 403
        if (context.Items.TryGetValue("CustomerForbiddenMessage", out var forbiddenObj) && forbiddenObj is string forbiddenMsg)
        {
            await WriteJsonErrorAsync(context, StatusCodes.Status403Forbidden, forbiddenMsg);
            return;
        }

        // If a valid-signature customer_auth JWT was revoked (logout/password reset) and hits an admin endpoint with [AllowAnonymous], reject with 401
        if (context.Items.TryGetValue("CustomerRevokedMessage", out var revokedObj) && revokedObj is string revokedMsg &&
            !IsCustomerAllowedEndpoint(method, path))
        {
            await WriteJsonErrorAsync(context, StatusCodes.Status401Unauthorized, revokedMsg);
            return;
        }

        // If authenticated as a Customer principal, allow ONLY explicitly approved customer-facing endpoints
        if (context.User.Identity?.IsAuthenticated == true && IsCustomerPrincipal(context.User))
        {
            if (!IsCustomerAllowedEndpoint(method, path))
            {
                await WriteJsonErrorAsync(
                    context,
                    StatusCodes.Status403Forbidden,
                    "Customer accounts are not authorized to access Admin or POS endpoints.");
                return;
            }
        }

        await _next(context);
    }

    public static bool IsCustomerPrincipal(ClaimsPrincipal? user)
    {
        if (user == null || user.Identity?.IsAuthenticated != true) return false;

        string? role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("roleName");
        string? accountType = user.FindFirstValue("accountType");
        string? scope = user.FindFirstValue("tokenScope");

        return string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(accountType, "Customer", StringComparison.OrdinalIgnoreCase) ||
               (!string.IsNullOrWhiteSpace(scope) &&
                (scope.StartsWith("customer", StringComparison.OrdinalIgnoreCase) ||
                 scope.StartsWith("reservation", StringComparison.OrdinalIgnoreCase)));
    }

    private static bool IsCustomerAllowedEndpoint(string method, string path)
    {
        // Customer auth routes
        if (path.StartsWith("/api/v1/auth/customer/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Customer self-service portal endpoints
        if (HttpMethods.IsGet(method) &&
            (path.Equals("/api/v1/customers/me", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/customers/me/orders", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/customers/me/reservations", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        // Customer Takeaway endpoints
        if (HttpMethods.IsGet(method) &&
            (path.Equals("/api/v1/takeaway/menu", StringComparison.OrdinalIgnoreCase) ||
             path.StartsWith("/api/v1/takeaway/menu/", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/takeaway/categories", StringComparison.OrdinalIgnoreCase) ||
             TakeawayOrderDetailRegex.IsMatch(path)))
        {
            return true;
        }

        if (HttpMethods.IsPost(method) &&
            (path.Equals("/api/v1/takeaway/calculate", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/takeaway/orders", StringComparison.OrdinalIgnoreCase) ||
             TakeawayOrderPayRegex.IsMatch(path) ||
             TakeawayInvoicePayRegex.IsMatch(path)))
        {
            return true;
        }

        // Customer Table Reservation endpoints (note: exact GET /api/v1/reservations, PUT .../status, DELETE, webhook stay blocked)
        if (HttpMethods.IsGet(method) &&
            (path.Equals("/api/v1/reservations/availability", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/reservations/available-tables", StringComparison.OrdinalIgnoreCase) ||
             ReservationTableDetailRegex.IsMatch(path) ||
             path.Equals("/api/v1/reservations/my", StringComparison.OrdinalIgnoreCase) ||
             ReservationSingleRegex.IsMatch(path) ||
             ReservationPaymentStatusRegex.IsMatch(path)))
        {
            return true;
        }

        if (HttpMethods.IsPost(method) &&
            (path.Equals("/api/v1/reservations", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/reservations/otp/send", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/reservations/otp/verify", StringComparison.OrdinalIgnoreCase) ||
             ReservationCancelRegex.IsMatch(path) ||
             ReservationPaymentRegex.IsMatch(path)))
        {
            return true;
        }

        if (HttpMethods.IsPut(method) && ReservationSingleRegex.IsMatch(path))
        {
            return true;
        }

        // Public read-only menu & promotions
        if (HttpMethods.IsGet(method) &&
            (path.Equals("/api/v1/menu-items", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/menu-items/specials", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/v1/menu-items/categories", StringComparison.OrdinalIgnoreCase) ||
             MenuItemSingleRegex.IsMatch(path) ||
             path.Equals("/api/v1/promotions", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return false;
    }

    private static async Task WriteJsonErrorAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            success = false,
            message
        }));
    }
}
