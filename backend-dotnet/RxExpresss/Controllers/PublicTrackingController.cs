using RxExpresss.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/track")]
public class PublicTrackingController : ControllerBase
{
    private readonly MongoDbService _db;
    
    public PublicTrackingController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpGet("{trackingNumber}")]
    public async Task<ActionResult> TrackOrder(string trackingNumber)
    {
        var order = await _db.Orders
            .Find(o => o.TrackingNumber == trackingNumber || o.OrderNumber == trackingNumber)
            .FirstOrDefaultAsync();
        
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var statusMessages = new Dictionary<string, string>
        {
            { "pending", "Order is being processed" },
            { "confirmed", "Order has been confirmed" },
            { "ready_for_pickup", "Package is ready for pickup" },
            { "assigned", "Driver has been assigned" },
            { "picked_up", "Package has been picked up from pharmacy" },
            { "in_transit", "Package is in transit" },
            { "out_for_delivery", "Package is out for delivery" },
            { "delivered", "Package has been delivered" },
            { "failed", "Delivery attempt failed" },
            { "cancelled", "Order has been cancelled" },
            { "new", "Order received" }
        };
        
        return Ok(new
        {
            tracking_number = order.TrackingNumber,
            order_number = order.OrderNumber,
            status = order.Status,
            status_message = statusMessages.GetValueOrDefault(order.Status, "Unknown status"),
            pharmacy_name = order.PharmacyName ?? "Unknown Pharmacy",
            delivery_type = order.DeliveryType,
            time_window = order.TimeWindow,
            estimated_delivery_start = order.EstimatedDeliveryStart,
            estimated_delivery_end = order.EstimatedDeliveryEnd,
            actual_delivery_time = order.ActualDeliveryTime,
            driver_name = order.Status == "delivered" || order.Status == "out_for_delivery" || order.Status == "in_transit" 
                ? order.DriverName : null,
            tracking_events = order.TrackingUpdates,
            created_at = order.CreatedAt
        });
    }
}
