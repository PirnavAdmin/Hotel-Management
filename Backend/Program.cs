using System.Text;
using HMS.Data;
using HMS.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Ensure default listening on port 5018
builder.WebHost.UseUrls("http://localhost:5018", "http://0.0.0.0:5018");

// ============================================================
// DATABASE
// ============================================================

var connectionString =
    builder.Configuration
        .GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection is missing from appsettings.json.");
}

builder.Services.AddDbContext<AppDbContext>(
    options =>
        options.UseMySql(
            connectionString,
            ServerVersion.AutoDetect(
                connectionString)));

// ============================================================
// JWT
// ============================================================

var jwtKey =
    builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Jwt:Key is missing from appsettings.json.");
}

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"];

var jwtAudience =
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
                .WithOrigins("http://localhost:5173")
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
builder.Services.AddScoped<MenuItemService>();
builder.Services.AddScoped<StaffService>();
builder.Services.AddScoped<TableService>();
builder.Services.AddScoped<LoginManagementService>();
builder.Services.AddScoped<KotService>();
builder.Services.AddScoped<RestaurantSettingsService>();
builder.Services.AddScoped<BarService>();
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
    options.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());

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


// Ensure wwwroot/uploads directory exists
var uploadsDir = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
if (!Directory.Exists(uploadsDir))
{
    Directory.CreateDirectory(uploadsDir);
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.UseCors("FrontendPolicy");

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




app.UseStaticFiles();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();
app.MapHub<HMS.Hubs.PosHub>("/hubs/pos");

app.Run();