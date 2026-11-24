using System.Security.Claims;
using System.Text;
using System.Text.Json;
using HMS.Data;
using HMS.Middleware;
using HMS.Models;
using HMS.Services;
using HMS.Tests;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

if (args.Length > 0 && args.Contains("--run-issue21-tests"))
{
    var exitCode = await Issue21SecurityTests.RunAsync(args);
    Environment.Exit(exitCode);
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Respect URLs configured via launchSettings.json, ASPNETCORE_URLS (e.g. Docker), or --urls;
// default to port 5018 when running without explicit URL configuration.
var configuredUrls =
    builder.Configuration[WebHostDefaults.ServerUrlsKey] ??
    Environment.GetEnvironmentVariable("ASPNETCORE_URLS");

if (string.IsNullOrWhiteSpace(configuredUrls))
{
    builder.WebHost.UseUrls("http://localhost:5018", "http://0.0.0.0:5018");
}

// ============================================================
// DATABASE
// ============================================================

var configuredConnectionString =
    Environment.GetEnvironmentVariable("DB_CONNECTION_STRING") ??
    builder.Configuration
        .GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(configuredConnectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection is missing from configuration.");
}

// Resilient credentials resolver (supports multi-developer environments via environment variables)
string connectionString = configuredConnectionString;
try
{
    using var testConn = new MySqlConnector.MySqlConnection(connectionString);
    testConn.Open();
}
catch (MySqlConnector.MySqlException ex)
{
    Console.WriteLine($"[Database] Configured credentials failed ({ex.Message}). Checking fallback credentials from environment...");
    var envFallbacks = Environment.GetEnvironmentVariable("DB_FALLBACK_CONNECTION_STRINGS");
    var fallbackCandidates = !string.IsNullOrWhiteSpace(envFallbacks)
        ? envFallbacks.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        : Array.Empty<string>();

    bool resolved = false;
    foreach (var candidate in fallbackCandidates)
    {
        try
        {
            using var candidateConn = new MySqlConnector.MySqlConnection(candidate);
            candidateConn.Open();
            connectionString = candidate;
            resolved = true;
            Console.WriteLine("[Database] Successfully connected with fallback credentials from environment.");
            break;
        }
        catch
        {
            // try next candidate
        }
    }

    if (!resolved)
    {
        Console.Error.WriteLine("[Database] Failed to connect to MySQL database.");
    }
}

var serverVersion = ServerVersion.AutoDetect(connectionString);

builder.Services.AddDbContext<AppDbContext>(
    options =>
        options.UseMySql(
            connectionString,
            serverVersion,
            mySqlOptions =>
            {
                mySqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorNumbersToAdd: null);
            }));

// ============================================================
// JWT
// ============================================================

var jwtKey =
    Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ??
    builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Jwt:Key is missing from configuration.");
}

var jwtIssuer =
    Environment.GetEnvironmentVariable("JWT_ISSUER") ??
    builder.Configuration["Jwt:Issuer"];

