using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class AdminController : Controller
{
    private readonly IConfiguration _configuration;
    
    public AdminController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private static readonly List<(string Id, string Label, string Href, string Icon)> NavItems = new()
    {
        ("overview", "Overview", "/Admin", SvgIcons.Dashboard),
        ("users", "Users", "/Admin/Users", SvgIcons.Users),
        ("pharmacies", "Pharmacies", "/Admin/Pharmacies", SvgIcons.Pharmacy),
        ("drivers", "Drivers", "/Admin/Drivers", SvgIcons.Truck),
        ("tracking", "Live Tracking", "/Admin/Tracking", SvgIcons.Crosshair),
        ("orders", "Orders", "/Admin/Orders", SvgIcons.Package),
        ("routes", "Routes", "/Admin/Routes", SvgIcons.Route),
        ("pricing", "Pricing", "/Admin/Pricing", SvgIcons.Dollar),
        ("scanning", "QR Scanning", "/Admin/Scanning", SvgIcons.QrCode),
        ("zones", "Service Zones", "/Admin/Zones", SvgIcons.MapPin),
        ("offices", "Office Locations", "/Admin/Offices", SvgIcons.Building),
        ("api-keys", "API Keys", "/Admin/ApiKeys", SvgIcons.Key),
        ("reports", "Reports", "/Admin/Reports", SvgIcons.BarChart),
        // LAUNCH: uncomment to surface Subscriptions nav once Subscriptions:Enabled=true.
        // ("subscriptions", "Subscriptions", "/Admin/Subscriptions", SvgIcons.Dollar),
    };

    private void SetNav(string activeId, string pageTitle)
    {
        ViewData["NavItems"] = NavItems;
        ViewData["ActiveNav"] = activeId;
        ViewData["PageTitle"] = pageTitle;
        ViewData["PortalName"] = "Admin Panel";
        ViewData["Role"] = "Admin";
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? "/api";
    }

    public IActionResult Index() { SetNav("overview", "Dashboard Overview"); return View(); }
    public IActionResult Orders() { SetNav("orders", "Orders Management"); return View(); }
    public IActionResult Drivers() { SetNav("drivers", "Drivers Management"); return View(); }
    public IActionResult Users() { SetNav("users", "Users Management"); return View(); }
    public IActionResult Pharmacies() { SetNav("pharmacies", "Pharmacies"); return View(); }
    public IActionResult Routes() { SetNav("routes", "Routes"); return View(); }
    public IActionResult Pricing() { SetNav("pricing", "Pricing"); return View(); }
    public IActionResult Scanning() { SetNav("scanning", "QR Code Scanning"); return View(); }
    public IActionResult Zones() { SetNav("zones", "Service Zones"); return View(); }
    public IActionResult Offices() { SetNav("offices", "Office Locations"); return View(); }
    public IActionResult Reports() { SetNav("reports", "Reports"); return View(); }
    public IActionResult ApiKeys() { SetNav("api-keys", "API Keys Management"); return View(); }
    // LAUNCH: Subscriptions route stays accessible (returns blank-ish view) but is hidden from sidebar
    // until the nav item is uncommented above. Enable fully by flipping Subscriptions:Enabled flag
    // in API appsettings.json.
    public IActionResult Subscriptions() { SetNav("subscriptions", "Subscriptions & Billing"); return View(); }
    public IActionResult Tracking() { 
        SetNav("tracking", "Live Driver Tracking");
        ViewData["GoogleMapsKey"] = _configuration["GoogleMaps:ApiKey"] ?? "";
        return View(); 
    }
    public new IActionResult Unauthorized() { SetNav("", "Access Denied"); return View(); }
}

