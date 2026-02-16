using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

var builder = WebApplication.CreateBuilder(args);

// Disable default claim mapping so "sub" stays as "sub"
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register services
builder.Services.AddSingleton<MongoDbService>();
builder.Services.AddSingleton<AuthService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JWT Authentication
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
    ?? throw new InvalidOperationException("JWT_SECRET_KEY must be set");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ValidateIssuer = true,
            ValidIssuer = "RxExpresss",
            ValidateAudience = true,
            ValidAudience = "RxExpresss",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Information);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Serve uploaded files (signatures, photos)
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider("/app/backend/uploads/signatures"),
    RequestPath = "/api/uploads/signatures"
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider("/app/backend/uploads/photos"),
    RequestPath = "/api/uploads/photos"
});

app.MapControllers();

// Active pricing public endpoint
app.MapGet("/api/pricing/active", async (RxExpresss.Services.MongoDbService db) =>
{
    var pricing = await db.Pricing.Find(p => p.IsActive).ToListAsync();
    var pricingList = pricing.Select(p => new
    {
        id = p.Id, delivery_type = p.DeliveryType, name = p.Name,
        description = p.Description, base_price = p.BasePrice, is_active = p.IsActive,
        time_window_start = p.TimeWindowStart, time_window_end = p.TimeWindowEnd,
        cutoff_time = p.CutoffTime, is_addon = p.IsAddon
    }).ToList();
    return Results.Ok(new { pricing = pricingList, count = pricingList.Count });
});

// Health check endpoint
app.MapGet("/", () => Results.Ok(new { status = "healthy", service = "RX Expresss API", version = "1.0.0" }));
app.MapGet("/api", () => Results.Ok(new { status = "healthy", service = "RX Expresss API", version = "1.0.0" }));
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

// Configure the server to listen on the specified port
// Command line args take precedence (e.g., --urls "http://0.0.0.0:8002")
// Otherwise defaults to port 8001
if (!args.Any(a => a.StartsWith("--urls")))
{
    app.Urls.Clear();
    app.Urls.Add("http://0.0.0.0:8001");
    Console.WriteLine("Starting RX Expresss ASP.NET Core API on port 8001...");
}
else
{
    Console.WriteLine($"Starting RX Expresss ASP.NET Core API with custom URLs...");
}

app.Run();
