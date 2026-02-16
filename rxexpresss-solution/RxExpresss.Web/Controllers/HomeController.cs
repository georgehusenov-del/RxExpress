using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class HomeController : Controller
{
    private readonly IConfiguration _config;
    public HomeController(IConfiguration config) => _config = config;

    [HttpGet("/")]
    [HttpGet("/login")]
    public IActionResult Index()
    {
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? _config["ApiBaseUrl"] ?? "/api";
        return View("Login");
    }
}
