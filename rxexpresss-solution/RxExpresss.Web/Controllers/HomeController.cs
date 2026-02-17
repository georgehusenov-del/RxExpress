using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class HomeController : Controller
{
    private readonly IConfiguration _config;
    public HomeController(IConfiguration config) => _config = config;

    [HttpGet("/")]
    public IActionResult Index()
    {
        return View("Index");
    }

    [HttpGet("/login")]
    [HttpGet("/Home/Login")]
    public IActionResult Login()
    {
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? _config["ApiBaseUrl"] ?? "/api";
        return View("Login");
    }

    [HttpGet("/Home/ForgotPassword")]
    public IActionResult ForgotPassword()
    {
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? _config["ApiBaseUrl"] ?? "/api";
        return View("ForgotPassword");
    }

    [HttpGet("/Home/RegisterPharmacy")]
    public IActionResult RegisterPharmacy()
    {
        ViewData["ApiBaseUrl"] = HttpContext.Items["ApiBaseUrl"]?.ToString() ?? _config["ApiBaseUrl"] ?? "/api";
        return View("RegisterPharmacy");
    }

    [HttpGet("/Track")]
    [HttpGet("/Track/{code}")]
    public IActionResult Track(string? code = null)
    {
        return View("Track");
    }
}
