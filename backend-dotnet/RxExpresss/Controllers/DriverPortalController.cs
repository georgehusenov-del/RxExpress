using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/driver-portal")]
[Authorize]
public class DriverPortalController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<DriverPortalController> _logger;
    
    public DriverPortalController(MongoDbService db, ILogger<DriverPortalController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpGet("deliveries")]
    public async Task<ActionResult> GetMyDeliveries()
    {
        var userId = User.FindFirst("sub")?.Value;
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var orders = await _db.Orders
            .Find(o => o.DriverId == driver.Id && 
                       (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "in_transit" || o.Status == "out_for_delivery"))
            .SortBy(o => o.CreatedAt)
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
            o.PickupAddress,
            o.Packages,
            o.Status,
            o.CopayAmount,
            o.CopayCollected,
            o.RequiresSignature,
            o.RequiresPhotoProof,
            o.RequiresIdVerification,
            o.DeliveryNotes,
            o.CreatedAt
        });
        
        return Ok(new { deliveries = result, count = result.Count() });
    }
    
    [HttpGet("deliveries/{orderId}")]
    public async Task<ActionResult> GetDelivery(string orderId)
    {
        var userId = User.FindFirst("sub")?.Value;
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId && o.DriverId == driver.Id).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Delivery not found or not assigned to you" });
        }
        
        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.TrackingNumber,
            order.QrCode,
            order.PharmacyName,
            order.DeliveryType,
            order.TimeWindow,
            order.Recipient,
            order.DeliveryAddress,
            order.PickupAddress,
            order.Packages,
            order.Status,
            order.CopayAmount,
            order.CopayCollected,
            order.RequiresSignature,
            order.RequiresPhotoProof,
            order.RequiresIdVerification,
            order.DeliveryNotes,
            order.CreatedAt
        });
    }
    
    [HttpPost("deliveries/{orderId}/scan")]
    public async Task<ActionResult> ScanPackage(
        string orderId,
        [FromQuery] string qr_code,
        [FromQuery] string action = "pickup",
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null)
    {
        var userId = User.FindFirst("sub")?.Value;
        var userRole = User.FindFirst("role")?.Value;
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        // Verify QR code matches
        if (order.QrCode != qr_code)
        {
            return BadRequest(new { detail = "QR code does not match this order" });
        }
        
        // Get user info for scan log
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        var scannerName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Create scan log
        var scanLog = new ScanLog
        {
            QrCode = qr_code,
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            Action = action,
            ScannedBy = userId ?? "",
            ScannedByName = scannerName,
            ScannedByRole = userRole,
            ScannedAt = DateTime.UtcNow.ToString("o"),
            Location = latitude.HasValue && longitude.HasValue ? new LocationPoint
            {
                Latitude = latitude.Value,
                Longitude = longitude.Value,
                Timestamp = DateTime.UtcNow.ToString("o")
            } : null
        };
        
        await _db.ScanLogs.InsertOneAsync(scanLog);
        
        // Update order status based on action
        var newStatus = action switch
        {
            "pickup" => "picked_up",
            "delivery" => "out_for_delivery",
            _ => order.Status
        };
        
        var updateBuilder = Builders<Order>.Update
            .Set(o => o.Status, newStatus)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (action == "pickup")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualPickupTime, DateTime.UtcNow.ToString("o"));
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", newStatus },
            { "notes", $"Package scanned: {action}" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new
        {
            success = true,
            message = $"Package scanned for {action}",
            new_status = newStatus,
            scan = new
            {
                scanLog.Id,
                scanLog.QrCode,
                scanLog.Action,
                scanLog.ScannedAt
            }
        });
    }
    
    [HttpPost("deliveries/{orderId}/collect-copay")]
    public async Task<ActionResult> CollectCopay(
        string orderId,
        [FromQuery] string? method = "cash")
    {
        var userId = User.FindFirst("sub")?.Value;
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId && o.DriverId == driver.Id).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Delivery not found or not assigned to you" });
        }
        
        if (order.CopayCollected)
        {
            return BadRequest(new { detail = "Copay already collected" });
        }
        
        var update = Builders<Order>.Update
            .Set(o => o.CopayCollected, true)
            .Set(o => o.CopayCollectedAt, DateTime.UtcNow.ToString("o"))
            .Set(o => o.CopayCollectionMethod, method)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, update);
        
        return Ok(new
        {
            success = true,
            message = $"Copay of ${order.CopayAmount:F2} collected via {method}",
            copay_amount = order.CopayAmount,
            collection_method = method
        });
    }
    
    [HttpPost("deliveries/{orderId}/complete")]
    public async Task<ActionResult> CompleteDelivery(
        string orderId,
        [FromBody] CompleteDeliveryDto? dto = null)
    {
        var userId = User.FindFirst("sub")?.Value;
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId && o.DriverId == driver.Id).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Delivery not found or not assigned to you" });
        }
        
        var updateBuilder = Builders<Order>.Update
            .Set(o => o.Status, "delivered")
            .Set(o => o.ActualDeliveryTime, DateTime.UtcNow.ToString("o"))
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (dto != null)
        {
            if (!string.IsNullOrEmpty(dto.SignatureUrl))
                updateBuilder = updateBuilder.Set(o => o.SignatureUrl, dto.SignatureUrl);
            if (!string.IsNullOrEmpty(dto.RecipientNameSigned))
                updateBuilder = updateBuilder.Set(o => o.RecipientNameSigned, dto.RecipientNameSigned);
            if (dto.PhotoUrls != null && dto.PhotoUrls.Count > 0)
                updateBuilder = updateBuilder.Set(o => o.PhotoUrls, dto.PhotoUrls);
            if (dto.IdVerified.HasValue)
                updateBuilder = updateBuilder.Set(o => o.IdVerified, dto.IdVerified.Value);
            if (dto.Latitude.HasValue && dto.Longitude.HasValue)
            {
                updateBuilder = updateBuilder.Set(o => o.DeliveryLocation, new LocationPoint
                {
                    Latitude = dto.Latitude.Value,
                    Longitude = dto.Longitude.Value,
                    Timestamp = DateTime.UtcNow.ToString("o")
                });
            }
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", "delivered" },
            { "notes", "Delivery completed" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        // Update driver stats
        var driverUpdate = Builders<DriverProfile>.Update.Inc(d => d.TotalDeliveries, 1);
        await _db.Drivers.UpdateOneAsync(d => d.Id == driver.Id, driverUpdate);
        
        return Ok(new
        {
            success = true,
            message = "Delivery completed successfully"
        });
    }
    
    [HttpPut("status")]
    public async Task<ActionResult> UpdateMyStatus([FromBody] Dictionary<string, string> body)
    {
        var userId = User.FindFirst("sub")?.Value;
        var status = body.GetValueOrDefault("status");
        
        if (string.IsNullOrEmpty(status))
        {
            return BadRequest(new { detail = "status is required" });
        }
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var update = Builders<DriverProfile>.Update.Set(d => d.Status, status);
        await _db.Drivers.UpdateOneAsync(d => d.Id == driver.Id, update);
        
        return Ok(new { message = $"Status updated to {status}" });
    }
    
    [HttpPut("location")]
    public async Task<ActionResult> UpdateMyLocation([FromBody] Dictionary<string, double> body)
    {
        var userId = User.FindFirst("sub")?.Value;
        
        if (!body.ContainsKey("latitude") || !body.ContainsKey("longitude"))
        {
            return BadRequest(new { detail = "latitude and longitude are required" });
        }
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var location = new LocationPoint
        {
            Latitude = body["latitude"],
            Longitude = body["longitude"],
            Timestamp = DateTime.UtcNow.ToString("o")
        };
        
        var update = Builders<DriverProfile>.Update.Set(d => d.CurrentLocation, location);
        await _db.Drivers.UpdateOneAsync(d => d.Id == driver.Id, update);
        
        return Ok(new { message = "Location updated" });
    }
}

public class CompleteDeliveryDto
{
    public string? SignatureUrl { get; set; }
    public string? RecipientNameSigned { get; set; }
    public List<string>? PhotoUrls { get; set; }
    public bool? IdVerified { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
