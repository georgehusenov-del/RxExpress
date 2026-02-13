using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using MongoDB.Bson;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<AdminController> _logger;
    
    public AdminController(MongoDbService db, ILogger<AdminController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpGet("stats")]
    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminStatsDto>> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;
        var todayStart = today.ToString("o");
        
        var totalUsers = await _db.Users.CountDocumentsAsync(FilterDefinition<User>.Empty);
        var activePharmacies = await _db.Pharmacies.CountDocumentsAsync(p => p.IsActive);
        var activeDrivers = await _db.Drivers.CountDocumentsAsync(d => d.Status == "available" || d.Status == "on_route");
        var pendingOrders = await _db.Orders.CountDocumentsAsync(o => o.Status == "pending");
        var readyForPickup = await _db.Orders.CountDocumentsAsync(o => o.Status == "ready_for_pickup");
        var inTransit = await _db.Orders.CountDocumentsAsync(o => o.Status == "in_transit" || o.Status == "out_for_delivery");
        
        // Count delivered today
        var deliveredToday = await _db.Orders.CountDocumentsAsync(o => 
            o.Status == "delivered" && 
            o.ActualDeliveryTime != null &&
            o.ActualDeliveryTime.CompareTo(todayStart) >= 0);
        
        // Copay statistics
        var copayToCollect = await _db.Orders
            .Find(o => o.CopayAmount > 0 && !o.CopayCollected && o.Status != "cancelled" && o.Status != "failed")
            .ToListAsync();
        var copayToCollectSum = copayToCollect.Sum(o => o.CopayAmount);
        
        var copayCollected = await _db.Orders
            .Find(o => o.CopayCollected)
            .ToListAsync();
        var copayCollectedSum = copayCollected.Sum(o => o.CopayAmount);
        
        return Ok(new AdminStatsDto
        {
            TotalUsers = (int)totalUsers,
            ActivePharmacies = (int)activePharmacies,
            ActiveDrivers = (int)activeDrivers,
            PendingOrders = (int)pendingOrders,
            ReadyForPickup = (int)readyForPickup,
            InTransit = (int)inTransit,
            DeliveredToday = (int)deliveredToday,
            CopayToCollect = copayToCollectSum,
            CopayCollected = copayCollectedSum
        });
    }
    
    [HttpGet("users")]
    public async Task<ActionResult> GetUsers([FromQuery] string? role = null, [FromQuery] int skip = 0, [FromQuery] int limit = 50)
    {
        var filter = Builders<User>.Filter.Empty;
        if (!string.IsNullOrEmpty(role))
        {
            filter = Builders<User>.Filter.Eq(u => u.Role, role);
        }
        
        var total = await _db.Users.CountDocumentsAsync(filter);
        var users = await _db.Users.Find(filter).Skip(skip).Limit(limit).ToListAsync();
        
        var result = users.Select(u => new
        {
            u.Id,
            u.Email,
            u.Phone,
            u.FirstName,
            u.LastName,
            u.Role,
            u.IsActive,
            u.IsVerified,
            u.CreatedAt
        });
        
        return Ok(new { users = result, total = total });
    }
    
    [HttpPut("users/{userId}/status")]
    public async Task<ActionResult> UpdateUserStatus(string userId, [FromBody] Dictionary<string, bool> body)
    {
        var isActive = body.GetValueOrDefault("is_active", true);
        
        var update = Builders<User>.Update.Set(u => u.IsActive, isActive);
        var result = await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        
        if (result.MatchedCount == 0)
        {
            return NotFound(new { detail = "User not found" });
        }
        
        return Ok(new { message = $"User status updated to {(isActive ? "active" : "inactive")}" });
    }
    
    [HttpGet("orders")]
    public async Task<ActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? pharmacy_id = null,
        [FromQuery] string? driver_id = null,
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
        if (!string.IsNullOrEmpty(driver_id))
        {
            filter &= filterBuilder.Eq(o => o.DriverId, driver_id);
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
            o.UpdatedAt,
            latitude = o.DeliveryAddress?.Latitude,
            longitude = o.DeliveryAddress?.Longitude
        });
        
        return Ok(new { orders = result, total = total });
    }
    
    [HttpPut("orders/{orderId}/status")]
    public async Task<ActionResult> UpdateOrderStatus(
        string orderId, 
        [FromQuery] string? status = null,
        [FromQuery] string? notes = null,
        [FromBody] OrderStatusUpdateDto? body = null)
    {
        // Accept both query params and body
        var statusValue = status ?? body?.Status;
        var notesValue = notes ?? body?.Notes;
        
        if (string.IsNullOrEmpty(statusValue))
        {
            return BadRequest(new { detail = "status is required" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var updateBuilder = Builders<Order>.Update
            .Set(o => o.Status, statusValue)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (statusValue == "picked_up")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualPickupTime, DateTime.UtcNow.ToString("o"));
        }
        else if (statusValue == "delivered")
        {
            updateBuilder = updateBuilder.Set(o => o.ActualDeliveryTime, DateTime.UtcNow.ToString("o"));
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", statusValue },
            { "notes", notesValue ?? "Updated by admin" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new { message = $"Status updated to {statusValue}" });
    }
    
    [HttpPut("orders/{orderId}/cancel")]
    public async Task<ActionResult> CancelOrder(string orderId, [FromBody] Dictionary<string, string>? body = null)
    {
        var reason = body?.GetValueOrDefault("reason") ?? "Cancelled by admin";
        
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
    
    [HttpPut("orders/reassign-order")]
    public async Task<ActionResult> ReassignOrder([FromBody] Dictionary<string, string> body)
    {
        var orderId = body.GetValueOrDefault("order_id");
        var timeWindow = body.GetValueOrDefault("time_window");
        var driverId = body.GetValueOrDefault("driver_id");
        
        if (string.IsNullOrEmpty(orderId))
        {
            return BadRequest(new { detail = "order_id is required" });
        }
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var updateBuilder = Builders<Order>.Update.Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (!string.IsNullOrEmpty(timeWindow))
        {
            updateBuilder = updateBuilder.Set(o => o.TimeWindow, timeWindow);
        }
        
        if (!string.IsNullOrEmpty(driverId))
        {
            if (driverId == "unassign")
            {
                updateBuilder = updateBuilder
                    .Set(o => o.DriverId, (string?)null)
                    .Set(o => o.DriverName, (string?)null)
                    .Set(o => o.Status, "ready_for_pickup");
            }
            else
            {
                var driver = await _db.Drivers.Find(d => d.Id == driverId).FirstOrDefaultAsync();
                if (driver != null)
                {
                    var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
                    var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
                    
                    updateBuilder = updateBuilder
                        .Set(o => o.DriverId, driverId)
                        .Set(o => o.DriverName, driverName)
                        .Set(o => o.Status, "assigned");
                }
            }
        }
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new { message = "Order reassigned successfully" });
    }
    
    [HttpPost("orders/optimize-route-preview")]
    public async Task<ActionResult> OptimizeRoutePreview([FromBody] RouteOptimizationRequestDto dto)
    {
        var orderIds = dto.OrderIds;
        
        if (orderIds == null || orderIds.Count == 0)
        {
            return BadRequest(new { detail = "order_ids is required" });
        }
        
        var orders = await _db.Orders
            .Find(o => orderIds.Contains(o.Id))
            .ToListAsync();
        
        if (orders.Count == 0)
        {
            return Ok(new
            {
                optimized_route = new List<object>(),
                total_stops = 0,
                total_distance_miles = 0,
                total_duration_minutes = 0
            });
        }
        
        // Build stops list with coordinates
        var stops = orders.Select(o => new
        {
            order_id = o.Id,
            order_number = o.OrderNumber,
            qr_code = o.QrCode,
            status = o.Status,
            recipient_name = o.Recipient?.Name ?? "Unknown",
            address = $"{o.DeliveryAddress?.Street}, {o.DeliveryAddress?.City}",
            city = o.DeliveryAddress?.City ?? "",
            latitude = o.DeliveryAddress?.Latitude ?? 40.7128,
            longitude = o.DeliveryAddress?.Longitude ?? -74.0060,
            copay_amount = o.CopayAmount,
            copay_collected = o.CopayCollected,
            time_window = o.TimeWindow
        }).ToList();
        
        // Simple nearest-neighbor optimization
        var depot = new { lat = 40.7128, lng = -74.0060 }; // Default NYC
        var optimized = new List<object>();
        var remaining = stops.ToList();
        var currentLat = depot.lat;
        var currentLng = depot.lng;
        var sequence = 1;
        var totalDistance = 0.0;
        var totalDuration = 0.0;
        var startHour = dto.StartHour ?? 8;
        var currentTimeMins = startHour * 60;
        
        while (remaining.Count > 0)
        {
            // Find nearest stop
            var nearest = remaining
                .OrderBy(s => HaversineDistance(currentLat, currentLng, s.latitude, s.longitude))
                .First();
            
            var distance = HaversineDistance(currentLat, currentLng, nearest.latitude, nearest.longitude);
            var driveMins = (distance / 18.0) * 60; // 18 mph average
            var stopMins = 5; // 5 min stop
            
            currentTimeMins += (int)driveMins + stopMins;
            totalDistance += distance;
            totalDuration += driveMins + stopMins;
            
            var etaHour = currentTimeMins / 60;
            var etaMin = currentTimeMins % 60;
            var etaStr = $"{etaHour % 12}:{etaMin:D2} {(etaHour >= 12 ? "PM" : "AM")}";
            
            optimized.Add(new
            {
                sequence = sequence++,
                order_id = nearest.order_id,
                order_number = nearest.order_number,
                qr_code = nearest.qr_code,
                status = nearest.status,
                recipient_name = nearest.recipient_name,
                address = nearest.address,
                city = nearest.city,
                latitude = nearest.latitude,
                longitude = nearest.longitude,
                copay_amount = nearest.copay_amount,
                copay_collected = nearest.copay_collected,
                time_window = nearest.time_window,
                distance_from_previous = Math.Round(distance, 2),
                estimated_drive_time = (int)driveMins,
                stop_duration = stopMins,
                estimated_arrival = etaStr
            });
            
            currentLat = nearest.latitude;
            currentLng = nearest.longitude;
            remaining.Remove(nearest);
        }
        
        var routeStartTime = $"{startHour % 12}:00 {(startHour >= 12 ? "PM" : "AM")}";
        var endHour = (startHour * 60 + (int)totalDuration) / 60;
        var endMin = (startHour * 60 + (int)totalDuration) % 60;
        var routeEndTime = $"{endHour % 12}:{endMin:D2} {(endHour >= 12 ? "PM" : "AM")}";
        
        return Ok(new
        {
            optimized_route = optimized,
            total_stops = optimized.Count,
            total_distance_miles = Math.Round(totalDistance, 2),
            total_duration_minutes = (int)totalDuration,
            total_duration_hours = Math.Round(totalDuration / 60, 1),
            route_start_time = routeStartTime,
            route_end_time = routeEndTime,
            borough = dto.Borough
        });
    }
    
    [HttpGet("drivers")]
    public async Task<ActionResult> GetDrivers([FromQuery] string? status = null)
    {
        var filter = Builders<DriverProfile>.Filter.Empty;
        if (!string.IsNullOrEmpty(status))
        {
            filter = Builders<DriverProfile>.Filter.Eq(d => d.Status, status);
        }
        
        var drivers = await _db.Drivers.Find(filter).ToListAsync();
        
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
                driver.Status,
                driver.CurrentLocation,
                driver.Rating,
                driver.TotalDeliveries,
                driver.IsVerified,
                first_name = user?.FirstName,
                last_name = user?.LastName,
                email = user?.Email,
                phone = user?.Phone
            });
        }
        
        return Ok(new { drivers = result, count = result.Count });
    }
    
    [HttpGet("drivers/locations")]
    public async Task<ActionResult> GetDriverLocations()
    {
        var filter = Builders<DriverProfile>.Filter.Or(
            Builders<DriverProfile>.Filter.Eq(d => d.Status, "available"),
            Builders<DriverProfile>.Filter.Eq(d => d.Status, "on_route"),
            Builders<DriverProfile>.Filter.Eq(d => d.Status, "on_delivery")
        );
        
        var drivers = await _db.Drivers.Find(filter).ToListAsync();
        
        var result = new List<object>();
        foreach (var driver in drivers)
        {
            if (driver.CurrentLocation != null)
            {
                var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
                var assignedOrders = await _db.Orders.CountDocumentsAsync(
                    o => o.DriverId == driver.Id && 
                    (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "in_transit"));
                
                result.Add(new
                {
                    driver_id = driver.Id,
                    name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                    status = driver.Status,
                    latitude = driver.CurrentLocation.Latitude,
                    longitude = driver.CurrentLocation.Longitude,
                    last_update = driver.CurrentLocation.Timestamp,
                    assigned_orders = (int)assignedOrders
                });
            }
        }
        
        return Ok(new { drivers = result });
    }
    
    // Haversine formula for distance calculation
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 3959; // Earth's radius in miles
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
    
    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
