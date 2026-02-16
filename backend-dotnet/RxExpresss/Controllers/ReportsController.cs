using RxExpresss.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly MongoDbService _db;
    
    public ReportsController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpGet("dashboard")]
    public async Task<ActionResult> GetReportsDashboard([FromQuery] string? period = "7d")
    {
        var totalOrders = await _db.Orders.CountDocumentsAsync(_ => true);
        var deliveredOrders = await _db.Orders.CountDocumentsAsync(o => o.Status == "delivered");
        var failedOrders = await _db.Orders.CountDocumentsAsync(o => o.Status == "failed");
        
        var allOrders = await _db.Orders.Find(_ => true).ToListAsync();
        var totalRevenue = allOrders.Sum(o => o.TotalAmount);
        var totalCopay = allOrders.Where(o => o.CopayCollected).Sum(o => o.CopayAmount);
        
        return Ok(new
        {
            period,
            total_orders = totalOrders,
            delivered_orders = deliveredOrders,
            failed_orders = failedOrders,
            delivery_rate = totalOrders > 0 ? Math.Round((double)deliveredOrders / totalOrders * 100, 1) : 0,
            total_revenue = Math.Round(totalRevenue, 2),
            total_copay_collected = Math.Round(totalCopay, 2)
        });
    }
    
    [HttpGet("deliveries")]
    public async Task<ActionResult> GetDeliveriesReport(
        [FromQuery] string? start_date = null,
        [FromQuery] string? end_date = null)
    {
        var orders = await _db.Orders.Find(_ => true)
            .SortByDescending(o => o.CreatedAt).Limit(100).ToListAsync();
        
        var byStatus = orders.GroupBy(o => o.Status)
            .ToDictionary(g => g.Key, g => g.Count());
        var byType = orders.GroupBy(o => o.DeliveryType)
            .ToDictionary(g => g.Key, g => g.Count());
        
        return Ok(new
        {
            total = orders.Count,
            by_status = byStatus,
            by_type = byType
        });
    }
    
    [HttpGet("drivers/performance")]
    public async Task<ActionResult> GetDriverPerformance()
    {
        var drivers = await _db.Drivers.Find(_ => true).ToListAsync();
        var result = new List<object>();
        
        foreach (var driver in drivers)
        {
            var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
            var deliveredCount = await _db.Orders.CountDocumentsAsync(
                o => o.DriverId == driver.Id && o.Status == "delivered");
            var failedCount = await _db.Orders.CountDocumentsAsync(
                o => o.DriverId == driver.Id && o.Status == "failed");
            
            result.Add(new
            {
                driver_id = driver.Id,
                name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                total_deliveries = driver.TotalDeliveries,
                delivered = deliveredCount,
                failed = failedCount,
                rating = driver.Rating,
                status = driver.Status
            });
        }
        
        return Ok(new { drivers = result });
    }
}
