using RxExpresss.Extensions;
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
    public async Task<ActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;
        var todayStart = today.ToString("o");
        
        var totalUsers = await _db.Users.CountDocumentsAsync(FilterDefinition<User>.Empty);
        var totalPharmacies = await _db.Pharmacies.CountDocumentsAsync(FilterDefinition<Pharmacy>.Empty);
        var totalDrivers = await _db.Drivers.CountDocumentsAsync(FilterDefinition<DriverProfile>.Empty);
        var activeDrivers = await _db.Drivers.CountDocumentsAsync(d => d.Status != "offline");
        var totalOrders = await _db.Orders.CountDocumentsAsync(FilterDefinition<Order>.Empty);
        
        // Orders by status (using new status system)
        var ordersByStatus = new Dictionary<string, long>
        {
            ["new"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "new"),
            ["picked_up"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "picked_up"),
            ["in_transit"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "in_transit"),
            ["out_for_delivery"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "out_for_delivery"),
            ["delivered"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "delivered"),
            ["failed"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "failed"),
            ["canceled"] = await _db.Orders.CountDocumentsAsync(o => o.Status == "canceled")
        };
        
        // Copay statistics
        var copayToCollect = await _db.Orders
            .Find(o => o.CopayAmount > 0 && !o.CopayCollected && o.Status != "canceled" && o.Status != "failed")
            .ToListAsync();
        var copayToCollectSum = copayToCollect.Sum(o => o.CopayAmount);
        var ordersCopayPending = copayToCollect.Count;
        
        var copayCollected = await _db.Orders
            .Find(o => o.CopayCollected)
            .ToListAsync();
        var copayCollectedSum = copayCollected.Sum(o => o.CopayAmount);
        var ordersCopayCollected = copayCollected.Count;
        
        // Borough statistics from QR codes
        var boroughStats = new Dictionary<string, int>();
        var activeOrders = await _db.Orders
            .Find(o => o.Status != "delivered" && o.Status != "canceled" && o.QrCode != null)
            .ToListAsync();
        foreach (var order in activeOrders)
        {
            if (!string.IsNullOrEmpty(order.QrCode) && order.QrCode.Length > 0)
            {
                var borough = order.QrCode[0].ToString();
                boroughStats[borough] = boroughStats.GetValueOrDefault(borough, 0) + 1;
            }
        }
        
        // Recent orders
        var recentOrders = await _db.Orders
            .Find(FilterDefinition<Order>.Empty)
            .SortByDescending(o => o.CreatedAt)
            .Limit(10)
            .ToListAsync();
        
        var recentOrdersResult = recentOrders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.QrCode,
            o.PharmacyName,
            o.Status,
            o.DeliveryType,
            o.TimeWindow,
            o.Recipient,
            o.DeliveryAddress,
            o.CopayAmount,
            o.CopayCollected,
            o.CreatedAt
        });
        
        return Ok(new
        {
            stats = new
            {
                total_users = totalUsers,
                total_pharmacies = totalPharmacies,
                total_drivers = totalDrivers,
                active_drivers = activeDrivers,
                total_orders = totalOrders,
                orders_by_status = ordersByStatus,
                copay_to_collect = copayToCollectSum,
                copay_collected = copayCollectedSum,
                orders_copay_pending = ordersCopayPending,
                orders_copay_collected = ordersCopayCollected,
                borough_stats = boroughStats
            },
            recent_orders = recentOrdersResult
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
            id = u.Id,
            email = u.Email,
            phone = u.Phone,
            first_name = u.FirstName,
            last_name = u.LastName,
            role = u.Role,
            is_active = u.IsActive,
            is_verified = u.IsVerified,
            notes = u.Notes,
            created_at = u.CreatedAt
        });
        
        return Ok(new { users = result, total = total });
    }
    
    [HttpPut("users/{userId}")]
    public async Task<ActionResult> UpdateUser(string userId, [FromBody] UpdateUserRequest request)
    {
        var existingUser = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (existingUser == null)
        {
            return NotFound(new { detail = "User not found" });
        }
        
        var updateDefinition = new List<UpdateDefinition<User>>();
        
        if (!string.IsNullOrEmpty(request.FirstName))
            updateDefinition.Add(Builders<User>.Update.Set(u => u.FirstName, request.FirstName));
        
        if (!string.IsNullOrEmpty(request.LastName))
            updateDefinition.Add(Builders<User>.Update.Set(u => u.LastName, request.LastName));
        
        if (!string.IsNullOrEmpty(request.Email))
            updateDefinition.Add(Builders<User>.Update.Set(u => u.Email, request.Email));
        
        if (!string.IsNullOrEmpty(request.Phone))
            updateDefinition.Add(Builders<User>.Update.Set(u => u.Phone, request.Phone));
        
        if (!string.IsNullOrEmpty(request.Role))
            updateDefinition.Add(Builders<User>.Update.Set(u => u.Role, request.Role));
        
        // Notes can be empty string to clear it
        if (request.Notes != null)
            updateDefinition.Add(Builders<User>.Update.Set(u => u.Notes, request.Notes));
        
        updateDefinition.Add(Builders<User>.Update.Set(u => u.UpdatedAt, DateTime.UtcNow.ToString("o")));
        
        if (updateDefinition.Count > 0)
        {
            var combinedUpdate = Builders<User>.Update.Combine(updateDefinition);
            await _db.Users.UpdateOneAsync(u => u.Id == userId, combinedUpdate);
        }
        
        return Ok(new { message = "User updated successfully" });
    }
    
    [HttpGet("pharmacies")]
    public async Task<ActionResult> GetAdminPharmacies([FromQuery] int skip = 0, [FromQuery] int limit = 50)
    {
        var total = await _db.Pharmacies.CountDocumentsAsync(FilterDefinition<Pharmacy>.Empty);
        var pharmacies = await _db.Pharmacies
            .Find(FilterDefinition<Pharmacy>.Empty)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
        
        var result = pharmacies.Select(p => new
        {
            id = p.Id,
            user_id = p.UserId,
            name = p.Name,
            license_number = p.LicenseNumber,
            npi_number = p.NpiNumber,
            phone = p.Phone,
            email = p.Email,
            website = p.Website,
            address = p.Address,
            locations = p.Locations,
            service_zones = p.ServiceZones,
            is_active = p.IsActive,
            is_verified = p.IsVerified,
            rating = p.Rating,
            total_deliveries = p.TotalDeliveries,
            created_at = p.CreatedAt,
            operating_hours = p.OperatingHours
        });
        
        return Ok(new { pharmacies = result, total = total });
    }
    
    [HttpPut("pharmacies/{pharmacyId}/verify")]
    public async Task<ActionResult> VerifyPharmacy(string pharmacyId)
    {
        var update = Builders<Pharmacy>.Update.Set(p => p.IsVerified, true);
        var result = await _db.Pharmacies.UpdateOneAsync(p => p.Id == pharmacyId, update);
        
        if (result.MatchedCount == 0)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        return Ok(new { message = "Pharmacy verified successfully" });
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
    public async Task<ActionResult> CancelOrder(
        string orderId, 
        [FromQuery] string? reason = null,
        [FromBody] Dictionary<string, string>? body = null)
    {
        var reasonValue = reason ?? body?.GetValueOrDefault("reason") ?? "Cancelled by admin";
        
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", "cancelled" },
            { "notes", reasonValue }
        };
        
        var update = Builders<Order>.Update
            .Set(o => o.Status, "cancelled")
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"))
            .Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, update);
        
        return Ok(new { message = "Order cancelled successfully" });
    }
    
    [HttpPut("orders/{orderId}/reassign")]
    public async Task<ActionResult> ReassignOrderByPath(
        string orderId,
        [FromQuery] string? time_window = null,
        [FromQuery] string? driver_id = null)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Order not found" });
        }
        
        var updateBuilder = Builders<Order>.Update.Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (!string.IsNullOrEmpty(time_window))
        {
            updateBuilder = updateBuilder.Set(o => o.TimeWindow, time_window);
        }
        
        if (!string.IsNullOrEmpty(driver_id))
        {
            if (driver_id == "unassign")
            {
                updateBuilder = updateBuilder
                    .Set(o => o.DriverId, (string?)null)
                    .Set(o => o.DriverName, (string?)null)
                    .Set(o => o.Status, "ready_for_pickup");
            }
            else
            {
                var driver = await _db.Drivers.Find(d => d.Id == driver_id).FirstOrDefaultAsync();
                if (driver != null)
                {
                    var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
                    var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
                    
                    updateBuilder = updateBuilder
                        .Set(o => o.DriverId, driver_id)
                        .Set(o => o.DriverName, driverName)
                        .Set(o => o.Status, "assigned");
                }
            }
        }
        
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, updateBuilder);
        
        return Ok(new { message = "Order reassigned successfully" });
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
    [HttpPost("orders/optimize-route")]
    public async Task<ActionResult> OptimizeRoutePreview(
        [FromBody] RouteOptimizationRequestDto dto,
        [FromQuery] string? borough = null,
        [FromQuery] string? time_window = null,
        [FromQuery] int? start_hour = null)
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
        var startHourValue = start_hour ?? dto.StartHour ?? 8;
        var currentTimeMins = startHourValue * 60;
        
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
        
        var routeStartTime = $"{startHourValue % 12}:00 {(startHourValue >= 12 ? "PM" : "AM")}";
        var endHour = (startHourValue * 60 + (int)totalDuration) / 60;
        var endMin = (startHourValue * 60 + (int)totalDuration) % 60;
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
            borough = borough ?? dto.Borough
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
                id = driver.Id,
                user_id = driver.UserId,
                vehicle_type = driver.VehicleType,
                vehicle_number = driver.VehicleNumber,
                license_number = driver.LicenseNumber,
                status = driver.Status,
                current_location = driver.CurrentLocation,
                rating = driver.Rating,
                total_deliveries = driver.TotalDeliveries,
                is_verified = driver.IsVerified,
                created_at = driver.CreatedAt,
                user = user == null ? null : new
                {
                    id = user.Id,
                    first_name = user.FirstName,
                    last_name = user.LastName,
                    email = user.Email,
                    phone = user.Phone,
                    is_active = user.IsActive
                }
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
    
    // =========== ADMIN PRICING ENDPOINTS ===========
    
    [HttpGet("pricing")]
    public async Task<ActionResult> GetAdminPricing([FromQuery] bool include_inactive = false)
    {
        var filter = include_inactive 
            ? Builders<DeliveryPricing>.Filter.Empty 
            : Builders<DeliveryPricing>.Filter.Eq(p => p.IsActive, true);
        
        var pricing = await _db.Pricing.Find(filter).ToListAsync();
        
        var result = pricing.Select(p => new
        {
            id = p.Id,
            delivery_type = p.DeliveryType,
            name = p.Name,
            description = p.Description,
            base_price = p.BasePrice,
            is_active = p.IsActive,
            time_window_start = p.TimeWindowStart,
            time_window_end = p.TimeWindowEnd,
            cutoff_time = p.CutoffTime,
            is_addon = p.IsAddon,
            created_at = p.CreatedAt,
            updated_at = p.UpdatedAt
        });
        
        return Ok(new { pricing = result, count = result.Count() });
    }
    
    [HttpGet("pricing/{pricingId}")]
    public async Task<ActionResult> GetAdminPricingById(string pricingId)
    {
        var pricing = await _db.Pricing.Find(p => p.Id == pricingId).FirstOrDefaultAsync();
        if (pricing == null)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        return Ok(new
        {
            id = pricing.Id,
            delivery_type = pricing.DeliveryType,
            name = pricing.Name,
            description = pricing.Description,
            base_price = pricing.BasePrice,
            is_active = pricing.IsActive,
            time_window_start = pricing.TimeWindowStart,
            time_window_end = pricing.TimeWindowEnd,
            cutoff_time = pricing.CutoffTime,
            is_addon = pricing.IsAddon,
            created_at = pricing.CreatedAt,
            updated_at = pricing.UpdatedAt
        });
    }
    
    [HttpPost("pricing")]
    public async Task<ActionResult> CreateAdminPricing([FromBody] DeliveryPricingCreateDto dto)
    {
        var pricing = new DeliveryPricing
        {
            DeliveryType = dto.DeliveryType,
            Name = dto.Name,
            Description = dto.Description,
            BasePrice = dto.BasePrice,
            IsActive = dto.IsActive,
            TimeWindowStart = dto.TimeWindowStart,
            TimeWindowEnd = dto.TimeWindowEnd,
            CutoffTime = dto.CutoffTime,
            IsAddon = dto.IsAddon,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        
        await _db.Pricing.InsertOneAsync(pricing);
        
        return Ok(new { message = "Pricing created successfully", pricing_id = pricing.Id });
    }
    
    [HttpPut("pricing/{pricingId}")]
    public async Task<ActionResult> UpdateAdminPricing(string pricingId, [FromBody] DeliveryPricingUpdateDto dto)
    {
        var pricing = await _db.Pricing.Find(p => p.Id == pricingId).FirstOrDefaultAsync();
        if (pricing == null)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        var updateBuilder = Builders<DeliveryPricing>.Update
            .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (!string.IsNullOrEmpty(dto.Name))
            updateBuilder = updateBuilder.Set(p => p.Name, dto.Name);
        if (!string.IsNullOrEmpty(dto.Description))
            updateBuilder = updateBuilder.Set(p => p.Description, dto.Description);
        if (dto.BasePrice.HasValue)
            updateBuilder = updateBuilder.Set(p => p.BasePrice, dto.BasePrice.Value);
        if (dto.IsActive.HasValue)
            updateBuilder = updateBuilder.Set(p => p.IsActive, dto.IsActive.Value);
        if (dto.TimeWindowStart != null)
            updateBuilder = updateBuilder.Set(p => p.TimeWindowStart, dto.TimeWindowStart);
        if (dto.TimeWindowEnd != null)
            updateBuilder = updateBuilder.Set(p => p.TimeWindowEnd, dto.TimeWindowEnd);
        if (dto.CutoffTime != null)
            updateBuilder = updateBuilder.Set(p => p.CutoffTime, dto.CutoffTime);
        
        await _db.Pricing.UpdateOneAsync(p => p.Id == pricingId, updateBuilder);
        
        return Ok(new { message = "Pricing updated successfully" });
    }
    
    [HttpDelete("pricing/{pricingId}")]
    public async Task<ActionResult> DeleteAdminPricing(string pricingId)
    {
        var result = await _db.Pricing.DeleteOneAsync(p => p.Id == pricingId);
        if (result.DeletedCount == 0)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        return Ok(new { message = "Pricing deleted successfully" });
    }
    
    [HttpPut("pricing/{pricingId}/toggle")]
    public async Task<ActionResult> TogglePricing(string pricingId)
    {
        var pricing = await _db.Pricing.Find(p => p.Id == pricingId).FirstOrDefaultAsync();
        if (pricing == null)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        var update = Builders<DeliveryPricing>.Update
            .Set(p => p.IsActive, !pricing.IsActive)
            .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        await _db.Pricing.UpdateOneAsync(p => p.Id == pricingId, update);
        
        return Ok(new { message = $"Pricing {(pricing.IsActive ? "disabled" : "enabled")} successfully" });
    }
    
    // =========== ADMIN SCAN ENDPOINTS ===========
    
    [HttpGet("scans")]
    public async Task<ActionResult> GetScans(
        [FromQuery] string? action = null,
        [FromQuery] string? order_id = null,
        [FromQuery] int skip = 0,
        [FromQuery] int limit = 50)
    {
        var filterBuilder = Builders<ScanLog>.Filter;
        var filter = filterBuilder.Empty;
        
        if (!string.IsNullOrEmpty(action))
        {
            filter &= filterBuilder.Eq(s => s.Action, action);
        }
        if (!string.IsNullOrEmpty(order_id))
        {
            filter &= filterBuilder.Eq(s => s.OrderId, order_id);
        }
        
        var total = await _db.ScanLogs.CountDocumentsAsync(filter);
        var scans = await _db.ScanLogs
            .Find(filter)
            .SortByDescending(s => s.ScannedAt)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
        
        var result = scans.Select(s => new
        {
            s.Id,
            s.QrCode,
            s.OrderId,
            s.OrderNumber,
            s.Action,
            s.ScannedBy,
            s.ScannedByName,
            s.ScannedByRole,
            s.ScannedAt,
            s.Location
        });
        
        return Ok(new { scans = result, total = total, skip = skip, limit = limit });
    }
    
    [HttpGet("scans/stats")]
    public async Task<ActionResult> GetScanStats()
    {
        var totalScans = await _db.ScanLogs.CountDocumentsAsync(FilterDefinition<ScanLog>.Empty);
        
        // Recent scans (last 24 hours)
        var yesterday = DateTime.UtcNow.AddDays(-1).ToString("o");
        var recentScans = await _db.ScanLogs.CountDocumentsAsync(s => s.ScannedAt.CompareTo(yesterday) >= 0);
        
        // Scans by action
        var allScans = await _db.ScanLogs.Find(FilterDefinition<ScanLog>.Empty).ToListAsync();
        var scansByAction = allScans
            .GroupBy(s => s.Action)
            .ToDictionary(g => g.Key, g => g.Count());
        
        // Top scanners
        var topScanners = allScans
            .GroupBy(s => s.ScannedBy)
            .Select(g => new { user_id = g.Key, count = g.Count(), name = g.First().ScannedByName })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToList();
        
        return Ok(new
        {
            total_scans = totalScans,
            recent_scans_24h = recentScans,
            scans_by_action = scansByAction,
            top_scanners = topScanners
        });
    }
    
    // =========== ADMIN PACKAGE ENDPOINTS ===========
    
    [HttpGet("packages")]
    public async Task<ActionResult> GetPackages(
        [FromQuery] string? status = null,
        [FromQuery] string? pharmacy_id = null,
        [FromQuery] int skip = 0,
        [FromQuery] int limit = 50)
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
        
        // Build package list from orders
        var packages = new List<object>();
        foreach (var order in orders)
        {
            packages.Add(new
            {
                id = order.Id,
                qr_code = order.QrCode,
                order_id = order.Id,
                order_number = order.OrderNumber,
                pharmacy_id = order.PharmacyId,
                pharmacy_name = order.PharmacyName,
                status = order.Status,
                delivery_type = order.DeliveryType,
                time_window = order.TimeWindow,
                recipient = order.Recipient,
                recipient_name = order.Recipient?.Name ?? "Unknown",
                recipient_phone = order.Recipient?.Phone,
                delivery_address = order.DeliveryAddress,
                pickup_address = order.PickupAddress,
                driver_id = order.DriverId,
                driver_name = order.DriverName,
                copay_amount = order.CopayAmount,
                copay_collected = order.CopayCollected,
                created_at = order.CreatedAt
            });
        }
        
        return Ok(new { packages = packages, total = total, skip = skip, limit = limit });
    }
    
    [HttpPost("packages/verify/{qrCode}")]
    public async Task<ActionResult> VerifyPackage(string qrCode)
    {
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();
        
        var order = await _db.Orders.Find(o => o.QrCode == qrCode).FirstOrDefaultAsync();
        if (order == null)
        {
            return NotFound(new { detail = "Package not found with this QR code", verified = false });
        }
        
        // Get user info for scan log
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        var scannerName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Create scan log
        var scanLog = new ScanLog
        {
            QrCode = qrCode,
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            Action = "verify",
            ScannedBy = userId ?? "",
            ScannedByName = scannerName,
            ScannedByRole = userRole,
            ScannedAt = DateTime.UtcNow.ToString("o")
        };
        
        await _db.ScanLogs.InsertOneAsync(scanLog);
        
        return Ok(new
        {
            verified = true,
            message = "Package verified successfully",
            package = new
            {
                id = order.Id,
                qr_code = order.QrCode,
                order_id = order.Id,
                order_number = order.OrderNumber,
                pharmacy_name = order.PharmacyName,
                status = order.Status,
                delivery_type = order.DeliveryType,
                time_window = order.TimeWindow,
                recipient = order.Recipient,
                delivery_address = order.DeliveryAddress,
                copay_amount = order.CopayAmount,
                copay_collected = order.CopayCollected
            },
            scan = new
            {
                scanLog.Id,
                scanLog.Action,
                scanLog.ScannedAt,
                scanLog.ScannedByName
            }
        });
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
