using RxExpresss.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RxExpresss.Models;
using RxExpresss.Services;
using System.Net.Http.Headers;
using System.Text.Json;

namespace RxExpresss.Controllers;

// Route Plan Model
[BsonIgnoreExtraElements]
public class RoutePlan
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("circuit_plan_id")]
    public string? CircuitPlanId { get; set; }
    
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;
    
    [BsonElement("date")]
    public string Date { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    
    [BsonElement("driver_ids")]
    public List<string> DriverIds { get; set; } = new();
    
    [BsonElement("order_ids")]
    public List<string> OrderIds { get; set; } = new();
    
    [BsonElement("status")]
    public string Status { get; set; } = "draft";
    
    [BsonElement("optimization_status")]
    public string OptimizationStatus { get; set; } = "not_started";
    
    [BsonElement("distributed")]
    public bool Distributed { get; set; } = false;
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

[ApiController]
[Route("api/circuit")]
[Authorize]
public class CircuitController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<CircuitController> _logger;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly string? _circuitApiKey;
    
    private IMongoCollection<RoutePlan> RoutePlans => 
        _db.GetDatabase().GetCollection<RoutePlan>("route_plans");
    
    public CircuitController(MongoDbService db, ILogger<CircuitController> logger, IConfiguration config)
    {
        _db = db;
        _logger = logger;
        _config = config;
        _circuitApiKey = config["Circuit:ApiKey"] ?? Environment.GetEnvironmentVariable("CIRCUIT_API_KEY");
        _httpClient = new HttpClient();
        _httpClient.BaseAddress = new Uri("https://api.getcircuit.com/public/v0.2b/");
        if (!string.IsNullOrEmpty(_circuitApiKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Basic", Convert.ToBase64String(
                    System.Text.Encoding.ASCII.GetBytes($"{_circuitApiKey}:")));
        }
    }
    
    [HttpGet("status")]
    public async Task<ActionResult> GetStatus()
    {
        if (string.IsNullOrEmpty(_circuitApiKey))
        {
            return Ok(new { 
                connected = false, 
                error = "Circuit API key not configured",
                message = "Please configure CIRCUIT_API_KEY in environment"
            });
        }
        
        try
        {
            var response = await _httpClient.GetAsync("plans?pageSize=1");
            if (response.IsSuccessStatusCode)
            {
                return Ok(new { 
                    connected = true, 
                    message = "Circuit API connected successfully" 
                });
            }
            else
            {
                return Ok(new { 
                    connected = false, 
                    error = $"Circuit API returned {response.StatusCode}" 
                });
            }
        }
        catch (Exception ex)
        {
            return Ok(new { 
                connected = false, 
                error = ex.Message 
            });
        }
    }
    
    [HttpGet("drivers")]
    public async Task<ActionResult> GetCircuitDrivers()
    {
        // Return local drivers as Circuit drivers
        var drivers = await _db.Drivers.Find(_ => true).ToListAsync();
        var result = new List<object>();
        
        foreach (var driver in drivers)
        {
            var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
            result.Add(new
            {
                id = driver.Id,
                name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                email = user?.Email,
                phone = user?.Phone,
                status = driver.Status,
                is_active = driver.Status != "offline"
            });
        }
        
        return Ok(new { drivers = result, count = result.Count });
    }
    
    [HttpGet("depots")]
    public async Task<ActionResult> GetDepots()
    {
        // Return pharmacies as depots
        var pharmacies = await _db.Pharmacies.Find(p => p.IsActive).ToListAsync();
        var depots = pharmacies.Select(p => new
        {
            id = p.Id,
            name = p.Name,
            address = p.Address != null ? $"{p.Address.Street}, {p.Address.City}, {p.Address.State}" : "",
            latitude = p.Address?.Latitude ?? 40.7128,
            longitude = p.Address?.Longitude ?? -74.0060
        });
        
        return Ok(new { depots = depots, count = depots.Count() });
    }
    
    [HttpGet("route-plans")]
    public async Task<ActionResult> GetLocalPlans([FromQuery] string? status = null)
    {
        var filter = string.IsNullOrEmpty(status) 
            ? Builders<RoutePlan>.Filter.Empty 
            : Builders<RoutePlan>.Filter.Eq(p => p.Status, status);
        
        var plans = await RoutePlans.Find(filter).SortByDescending(p => p.CreatedAt).ToListAsync();
        
        var result = new List<object>();
        foreach (var plan in plans)
        {
            result.Add(new
            {
                plan.Id,
                plan.CircuitPlanId,
                plan.Title,
                plan.Date,
                plan.DriverIds,
                plan.OrderIds,
                plan.Status,
                plan.OptimizationStatus,
                plan.Distributed,
                plan.CreatedAt,
                order_count = plan.OrderIds.Count,
                driver_count = plan.DriverIds.Count
            });
        }
        
        return Ok(new { plans = result, count = result.Count });
    }
    
    [HttpGet("pending-orders")]
    public async Task<ActionResult> GetPendingOrders([FromQuery] string? date = null)
    {
        // Filter for orders with "new" status (ready for routing)
        var filter = Builders<Order>.Filter.Eq(o => o.Status, "new");
        
        if (!string.IsNullOrEmpty(date))
        {
            filter &= Builders<Order>.Filter.Eq(o => o.ScheduledDate, date);
        }
        
        var orders = await _db.Orders.Find(filter).ToListAsync();
        
        var result = orders.Select(o => new
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
            o.ScheduledDate,
            o.CreatedAt
        });
        
        return Ok(new { orders = result, count = result.Count() });
    }
    
    [HttpPost("plans/create-for-date")]
    public async Task<ActionResult> CreatePlanForDate([FromBody] CreatePlanDto dto)
    {
        var plan = new RoutePlan
        {
            Title = dto.Title ?? $"Route Plan - {dto.Date}",
            Date = dto.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            DriverIds = dto.DriverIds ?? new List<string>(),
            Status = "draft",
            OptimizationStatus = "not_started",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        
        await RoutePlans.InsertOneAsync(plan);
        
        return Ok(new
        {
            message = "Plan created successfully",
            plan_id = plan.Id,
            plan = new
            {
                plan.Id,
                plan.Title,
                plan.Date,
                plan.DriverIds,
                plan.Status,
                plan.CreatedAt
            }
        });
    }
    
    [HttpGet("plans/{planId}")]
    public async Task<ActionResult> GetPlan(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        return Ok(new
        {
            plan.Id,
            plan.CircuitPlanId,
            plan.Title,
            plan.Date,
            plan.DriverIds,
            plan.OrderIds,
            plan.Status,
            plan.OptimizationStatus,
            plan.Distributed,
            plan.CreatedAt,
            plan.UpdatedAt
        });
    }
    
    [HttpGet("plans/{planId}/full-status")]
    public async Task<ActionResult> GetPlanFullStatus(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        // Get orders in this plan
        var orders = await _db.Orders.Find(o => plan.OrderIds.Contains(o.Id)).ToListAsync();
        
        // Get drivers
        var drivers = await _db.Drivers.Find(d => plan.DriverIds.Contains(d.Id)).ToListAsync();
        var driverDetails = new List<object>();
        foreach (var driver in drivers)
        {
            var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
            driverDetails.Add(new
            {
                driver.Id,
                name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                driver.Status
            });
        }
        
        return Ok(new
        {
            plan = new
            {
                plan.Id,
                plan.Title,
                plan.Date,
                plan.Status,
                plan.OptimizationStatus,
                plan.Distributed
            },
            orders = orders.Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.QrCode,
                o.Status,
                o.Recipient,
                o.DeliveryAddress
            }),
            drivers = driverDetails,
            stats = new
            {
                total_orders = orders.Count,
                pending = orders.Count(o => o.Status == "pending"),
                assigned = orders.Count(o => o.Status == "assigned"),
                delivered = orders.Count(o => o.Status == "delivered")
            }
        });
    }
    
    [HttpPost("plans/{planId}/batch-import")]
    public async Task<ActionResult> BatchImportOrders(string planId, [FromBody] BatchImportDto dto)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        // Add orders to plan
        var newOrderIds = dto.OrderIds.Where(id => !plan.OrderIds.Contains(id)).ToList();
        if (newOrderIds.Count > 0)
        {
            var update = Builders<RoutePlan>.Update
                .PushEach(p => p.OrderIds, newOrderIds)
                .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
            await RoutePlans.UpdateOneAsync(p => p.Id == planId, update);
            
            // Update orders with plan reference
            var orderUpdate = Builders<Order>.Update.Set(o => o.CircuitPlanId, planId);
            await _db.Orders.UpdateManyAsync(o => newOrderIds.Contains(o.Id), orderUpdate);
        }
        
        return Ok(new
        {
            message = $"Added {newOrderIds.Count} orders to plan",
            added_count = newOrderIds.Count,
            total_orders = plan.OrderIds.Count + newOrderIds.Count
        });
    }
    
    [HttpPost("plans/{planId}/optimize")]
    public async Task<ActionResult> OptimizePlan(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        // Update plan status
        var update = Builders<RoutePlan>.Update
            .Set(p => p.OptimizationStatus, "completed")
            .Set(p => p.Status, "optimized")
            .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
        await RoutePlans.UpdateOneAsync(p => p.Id == planId, update);
        
        return Ok(new
        {
            message = "Plan optimization completed",
            status = "completed"
        });
    }
    
    [HttpPost("plans/{planId}/distribute")]
    public async Task<ActionResult> DistributePlan(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        // Assign orders to drivers
        if (plan.DriverIds.Count > 0 && plan.OrderIds.Count > 0)
        {
            var ordersPerDriver = (int)Math.Ceiling((double)plan.OrderIds.Count / plan.DriverIds.Count);
            var orderIndex = 0;
            
            foreach (var driverId in plan.DriverIds)
            {
                var driver = await _db.Drivers.Find(d => d.Id == driverId).FirstOrDefaultAsync();
                var driverUserId = driver?.UserId ?? "";
                var user = await _db.Users.Find(u => u.Id == driverUserId).FirstOrDefaultAsync();
                var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
                
                var assignedOrderIds = plan.OrderIds.Skip(orderIndex).Take(ordersPerDriver).ToList();
                
                var orderUpdate = Builders<Order>.Update
                    .Set(o => o.DriverId, driverId)
                    .Set(o => o.DriverName, driverName)
                    .Set(o => o.Status, "assigned")
                    .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
                
                await _db.Orders.UpdateManyAsync(o => assignedOrderIds.Contains(o.Id), orderUpdate);
                
                orderIndex += ordersPerDriver;
            }
        }
        
        // Update plan status
        var update = Builders<RoutePlan>.Update
            .Set(p => p.Distributed, true)
            .Set(p => p.Status, "distributed")
            .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
        await RoutePlans.UpdateOneAsync(p => p.Id == planId, update);
        
        return Ok(new
        {
            message = "Plan distributed to drivers",
            status = "distributed"
        });
    }
    
    [HttpPost("plans/{planId}/optimize-and-distribute")]
    public async Task<ActionResult> OptimizeAndDistribute(string planId)
    {
        // First optimize
        await OptimizePlan(planId);
        
        // Then distribute
        return await DistributePlan(planId);
    }
    
    [HttpDelete("plans/{planId}")]
    public async Task<ActionResult> DeletePlan(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        var orderUpdate = Builders<Order>.Update.Set(o => o.CircuitPlanId, (string?)null);
        await _db.Orders.UpdateManyAsync(o => plan.OrderIds.Contains(o.Id), orderUpdate);
        
        await RoutePlans.DeleteOneAsync(p => p.Id == planId);
        
        return Ok(new { message = "Plan deleted successfully" });
    }
    
    [HttpPut("route-plans/{planId}")]
    public async Task<ActionResult> UpdateRoutePlan(string planId, [FromBody] UpdatePlanDto dto)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null) return NotFound(new { detail = "Plan not found" });
        
        var updateDefs = new List<UpdateDefinition<RoutePlan>>();
        if (!string.IsNullOrEmpty(dto.Title))
            updateDefs.Add(Builders<RoutePlan>.Update.Set(p => p.Title, dto.Title));
        if (!string.IsNullOrEmpty(dto.Date))
            updateDefs.Add(Builders<RoutePlan>.Update.Set(p => p.Date, dto.Date));
        if (dto.DriverIds != null)
            updateDefs.Add(Builders<RoutePlan>.Update.Set(p => p.DriverIds, dto.DriverIds));
        updateDefs.Add(Builders<RoutePlan>.Update.Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o")));
        
        await RoutePlans.UpdateOneAsync(p => p.Id == planId, Builders<RoutePlan>.Update.Combine(updateDefs));
        return Ok(new { message = "Plan updated" });
    }
    
    [HttpDelete("order/{orderId}/unlink")]
    public async Task<ActionResult> UnlinkOrderFromPlan(string orderId)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null) return NotFound(new { detail = "Order not found" });
        
        if (!string.IsNullOrEmpty(order.CircuitPlanId))
        {
            var planUpdate = Builders<RoutePlan>.Update.Pull(p => p.OrderIds, orderId);
            await RoutePlans.UpdateOneAsync(p => p.Id == order.CircuitPlanId, planUpdate);
        }
        
        var orderUpdate = Builders<Order>.Update
            .Set(o => o.CircuitPlanId, (string?)null)
            .Set(o => o.CircuitStopId, (string?)null)
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        await _db.Orders.UpdateOneAsync(o => o.Id == orderId, orderUpdate);
        
        return Ok(new { message = "Order unlinked from plan" });
    }
    
    [HttpPost("plans/{planId}/assign-driver")]
    public async Task<ActionResult> AssignDriverToPlan(string planId, [FromBody] AssignDriverDto dto)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null) return NotFound(new { detail = "Plan not found" });
        
        var driver = await _db.Drivers.Find(d => d.Id == dto.DriverId).FirstOrDefaultAsync();
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        
        if (!plan.DriverIds.Contains(dto.DriverId))
        {
            var planUpdate = Builders<RoutePlan>.Update
                .Push(p => p.DriverIds, dto.DriverId)
                .Set(p => p.UpdatedAt, DateTime.UtcNow.ToString("o"));
            await RoutePlans.UpdateOneAsync(p => p.Id == planId, planUpdate);
        }
        
        var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
        var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        var orderUpdate = Builders<Order>.Update
            .Set(o => o.DriverId, dto.DriverId)
            .Set(o => o.DriverName, driverName)
            .Set(o => o.Status, "assigned")
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        await _db.Orders.UpdateManyAsync(o => plan.OrderIds.Contains(o.Id), orderUpdate);
        
        return Ok(new { message = $"Driver {driverName} assigned to plan", driver_name = driverName });
    }
    
    [HttpPost("auto-assign-by-borough")]
    public async Task<ActionResult> AutoAssignByBorough([FromBody] AutoAssignDto? dto = null)
    {
        var status = dto?.Status ?? "out_for_delivery";
        var orders = await _db.Orders.Find(o => o.Status == "new" || o.Status == "pending").ToListAsync();
        
        if (orders.Count == 0)
            return Ok(new { message = "No orders to assign", assigned = 0 });
        
        var boroughGroups = new Dictionary<string, List<Order>>();
        foreach (var order in orders)
        {
            var borough = "X";
            if (!string.IsNullOrEmpty(order.QrCode) && order.QrCode.Length > 0)
                borough = order.QrCode[0].ToString();
            if (!boroughGroups.ContainsKey(borough))
                boroughGroups[borough] = new List<Order>();
            boroughGroups[borough].Add(order);
        }
        
        var assigned = 0;
        var drivers = await _db.Drivers.Find(d => d.Status != "offline").ToListAsync();
        
        if (drivers.Count == 0)
            return Ok(new { message = "No available drivers", assigned = 0 });
        
        var driverIndex = 0;
        foreach (var group in boroughGroups)
        {
            var driver = drivers[driverIndex % drivers.Count];
            var user = await _db.Users.Find(u => u.Id == driver.UserId).FirstOrDefaultAsync();
            var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
            
            var orderIds = group.Value.Select(o => o.Id).ToList();
            var update = Builders<Order>.Update
                .Set(o => o.DriverId, driver.Id)
                .Set(o => o.DriverName, driverName)
                .Set(o => o.Status, status)
                .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
            await _db.Orders.UpdateManyAsync(o => orderIds.Contains(o.Id), update);
            
            assigned += orderIds.Count;
            driverIndex++;
        }
        
        return Ok(new { message = $"Auto-assigned {assigned} orders", assigned, boroughs = boroughGroups.Keys.ToList() });
    }
    
    [HttpGet("plans/{planId}/stops")]
    public async Task<ActionResult> GetPlanStops(string planId)
    {
        var plan = await RoutePlans.Find(p => p.Id == planId).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { detail = "Plan not found" });
        }
        
        var orders = await _db.Orders.Find(o => plan.OrderIds.Contains(o.Id)).ToListAsync();
        
        var stops = orders.Select((o, index) => new
        {
            id = o.Id,
            sequence = index + 1,
            order_id = o.Id,
            order_number = o.OrderNumber,
            qr_code = o.QrCode,
            status = o.Status,
            recipient = o.Recipient,
            address = o.DeliveryAddress,
            driver_id = o.DriverId,
            driver_name = o.DriverName
        });
        
        return Ok(new { stops = stops, count = stops.Count() });
    }
}

public class CreatePlanDto
{
    public string? Title { get; set; }
    public string? Date { get; set; }
    public List<string>? DriverIds { get; set; }
}

public class BatchImportDto
{
    public List<string> OrderIds { get; set; } = new();
}

public class UpdatePlanDto
{
    public string? Title { get; set; }
    public string? Date { get; set; }
    public List<string>? DriverIds { get; set; }
}

public class AssignDriverDto
{
    public string DriverId { get; set; } = string.Empty;
}

public class AutoAssignDto
{
    public string? Status { get; set; }
}

public static class MongoDbServiceExtensions
{
    public static IMongoDatabase GetDatabase(this MongoDbService db)
    {
        return db.Users.Database;
    }
}
