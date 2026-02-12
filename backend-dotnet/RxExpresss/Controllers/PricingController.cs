using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/pricing")]
public class PricingController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<PricingController> _logger;
    
    public PricingController(MongoDbService db, ILogger<PricingController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpGet]
    public async Task<ActionResult> GetAllPricing([FromQuery] bool active_only = false)
    {
        var filter = active_only 
            ? Builders<DeliveryPricing>.Filter.Eq(p => p.IsActive, true) 
            : Builders<DeliveryPricing>.Filter.Empty;
        
        var pricing = await _db.Pricing.Find(filter).ToListAsync();
        
        var result = pricing.Select(p => new
        {
            p.Id,
            delivery_type = p.DeliveryType,
            p.Name,
            p.Description,
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
    
    [HttpGet("{pricingId}")]
    public async Task<ActionResult> GetPricing(string pricingId)
    {
        var pricing = await _db.Pricing.Find(p => p.Id == pricingId).FirstOrDefaultAsync();
        if (pricing == null)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        return Ok(new
        {
            pricing.Id,
            delivery_type = pricing.DeliveryType,
            pricing.Name,
            pricing.Description,
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
    
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> CreatePricing([FromBody] DeliveryPricingCreateDto dto)
    {
        var role = User.FindFirst("role")?.Value;
        if (role != "admin")
        {
            return StatusCode(403, new { detail = "Only admins can create pricing" });
        }
        
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
    
    [HttpPut("{pricingId}")]
    [Authorize]
    public async Task<ActionResult> UpdatePricing(string pricingId, [FromBody] DeliveryPricingUpdateDto dto)
    {
        var role = User.FindFirst("role")?.Value;
        if (role != "admin")
        {
            return StatusCode(403, new { detail = "Only admins can update pricing" });
        }
        
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
    
    [HttpDelete("{pricingId}")]
    [Authorize]
    public async Task<ActionResult> DeletePricing(string pricingId)
    {
        var role = User.FindFirst("role")?.Value;
        if (role != "admin")
        {
            return StatusCode(403, new { detail = "Only admins can delete pricing" });
        }
        
        var result = await _db.Pricing.DeleteOneAsync(p => p.Id == pricingId);
        if (result.DeletedCount == 0)
        {
            return NotFound(new { detail = "Pricing not found" });
        }
        
        return Ok(new { message = "Pricing deleted successfully" });
    }
}
