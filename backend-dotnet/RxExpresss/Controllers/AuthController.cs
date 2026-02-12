using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.DTOs;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly MongoDbService _db;
    private readonly AuthService _auth;
    private readonly ILogger<AuthController> _logger;
    
    public AuthController(MongoDbService db, AuthService auth, ILogger<AuthController> logger)
    {
        _db = db;
        _auth = auth;
        _logger = logger;
    }
    
    [HttpPost("register")]
    public async Task<ActionResult<TokenResponseDto>> Register([FromBody] UserCreateDto dto)
    {
        // Check if email exists
        var existing = await _db.Users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
        if (existing != null)
        {
            return BadRequest(new { detail = "Email already registered" });
        }
        
        var user = new User
        {
            Email = dto.Email,
            Phone = dto.Phone,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Role = dto.Role.ToLower(),
            PasswordHash = _auth.HashPassword(dto.Password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        
        await _db.Users.InsertOneAsync(user);
        
        var token = _auth.GenerateToken(user.Id, user.Email, user.Role);
        
        return Ok(new TokenResponseDto
        {
            AccessToken = token,
            TokenType = "bearer",
            User = new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Phone = user.Phone,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = DateTime.Parse(user.CreatedAt)
            }
        });
    }
    
    [HttpPost("login")]
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] UserLoginDto dto)
    {
        var user = await _db.Users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
        if (user == null)
        {
            return Unauthorized(new { detail = "Invalid credentials" });
        }
        
        if (!_auth.VerifyPassword(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { detail = "Invalid credentials" });
        }
        
        var token = _auth.GenerateToken(user.Id, user.Email, user.Role);
        
        DateTime createdAt;
        try
        {
            createdAt = DateTime.Parse(user.CreatedAt);
        }
        catch
        {
            createdAt = DateTime.UtcNow;
        }
        
        return Ok(new TokenResponseDto
        {
            AccessToken = token,
            TokenType = "bearer",
            User = new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Phone = user.Phone,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = createdAt
            }
        });
    }
    
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponseDto>> GetCurrentUser()
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { detail = "Invalid token" });
        }
        
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            return NotFound(new { detail = "User not found" });
        }
        
        DateTime createdAt;
        try
        {
            createdAt = DateTime.Parse(user.CreatedAt);
        }
        catch
        {
            createdAt = DateTime.UtcNow;
        }
        
        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Phone = user.Phone,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = createdAt
        });
    }
}
