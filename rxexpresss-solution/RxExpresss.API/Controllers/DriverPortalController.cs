using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/driver-portal")]
[Authorize(Roles = AppRoles.Driver)]
public class DriverPortalController : ControllerBase
{
    private readonly IRepository<DriverProfile> _drivers;
    private readonly IRepository<Order> _orders;
    private readonly IRepository<OfficeLocation> _officeLocations;
    private readonly IRepository<DriverLocationLog> _locationLogs;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<DriverPortalController> _logger;

    public DriverPortalController(
        IRepository<DriverProfile> drivers, 
        IRepository<Order> orders,
        IRepository<OfficeLocation> officeLocations,
        IRepository<DriverLocationLog> locationLogs,
        IWebHostEnvironment env,
        ILogger<DriverPortalController> logger)
    {
        _drivers = drivers; 
        _orders = orders;
        _officeLocations = officeLocations;
        _locationLogs = locationLogs;
        _env = env;
        _logger = logger;
    }

    private async Task<DriverProfile?> GetMyDriver()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value;
        return await _drivers.Query().FirstOrDefaultAsync(d => d.UserId == userId);
    }

    /// <summary>
    /// Get all active office locations for geo-lock verification
    /// </summary>
    [HttpGet("office-locations")]
    public async Task<IActionResult> GetOfficeLocations()
    {
        var offices = await _officeLocations.Query()
            .Where(o => o.IsActive)
            .Select(o => new { o.Id, o.Name, o.Address, o.City, o.Latitude, o.Longitude, o.RadiusMeters, o.IsDefault })
            .ToListAsync();
        return Ok(new { offices });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver profile not found" });
        return Ok(new { driver.Id, driver.UserId, driver.VehicleType, driver.VehicleNumber, driver.LicenseNumber, driver.Status, driver.Rating, driver.TotalDeliveries, driver.IsVerified });
    }

    [HttpGet("deliveries")]
    public async Task<IActionResult> Deliveries()
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver profile not found" });
        
        // Show orders for this driver at these statuses:
        // - assigned: pickup from pharmacy
        // - picked_up: going to office
        // - dispatched: leaving office for delivery
        // - out_for_delivery: on route
        // - delivering_now: at location
        // Exclude "in_transit" - those are at office waiting for reassignment
        var orders = await _orders.Query()
            .Where(o => o.DriverId == driver.Id && (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "dispatched" || o.Status == "out_for_delivery" || o.Status == "delivering_now"))
            .OrderBy(o => o.CreatedAt)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.RecipientName, o.RecipientPhone, o.Street, o.AptUnit, o.City, o.State, o.PostalCode, o.Latitude, o.Longitude, o.Status, o.CopayAmount, o.CopayCollected, o.DeliveryNotes, o.DeliveryInstructions, o.RequiresSignature, o.IsRefrigerated, o.CreatedAt })
            .ToListAsync();
        return Ok(new { deliveries = orders, count = orders.Count });
    }

    [HttpGet("history")]
    public async Task<IActionResult> DeliveryHistory()
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver profile not found" });
        
        // Get last 50 delivered orders by this driver
        var orders = await _orders.Query()
            .Where(o => o.DriverId == driver.Id && (o.Status == "delivered" || o.Status == "failed" || o.Status == "cancelled"))
            .OrderByDescending(o => o.ActualDeliveryTime ?? o.UpdatedAt)
            .Take(50)
            .Select(o => new { 
                o.Id, 
                o.OrderNumber, 
                o.QrCode, 
                o.RecipientName, 
                o.RecipientPhone,
                o.Street, 
                o.City, 
                o.State,
                o.Status, 
                o.ActualDeliveryTime, 
                o.CopayAmount, 
                o.CopayCollected, 
                o.PhotoUrl,
                o.SignatureUrl,
                o.RecipientNameSigned,
                o.IsRefrigerated,
                o.DeliveryNotes,
                o.UpdatedAt
            })
            .ToListAsync();
        return Ok(new { deliveries = orders, count = orders.Count });
    }

    [HttpPut("deliveries/{id}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(int id, [FromQuery] string status)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound();
        var order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == id && o.DriverId == driver.Id);
        if (order == null) return NotFound();
        
        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        
        if (status == "picked_up") 
        {
            order.ActualPickupTime = DateTime.UtcNow;
        }
        else if (status == "in_transit")
        {
            // Package arrived at office - unassign driver so admin can reassign to appropriate route driver
            order.DriverId = null;
            order.DriverName = null;
        }
        else if (status == "delivered") 
        {
            order.ActualDeliveryTime = DateTime.UtcNow;
        }
        
        await _orders.UpdateAsync(order);
        return Ok(new { message = $"Status updated to {status}" });
    }

    [HttpPost("deliveries/{id}/pod")]
    public async Task<IActionResult> SubmitPod(int id, [FromBody] SubmitPodDto dto)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        
        var order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == id && o.DriverId == driver.Id);
        if (order == null) return NotFound(new { detail = "Order not found" });
        
        // Check for new 3-photo format or legacy single photo
        bool hasNewPhotos = !string.IsNullOrEmpty(dto.PhotoHomeBase64) || 
                           !string.IsNullOrEmpty(dto.PhotoAddressBase64) || 
                           !string.IsNullOrEmpty(dto.PhotoPackageBase64);
        
        if (hasNewPhotos)
        {
            // New format: 3 required photos
            if (string.IsNullOrEmpty(dto.PhotoHomeBase64))
                return BadRequest(new { detail = "Photo of home is required" });
            if (string.IsNullOrEmpty(dto.PhotoAddressBase64))
                return BadRequest(new { detail = "Photo of address is required" });
            if (string.IsNullOrEmpty(dto.PhotoPackageBase64))
                return BadRequest(new { detail = "Photo of package at door is required" });
            
            try
            {
                order.PhotoHomeUrl = await SavePhotoAsync(dto.PhotoHomeBase64, order.OrderNumber, "home");
                order.PhotoAddressUrl = await SavePhotoAsync(dto.PhotoAddressBase64, order.OrderNumber, "addr");
                order.PhotoPackageUrl = await SavePhotoAsync(dto.PhotoPackageBase64, order.OrderNumber, "pkg");
                // Set legacy PhotoUrl to package photo for backward compatibility
                order.PhotoUrl = order.PhotoPackageUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save POD photos for order {OrderId}", id);
                return BadRequest(new { detail = "Failed to save photos. Please try again." });
            }
        }
        else if (!string.IsNullOrEmpty(dto.PhotoBase64))
        {
            // Legacy single photo format
            try
            {
                var photoPath = await SavePhotoAsync(dto.PhotoBase64, order.OrderNumber, "pod");
                order.PhotoUrl = photoPath;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save POD photo for order {OrderId}", id);
                return BadRequest(new { detail = "Failed to save photo. Please try again." });
            }
        }
        else
        {
            return BadRequest(new { detail = "Photo proof is required for delivery completion" });
        }
        
        // Signature is optional (based on delivery instructions like "leave at door")
        if (!string.IsNullOrEmpty(dto.SignatureBase64))
        {
            try
            {
                var signaturePath = await SaveSignatureAsync(dto.SignatureBase64, order.OrderNumber);
                order.SignatureUrl = signaturePath;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to save signature for order {OrderId}", id);
                // Don't fail - signature is optional
            }
        }
        
        order.Status = "delivered";
        order.ActualDeliveryTime = DateTime.UtcNow;
        order.RecipientNameSigned = dto.RecipientName;
        order.DeliveryNotes = dto.Notes;
        order.UpdatedAt = DateTime.UtcNow;
        
        driver.TotalDeliveries++;
        
        await _orders.UpdateAsync(order);
        await _drivers.UpdateAsync(driver);
        
        return Ok(new { 
            success = true, 
            message = "Delivery completed with POD", 
            photoUrl = order.PhotoUrl,
            photoHomeUrl = order.PhotoHomeUrl,
            photoAddressUrl = order.PhotoAddressUrl,
            photoPackageUrl = order.PhotoPackageUrl,
            signatureUrl = order.SignatureUrl 
        });
    }
    
    private async Task<string> SavePhotoAsync(string base64Data, string orderNumber, string photoType = "pod")
    {
        // Remove data URL prefix if present
        var base64 = base64Data;
        if (base64.Contains(","))
        {
            base64 = base64.Split(',')[1];
        }
        
        var bytes = Convert.FromBase64String(base64);
        var fileName = $"{photoType}_{orderNumber}_{DateTime.UtcNow:yyyyMMddHHmmss}.jpg";
        
        // Save to Web project's wwwroot/pod folder (not API's wwwroot)
        // This ensures images are served by the Web static file middleware
        var webProjectRoot = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "RxExpresss.Web"));
        var podFolder = Path.Combine(webProjectRoot, "wwwroot", "pod");
        
        if (!Directory.Exists(podFolder))
        {
            Directory.CreateDirectory(podFolder);
        }
        
        var filePath = Path.Combine(podFolder, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);
        
        _logger.LogInformation("POD photo saved to Web wwwroot: {FilePath}", filePath);
        
        return $"/pod/{fileName}";
    }
    
    private async Task<string> SaveSignatureAsync(string base64Data, string orderNumber)
    {
        var base64 = base64Data;
        if (base64.Contains(","))
        {
            base64 = base64.Split(',')[1];
        }
        
        var bytes = Convert.FromBase64String(base64);
        var fileName = $"sig_{orderNumber}_{DateTime.UtcNow:yyyyMMddHHmmss}.png";
        
        // Save to Web project's wwwroot/pod folder (not API's wwwroot)
        var webProjectRoot = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "RxExpresss.Web"));
        var podFolder = Path.Combine(webProjectRoot, "wwwroot", "pod");
        
        if (!Directory.Exists(podFolder))
        {
            Directory.CreateDirectory(podFolder);
        }
        
        var filePath = Path.Combine(podFolder, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);
        
        _logger.LogInformation("Signature saved to Web wwwroot: {FilePath}", filePath);
        
        return $"/pod/{fileName}";
    }

    [HttpPost("deliveries/{id}/collect-copay")]
    public async Task<IActionResult> CollectCopay(int id)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound();
        var order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == id && o.DriverId == driver.Id);
        if (order == null) return NotFound();
        order.CopayCollected = true;
        order.UpdatedAt = DateTime.UtcNow;
        await _orders.UpdateAsync(order);
        return Ok(new { success = true, message = $"Copay of ${order.CopayAmount:F2} collected" });
    }

    [HttpPut("status")]
    public async Task<IActionResult> UpdateStatus([FromQuery] string? status, [FromBody] Dictionary<string, string>? body = null)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound();
        driver.Status = status ?? body?.GetValueOrDefault("status") ?? "offline";
        await _drivers.UpdateAsync(driver);
        return Ok(new { message = $"Status updated to {driver.Status}" });
    }

    /// <summary>
    /// POST /api/driver-portal/location
    /// Driver reports their current GPS position. Called every 10-15 seconds from driver app.
    /// </summary>
    [HttpPost("location")]
    public async Task<IActionResult> ReportLocation([FromBody] LocationUpdateDto dto)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver not found" });

        // Update current position on driver profile
        driver.CurrentLatitude = dto.Latitude;
        driver.CurrentLongitude = dto.Longitude;
        driver.CurrentSpeed = dto.Speed;
        driver.CurrentHeading = dto.Heading;
        driver.LastLocationUpdate = DateTime.UtcNow;
        await _drivers.UpdateAsync(driver);

        // Log location for trail/history
        await _locationLogs.AddAsync(new DriverLocationLog
        {
            DriverId = driver.Id,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Speed = dto.Speed,
            Heading = dto.Heading,
            Accuracy = dto.Accuracy,
            Timestamp = DateTime.UtcNow
        });

        return Ok(new { success = true });
    }
}

public class LocationUpdateDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Speed { get; set; }
    public double? Heading { get; set; }
    public double? Accuracy { get; set; }
}
