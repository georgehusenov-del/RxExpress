using RxExpresss.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[BsonIgnoreExtraElements]
public class ZoneDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("zip_codes")]
    public List<string> ZipCodes { get; set; } = new();
    
    [BsonElement("cities")]
    public List<string> Cities { get; set; } = new();
    
    [BsonElement("states")]
    public List<string> States { get; set; } = new();
    
    [BsonElement("delivery_fee")]
    public double DeliveryFee { get; set; } = 5.99;
    
    [BsonElement("same_day_cutoff")]
    public string SameDayCutoff { get; set; } = "14:00";
    
    [BsonElement("priority_surcharge")]
    public double PrioritySurcharge { get; set; } = 5.00;
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

[ApiController]
[Route("api/zones")]
public class ZonesController : ControllerBase
{
    private readonly MongoDbService _db;
    
    private IMongoCollection<ZoneDocument> Zones => _db.ServiceZones.Database.GetCollection<ZoneDocument>("service_zones");
    
    public ZonesController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpGet]
    public async Task<ActionResult> ListZones()
    {
        var zones = await Zones.Find(_ => true).ToListAsync();
        var result = zones.Select(z => new
        {
            z.Id, z.Name, z.Code, z.IsActive, z.ZipCodes, z.Cities, z.States,
            z.DeliveryFee, z.SameDayCutoff, z.PrioritySurcharge, z.CreatedAt
        });
        return Ok(new { zones = result, count = result.Count() });
    }
    
    [HttpGet("{zoneId}")]
    public async Task<ActionResult> GetZone(string zoneId)
    {
        var zone = await Zones.Find(z => z.Id == zoneId).FirstOrDefaultAsync();
        if (zone == null) return NotFound(new { detail = "Zone not found" });
        return Ok(new
        {
            zone.Id, zone.Name, zone.Code, zone.IsActive, zone.ZipCodes, zone.Cities, zone.States,
            zone.DeliveryFee, zone.SameDayCutoff, zone.PrioritySurcharge, zone.CreatedAt
        });
    }
    
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> CreateZone([FromBody] ZoneCreateDto dto)
    {
        var zone = new ZoneDocument
        {
            Name = dto.Name, Code = dto.Code, ZipCodes = dto.ZipCodes ?? new(),
            Cities = dto.Cities ?? new(), States = dto.States ?? new(),
            DeliveryFee = dto.DeliveryFee, SameDayCutoff = dto.SameDayCutoff ?? "14:00",
            PrioritySurcharge = dto.PrioritySurcharge
        };
        await Zones.InsertOneAsync(zone);
        return Ok(new { message = "Zone created", zone_id = zone.Id });
    }
    
    [HttpPut("{zoneId}")]
    [Authorize]
    public async Task<ActionResult> UpdateZone(string zoneId, [FromBody] ZoneCreateDto dto)
    {
        var update = Builders<ZoneDocument>.Update
            .Set(z => z.Name, dto.Name).Set(z => z.Code, dto.Code)
            .Set(z => z.ZipCodes, dto.ZipCodes ?? new()).Set(z => z.Cities, dto.Cities ?? new())
            .Set(z => z.States, dto.States ?? new()).Set(z => z.DeliveryFee, dto.DeliveryFee)
            .Set(z => z.PrioritySurcharge, dto.PrioritySurcharge);
        var result = await Zones.UpdateOneAsync(z => z.Id == zoneId, update);
        if (result.MatchedCount == 0) return NotFound(new { detail = "Zone not found" });
        return Ok(new { message = "Zone updated" });
    }
    
    [HttpDelete("{zoneId}")]
    [Authorize]
    public async Task<ActionResult> DeleteZone(string zoneId)
    {
        var result = await Zones.DeleteOneAsync(z => z.Id == zoneId);
        if (result.DeletedCount == 0) return NotFound(new { detail = "Zone not found" });
        return Ok(new { message = "Zone deleted" });
    }
    
    [HttpGet("check/{zipCode}")]
    public async Task<ActionResult> CheckZipCode(string zipCode)
    {
        var zone = await Zones.Find(z => z.ZipCodes.Contains(zipCode) && z.IsActive).FirstOrDefaultAsync();
        if (zone == null)
            return Ok(new { covered = false, message = "This zip code is not in our service area" });
        return Ok(new
        {
            covered = true,
            zone = new { zone.Id, zone.Name, zone.Code, zone.DeliveryFee, zone.SameDayCutoff, zone.PrioritySurcharge }
        });
    }
}

public class ZoneCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public List<string>? ZipCodes { get; set; }
    public List<string>? Cities { get; set; }
    public List<string>? States { get; set; }
    public double DeliveryFee { get; set; } = 5.99;
    public string? SameDayCutoff { get; set; }
    public double PrioritySurcharge { get; set; } = 5.00;
}
