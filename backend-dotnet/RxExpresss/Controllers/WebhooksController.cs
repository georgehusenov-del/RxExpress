using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api")]
public class WebhooksController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<WebhooksController> _logger;
    
    public WebhooksController(MongoDbService db, ILogger<WebhooksController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpPost("webhook/stripe")]
    public async Task<ActionResult> StripeWebhook()
    {
        var body = await new StreamReader(Request.Body).ReadToEndAsync();
        _logger.LogInformation("Stripe webhook received");
        return Ok(new { received = true });
    }
    
    [HttpPost("webhooks/circuit")]
    public ActionResult CircuitWebhook([FromBody] object payload)
    {
        _logger.LogInformation("Circuit webhook received");
        return Ok(new { received = true });
    }
    
    [HttpGet("webhooks/circuit/logs")]
    public ActionResult GetCircuitWebhookLogs()
    {
        return Ok(new { logs = new List<object>(), count = 0 });
    }
}
