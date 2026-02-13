using RxExpresss.Extensions;
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
    
    [HttpGet("profile")]
    public async Task<ActionResult> GetMyProfile()
    {
        var userId = User.GetUserId();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { detail = "Invalid token - no user ID found" });
        }
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        
        // Count assigned deliveries
        var assignedCount = await _db.Orders.CountDocumentsAsync(o => 
            o.DriverId == driver.Id && 
            (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "in_transit"));
        
        return Ok(new
        {
            id = driver.Id,
            user_id = driver.UserId,
            first_name = user?.FirstName,
            last_name = user?.LastName,
            email = user?.Email,
            phone = user?.Phone,
            vehicle_type = driver.VehicleType,
            vehicle_number = driver.VehicleNumber,
            license_number = driver.LicenseNumber,
            status = driver.Status,
            current_location = driver.CurrentLocation,
            rating = driver.Rating,
            total_deliveries = driver.TotalDeliveries,
            is_verified = driver.IsVerified,
            assigned_deliveries = assignedCount,
            created_at = driver.CreatedAt
        });
    }
    
    [HttpGet("deliveries")]
    public async Task<ActionResult> GetMyDeliveries()
    {
        var userId = User.GetUserId();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { detail = "Invalid token - no user ID found" });
        }
        
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
        var userId = User.GetUserId();
        
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
    
    [HttpPut("deliveries/{orderId}/status")]
    public async Task<ActionResult> UpdateDeliveryStatus(
        string orderId,
        [FromQuery] string status,
        [FromQuery] string? notes = null)
    {
        var userId = User.GetUserId();
        
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
            .Set(o => o.Status, status)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (status == "picked_up")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualPickupTime, DateTime.UtcNow.ToString("o"));
        }
        else if (status == "delivered")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualDeliveryTime, DateTime.UtcNow.ToString("o"));
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", status },
            { "notes", notes ?? $"Status updated by driver" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new { message = $"Status updated to {status}" });
    }
    
    [HttpPost("deliveries/{orderId}/pod")]
    public async Task<ActionResult> SubmitProofOfDelivery(
        string orderId,
        [FromBody] CompleteDeliveryDto dto)
    {
        var userId = User.GetUserId();
        
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
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", "delivered" },
            { "notes", "Proof of delivery submitted" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        // Update driver stats
        var driverUpdate = Builders<DriverProfile>.Update.Inc(d => d.TotalDeliveries, 1);
        await _db.Drivers.UpdateOneAsync(d => d.Id == driver.Id, driverUpdate);
        
        return Ok(new { success = true, message = "Proof of delivery submitted successfully" });
    }
    
    [HttpGet("deliveries/{orderId}/pod")]
    public async Task<ActionResult> GetProofOfDelivery(string orderId)
    {
        var userId = User.GetUserId();
        
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
        
        return Ok(new
        {
            order_id = order.Id,
            signature_url = order.SignatureUrl,
            recipient_name_signed = order.RecipientNameSigned,
            photo_urls = order.PhotoUrls,
            id_verified = order.IdVerified,
            delivery_location = order.DeliveryLocation,
            delivered_at = order.ActualDeliveryTime
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
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();
        
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
        var userId = User.GetUserId();
        
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
        var userId = User.GetUserId();
        
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
    public async Task<ActionResult> UpdateMyStatus(
        [FromQuery] string? status = null,
        [FromBody] Dictionary<string, string>? body = null)
    {
        var userId = User.GetUserId();
        var statusValue = status ?? body?.GetValueOrDefault("status");
        
        if (string.IsNullOrEmpty(statusValue))
        {
            return BadRequest(new { detail = "status is required" });
        }
        
        var driver = await _db.Drivers.Find(d => d.UserId == userId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver profile not found" });
        }
        
        var update = Builders<DriverProfile>.Update.Set(d => d.Status, statusValue);
        await _db.Drivers.UpdateOneAsync(d => d.Id == driver.Id, update);
        
        return Ok(new { message = $"Status updated to {statusValue}" });
    }
    
    [HttpPut("location")]
    public async Task<ActionResult> UpdateMyLocation(
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null,
        [FromBody] Dictionary<string, double>? body = null)
    {
        var userId = User.GetUserId();
        
        var lat = latitude ?? body?.GetValueOrDefault("latitude");
        var lng = longitude ?? body?.GetValueOrDefault("longitude");
        
        if (!lat.HasValue || !lng.HasValue)
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
            Latitude = lat.Value,
            Longitude = lng.Value,
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
