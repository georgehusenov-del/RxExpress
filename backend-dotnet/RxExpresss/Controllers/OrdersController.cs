using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<OrdersController> _logger;
    
    // Borough prefix mapping for QR codes
    private static readonly Dictionary<string, string> BoroughPrefixes = new()
    {
        { "queens", "Q" },
        { "brooklyn", "B" },
        { "manhattan", "M" },
        { "new york", "M" },
        { "staten island", "S" },
        { "bronx", "X" }
    };
    
    public OrdersController(MongoDbService db, ILogger<OrdersController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    private string GenerateQrCode(string city)
    {
        var prefix = "X"; // Default to Bronx
        var cityLower = city.ToLower();
        
        foreach (var kvp in BoroughPrefixes)
        {
            if (cityLower.Contains(kvp.Key))
            {
                prefix = kvp.Value;
                break;
            }
        }
        
        var randomPart = Guid.NewGuid().ToString()[..6].ToUpper();
        return $"{prefix}{randomPart}";
    }
    
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> CreateOrder([FromBody] OrderCreateDto dto)
    {
        // Get pharmacy info
        var pharmacy = await _db.Pharmacies.Find(p => p.Id == dto.PharmacyId).FirstOrDefaultAsync();
        if (pharmacy == null)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        var order = new Order
        {
            PharmacyId = dto.PharmacyId,
            PharmacyLocationId = dto.PharmacyLocationId,
            PharmacyName = pharmacy.Name,
            DeliveryType = dto.DeliveryType,
            TimeWindow = dto.TimeWindow,
            ScheduledDate = dto.ScheduledDate,
            DeliveryNotes = dto.DeliveryNotes,
            RequiresSignature = dto.RequiresSignature,
            RequiresPhotoProof = dto.RequiresPhotoProof,
            RequiresIdVerification = dto.RequiresIdVerification,
            CopayAmount = dto.CopayAmount,
            Status = "pending",
            Recipient = new DeliveryRecipient
            {
                Name = dto.Recipient.Name,
                Phone = dto.Recipient.Phone,
                Email = dto.Recipient.Email,
                DateOfBirth = dto.Recipient.DateOfBirth,
                Relationship = dto.Recipient.Relationship
            },
            DeliveryAddress = new Address
            {
                Street = dto.DeliveryAddress.Street,
                AptUnit = dto.DeliveryAddress.AptUnit,
                City = dto.DeliveryAddress.City,
                State = dto.DeliveryAddress.State,
                PostalCode = dto.DeliveryAddress.PostalCode,
                Country = dto.DeliveryAddress.Country,
                Latitude = dto.DeliveryAddress.Latitude,
                Longitude = dto.DeliveryAddress.Longitude,
                DeliveryInstructions = dto.DeliveryAddress.DeliveryInstructions
            },
            Packages = dto.Packages.Select(p => new Package
            {
                Id = p.Id ?? Guid.NewGuid().ToString(),
                QrCode = p.QrCode ?? $"RX-PKG-{Guid.NewGuid().ToString()[..8].ToUpper()}",
                Barcode = p.Barcode,
                WeightLbs = p.WeightLbs,
                RequiresRefrigeration = p.RequiresRefrigeration,
                RequiresSignature = p.RequiresSignature,
                RequiresIdVerification = p.RequiresIdVerification,
                SpecialInstructions = p.SpecialInstructions,
                Prescriptions = p.Prescriptions.Select(pr => new PrescriptionItem
                {
                    MedicationName = pr.MedicationName,
                    RxNumber = pr.RxNumber,
                    Quantity = pr.Quantity,
                    Dosage = pr.Dosage,
                    Instructions = pr.Instructions,
                    RequiresRefrigeration = pr.RequiresRefrigeration,
                    ControlledSubstance = pr.ControlledSubstance,
                    RequiresIdVerification = pr.RequiresIdVerification
                }).ToList()
            }).ToList(),
            TotalPackages = dto.Packages.Count,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        
        // Generate borough-prefixed QR code
        order.QrCode = GenerateQrCode(dto.DeliveryAddress.City);
        
        // Set pickup address from pharmacy
        if (pharmacy.Address != null)
        {
            order.PickupAddress = pharmacy.Address;
        }
        
        // Calculate pricing
        var pricing = await _db.Pricing.Find(p => p.DeliveryType == dto.DeliveryType && p.IsActive).FirstOrDefaultAsync();
        if (pricing != null)
        {
            order.DeliveryFee = pricing.BasePrice;
            order.TotalAmount = pricing.BasePrice;
        }
        
        await _db.Orders.InsertOneAsync(order);
        
        return Ok(new
        {
            message = "Order created successfully",
            order_id = order.Id,
            order_number = order.OrderNumber,
            tracking_number = order.TrackingNumber,
            qr_code = order.QrCode,
            delivery_fee = order.DeliveryFee,
            total_amount = order.TotalAmount
        });
    }
    
    [HttpGet]
    [Authorize]
    public async Task<ActionResult> ListOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? pharmacy_id = null,
        [FromQuery] int skip = 0,
        [FromQuery] int limit = 100)
    {
        var filterBuilder = Builders<Order>.Filter;
        var filter = filterBuilder.Empty;
        
        if (!string.IsNullOrEmpty(status))
        {
            filter &= filterBuilder.Eq(o => o.Status, status);
        }
        
        if (!string.IsNullOrEmpty(pharmacy_id))
        {
            filter &= filterBuilder.Eq(o => o.PharmacyId, pharmacy_id);
        }
        
        var total = await _db.Orders.CountDocumentsAsync(filter);
        var orders = await _db.Orders
            .Find(filter)
            .SortByDescending(o => o.CreatedAt)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
        
        var result = orders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.TrackingNumber,
            o.QrCode,
            o.PharmacyId,
            o.PharmacyName,
            o.DeliveryType,
            o.TimeWindow,
            o.Recipient,
            o.DeliveryAddress,
            o.DriverId,
            o.DriverName,
            o.Status,
            o.ScheduledDate,
            o.DeliveryFee,
            o.TotalAmount,
            o.CopayAmount,
            o.CopayCollected,
            o.CreatedAt,
            o.UpdatedAt
        });
        
        return Ok(new { orders = result, total = total });
    }
    
    [HttpGet("{orderId}")]
    [Authorize]
    public async Task<ActionResult> GetOrder(string orderId)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.TrackingNumber,
            order.QrCode,
            order.PharmacyId,
            order.PharmacyName,
            order.DeliveryType,
            order.TimeWindow,
            order.Recipient,
            order.DeliveryAddress,
            order.PickupAddress,
            order.Packages,
            order.TotalPackages,
            order.DriverId,
            order.DriverName,
            order.Status,
            order.ScheduledDate,
            order.DeliveryNotes,
            order.RequiresSignature,
            order.RequiresPhotoProof,
            order.RequiresIdVerification,
            order.DeliveryFee,
            order.TotalAmount,
            order.CopayAmount,
            order.CopayCollected,
            order.CopayCollectedAt,
            order.TrackingUpdates,
            order.CreatedAt,
            order.UpdatedAt
        });
    }
    
    [HttpPut("{orderId}/assign")]
    [Authorize]
    public async Task<ActionResult> AssignDriver(string orderId, [FromBody] Dictionary<string, string> body)
    {
        var driverId = body.GetValueOrDefault("driver_id");
        if (string.IsNullOrEmpty(driverId))
        {
            return BadRequest(new { detail = "driver_id is required" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var driver = await _db.Drivers.Find(d => d.Id == driverId).FirstOrDefaultAsync();
        if (driver == null)
        {
            return NotFound(new { detail = "Driver not found" });
        }
        
        var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
        var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        var update = Builders<Order>.Update
            .Set(o => o.DriverId, driverId)
            .Set(o => o.DriverName, driverName)
            .Set(o => o.Status, "assigned")
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, update);
        
        // Update driver status
        var driverUpdate = Builders<DriverProfile>.Update.Set(d => d.Status, "on_route");
        await _db.Drivers.UpdateOneAsync(d => d.Id == driverId, driverUpdate);
        
        return Ok(new { message = "Driver assigned successfully" });
    }
    
    [HttpPut("{orderId}/status")]
    [Authorize]
    public async Task<ActionResult> UpdateOrderStatus(string orderId, [FromBody] OrderStatusUpdateDto dto)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var updateBuilder = Builders<Order>.Update
            .Set(o => o.Status, dto.Status)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (dto.Status == "picked_up")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualPickupTime, DateTime.UtcNow.ToString("o"));
        }
        else if (dto.Status == "delivered")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualDeliveryTime, DateTime.UtcNow.ToString("o"));
        }
        
        // Add tracking update
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", dto.Status },
            { "notes", dto.Notes ?? "" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new { message = $"Status updated to {dto.Status}" });
    }
    
    [HttpPut("{orderId}/cancel")]
    [Authorize]
    public async Task<ActionResult> CancelOrder(string orderId, [FromBody] Dictionary<string, string>? body = null)
    {
        var reason = body?.GetValueOrDefault("reason") ?? "Cancelled by user";
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", "cancelled" },
            { "notes", reason }
        };
        
        var update = Builders<Order>.Update
            .Set(o => o.Status, "cancelled")
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"))
            .Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, update);
        
        return Ok(new { message = "Order cancelled successfully" });
    }
    
    [HttpPost("scan")]
    [Authorize]
    public async Task<ActionResult> ScanPackage([FromBody] ScanPackageDto dto)
    {
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();
        
        // Find order by QR code
        var order = await _db.Orders.Find(o => o.QrCode == dto.QrCode).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Package not found with this QR code" });
        }
        
        // Get scanner info
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        var scannerName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Create scan log
        var scanLog = new ScanLog
        {
            QrCode = dto.QrCode,
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            Action = dto.Action ?? "verify",
            ScannedBy = userId ?? "",
            ScannedByName = scannerName,
            ScannedByRole = userRole,
            ScannedAt = DateTime.UtcNow.ToString("o"),
            Location = dto.Location != null ? new LocationPoint
            {
                Latitude = dto.Location.Latitude,
                Longitude = dto.Location.Longitude,
                Timestamp = DateTime.UtcNow.ToString("o")
            } : null
        };
        
        await _db.ScanLogs.InsertOneAsync(scanLog);
        
        // Update order status based on action
        if (dto.Action == "pickup" && order.Status == "ready_for_pickup")
        {
            var update = Builders<Order>.Update
                .Set(o => o.Status, "picked_up")
                .Set(o => o.ActualPickupTime, DateTime.UtcNow.ToString("o"))
                .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
            await _db.Orders.UpdateOneAsync(o => o.Id == order.Id, update);
        }
        
        return Ok(new
        {
            success = true,
            message = "Package scanned successfully",
            scan = new
            {
                scanLog.Id,
                scanLog.QrCode,
                scanLog.Action,
                scanLog.ScannedAt,
                scanLog.ScannedByName
            },
            order = new
            {
                order.Id,
                order.OrderNumber,
                order.QrCode,
                order.PharmacyName,
                order.Status,
                order.DeliveryType,
                order.TimeWindow,
                order.Recipient,
                order.DeliveryAddress,
                order.CopayAmount,
                order.CopayCollected
            }
        });
    }
}