var jwtAudience =
    Environment.GetEnvironmentVariable("JWT_AUDIENCE") ??
    builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,

                ValidateAudience = true,

                ValidateLifetime = true,

                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,

                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey)),

                ClockSkew =
                    TimeSpan.Zero
            };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"].ToString();
                var authHeader = context.Request.Headers.Authorization.ToString();
                string? rawToken = !string.IsNullOrEmpty(accessToken)
                    ? accessToken
                    : (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? authHeader.Substring(7).Trim() : null);

                if (!string.IsNullOrEmpty(rawToken) && rawToken.StartsWith("mock-jwt-token", StringComparison.OrdinalIgnoreCase))
                {
                    // Mock JWT is strictly disabled by default and completely prohibited in production.
                    // It can only be enabled if IsDevelopment is true AND Authentication:AllowMockJwtInDevelopment is explicitly true.
                    var allowMockJwt = builder.Environment.IsDevelopment() &&
                                       !builder.Environment.IsProduction() &&
                                       builder.Configuration.GetValue<bool>("Authentication:AllowMockJwtInDevelopment", false);

                    if (!allowMockJwt)
                    {
                        context.Fail("Mock JWT authentication bypass is prohibited in this environment.");
                        return Task.CompletedTask;
                    }

                    var claims = new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1"),
                        new Claim(ClaimTypes.Name, "pirnav"),
                        new Claim(ClaimTypes.Role, "Admin"),
                        new Claim("userId", "1"),
                        new Claim("roleName", "Admin"),
                        new Claim("branchId", "1"),
                        new Claim("restaurantId", "restaurant_1")
                    };
                    var identity = new ClaimsIdentity(claims, "MockBearer");
                    context.Principal = new ClaimsPrincipal(identity);
                    context.Success();
                    return Task.CompletedTask;
                }

                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            },

            OnTokenValidated = async context =>
            {
                var scope = context.Principal?.FindFirstValue("tokenScope");
                if (!string.Equals(scope, CustomerAuthService.CustomerAuthScope, StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                string? rawCid = context.Principal?.FindFirstValue("customerId");
                string? rawVer = context.Principal?.FindFirstValue("tokenVersion");
                string? sessionId = context.Principal?.FindFirstValue("sessionId");

                if (!long.TryParse(rawCid, out long customerId) || customerId <= 0 ||
                    !int.TryParse(rawVer, out int claimTokenVersion) ||
                    string.IsNullOrWhiteSpace(sessionId))
                {
                    context.HttpContext.Items["CustomerRevokedMessage"] = "Invalid customer session token.";
                    context.Fail("Invalid customer session token.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var cust = await db.Customers
                    .AsNoTracking()
                    .Where(c => c.CustomerId == customerId)
                    .Select(c => new
                    {
                        c.CustomerId,
                        c.IsActive,
                        c.IsVerified,
                        c.TokenVersion,
                        c.DeletedAt
                    })
                    .FirstOrDefaultAsync();

                if (cust == null || cust.DeletedAt != null || cust.TokenVersion != claimTokenVersion)
                {
                    context.HttpContext.Items["CustomerRevokedMessage"] = "Session has been invalidated or password was reset. Please sign in again.";
                    context.Fail("Customer token invalidated.");
                    return;
                }

                DateTime utcNow = DateTime.UtcNow;
                bool hasActiveSession = await db.CustomerRefreshTokens
                    .AsNoTracking()
                    .AnyAsync(rt => rt.CustomerId == customerId &&
                                    rt.FamilyId == sessionId &&
                                    rt.RevokedAt == null &&
                                    rt.ExpiresAt > utcNow);

                if (!hasActiveSession)
                {
                    context.HttpContext.Items["CustomerRevokedMessage"] = "Session has been logged out or expired. Please sign in again.";
                    context.Fail("Customer session revoked.");
                    return;
                }

                if (!cust.IsActive)
                {
                    context.HttpContext.Items["CustomerForbiddenMessage"] = "Your customer account is currently inactive.";
                    context.Fail("Customer account inactive.");
                    return;
                }

                if (!cust.IsVerified)
                {
                    context.HttpContext.Items["CustomerForbiddenMessage"] = "Your customer account is not verified.";
                    context.Fail("Customer account unverified.");
                    return;
                }
            },

            OnChallenge = async context =>
            {
                if (context.Handled) return;
                context.HandleResponse();

                if (context.HttpContext.Items.TryGetValue("CustomerForbiddenMessage", out var forbiddenObj) &&
                    forbiddenObj is string forbiddenMsg)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        success = false,
                        message = forbiddenMsg
                    }));
                    return;
                }

                string msg = context.HttpContext.Items.TryGetValue("CustomerRevokedMessage", out var revObj) &&
                             revObj is string revokedMsg
                    ? revokedMsg
                    : "Authentication required. Missing, invalid, expired, or revoked access token.";

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    message = msg
                }));
            },

            OnForbidden = async context =>
            {
                if (context.Response.HasStarted) return;
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    message = "You do not have permission to access this resource."
                }));
            }
        };
    });

builder.Services.AddAuthorization();

// ============================================================
// CORS
// ============================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "FrontendPolicy",
        policy =>
        {
            policy
                .SetIsOriginAllowed(origin => true)

                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("Content-Disposition", "Content-Length", "X-Suggested-Filename");
        });
});


// ============================================================
// SERVICES
// ============================================================

builder.Services.AddScoped<SpService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<AuthRateLimiter>();
builder.Services.Configure<SmtpSettings>(options =>
{
    builder.Configuration.GetSection(SmtpSettings.SectionName).Bind(options);

    var envHost = Environment.GetEnvironmentVariable("SMTP_HOST");
    if (!string.IsNullOrWhiteSpace(envHost)) options.Host = envHost;

    var envPort = Environment.GetEnvironmentVariable("SMTP_PORT");
    if (int.TryParse(envPort, out int port)) options.Port = port;

    var envUser = Environment.GetEnvironmentVariable("SMTP_USERNAME");
    if (!string.IsNullOrWhiteSpace(envUser)) options.Username = envUser;

    var envPass = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
    if (!string.IsNullOrWhiteSpace(envPass)) options.Password = envPass;

    var envFromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL");
    if (!string.IsNullOrWhiteSpace(envFromEmail)) options.FromEmail = envFromEmail;

    var envFromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME");
    if (!string.IsNullOrWhiteSpace(envFromName)) options.FromName = envFromName;
});
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<ICustomerNotificationService, CustomerNotificationService>();
builder.Services.AddScoped<CustomerAuthService>();
builder.Services.AddScoped<MenuItemService>();
builder.Services.AddScoped<StaffService>();
builder.Services.AddScoped<TableService>();
builder.Services.AddScoped<LoginManagementService>();
builder.Services.AddScoped<KotService>();
builder.Services.AddScoped<RestaurantSettingsService>();
builder.Services.AddScoped<RestaurantThemeColorService>();
builder.Services.AddScoped<BarService>();
builder.Services.AddScoped<TakeawayService>();
builder.Services.AddScoped<ReservationService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<SalaryService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<ExportService>();
builder.Services.AddScoped<ReportingExportService>();
builder.Services.AddScoped<AccountingService>();
builder.Services.AddSingleton<ISseBroadcaster, SseBroadcaster>();
builder.Services.AddSingleton<ITableLockService, TableLockService>();
builder.Services.AddSingleton<IRealtimeSyncService, RealtimeSyncService>();
builder.Services.AddSignalR();

