using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/drivers")]
public class DriversController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<DriversController> _logger;
    
    public DriversController(MongoDbService db, ILogger<DriversController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpPost("register")]
    [Authorize]
    public async Task<ActionResult> RegisterDriver([FromBody] DriverCreateDto dto)
    {
        var role = User.GetUserRole();
        var userId = User.GetUserId();
        
        if (role != "driver" && role != "admin")
        {
            return StatusCode(403, new { detail = "Only driver accounts can register as drivers" });
        }
        
        // Check if driver profile exists
        var existing = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (existing != null)
        {
            return BadRequest(new { detail = "Driver profile already exists" });
        }
        
        var driver = new DriverProfile
        {
            UserId = userId ?? "",
            VehicleType = dto.VehicleType,
            VehicleNumber = dto.VehicleNumber,
            LicenseNumber = dto.LicenseNumber,
            InsuranceInfo = dto.InsuranceInfo,
            ServiceZones = dto.ServiceZones,
            Status = "offline",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        
        await _db.Drivers.InsertOneAsync(driver);
        
        return Ok(new { message = "Driver registered successfully", driver_id = driver.Id });
    }
    
    [HttpGet]
    public async Task<ActionResult> ListDrivers([FromQuery] string? status = null)
    {
        FilterDefinition<DriverProfile> filter = Builders<DriverProfile>.Filter.Empty;
        
        if (!string.IsNullOrEmpty(status))
        {
            filter = Builders<DriverProfile>.Filter.Eq(d => d.Status, status);
        }
        
        var drivers = await _db.Drivers.Find(filter).ToListAsync();
        
        // Get user info for each driver
        var result = new List<object>();
        foreach (var driver in drivers)
        {
            var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
            result.Add(new
            {
                driver.Id,
                driver.UserId,
                driver.VehicleType,
                driver.VehicleNumber,
                driver.LicenseNumber,
                driver.Status,
                driver.CurrentLocation,
                driver.Rating,
                driver.TotalDeliveries,
                driver.IsVerified,
                driver.CreatedAt,
                first_name = user?.FirstName,
                last_name = user?.LastName,
                email = user?.Email,
                phone = user?.Phone
            });
        }
        
        return Ok(new { drivers = result, count = result.Count });
    }
    
    [HttpGet("{driverId}")]
    public async Task<ActionResult> GetDriver(string driverId)
    {
        var driver = await _db.Drivers.Find(d => d.Id == driverId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
        
        return Ok(new
        {
            driver.Id,
            driver.UserId,
            driver.VehicleType,
            driver.VehicleNumber,
            driver.LicenseNumber,
            driver.Status,
            driver.CurrentLocation,
            driver.Rating,
            driver.TotalDeliveries,
            driver.IsVerified,
            driver.CreatedAt,
            first_name = user?.FirstName,
            last_name = user?.LastName,
            email = user?.Email,
            phone = user?.Phone
        });
    }
    
    [HttpGet("my/deliveries")]
    [Authorize]
    public async Task<ActionResult> GetMyDeliveries()
    {
        var userId = User.GetUserId();
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var orders = await _db.Orders
            .Find(o => o.DriverId == driver.Id && 
                       (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "in_transit"))
            .ToListAsync();
        
        var result = orders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.TrackingNumber,
            o.QrCode,
            o.PharmacyName,
            o.DeliveryType,
            o.TimeWindow,
            o.Recipient,
            o.DeliveryAddress,
            o.Status,
            o.CopayAmount,
            o.CopayCollected,
            o.CreatedAt
        });
        
        return Ok(new { deliveries = result, count = result.Count() });
    }
    
    [HttpPut("status")]
    [Authorize]
    public async Task<ActionResult> UpdateDriverStatus([FromBody] DriverStatusUpdateDto dto)
    {
        var update = Builders<DriverProfile>.Update.Set(d => d.Status, dto.Status);
        var result = await _db.Drivers.UpdateOneAsync(d => d.Id == dto.DriverId, update);
        
        if (result.MatchedCount == 0)
        {
            return NotFound(new { detail = "Driver not found" });
        }
        
        return Ok(new { message = $"Status updated to {dto.Status}" });
    }
    
    [HttpPut("location")]
    [Authorize]
    public async Task<ActionResult> UpdateDriverLocation([FromBody] DriverLocationUpdateDto dto)
    {
        var location = new LocationPoint
        {
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Timestamp = DateTime.UtcNow.ToString("o")
        };
        
        var update = Builders<DriverProfile>.Update.Set(d => d.CurrentLocation, location);
        var result = await _db.Drivers.UpdateOneAsync(d => d.Id == dto.DriverId, update);
        
        if (result.MatchedCount == 0)
        {
            return NotFound(new { detail = "Driver not found" });
        }
        
        return Ok(new { message = "Location updated" });
    }
}
