var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Login}/{id?}");

app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:3000");

app.Run();
