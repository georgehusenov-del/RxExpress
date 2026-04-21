using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class PharmacyController : Controller
{
    private static readonly List<(string Id, string Label, string Href, string Icon)> NavItems = new()
    {
        ("dashboard", "Dashboard", "/Pharmacy", SvgIcons.Dashboard),
        ("reports", "Reports", "/Pharmacy/Reports", SvgIcons.BarChart),
        // LAUNCH: uncomment to surface Billing nav once Subscriptions:Enabled=true.
        // ("billing", "Billing & Plan", "/Pharmacy/Billing", SvgIcons.Dollar),
    };

    private void SetNav(string activeId, string pageTitle)
    {
        ViewData["NavItems"] = NavItems;
        ViewData["ActiveNav"] = activeId;
        ViewData["PageTitle"] = pageTitle;
        ViewData["PortalName"] = "Pharmacy Portal";
        ViewData["Role"] = "Pharmacy";
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? "/api";
    }

    public IActionResult Index() { SetNav("dashboard", "Pharmacy Dashboard"); return View(); }
    public IActionResult Reports() { SetNav("reports", "Reports"); return View(); }
    // LAUNCH: Billing view is always reachable but sidebar link is commented above.
    public IActionResult Billing() { SetNav("billing", "Billing & Subscription"); return View(); }
}
