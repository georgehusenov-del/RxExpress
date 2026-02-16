using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/tracking")]
public class TrackingController : ControllerBase
{
    private readonly MongoDbService _db;
    
    public TrackingController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpGet("order/{orderId}")]
    public async Task<ActionResult> GetOrderTracking(string orderId)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
            return NotFound(new { detail = "Order not found" });
        
        return Ok(new
        {
            order_id = order.Id,
            order_number = order.OrderNumber,
            tracking_number = order.TrackingNumber,
            status = order.Status,
            driver_name = order.DriverName,
            estimated_delivery_start = order.EstimatedDeliveryStart,
            estimated_delivery_end = order.EstimatedDeliveryEnd,
            actual_delivery_time = order.ActualDeliveryTime,
            tracking_updates = order.TrackingUpdates,
            delivery_location = order.DeliveryLocation
        });
    }
    
    [HttpGet("driver/{driverId}/history")]
    [Authorize]
    public async Task<ActionResult> GetDriverLocationHistory(string driverId, [FromQuery] int hours = 24)
    {
        var driver = await _db.Drivers.Find(d => d.Id == driverId).FirstOrDefaultAsync();
        if (driver == null)
            return NotFound(new { detail = "Driver not found" });
        
        return Ok(new
        {
            driver_id = driverId,
            current_location = driver.CurrentLocation,
            history = new List<object>()
        });
    }
}
