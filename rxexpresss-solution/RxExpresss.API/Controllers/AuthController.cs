using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;
using RxExpresss.Identity.Services;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtService _jwt;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<UserPermission> _permissions;

    public AuthController(UserManager<ApplicationUser> userManager, JwtService jwt, 
        IRepository<Pharmacy> pharmacies, IRepository<UserPermission> permissions)
    {
        _userManager = userManager;
        _jwt = jwt;
        _pharmacies = pharmacies;
        _permissions = permissions;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { detail = "Invalid credentials" });

        if (!user.IsActive)
            return Unauthorized(new { detail = "Account is deactivated" });

        var token = await _jwt.GenerateTokenAsync(user);
        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "";

        // Get permissions (Admin has all)
        List<string> perms;
        if (role == AppRoles.Admin)
        {
            perms = Permissions.All.Select(p => p.Key).ToList();
        }
        else
        {
            perms = _permissions.Query()
                .Where(p => p.UserId == user.Id)
                .Select(p => p.PermissionKey)
                .ToList();
        }

        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id, email = user.Email!, firstName = user.FirstName,
                lastName = user.LastName, phone = user.PhoneNumber ?? "",
                role, isActive = user.IsActive,
                permissions = perms
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            return BadRequest(new { detail = "Email already registered" });

        var user = new ApplicationUser
        {
            UserName = dto.Email, Email = dto.Email,
            FirstName = dto.FirstName, LastName = dto.LastName,
            PhoneNumber = dto.Phone, EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        await _userManager.AddToRoleAsync(user, dto.Role);
        var token = await _jwt.GenerateTokenAsync(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id, Email = user.Email!, FirstName = user.FirstName,
                LastName = user.LastName, Phone = user.PhoneNumber ?? "",
                Role = dto.Role, IsActive = true
            }
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // Always return success to prevent email enumeration
        if (user == null)
            return Ok(new { message = "If an account exists, a reset link will be sent." });

        // In production, generate a token and send email
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // TODO: Integrate email service to send reset link
        // For now, just log it (in production, send email)
        Console.WriteLine($"Password reset token for {dto.Email}: {token}");

        return Ok(new { message = "If an account exists, a reset link will be sent." });
    }

    [HttpPost("register-pharmacy")]
    public async Task<IActionResult> RegisterPharmacy([FromBody] RegisterPharmacyDto dto)
    {
        // Check if email already exists
        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            return BadRequest(new { detail = "Email already registered" });

        // Create user (inactive until admin approval)
        var user = new ApplicationUser
        {
            UserName = dto.Email, Email = dto.Email,
            FirstName = dto.FirstName, LastName = dto.LastName,
            PhoneNumber = dto.Phone, EmailConfirmed = true,
            IsActive = false // Requires admin approval
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        await _userManager.AddToRoleAsync(user, AppRoles.Pharmacy);

        // Create pharmacy record - parse address into components
        var addressParts = dto.Address.Split(',').Select(s => s.Trim()).ToArray();
        var pharmacy = new Pharmacy
        {
            Name = dto.PharmacyName,
            LicenseNumber = dto.LicenseNumber,
            Phone = dto.Phone,
            Street = addressParts.Length > 0 ? addressParts[0] : dto.Address,
            City = addressParts.Length > 1 ? addressParts[1] : "",
            State = addressParts.Length > 2 ? addressParts[2].Split(' ').FirstOrDefault() ?? "" : "",
            PostalCode = addressParts.Length > 2 ? addressParts[2].Split(' ').LastOrDefault() ?? "" : "",
            UserId = user.Id,
            IsActive = false // Requires admin approval
        };
        await _pharmacies.AddAsync(pharmacy);

        return Ok(new { 
            message = "Registration submitted successfully. Your account is pending admin approval.",
            pharmacyId = pharmacy.Id 
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value ?? "";
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return Unauthorized();
        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new UserDto
        {
            Id = user.Id, Email = user.Email!, FirstName = user.FirstName,
            LastName = user.LastName, Phone = user.PhoneNumber ?? "",
            Role = roles.FirstOrDefault() ?? "", IsActive = user.IsActive
        });
    }
}
