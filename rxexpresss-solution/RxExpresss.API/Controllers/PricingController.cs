using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/pricing")]
public class PricingController : ControllerBase
{
    private readonly IRepository<DeliveryPricing> _pricing;
    public PricingController(IRepository<DeliveryPricing> pricing) => _pricing = pricing;

    [HttpGet]
    public async Task<IActionResult> List() => Ok(new { pricing = await _pricing.GetAllAsync() });

    [HttpGet("active")]
    public async Task<IActionResult> Active()
    {
        var list = await _pricing.Query().Where(p => p.IsActive).ToListAsync();
        return Ok(new { pricing = list, count = list.Count });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await _pricing.GetByIdAsync(id);
        return p == null ? NotFound() : Ok(p);
    }
}
