using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/pharmacies")]
public class PharmaciesController : ControllerBase
{
    private readonly IRepository<Pharmacy> _pharmacies;

    public PharmaciesController(IRepository<Pharmacy> pharmacies) => _pharmacies = pharmacies;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var pharmacies = await _pharmacies.Query().Where(p => p.IsActive).ToListAsync();
        return Ok(new { pharmacies, count = pharmacies.Count });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await _pharmacies.GetByIdAsync(id);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpGet("my")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> My()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value;
        var pharmacy = await _pharmacies.Query().FirstOrDefaultAsync(p => p.UserId == userId);
        return pharmacy == null ? NotFound(new { detail = "Pharmacy not found" }) : Ok(pharmacy);
    }

    [HttpPost("register")]
    [Authorize]
    public async Task<IActionResult> Register([FromBody] CreatePharmacyDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value ?? "";
        var pharmacy = new Pharmacy
        {
            UserId = userId, Name = dto.Name, LicenseNumber = dto.LicenseNumber,
            NpiNumber = dto.NpiNumber, Phone = dto.Phone, Email = dto.Email,
            Street = dto.Street, City = dto.City, State = dto.State,
            PostalCode = dto.PostalCode, Latitude = dto.Latitude, Longitude = dto.Longitude
        };
        await _pharmacies.AddAsync(pharmacy);
        return Ok(new { message = "Pharmacy registered", pharmacy_id = pharmacy.Id });
    }
}
