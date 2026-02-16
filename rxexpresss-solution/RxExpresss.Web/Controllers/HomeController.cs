using Microsoft.AspNetCore.Mvc;

namespace RxExpresss.Web.Controllers;

public class HomeController : Controller
{
    [HttpGet("/")]
    [HttpGet("/login")]
    public IActionResult Login() => View();
}
