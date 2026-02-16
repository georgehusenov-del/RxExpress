using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class DriverController : Controller
{
    private static readonly List<(string Id, string Label, string Href, string Icon)> NavItems = new()
    {
        ("deliveries", "My Deliveries", "/Driver", SvgIcons.List),
    };

    private void SetNav(string activeId, string pageTitle)
    {
        ViewData["NavItems"] = NavItems;
        ViewData["ActiveNav"] = activeId;
        ViewData["PageTitle"] = pageTitle;
        ViewData["PortalName"] = "Driver Portal";
        ViewData["Role"] = "Driver";
        ViewData["ApiBaseUrl"] = "/api";
    }

    public IActionResult Index() { SetNav("deliveries", "My Deliveries"); return View(); }
}
