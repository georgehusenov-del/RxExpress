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
    private readonly IRepository<OrderAttemptLog> _attemptLogs;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<DriverPortalController> _logger;

    public DriverPortalController(
        IRepository<DriverProfile> drivers, 
        IRepository<Order> orders,
        IRepository<OfficeLocation> officeLocations,
        IRepository<DriverLocationLog> locationLogs,
        IRepository<OrderAttemptLog> attemptLogs,
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<DriverPortalController> logger)
    {
        _drivers = drivers; 
        _orders = orders;
        _officeLocations = officeLocations;
        _locationLogs = locationLogs;
        _attemptLogs = attemptLogs;
        _env = env;
        _config = config;
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
        // - failed (but only while FailedAttempts < 2): retry-eligible, keep on driver's list
        // Exclude "in_transit" - those are at office waiting for reassignment
        var orders = await _orders.Query()
            .Where(o => o.DriverId == driver.Id && (
                o.Status == "assigned" || o.Status == "picked_up" || o.Status == "dispatched"
                || o.Status == "out_for_delivery" || o.Status == "delivering_now"
                || (o.Status == "failed" && o.FailedAttempts < 2)
            ))
            .OrderBy(o => o.CreatedAt)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.RecipientName, o.RecipientPhone, o.Street, o.AptUnit, o.City, o.State, o.PostalCode, o.Latitude, o.Longitude, o.Status, o.CopayAmount, o.CopayCollected, o.DeliveryNotes, o.DeliveryInstructions, o.RequiresSignature, o.IsRefrigerated, o.FailedAttempts, o.CreatedAt })
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

        // "failed" must go through the attempt-failed flow so the counter increments and copay resets.
        if (status == "failed")
        {
            return BadRequest(new {
                detail = "Use POST /api/driver-portal/deliveries/{id}/attempt-failed to mark a delivery as failed. " +
                         "That endpoint logs the attempt, clears any copay, and keeps the order on your list until 2 attempts are reached."
            });
        }

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
    
    private string ResolvePodFolder()
    {
        // 1. Allow explicit override via appsettings (recommended for prod).
        //    Example appsettings.json:  "Pod": { "StoragePath": "C:\\inetpub\\rxexpresss\\web\\wwwroot\\pod" }
        var configured = _config["Pod:StoragePath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            Directory.CreateDirectory(configured);
            return configured;
        }

        // 2. Try the sibling Web project (dev layout: RxExpresss.API + RxExpresss.Web).
        var sibling = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "RxExpresss.Web", "wwwroot", "pod"));
        var siblingParent = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "RxExpresss.Web"));
        if (Directory.Exists(siblingParent))
        {
            Directory.CreateDirectory(sibling);
            return sibling;
        }

        // 3. Production fallback: save under API's own wwwroot/pod.
        //    Images are still served because app.UseStaticFiles() is enabled on the API.
        var apiLocal = Path.Combine(_env.ContentRootPath, "wwwroot", "pod");
        Directory.CreateDirectory(apiLocal);
        return apiLocal;
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

        var podFolder = ResolvePodFolder();
        var filePath = Path.Combine(podFolder, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);

        _logger.LogInformation("POD photo saved: {FilePath}", filePath);

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

        var podFolder = ResolvePodFolder();
        var filePath = Path.Combine(podFolder, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);

        _logger.LogInformation("Signature saved: {FilePath}", filePath);

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

    /// <summary>
    /// POST /api/driver-portal/deliveries/{id}/attempt-failed
    /// Driver marks a delivery attempt as failed.
    /// - Increments FailedAttempts counter and writes an OrderAttemptLog.
    /// - Clears CopayCollected (a failed delivery can never have collected copay).
    /// - If FailedAttempts &lt; 2, keeps the order on the driver's list (status = "assigned") for retry.
    /// - If FailedAttempts &gt;= 2, marks the order terminally "failed" so admin can duplicate it with a new QR code.
    /// </summary>
    [HttpPost("deliveries/{id}/attempt-failed")]
    public async Task<IActionResult> AttemptFailed(int id, [FromBody] AttemptFailedDto? dto)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver not found" });

        var order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == id && o.DriverId == driver.Id);
        if (order == null) return NotFound(new { detail = "Order not found or not assigned to you" });

        order.FailedAttempts++;
        // A failed attempt can never have collected copay - enforce data integrity.
        order.CopayCollected = false;

        // Keep the order on the driver's list unless this is the 2nd+ failure (terminal).
        bool terminal = order.FailedAttempts >= 2;
        order.Status = terminal ? "failed" : "assigned";
        order.UpdatedAt = DateTime.UtcNow;

        await _orders.UpdateAsync(order);
        await _attemptLogs.AddAsync(new OrderAttemptLog
        {
            OrderId = order.Id,
            AttemptNumber = order.FailedAttempts,
            Status = "failed",
            DriverId = driver.Id,
            DriverName = order.DriverName,
            FailureReason = dto?.FailureReason,
            Notes = dto?.Notes
        });

        return Ok(new
        {
            success = true,
            message = terminal
                ? "Delivery marked as failed. Order has reached 2+ attempts and is now terminal - admin can duplicate it with a new QR code."
                : "Attempt logged as failed. The order remains on your list for retry.",
            failedAttempts = order.FailedAttempts,
            status = order.Status,
            canDuplicate = terminal
        });
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

public class AttemptFailedDto
{
    public string? FailureReason { get; set; }
    public string? Notes { get; set; }
}
