using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/zones")]
public class ZonesController : ControllerBase
{
    private readonly IRepository<ServiceZone> _zones;
    public ZonesController(IRepository<ServiceZone> zones) => _zones = zones;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var zones = await _zones.GetAllAsync();
        return Ok(new { zones, count = zones.Count() });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var z = await _zones.GetByIdAsync(id);
        return z == null ? NotFound() : Ok(z);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] ZoneDto dto)
    {
        var zone = new ServiceZone { Name = dto.Name, Code = dto.Code, ZipCodes = dto.ZipCodes ?? "", DeliveryFee = dto.DeliveryFee, PrioritySurcharge = dto.PrioritySurcharge, SameDayCutoff = dto.SameDayCutoff ?? "14:00" };
        await _zones.AddAsync(zone);
        return Ok(new { message = "Zone created", zoneId = zone.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(int id, [FromBody] ZoneDto dto)
    {
        var z = await _zones.GetByIdAsync(id);
        if (z == null) return NotFound();
        z.Name = dto.Name; z.Code = dto.Code; z.ZipCodes = dto.ZipCodes ?? z.ZipCodes;
        z.DeliveryFee = dto.DeliveryFee; z.PrioritySurcharge = dto.PrioritySurcharge;
        await _zones.UpdateAsync(z);
        return Ok(new { message = "Zone updated" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var z = await _zones.GetByIdAsync(id);
        if (z == null) return NotFound();
        await _zones.DeleteAsync(z);
        return Ok(new { message = "Zone deleted" });
    }

    [HttpGet("check/{zipCode}")]
    public async Task<IActionResult> CheckZip(string zipCode)
    {
        var zone = await _zones.Query().FirstOrDefaultAsync(z => z.IsActive && z.ZipCodes.Contains(zipCode));
        if (zone == null) return Ok(new { covered = false, message = "Zip code not in service area" });
        return Ok(new { covered = true, zone = new { zone.Id, zone.Name, zone.Code, zone.DeliveryFee } });
    }
}

public class ZoneDto
{
    public string Name { get; set; } = ""; public string Code { get; set; } = "";
    public string? ZipCodes { get; set; } public double DeliveryFee { get; set; } = 5.99;
    public double PrioritySurcharge { get; set; } = 5.0; public string? SameDayCutoff { get; set; }
}
