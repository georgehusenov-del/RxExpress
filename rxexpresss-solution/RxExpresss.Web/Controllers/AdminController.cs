using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class AdminController : Controller
{
    private static readonly List<(string Id, string Label, string Href, string Icon)> NavItems = new()
    {
        ("overview", "Overview", "/Admin", SvgIcons.Dashboard),
        ("users", "Users", "/Admin/Users", SvgIcons.Users),
        ("pharmacies", "Pharmacies", "/Admin/Pharmacies", SvgIcons.Pharmacy),
        ("drivers", "Drivers", "/Admin/Drivers", SvgIcons.Truck),
        ("orders", "Orders", "/Admin/Orders", SvgIcons.Package),
        ("routes", "Routes", "/Admin/Routes", SvgIcons.Route),
        ("pricing", "Pricing", "/Admin/Pricing", SvgIcons.Dollar),
        ("scanning", "QR Scanning", "/Admin/Scanning", SvgIcons.QrCode),
        ("zones", "Service Zones", "/Admin/Zones", SvgIcons.MapPin),
        ("reports", "Reports", "/Admin/Reports", SvgIcons.BarChart),
    };

    private void SetNav(string activeId, string pageTitle)
    {
        ViewData["NavItems"] = NavItems;
        ViewData["ActiveNav"] = activeId;
        ViewData["PageTitle"] = pageTitle;
        ViewData["PortalName"] = "Admin Panel";
        ViewData["Role"] = "Admin";
        ViewData["ApiBaseUrl"] = "/api";
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
    public IActionResult Reports() { SetNav("reports", "Reports"); return View(); }
}
