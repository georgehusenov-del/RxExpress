using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/pharmacies")]
public class PharmaciesController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly ILogger<PharmaciesController> _logger;
    
    public PharmaciesController(MongoDbService db, ILogger<PharmaciesController> logger)
    {
        _db = db;
        _logger = logger;
    }
    
    [HttpPost("register")]
    [Authorize]
    public async Task<ActionResult> RegisterPharmacy([FromBody] PharmacyCreateDto dto)
    {
        var role = User.FindFirst("role")?.Value;
        var userId = User.FindFirst("sub")?.Value;
        
        if (role != "pharmacy" && role != "admin")
        {
            return StatusCode(403, new { detail = "Only pharmacy accounts can register pharmacies" });
        }
        
        var pharmacy = new Pharmacy
        {
            Name = dto.Name,
            LicenseNumber = dto.LicenseNumber,
            NpiNumber = dto.NpiNumber,
            Phone = dto.Phone,
            Email = dto.Email,
            Website = dto.Website,
            UserId = userId ?? "",
            OperatingHours = dto.OperatingHours,
            Address = new Address
            {
                Street = dto.Address.Street,
                AptUnit = dto.Address.AptUnit,
                City = dto.Address.City,
                State = dto.Address.State,
                PostalCode = dto.Address.PostalCode,
                Country = dto.Address.Country,
                Latitude = dto.Address.Latitude,
                Longitude = dto.Address.Longitude,
                DeliveryInstructions = dto.Address.DeliveryInstructions
            },
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        
        await _db.Pharmacies.InsertOneAsync(pharmacy);
        
        return Ok(new { message = "Pharmacy registered successfully", pharmacy_id = pharmacy.Id });
    }
    
    [HttpGet]
    public async Task<ActionResult> ListPharmacies([FromQuery] int skip = 0, [FromQuery] int limit = 20)
    {
        var pharmacies = await _db.Pharmacies
            .Find(p => p.IsActive)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
        
        // Remove MongoId from response
        var result = pharmacies.Select(p => new
        {
            p.Id,
            p.Name,
            p.LicenseNumber,
            p.NpiNumber,
            p.Phone,
            p.Email,
            p.Website,
            p.Address,
            p.Locations,
            p.ServiceZones,
            p.IsActive,
            p.IsVerified,
            p.Rating,
            p.TotalDeliveries,
            p.CreatedAt,
            p.OperatingHours
        });
        
        return Ok(new { pharmacies = result, count = result.Count() });
    }
    
    [HttpGet("{pharmacyId}")]
    public async Task<ActionResult> GetPharmacy(string pharmacyId)
    {
        var pharmacy = await _db.Pharmacies.Find(p => p.Id == pharmacyId).FirstOrDefaultAsync();
        if (pharmacy == null)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        return Ok(new
        {
            pharmacy.Id,
            pharmacy.Name,
            pharmacy.LicenseNumber,
            pharmacy.NpiNumber,
            pharmacy.Phone,
            pharmacy.Email,
            pharmacy.Website,
            pharmacy.Address,
            pharmacy.Locations,
            pharmacy.ServiceZones,
            pharmacy.IsActive,
            pharmacy.IsVerified,
            pharmacy.Rating,
            pharmacy.TotalDeliveries,
            pharmacy.CreatedAt,
            pharmacy.OperatingHours
        });
    }
    
    [HttpGet("{pharmacyId}/locations")]
    [Authorize]
    public async Task<ActionResult> GetPharmacyLocations(string pharmacyId)
    {
        var pharmacy = await _db.Pharmacies.Find(p => p.Id == pharmacyId).FirstOrDefaultAsync();
        if (pharmacy == null)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        return Ok(new { locations = pharmacy.Locations, count = pharmacy.Locations.Count });
    }
    
    [HttpPost("{pharmacyId}/locations")]
    [Authorize]
    public async Task<ActionResult> AddPharmacyLocation(string pharmacyId, [FromBody] PharmacyLocationCreateDto dto)
    {
        var userId = User.FindFirst("sub")?.Value;
        var role = User.FindFirst("role")?.Value;
        
        var pharmacy = await _db.Pharmacies.Find(p => p.Id == pharmacyId).FirstOrDefaultAsync();
        if (pharmacy == null)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        if (pharmacy.UserId != userId && role != "admin")
        {
            return StatusCode(403, new { detail = "Not authorized to modify this pharmacy" });
        }
        
        var location = new PharmacyLocation
        {
            Name = dto.Name,
            Phone = dto.Phone,
            IsPrimary = dto.IsPrimary,
            OperatingHours = dto.OperatingHours,
            PickupInstructions = dto.PickupInstructions,
            Address = new Address
            {
                Street = dto.Address.Street,
                AptUnit = dto.Address.AptUnit,
                City = dto.Address.City,
                State = dto.Address.State,
                PostalCode = dto.Address.PostalCode,
                Country = dto.Address.Country,
                Latitude = dto.Address.Latitude,
                Longitude = dto.Address.Longitude,
                DeliveryInstructions = dto.Address.DeliveryInstructions
            }
        };
        
        // If this is primary, unset other primaries
        if (dto.IsPrimary)
        {
            foreach (var loc in pharmacy.Locations)
            {
                loc.IsPrimary = false;
            }
        }
        
        var update = Builders<Pharmacy>.Update.Push(p => p.Locations, location);
        await _db.Pharmacies.UpdateOneAsync(p => p.Id == pharmacyId, update);
        
        return Ok(new
        {
            message = "Location added successfully",
            location_id = location.Id,
            location = new
            {
                location.Id,
                location.Name,
                location.Phone,
                location.IsPrimary,
                location.IsActive,
                location.Address,
                location.OperatingHours,
                location.PickupInstructions
            }
        });
    }
    
    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult> GetMyPharmacy()
    {
        var userId = User.FindFirst("sub")?.Value;
        
        var pharmacy = await _db.Pharmacies.Find(p => p.UserId == userId).FirstOrDefaultAsync();
        if (pharmacy == null)
        {
            return NotFound(new { detail = "Pharmacy not found" });
        }
        
        return Ok(new
        {
            pharmacy.Id,
            pharmacy.Name,
            pharmacy.LicenseNumber,
            pharmacy.NpiNumber,
            pharmacy.Phone,
            pharmacy.Email,
            pharmacy.Website,
            pharmacy.Address,
            pharmacy.Locations,
            pharmacy.ServiceZones,
            pharmacy.IsActive,
            pharmacy.IsVerified,
            pharmacy.Rating,
            pharmacy.TotalDeliveries,
            pharmacy.CreatedAt,
            pharmacy.OperatingHours
        });
    }
}
