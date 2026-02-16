var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

// Store API base URL in configuration for views
var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "/api";

var app = builder.Build();

// Make ApiBaseUrl available to all controllers/views
app.Use(async (context, next) =>
{
    context.Items["ApiBaseUrl"] = apiBaseUrl;
    await next();
});

app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");

// Redirect /Admin to /Admin/Index etc.
app.MapGet("/Admin", () => Results.Redirect("/Admin/Index"));
app.MapGet("/Pharmacy", () => Results.Redirect("/Pharmacy/Index"));
app.MapGet("/Driver", () => Results.Redirect("/Driver/Index"));

// Use port 3000 only if not already configured by launchSettings
if (!app.Urls.Any())
{
    app.Urls.Add("http://0.0.0.0:3000");
}

app.Run();
