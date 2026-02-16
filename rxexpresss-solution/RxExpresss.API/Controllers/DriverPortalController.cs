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

    public DriverPortalController(IRepository<DriverProfile> drivers, IRepository<Order> orders)
    {
        _drivers = drivers; _orders = orders;
    }

    private async Task<DriverProfile?> GetMyDriver()
    {
        var userId = User.FindFirst("sub")?.Value;
        return await _drivers.Query().FirstOrDefaultAsync(d => d.UserId == userId);
    }

    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver profile not found" });
        return Ok(driver);
    }

    [HttpGet("deliveries")]
    public async Task<IActionResult> Deliveries()
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound(new { detail = "Driver profile not found" });
        var orders = await _orders.Query()
            .Where(o => o.DriverId == driver.Id && (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "in_transit" || o.Status == "out_for_delivery"))
            .OrderBy(o => o.CreatedAt).ToListAsync();
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
        if (status == "picked_up") order.ActualPickupTime = DateTime.UtcNow;
        if (status == "delivered") order.ActualDeliveryTime = DateTime.UtcNow;
        await _orders.UpdateAsync(order);
        return Ok(new { message = $"Status updated to {status}" });
    }

    [HttpPost("deliveries/{id}/pod")]
    public async Task<IActionResult> SubmitPod(int id, [FromBody] SubmitPodDto dto)
    {
        var driver = await GetMyDriver();
        if (driver == null) return NotFound();
        var order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == id && o.DriverId == driver.Id);
        if (order == null) return NotFound();
        order.Status = "delivered";
        order.ActualDeliveryTime = DateTime.UtcNow;
        order.RecipientNameSigned = dto.RecipientName;
        order.UpdatedAt = DateTime.UtcNow;
        driver.TotalDeliveries++;
        await _orders.UpdateAsync(order);
        await _drivers.UpdateAsync(driver);
        return Ok(new { success = true, message = "POD submitted" });
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
}
