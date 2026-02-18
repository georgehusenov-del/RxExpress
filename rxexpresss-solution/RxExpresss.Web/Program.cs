var builder = WebApplication.CreateBuilder(args);

// Add Razor Runtime Compilation for development
var mvcBuilder = builder.Services.AddControllersWithViews();
mvcBuilder.AddRazorRuntimeCompilation();

// Add HTTP client for API proxying
builder.Services.AddHttpClient("API", client =>
{
    client.BaseAddress = new Uri("http://localhost:8001");
});

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "/api";

var app = builder.Build();

app.Use(async (context, next) =>
{
    context.Items["ApiBaseUrl"] = apiBaseUrl;
    
    // Add no-cache headers to prevent CDN caching of dynamic pages
    context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
    context.Response.Headers["Pragma"] = "no-cache";
    context.Response.Headers["Expires"] = "0";
    
    await next();
});

// Proxy /api requests to the API service on port 8001
app.Map("/api", async (HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("API");
    var path = context.Request.Path.Value;
    var query = context.Request.QueryString.Value;
    var url = $"/api{path}{query}";
    
    var requestMessage = new HttpRequestMessage
    {
        Method = new HttpMethod(context.Request.Method),
        RequestUri = new Uri(url, UriKind.Relative)
    };
    
    // Copy headers
    foreach (var header in context.Request.Headers)
    {
        if (!header.Key.StartsWith("Host", StringComparison.OrdinalIgnoreCase) &&
            !header.Key.StartsWith("Content-Length", StringComparison.OrdinalIgnoreCase) &&
            !header.Key.StartsWith("Content-Type", StringComparison.OrdinalIgnoreCase))
        {
            requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }
    
    // Copy body for POST/PUT/PATCH
    if (context.Request.ContentLength > 0)
    {
        requestMessage.Content = new StreamContent(context.Request.Body);
        if (context.Request.ContentType != null)
        {
            requestMessage.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(context.Request.ContentType);
        }
    }
    
    try
    {
        var response = await client.SendAsync(requestMessage);
        context.Response.StatusCode = (int)response.StatusCode;
        
        // Copy response headers
        foreach (var header in response.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }
        foreach (var header in response.Content.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }
        
        // Remove chunked transfer encoding header as we're writing the full content
        context.Response.Headers.Remove("Transfer-Encoding");
        
        var content = await response.Content.ReadAsByteArrayAsync();
        await context.Response.Body.WriteAsync(content);
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 502;
        await context.Response.WriteAsync($"API proxy error: {ex.Message}");
    }
});

app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapGet("/Admin", () => Results.Redirect("/Admin/Index"));
app.MapGet("/Pharmacy", () => Results.Redirect("/Pharmacy/Index"));
app.MapGet("/Driver", () => Results.Redirect("/Driver/Index"));

app.Run();
