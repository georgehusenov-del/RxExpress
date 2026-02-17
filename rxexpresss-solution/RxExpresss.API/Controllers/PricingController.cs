using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/pricing")]
public class PricingController : ControllerBase
{
    private readonly IRepository<DeliveryPricing> _pricing;
    public PricingController(IRepository<DeliveryPricing> pricing) => _pricing = pricing;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var query = includeInactive ? _pricing.Query() : _pricing.Query().Where(p => p.IsActive);
        var list = await query.OrderBy(p => p.DeliveryType).ToListAsync();
        return Ok(new { pricing = list, count = list.Count });
    }

    [HttpGet("active")]
    public async Task<IActionResult> Active()
    {
        var list = await _pricing.Query().Where(p => p.IsActive).ToListAsync();
        var grouped = new
        {
            next_day = list.Where(p => p.DeliveryType == "next_day").ToList(),
            same_day = list.Where(p => p.DeliveryType == "same_day").ToList(),
            priority = list.Where(p => p.DeliveryType == "priority").ToList(),
            scheduled = list.Where(p => p.DeliveryType == "scheduled").ToList(),
            addons = list.Where(p => p.IsAddon).ToList()
        };
        return Ok(new { pricing = list, grouped, count = list.Count });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await _pricing.GetByIdAsync(id);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] PricingDto dto)
    {
        var p = new DeliveryPricing
        {
            DeliveryType = dto.DeliveryType, Name = dto.Name, Description = dto.Description,
            BasePrice = dto.BasePrice, IsActive = dto.IsActive, TimeWindowStart = dto.TimeWindowStart,
            TimeWindowEnd = dto.TimeWindowEnd, CutoffTime = dto.CutoffTime, IsAddon = dto.IsAddon
        };
        await _pricing.AddAsync(p);
        return Ok(new { message = "Pricing created", pricingId = p.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(int id, [FromBody] PricingDto dto)
    {
        var p = await _pricing.GetByIdAsync(id);
        if (p == null) return NotFound();
        p.Name = dto.Name; p.Description = dto.Description; p.BasePrice = dto.BasePrice;
        p.IsActive = dto.IsActive; p.TimeWindowStart = dto.TimeWindowStart;
        p.TimeWindowEnd = dto.TimeWindowEnd; p.CutoffTime = dto.CutoffTime;
        p.UpdatedAt = DateTime.UtcNow;
        await _pricing.UpdateAsync(p);
        return Ok(new { message = "Pricing updated" });
    }

    [HttpPut("{id}/toggle")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Toggle(int id)
    {
        var p = await _pricing.GetByIdAsync(id);
        if (p == null) return NotFound();
        p.IsActive = !p.IsActive; p.UpdatedAt = DateTime.UtcNow;
        await _pricing.UpdateAsync(p);
        return Ok(new { message = $"Pricing {(p.IsActive ? "enabled" : "disabled")}" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await _pricing.GetByIdAsync(id);
        if (p == null) return NotFound();
        await _pricing.DeleteAsync(p);
        return Ok(new { message = "Pricing deleted" });
    }
}

public class PricingDto
{
    public string DeliveryType { get; set; } = ""; public string Name { get; set; } = "";
    public string? Description { get; set; } public decimal BasePrice { get; set; }
    public bool IsActive { get; set; } = true; public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; } public string? CutoffTime { get; set; }
    public bool IsAddon { get; set; } = false;
}
