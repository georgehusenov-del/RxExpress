using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Identity.Services;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtService _jwt;

    public AuthController(UserManager<ApplicationUser> userManager, JwtService jwt)
    {
        _userManager = userManager;
        _jwt = jwt;
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

        return Ok(new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id, Email = user.Email!, FirstName = user.FirstName,
                LastName = user.LastName, Phone = user.PhoneNumber ?? "",
                Role = roles.FirstOrDefault() ?? "", IsActive = user.IsActive
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
