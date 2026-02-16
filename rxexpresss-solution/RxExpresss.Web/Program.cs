var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");

// Redirect /Admin to /Admin/Index etc.
app.MapGet("/Admin", () => Results.Redirect("/Admin/Index"));
app.MapGet("/Pharmacy", () => Results.Redirect("/Pharmacy/Index"));
app.MapGet("/Driver", () => Results.Redirect("/Driver/Index"));

app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:3000");

app.Run();
