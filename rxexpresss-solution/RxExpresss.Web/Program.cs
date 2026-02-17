var builder = WebApplication.CreateBuilder(args);

// Add Razor Runtime Compilation for development
var mvcBuilder = builder.Services.AddControllersWithViews();
mvcBuilder.AddRazorRuntimeCompilation();

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "/api";

var app = builder.Build();

app.Use(async (context, next) =>
{
    context.Items["ApiBaseUrl"] = apiBaseUrl;
    await next();
});

app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapGet("/Admin", () => Results.Redirect("/Admin/Index"));
app.MapGet("/Pharmacy", () => Results.Redirect("/Pharmacy/Index"));
app.MapGet("/Driver", () => Results.Redirect("/Driver/Index"));

app.Run();
