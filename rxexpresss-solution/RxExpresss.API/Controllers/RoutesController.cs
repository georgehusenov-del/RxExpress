using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.API.Services;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/routes")]
[Authorize(Roles = AppRoles.Admin)]
public class RoutesController : ControllerBase
{
    private readonly IRepository<RoutePlan> _plans;
    private readonly IRepository<RoutePlanOrder> _planOrders;
    private readonly IRepository<RoutePlanDriver> _planDrivers;
    private readonly IRepository<Order> _orders;
    private readonly IRepository<DriverProfile> _drivers;
    private readonly IRepository<ServiceZone> _zones;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly CircuitService _circuitService;
    private readonly ILogger<RoutesController> _logger;

    public RoutesController(
        IRepository<RoutePlan> plans, 
        IRepository<RoutePlanOrder> planOrders,
        IRepository<RoutePlanDriver> planDrivers, 
        IRepository<Order> orders,
        IRepository<DriverProfile> drivers, 
        IRepository<ServiceZone> zones,
        UserManager<ApplicationUser> userManager,
        CircuitService circuitService,
        ILogger<RoutesController> logger)
    {
        _plans = plans; 
        _planOrders = planOrders; 
        _planDrivers = planDrivers;
        _orders = orders; 
        _drivers = drivers; 
        _zones = zones;
        _userManager = userManager;
        _circuitService = circuitService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var plans = await _plans.Query().OrderByDescending(p => p.CreatedAt).ToListAsync();
        var result = new List<object>();
        foreach (var p in plans)
        {
            var orderCount = await _planOrders.Query().CountAsync(o => o.RoutePlanId == p.Id);
            var driverIds = await _planDrivers.Query().Where(d => d.RoutePlanId == p.Id).Select(d => d.DriverId).ToListAsync();
            result.Add(new { 
                p.Id, p.Title, p.Date, p.Status, p.OptimizationStatus, p.Distributed, 
                p.ServiceZoneId, p.IsAutoCreated, p.CreatedAt, 
                orderCount, driverCount = driverIds.Count 
            });
        }
        return Ok(new { plans = result, count = result.Count });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePlanDto dto)
    {
        var plan = new RoutePlan 
        { 
            Title = dto.Title ?? $"Route Plan - {dto.Date}", 
            Date = dto.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            ServiceZoneId = dto.ServiceZoneId,
            IsAutoCreated = false
        };
        await _plans.AddAsync(plan);
        
        if (dto.DriverIds != null)
        {
            foreach (var did in dto.DriverIds)
                await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = plan.Id, DriverId = did });
        }
        
        return Ok(new { message = "Gig created", planId = plan.Id });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var orders = await _orders.Query().Where(o => orderIds.Contains(o.Id))
            .Select(o => new { o.Id, o.OrderNumber, o.QrCode, o.RecipientName, o.Street, o.City, o.Status, o.DriverName, o.PharmacyName }).ToListAsync();
        
        var driverIds = await _planDrivers.Query().Where(d => d.RoutePlanId == id).Select(d => d.DriverId).ToListAsync();
        var drivers = new List<object>();
        foreach (var did in driverIds)
        {
            var d = await _drivers.GetByIdAsync(did);
            if (d != null) 
            { 
                var u = await _userManager.FindByIdAsync(d.UserId); 
                drivers.Add(new { d.Id, name = u != null ? $"{u.FirstName} {u.LastName}" : "Unknown", d.Status }); 
            }
        }
        
        return Ok(new { 
            plan = new { plan.Id, plan.Title, plan.Date, plan.Status, plan.OptimizationStatus, plan.Distributed, plan.ServiceZoneId, plan.IsAutoCreated }, 
            orders, 
            drivers, 
            stats = new { total = orders.Count, delivered = orders.Count(o => o.Status == "delivered"), assigned = orders.Count(o => o.Status == "assigned") } 
        });
    }

    [HttpPost("{id}/add-orders")]
    public async Task<IActionResult> AddOrders(int id, [FromBody] OrderIdsDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        var existing = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var added = 0;
        
        foreach (var oid in dto.OrderIds.Where(o => !existing.Contains(o)))
        {
            await _planOrders.AddAsync(new RoutePlanOrder { RoutePlanId = id, OrderId = oid });
            
            // Update order's RoutePlanId
            var order = await _orders.GetByIdAsync(oid);
            if (order != null)
            {
                order.RoutePlanId = id;
                order.UpdatedAt = DateTime.UtcNow;
                await _orders.UpdateAsync(order);
            }
            added++;
        }
        
        return Ok(new { message = $"Added {added} orders to gig", added });
    }

    [HttpPost("{id}/assign-driver")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] DriverIdDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        var driver = await _drivers.GetByIdAsync(dto.DriverId);
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        
        // Add driver to plan if not exists
        var exists = await _planDrivers.Query().AnyAsync(d => d.RoutePlanId == id && d.DriverId == dto.DriverId);
        if (!exists) 
            await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = id, DriverId = dto.DriverId });
        
        // Get driver name
        var user = await _userManager.FindByIdAsync(driver.UserId);
        var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Assign all orders in plan to this driver and update their status
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var assignedCount = 0;
        
        foreach (var oid in orderIds)
        {
            var order = await _orders.GetByIdAsync(oid);
            if (order != null) 
            { 
                order.DriverId = dto.DriverId; 
                order.DriverName = driverName; 
                order.Status = "assigned";
                order.RoutePlanId = id;
                order.UpdatedAt = DateTime.UtcNow;
                await _orders.UpdateAsync(order);
                assignedCount++;
            }
        }
        
        // Update plan status to assigned
        plan.Status = "assigned";
        plan.UpdatedAt = DateTime.UtcNow;
        await _plans.UpdateAsync(plan);
        
        return Ok(new { message = $"Driver {driverName} assigned to {assignedCount} orders", driverName, assignedCount });
    }

    [HttpPost("{id}/unassign-driver")]
    public async Task<IActionResult> UnassignDriver(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        // Remove all drivers from plan
        var planDrivers = await _planDrivers.Query().Where(d => d.RoutePlanId == id).ToListAsync();
        foreach (var pd in planDrivers)
        {
            await _planDrivers.DeleteAsync(pd);
        }
        
        // Reset all orders in plan
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var resetCount = 0;
        
        foreach (var oid in orderIds)
        {
            var order = await _orders.GetByIdAsync(oid);
            if (order != null && order.Status == "assigned") 
            { 
                order.DriverId = null;
                order.DriverName = null;
                order.Status = "new";
                order.UpdatedAt = DateTime.UtcNow;
                await _orders.UpdateAsync(order);
                resetCount++;
            }
        }
        
        // Update plan status to draft
        plan.Status = "draft";
        plan.UpdatedAt = DateTime.UtcNow;
        await _plans.UpdateAsync(plan);
        
        return Ok(new { message = $"Driver unassigned from {resetCount} orders", resetCount });
    }

    /// <summary>
    /// Unassign driver from a single specific order (Druglift flow)
    /// The order remains in the gig but becomes unassigned
    /// </summary>
    [HttpPost("{id}/orders/{orderId}/unassign")]
    public async Task<IActionResult> UnassignOrderDriver(int id, int orderId)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound(new { detail = "Gig not found" });
        
        // Verify order belongs to this gig
        var planOrder = await _planOrders.Query()
            .FirstOrDefaultAsync(po => po.RoutePlanId == id && po.OrderId == orderId);
        if (planOrder == null) 
            return NotFound(new { detail = "Order not found in this gig" });
        
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null) 
            return NotFound(new { detail = "Order not found" });
        
        // Only unassign if order is in "assigned" status (not picked up or delivering)
        if (order.Status != "assigned")
        {
            return BadRequest(new { 
                detail = $"Cannot unassign order with status '{order.Status}'. Only 'assigned' orders can be unassigned." 
            });
        }
        
        var previousDriver = order.DriverName;
        
        // Unassign the driver from this order only
        order.DriverId = null;
        order.DriverName = null;
        order.Status = "new";
        order.UpdatedAt = DateTime.UtcNow;
        await _orders.UpdateAsync(order);
        
        // Check if there are any remaining orders assigned to this driver in the gig
        // If not, remove the driver from the gig's driver list
        if (!string.IsNullOrEmpty(previousDriver))
        {
            var driverStillHasOrders = await _planOrders.Query()
                .Where(po => po.RoutePlanId == id)
                .Join(_orders.Query(), po => po.OrderId, o => o.Id, (po, o) => o)
                .AnyAsync(o => o.DriverName == previousDriver);
            
            if (!driverStillHasOrders)
            {
                // Find and remove driver from plan drivers
                var driverToRemove = await _planDrivers.Query()
                    .Where(pd => pd.RoutePlanId == id)
                    .FirstOrDefaultAsync();
                    
                // Only remove if this driver has no other orders in the gig
                // We need to find the actual driver by name - this is a simplified check
            }
        }
        
        // Update gig status if needed
        var allOrdersUnassigned = !await _planOrders.Query()
            .Where(po => po.RoutePlanId == id)
            .Join(_orders.Query(), po => po.OrderId, o => o.Id, (po, o) => o)
            .AnyAsync(o => o.DriverId != null);
        
        if (allOrdersUnassigned)
        {
            plan.Status = "draft";
            plan.UpdatedAt = DateTime.UtcNow;
            await _plans.UpdateAsync(plan);
        }
        
        return Ok(new { 
            message = $"Driver unassigned from order {order.OrderNumber}", 
            orderNumber = order.OrderNumber,
            previousDriver
        });
    }

    [HttpPost("{id}/assign-orders-to-driver")]
    public async Task<IActionResult> AssignOrdersToDriver(int id, [FromBody] AssignOrdersToDriverDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        var driver = await _drivers.GetByIdAsync(dto.DriverId);
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        
        // Get driver name
        var user = await _userManager.FindByIdAsync(driver.UserId);
        var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Add driver to plan if not exists
        var exists = await _planDrivers.Query().AnyAsync(d => d.RoutePlanId == id && d.DriverId == dto.DriverId);
        if (!exists) 
            await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = id, DriverId = dto.DriverId });
        
        // Assign selected orders to this driver
        var assignedCount = 0;
        foreach (var oid in dto.OrderIds)
        {
            var order = await _orders.GetByIdAsync(oid);
            if (order != null && order.RoutePlanId == id)
            {
                order.DriverId = dto.DriverId;
                order.DriverName = driverName;
                order.Status = "assigned";
                order.UpdatedAt = DateTime.UtcNow;
                await _orders.UpdateAsync(order);
                assignedCount++;
            }
        }
        
        // Check if all orders are assigned
        var unassignedOrders = await _planOrders.Query()
            .Where(po => po.RoutePlanId == id)
            .Join(_orders.Query(), po => po.OrderId, o => o.Id, (po, o) => o)
            .Where(o => o.DriverId == null)
            .CountAsync();
        
        if (unassignedOrders == 0)
        {
            plan.Status = "assigned";
            plan.UpdatedAt = DateTime.UtcNow;
            await _plans.UpdateAsync(plan);
        }
        
        return Ok(new { message = $"{assignedCount} orders assigned to {driverName}", driverName, assignedCount });
    }

    [HttpPost("{id}/optimize")]
    public async Task<IActionResult> OptimizeRoute(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        // Get all orders in this plan
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var orders = await _orders.Query().Where(o => orderIds.Contains(o.Id)).ToListAsync();
        
        if (!orders.Any())
            return BadRequest(new { detail = "No orders in this gig to optimize" });
        
        // Update status to optimizing
        plan.OptimizationStatus = "optimizing";
        await _plans.UpdateAsync(plan);
        
        if (_circuitService.IsConfigured)
        {
            try
            {
                // Create plan in Circuit if not exists
                if (string.IsNullOrEmpty(plan.CircuitPlanId))
                {
                    var driverIds = await _planDrivers.Query()
                        .Where(d => d.RoutePlanId == id)
                        .Select(d => d.DriverId)
                        .ToListAsync();
                    
                    var circuitDriverIds = new List<string>();
                    foreach (var did in driverIds)
                    {
                        var driver = await _drivers.GetByIdAsync(did);
                        if (driver?.CircuitDriverId != null)
                            circuitDriverIds.Add(driver.CircuitDriverId);
                    }
                    
                    var planResult = await _circuitService.CreatePlanAsync(plan.Title, plan.Date, circuitDriverIds);
                    if (planResult?.Success == true && planResult.PlanId != null)
                    {
                        plan.CircuitPlanId = planResult.PlanId;
                        await _plans.UpdateAsync(plan);
                    }
                }
                
                // Add stops to Circuit plan
                if (!string.IsNullOrEmpty(plan.CircuitPlanId))
                {
                    var stops = orders.Select(o => new CircuitStop
                    {
                        OrderId = o.Id,
                        Street = o.Street,
                        AptUnit = o.AptUnit,
                        City = o.City,
                        State = o.State,
                        PostalCode = o.PostalCode,
                        RecipientName = o.RecipientName,
                        RecipientPhone = o.RecipientPhone,
                        Notes = o.DeliveryNotes
                    }).ToList();
                    
                    await _circuitService.AddStopsAsync(plan.CircuitPlanId, stops);
                    
                    // Optimize the plan
                    var optimized = await _circuitService.OptimizePlanAsync(plan.CircuitPlanId);
                    plan.OptimizationStatus = optimized ? "optimized" : "failed";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Circuit optimization failed for plan {PlanId}", id);
                plan.OptimizationStatus = "failed";
            }
        }
        else
        {
            // Mock optimization - just mark as optimized
            plan.OptimizationStatus = "optimized";
        }
        
        plan.UpdatedAt = DateTime.UtcNow;
        await _plans.UpdateAsync(plan);
        
        return Ok(new { 
            message = plan.OptimizationStatus == "optimized" ? "Route optimized successfully" : "Optimization failed", 
            status = plan.OptimizationStatus,
            circuitConfigured = _circuitService.IsConfigured
        });
    }

    [HttpPost("{id}/split")]
    public async Task<IActionResult> SplitGig(int id, [FromBody] SplitGigDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        if (dto.OrderIds == null || !dto.OrderIds.Any())
            return BadRequest(new { detail = "Select orders to move to new gig" });
        
        // Create new gig
        var newPlan = new RoutePlan
        {
            Title = dto.NewTitle ?? $"{plan.Title} (Split)",
            Date = plan.Date,
            ServiceZoneId = plan.ServiceZoneId,
            IsAutoCreated = false
        };
        await _plans.AddAsync(newPlan);
        
        // Move selected orders to new gig - keep their current status and driver
        var movedCount = 0;
        foreach (var oid in dto.OrderIds)
        {
            // Remove from old plan
            var po = await _planOrders.Query().FirstOrDefaultAsync(o => o.RoutePlanId == id && o.OrderId == oid);
            if (po != null)
            {
                await _planOrders.DeleteAsync(po);
                
                // Add to new plan
                await _planOrders.AddAsync(new RoutePlanOrder { RoutePlanId = newPlan.Id, OrderId = oid });
                
                // Update order's RoutePlanId but keep status and driver
                var order = await _orders.GetByIdAsync(oid);
                if (order != null)
                {
                    order.RoutePlanId = newPlan.Id;
                    order.UpdatedAt = DateTime.UtcNow;
                    await _orders.UpdateAsync(order);
                    
                    // If order has a driver, add driver to new plan
                    if (order.DriverId.HasValue)
                    {
                        var driverExists = await _planDrivers.Query()
                            .AnyAsync(pd => pd.RoutePlanId == newPlan.Id && pd.DriverId == order.DriverId.Value);
                        if (!driverExists)
                        {
                            await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = newPlan.Id, DriverId = order.DriverId.Value });
                        }
                    }
                }
                movedCount++;
            }
        }
        
        // Update new plan status based on orders
        var hasAssignedOrders = await _planOrders.Query()
            .Where(po => po.RoutePlanId == newPlan.Id)
            .Join(_orders.Query(), po => po.OrderId, o => o.Id, (po, o) => o)
            .AnyAsync(o => o.DriverId != null);
        
        if (hasAssignedOrders)
        {
            newPlan.Status = "assigned";
            await _plans.UpdateAsync(newPlan);
        }
        
        return Ok(new { 
            message = $"Split gig created with {movedCount} orders", 
            newPlanId = newPlan.Id,
            newTitle = newPlan.Title,
            movedCount
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePlanDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        if (!string.IsNullOrEmpty(dto.Title)) plan.Title = dto.Title;
        if (!string.IsNullOrEmpty(dto.Date)) plan.Date = dto.Date;
        if (!string.IsNullOrEmpty(dto.Status)) plan.Status = dto.Status;
        if (!string.IsNullOrEmpty(dto.OptimizationStatus)) plan.OptimizationStatus = dto.OptimizationStatus;
        if (dto.Distributed.HasValue) plan.Distributed = dto.Distributed.Value;
        plan.UpdatedAt = DateTime.UtcNow;
        await _plans.UpdateAsync(plan);
        
        return Ok(new { message = "Gig updated" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        
        // Reset order statuses for orders in this plan
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        foreach (var oid in orderIds)
        {
            var order = await _orders.GetByIdAsync(oid);
            if (order != null)
            {
                order.RoutePlanId = null;
                order.Status = "new";
                order.DriverId = null;
                order.DriverName = null;
                order.UpdatedAt = DateTime.UtcNow;
                await _orders.UpdateAsync(order);
            }
        }
        
        await _plans.DeleteAsync(plan);
        return Ok(new { message = "Gig deleted" });
    }

    [HttpDelete("{id}/orders/{orderId}")]
    public async Task<IActionResult> RemoveOrder(int id, int orderId)
    {
        var po = await _planOrders.Query().FirstOrDefaultAsync(o => o.RoutePlanId == id && o.OrderId == orderId);
        if (po == null) return NotFound();
        
        await _planOrders.DeleteAsync(po);
        
        // Reset order status
        var order = await _orders.GetByIdAsync(orderId);
        if (order != null)
        {
            order.RoutePlanId = null;
            order.Status = "new";
            order.DriverId = null;
            order.DriverName = null;
            order.UpdatedAt = DateTime.UtcNow;
            await _orders.UpdateAsync(order);
        }
        
        return Ok(new { message = "Order removed from gig" });
    }

    [HttpGet("pending-orders")]
    public async Task<IActionResult> PendingOrders()
    {
        // Orders that are new and not assigned to any gig
        var orders = await _orders.Query()
            .Where(o => o.Status == "new" && o.RoutePlanId == null)
            .Select(o => new { o.Id, o.OrderNumber, o.QrCode, o.RecipientName, o.City, o.DeliveryType, o.PharmacyName, o.CreatedAt })
            .ToListAsync();
        return Ok(new { orders, count = orders.Count });
    }

    [HttpGet("service-zones")]
    public async Task<IActionResult> GetServiceZones()
    {
        var zones = await _zones.Query().Where(z => z.IsActive).ToListAsync();
        return Ok(new { zones, count = zones.Count });
    }

    [HttpPost("auto-create")]
    public async Task<IActionResult> AutoCreateGigs([FromBody] AutoCreateGigsDto dto)
    {
        var date = dto.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        var zones = await _zones.Query().Where(z => z.IsActive).ToListAsync();
        
        if (!zones.Any())
            return BadRequest(new { detail = "No service zones configured. Please add service zones first." });
        
        var createdGigs = new List<object>();
        
        foreach (var zone in zones)
        {
            // Check if gig already exists for this zone and date
            var existingGig = await _plans.Query()
                .FirstOrDefaultAsync(p => p.ServiceZoneId == zone.Id && p.Date == date);
            
            if (existingGig != null) continue;
            
            // Create new gig for this zone
            var plan = new RoutePlan
            {
                Title = $"{zone.Name} - {date}",
                Date = date,
                ServiceZoneId = zone.Id,
                IsAutoCreated = true
            };
            await _plans.AddAsync(plan);
            
            createdGigs.Add(new { plan.Id, plan.Title, zoneName = zone.Name });
        }
        
        return Ok(new { 
            message = $"Created {createdGigs.Count} gigs", 
            createdGigs,
            date
        });
    }
}

public class CreatePlanDto 
{ 
    public string? Title { get; set; } 
    public string? Date { get; set; } 
    public List<int>? DriverIds { get; set; }
    public int? ServiceZoneId { get; set; }
}
public class OrderIdsDto { public List<int> OrderIds { get; set; } = new(); }
public class DriverIdDto { public int DriverId { get; set; } }
public class AssignOrdersToDriverDto 
{ 
    public int DriverId { get; set; }
    public List<int> OrderIds { get; set; } = new();
}
public class SplitGigDto 
{ 
    public string? NewTitle { get; set; }
    public List<int>? OrderIds { get; set; }
}
public class AutoCreateGigsDto { public string? Date { get; set; } }
