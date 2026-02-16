using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/maps")]
public class MapsController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly IConfiguration _config;
    
    public MapsController(MongoDbService db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }
    
    [HttpPost("geocode")]
    public ActionResult Geocode([FromBody] GeocodeRequestDto dto)
    {
        return Ok(new
        {
            formatted_address = dto.Address,
            latitude = 40.7128,
            longitude = -74.0060,
            place_id = (string?)null
        });
    }
    
    [HttpPost("distance-matrix")]
    public ActionResult DistanceMatrix([FromBody] DistanceMatrixRequestDto dto)
    {
        var results = new List<object>();
        foreach (var origin in dto.Origins)
        {
            var row = new List<object>();
            foreach (var dest in dto.Destinations)
            {
                var dist = HaversineDistance(
                    origin.GetValueOrDefault("latitude", 0),
                    origin.GetValueOrDefault("longitude", 0),
                    dest.GetValueOrDefault("latitude", 0),
                    dest.GetValueOrDefault("longitude", 0));
                row.Add(new { distance = $"{dist:F1} mi", duration = $"{(int)(dist / 18.0 * 60)} mins" });
            }
            results.Add(row);
        }
        return Ok(new { results });
    }
    
    [HttpPost("optimize-route")]
    [Authorize]
    public ActionResult OptimizeRoute([FromBody] RouteOptRequestDto dto)
    {
        return Ok(new
        {
            optimized_waypoints = dto.Waypoints,
            total_distance = "0 mi",
            total_duration = "0 mins",
            polyline = "",
            waypoint_order = Enumerable.Range(0, dto.Waypoints.Count).ToList()
        });
    }
    
    [HttpGet("estimate/{orderId}")]
    public async Task<ActionResult> EstimateDeliveryTime(string orderId)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null) return NotFound(new { detail = "Order not found" });
        
        return Ok(new
        {
            order_id = orderId,
            estimated_duration_minutes = 30,
            estimated_distance_miles = 5.0,
            estimated_arrival = DateTime.UtcNow.AddMinutes(30).ToString("o")
        });
    }
    
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 3959;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}

public class GeocodeRequestDto { public string Address { get; set; } = string.Empty; }
public class DistanceMatrixRequestDto
{
    public List<Dictionary<string, double>> Origins { get; set; } = new();
    public List<Dictionary<string, double>> Destinations { get; set; } = new();
    public string Mode { get; set; } = "driving";
}
public class RouteOptRequestDto
{
    public string DriverId { get; set; } = string.Empty;
    public List<Dictionary<string, double>> Waypoints { get; set; } = new();
}
