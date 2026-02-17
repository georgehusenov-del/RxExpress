using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private readonly UserManager<ApplicationUser> _userManager;

    public RoutesController(IRepository<RoutePlan> plans, IRepository<RoutePlanOrder> planOrders,
        IRepository<RoutePlanDriver> planDrivers, IRepository<Order> orders,
        IRepository<DriverProfile> drivers, UserManager<ApplicationUser> userManager)
    {
        _plans = plans; _planOrders = planOrders; _planDrivers = planDrivers;
        _orders = orders; _drivers = drivers; _userManager = userManager;
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
            result.Add(new { p.Id, p.Title, p.Date, p.Status, p.OptimizationStatus, p.Distributed, p.CreatedAt, orderCount, driverCount = driverIds.Count });
        }
        return Ok(new { plans = result, count = result.Count });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePlanDto dto)
    {
        var plan = new RoutePlan { Title = dto.Title ?? $"Route Plan - {dto.Date}", Date = dto.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd") };
        await _plans.AddAsync(plan);
        if (dto.DriverIds != null)
            foreach (var did in dto.DriverIds)
                await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = plan.Id, DriverId = did });
        return Ok(new { message = "Plan created", planId = plan.Id });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        var orders = await _orders.Query().Where(o => orderIds.Contains(o.Id))
            .Select(o => new { o.Id, o.OrderNumber, o.QrCode, o.RecipientName, o.Street, o.City, o.Status, o.DriverName }).ToListAsync();
        var driverIds = await _planDrivers.Query().Where(d => d.RoutePlanId == id).Select(d => d.DriverId).ToListAsync();
        var drivers = new List<object>();
        foreach (var did in driverIds)
        {
            var d = await _drivers.GetByIdAsync(did);
            if (d != null) { var u = await _userManager.FindByIdAsync(d.UserId); drivers.Add(new { d.Id, name = u != null ? $"{u.FirstName} {u.LastName}" : "Unknown", d.Status }); }
        }
        return Ok(new { plan = new { plan.Id, plan.Title, plan.Date, plan.Status, plan.OptimizationStatus, plan.Distributed }, orders, drivers, stats = new { total = orders.Count, delivered = orders.Count(o => o.Status == "delivered") } });
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
            added++;
        }
        return Ok(new { message = $"Added {added} orders", added });
    }

    [HttpPost("{id}/assign-driver")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] DriverIdDto dto)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        var driver = await _drivers.GetByIdAsync(dto.DriverId);
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        var exists = await _planDrivers.Query().AnyAsync(d => d.RoutePlanId == id && d.DriverId == dto.DriverId);
        if (!exists) await _planDrivers.AddAsync(new RoutePlanDriver { RoutePlanId = id, DriverId = dto.DriverId });
        // Assign all orders in plan to this driver
        var user = await _userManager.FindByIdAsync(driver.UserId);
        var driverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        var orderIds = await _planOrders.Query().Where(o => o.RoutePlanId == id).Select(o => o.OrderId).ToListAsync();
        foreach (var oid in orderIds)
        {
            var order = await _orders.GetByIdAsync(oid);
            if (order != null) { order.DriverId = dto.DriverId; order.DriverName = driverName; order.Status = "assigned"; await _orders.UpdateAsync(order); }
        }
        return Ok(new { message = $"Driver {driverName} assigned", driverName });
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
        return Ok(new { message = "Plan updated" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await _plans.GetByIdAsync(id);
        if (plan == null) return NotFound();
        await _plans.DeleteAsync(plan);
        return Ok(new { message = "Plan deleted" });
    }

    [HttpDelete("{id}/orders/{orderId}")]
    public async Task<IActionResult> RemoveOrder(int id, int orderId)
    {
        var po = await _planOrders.Query().FirstOrDefaultAsync(o => o.RoutePlanId == id && o.OrderId == orderId);
        if (po == null) return NotFound();
        await _planOrders.DeleteAsync(po);
        return Ok(new { message = "Order removed from plan" });
    }

    [HttpGet("pending-orders")]
    public async Task<IActionResult> PendingOrders()
    {
        var orders = await _orders.Query().Where(o => o.Status == "new")
            .Select(o => new { o.Id, o.OrderNumber, o.QrCode, o.RecipientName, o.City, o.DeliveryType, o.CreatedAt }).ToListAsync();
        return Ok(new { orders, count = orders.Count });
    }
}

public class CreatePlanDto { public string? Title { get; set; } public string? Date { get; set; } public List<int>? DriverIds { get; set; } }
public class OrderIdsDto { public List<int> OrderIds { get; set; } = new(); }
public class DriverIdDto { public int DriverId { get; set; } }
