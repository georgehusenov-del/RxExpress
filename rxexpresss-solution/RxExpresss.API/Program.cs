using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Data.Context;
using RxExpresss.Data.Repositories;
using RxExpresss.Data.Seed;
using RxExpresss.Identity.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Database - SQLite for dev, swap to SQL Server via connection string
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=RxExpresss.db";

if (connStr.Contains(".db") || connStr.Contains("Data Source=Rx"))
    builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(connStr));
else
    builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(connStr));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(o =>
{
    o.Password.RequireDigit = true;
    o.Password.RequiredLength = 6;
    o.Password.RequireNonAlphanumeric = true;
    o.Password.RequireUppercase = true;
    o.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "RxExpresss-Super-Secret-Key-2024-Change-In-Production!";
builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "RxExpresss",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "RxExpresss",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// DI
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<JwtService>();
builder.Services.AddSingleton<RxExpresss.API.Services.CircuitService>();
builder.Services.AddSingleton<RxExpresss.API.Services.GoogleMapsService>();
builder.Services.AddSingleton<RxExpresss.API.Services.AppleMapsService>();

// CORS - allow cross-origin requests from frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://rxexpresss.com",
                "https://www.rxexpresss.com",
                "http://localhost:3000",
                "http://localhost:5000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
    
    // Also add a permissive policy for development
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Show real error details when ASPNETCORE_DETAILED_ERRORS=true is set in web.config.
// Keep OFF in normal prod; flip ON temporarily to diagnose 500s without SSH to the server.
if (app.Environment.IsDevelopment() ||
    string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_DETAILED_ERRORS"), "true",
        StringComparison.OrdinalIgnoreCase))
{
    app.UseDeveloperExceptionPage();
}

// CORS must be first!
app.UseCors();

// Ensure wwwroot exists
var wwwrootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(wwwrootPath))
    Directory.CreateDirectory(wwwrootPath);

// Seed DB
using (var scope = app.Services.CreateScope())
{
    await DbSeeder.SeedAsync(scope.ServiceProvider);
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
