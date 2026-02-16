using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly IConfiguration _config;
    
    public PaymentsController(MongoDbService db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }
    
    [HttpPost("checkout/create")]
    public async Task<ActionResult> CreateCheckout([FromBody] CheckoutCreateDto dto)
    {
        var order = await _db.Orders.Find(o => o.Id == dto.OrderId).FirstOrDefaultAsync();
        if (order == null)
            return NotFound(new { detail = "Order not found" });
        
        var stripeKey = _config["Stripe:ApiKey"] ?? Environment.GetEnvironmentVariable("STRIPE_API_KEY");
        if (string.IsNullOrEmpty(stripeKey))
            return BadRequest(new { detail = "Stripe not configured" });
        
        // Create a mock checkout session for now
        var sessionId = $"cs_test_{Guid.NewGuid():N}";
        var checkoutUrl = $"{dto.OriginUrl}/payment/success?session_id={sessionId}";
        
        var update = Builders<Order>.Update
            .Set(o => o.PaymentSessionId, sessionId)
            .Set(o => o.PaymentStatus, "initiated")
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        await _db.Orders.UpdateOneAsync(o => o.Id == dto.OrderId, update);
        
        return Ok(new
        {
            session_id = sessionId,
            checkout_url = checkoutUrl,
            amount = order.TotalAmount
        });
    }
    
    [HttpGet("checkout/status/{sessionId}")]
    public async Task<ActionResult> GetCheckoutStatus(string sessionId)
    {
        var order = await _db.Orders.Find(o => o.PaymentSessionId == sessionId).FirstOrDefaultAsync();
        if (order == null)
            return NotFound(new { detail = "Session not found" });
        
        return Ok(new
        {
            session_id = sessionId,
            order_id = order.Id,
            payment_status = order.PaymentStatus,
            amount = order.TotalAmount
        });
    }
}

public class CheckoutCreateDto
{
    public string OrderId { get; set; } = string.Empty;
    public string OriginUrl { get; set; } = string.Empty;
}