// ============================================================
// CONTROLLERS
// ============================================================

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

// ============================================================
// SWAGGER
// ============================================================

builder.Services.AddSwaggerGen(options =>
{

    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "HMS API",
            Version = "v1"
        });

    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",

            Type = SecuritySchemeType.Http,

            Scheme = "bearer",

            BearerFormat = "JWT",

            In = ParameterLocation.Header,

            Description =
                "Enter JWT token as: Bearer {token}"
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference =
                        new OpenApiReference
                        {
                            Type =
                                ReferenceType.SecurityScheme,

                            Id = "Bearer"
                        }
                },

                Array.Empty<string>()
            }
        });
});

var app = builder.Build();

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

using (var scope =
       app.Services.CreateScope())
{
    var services =
        scope.ServiceProvider;

    try
    {
        var context =
            services.GetRequiredService<AppDbContext>();

        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger =
            services.GetRequiredService<
                ILogger<Program>>();

        logger.LogError(
            ex,
            "An error occurred while initializing the database.");
    }
}

// ============================================================
// SWAGGER
// ============================================================

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "HMS API v1");
    c.RoutePrefix = "swagger";
});


// Ensure wwwroot and wwwroot/uploads directory exist
var webRoot = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsDir = Path.Combine(webRoot, "uploads");
if (!Directory.Exists(uploadsDir))
{
    Directory.CreateDirectory(uploadsDir);
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.UseCors("FrontendPolicy");

// Explicitly serve static assets and uploads with CORS headers before routing
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsDir),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=86400");
    }
});

app.UseMiddleware<GlobalExceptionMiddleware>();

// Centralized HTTP Request / Response Logging Middleware
app.Use(async (context, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    var method = context.Request.Method;
    var path = context.Request.Path + context.Request.QueryString;
    var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    var timeStr = DateTime.Now.ToString("HH:mm:ss");

    Console.WriteLine($"[BACKEND HTTP REQUEST] {method} {path} (from {clientIp} at {timeStr})");

    try
    {
        await next();
        sw.Stop();
        var status = context.Response.StatusCode;
        var duration = sw.ElapsedMilliseconds;

        if (status >= 500)
        {
            Console.Error.WriteLine($"[BACKEND HTTP SERVER ERROR] {method} {path} -> {status} ({duration}ms)");
        }
        else if (status >= 400)
        {
            Console.WriteLine($"[BACKEND HTTP CLIENT ERROR] {method} {path} -> {status} ({duration}ms)");
        }
        else
        {
            Console.WriteLine($"[BACKEND HTTP RESPONSE] {method} {path} -> {status} ({duration}ms)");
        }
    }
    catch (Exception ex)
    {
        sw.Stop();
        var duration = sw.ElapsedMilliseconds;
        Console.Error.WriteLine($"[BACKEND EXCEPTION] {method} {path} failed ({duration}ms): {ex.Message}\n{ex.StackTrace}");
        throw;
    }
});




// Transparently rewrites legacy and unversioned frontend API request paths
// to their canonical /api/v1/{module}/{resource} routes before endpoint routing
app.UseMiddleware<HMS.Middleware.LegacyApiRewriteMiddleware>();
app.UseRouting();

app.UseAuthentication();

app.UseAuthorization();

app.UseMiddleware<CustomerAdminIsolationMiddleware>();

app.MapGet("/", (HttpContext context) =>
{
    var accept = context.Request.Headers.Accept.ToString();
    if (accept.Contains("text/html", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Redirect("/swagger");
    }
    return Results.Ok(new
    {
        status = "Healthy",
        service = "Hotel Management System (HMS) API",
        version = "v1",
        documentation = "/swagger",
        timestamp = DateTime.UtcNow
    });
});

app.MapControllers();
app.MapHub<HMS.Hubs.PosHub>("/hubs/pos");

app.Run();
