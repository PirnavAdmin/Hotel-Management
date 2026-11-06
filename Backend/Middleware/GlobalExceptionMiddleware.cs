using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace HMS.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Response has already started; cannot write global exception payload for {Path}", context.Request.Path);
            return;
        }

        var (statusCode, message, errorType) = MapExceptionToResponse(exception);

        _logger.LogError(
            exception,
            "[GLOBAL EXCEPTION] {Method} {Path} -> {StatusCode} ({ErrorType}): {Message}",
            context.Request.Method,
            context.Request.Path,
            statusCode,
            errorType,
            exception.Message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        if (statusCode == StatusCodes.Status503ServiceUnavailable)
        {
            context.Response.Headers["Retry-After"] = "5";
        }

        var response = new
        {
            success = false,
            message,
            statusCode,
            errorType,
            details = exception.Message
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        await context.Response.WriteAsync(json);
    }

    private static (int StatusCode, string Message, string ErrorType) MapExceptionToResponse(Exception ex)
    {
        var errorType = ex.GetType().Name;

        // Check for underlying MySQL exception in EF Core or wrapper exceptions
        var mysqlEx = FindException<MySqlException>(ex);
        if (mysqlEx != null)
        {
            return MapMySqlException(mysqlEx);
        }

        return ex switch
        {
            TimeoutException => (
                StatusCodes.Status503ServiceUnavailable,
                "The database or external service timed out. Please retry shortly.",
                errorType
            ),

            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "A concurrency conflict occurred. The record was modified by another operation.",
                errorType
            ),

            BadHttpRequestException badReq => (
                StatusCodes.Status400BadRequest,
                badReq.Message,
                errorType
            ),

            ArgumentNullException or ArgumentException => (
                StatusCodes.Status400BadRequest,
                ex.Message,
                errorType
            ),

            UnauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "You are not authorized to perform this action.",
                errorType
            ),

            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                ex.Message,
                errorType
            ),

            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected internal server error occurred.",
                errorType
            )
        };
    }

    private static (int StatusCode, string Message, string ErrorType) MapMySqlException(MySqlException sqlEx)
    {
        var errorType = $"MySqlException({sqlEx.Number})";

        // Transient database connectivity and server down errors -> HTTP 503
        // 1042: Unable to resolve host
        // 1045: Access denied
        // 2002: Connection refused / host unreachable
        // 2003: Can't connect to MySQL server
        // 2006: MySQL server has gone away
        // 2013: Lost connection to MySQL server during query
        // 1205: Lock wait timeout exceeded
        // 1213: Deadlock found when trying to get lock
        if (sqlEx.Number is 1042 or 1045 or 2002 or 2003 or 2006 or 2013 or 1205 or 1213)
        {
            return (
                StatusCodes.Status503ServiceUnavailable,
                "Database service is temporarily unavailable. Please retry shortly.",
                errorType
            );
        }

        // Duplicate entry -> HTTP 409
        if (sqlEx.Number == 1062)
        {
            return (
                StatusCodes.Status409Conflict,
                "A record with this identifier or unique value already exists.",
                errorType
            );
        }

        // Foreign key constraint failure -> HTTP 400
        if (sqlEx.Number is 1451 or 1452)
        {
            return (
                StatusCodes.Status400BadRequest,
                "The operation violates a foreign key relationship.",
                errorType
            );
        }

        // Other database exceptions -> HTTP 500
        return (
            StatusCodes.Status500InternalServerError,
            "A database error occurred while processing the request.",
            errorType
        );
    }

    private static T? FindException<T>(Exception? ex) where T : Exception
    {
        while (ex != null)
        {
            if (ex is T matched) return matched;
            ex = ex.InnerException;
        }
        return null;
    }
}
