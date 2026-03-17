using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminController : ControllerBase
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<DriverProfile> _drivers;
    private readonly IRepository<ApiKey> _apiKeys;
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminController(IRepository<Order> orders, IRepository<Pharmacy> pharmacies,
        IRepository<DriverProfile> drivers, IRepository<ApiKey> apiKeys, UserManager<ApplicationUser> userManager)
    {
        _orders = orders; _pharmacies = pharmacies;
        _drivers = drivers; _apiKeys = apiKeys; _userManager = userManager;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var totalUsers = _userManager.Users.Count();
        var totalPharmacies = await _pharmacies.Query().CountAsync();
        var totalDrivers = await _drivers.Query().CountAsync();
        var activeDrivers = await _drivers.Query().CountAsync(d => d.Status != "offline");
        var allOrders = await _orders.Query().ToListAsync();
        var totalOrders = allOrders.Count;

        var ordersByStatus = allOrders.GroupBy(o => o.Status).ToDictionary(g => g.Key, g => g.Count());

        // Copay stats
        var copayPending = allOrders.Where(o => o.CopayAmount > 0 && !o.CopayCollected && o.Status != "cancelled").ToList();
        var copayCollected = allOrders.Where(o => o.CopayCollected).ToList();

        // Borough stats from QR codes
        var boroughStats = new Dictionary<string, int>();
        foreach (var o in allOrders.Where(o => !string.IsNullOrEmpty(o.QrCode) && o.Status != "delivered" && o.Status != "cancelled"))
        {
            var b = o.QrCode![0].ToString();
            boroughStats[b] = boroughStats.GetValueOrDefault(b, 0) + 1;
        }

        // Today's delivered
        var today = DateTime.UtcNow.Date;
        var deliveredToday = allOrders.Count(o => o.Status == "delivered" && o.ActualDeliveryTime?.Date == today);

        return Ok(new
        {
            stats = new
            {
                total_users = totalUsers, total_pharmacies = totalPharmacies,
                total_drivers = totalDrivers, active_drivers = activeDrivers,
                total_orders = totalOrders, orders_by_status = ordersByStatus,
                copay_to_collect = copayPending.Sum(o => o.CopayAmount),
                copay_collected = copayCollected.Sum(o => o.CopayAmount),
                orders_copay_pending = copayPending.Count,
                orders_copay_collected = copayCollected.Count,
                borough_stats = boroughStats,
                delivered_today = deliveredToday,
                new_orders = ordersByStatus.GetValueOrDefault("new", 0),
                out_for_delivery = ordersByStatus.GetValueOrDefault("out_for_delivery", 0)
            },
            recent_orders = allOrders.OrderByDescending(o => o.CreatedAt).Take(10).Select(o => new {
                o.Id, o.OrderNumber, o.QrCode, o.PharmacyName, o.RecipientName, o.City,
                o.Status, o.DeliveryType, o.CopayAmount, o.CopayCollected, o.DriverName, o.CreatedAt
            })
        });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] string? status, [FromQuery] int? pharmacyId, [FromQuery] string? date, [FromQuery] int skip = 0, [FromQuery] int limit = 100)
    {
        var query = _orders.Query();
        if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
        if (pharmacyId.HasValue) query = query.Where(o => o.PharmacyId == pharmacyId.Value);
        if (!string.IsNullOrEmpty(date)) 
        {
            var targetDate = DateTime.Parse(date).Date;
            query = query.Where(o => o.CreatedAt.Date == targetDate);
        }
        var total = await query.CountAsync();
        var orders = await query.OrderByDescending(o => o.CreatedAt).Skip(skip).Take(limit)
            .Select(o => new {
                o.Id, o.OrderNumber, o.QrCode, o.PharmacyId, o.PharmacyName,
                o.RecipientName, o.RecipientPhone, o.Street, o.City, o.State, o.PostalCode,
                o.DeliveryType, o.Status, o.DriverId, o.DriverName,
                o.CopayAmount, o.CopayCollected, o.DeliveryFee,
                o.IsRefrigerated, o.CreatedAt, o.UpdatedAt,
                o.PhotoUrl, o.SignatureUrl, o.RecipientNameSigned, o.DeliveryNotes, o.ActualDeliveryTime
            })
            .ToListAsync();
        return Ok(new { orders, total });
    }

    [HttpPut("orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound(new { detail = "Order not found" });
        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;
        if (dto.Status == "picked_up") order.ActualPickupTime = DateTime.UtcNow;
        if (dto.Status == "delivered") order.ActualDeliveryTime = DateTime.UtcNow;
        if (dto.IsRefrigerated.HasValue) order.IsRefrigerated = dto.IsRefrigerated.Value;
        await _orders.UpdateAsync(order);
        return Ok(new { message = $"Status updated to {dto.Status}" });
    }

    [HttpPut("orders/{id}/assign")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] Dictionary<string, int> body)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound();
        var driverId = body.GetValueOrDefault("driverId", 0);
        var driver = await _drivers.GetByIdAsync(driverId);
        if (driver == null) return NotFound(new { detail = "Driver not found" });
        var user = await _userManager.FindByIdAsync(driver.UserId);
        order.DriverId = driverId;
        order.DriverName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        
        // Status logic:
        // - If "new" order → "assigned" (driver assigned for pickup from pharmacy)
        // - If "in_transit" (at office) → "dispatched" (driver assigned for delivery, leaving office)
        if (order.Status == "in_transit")
        {
            order.Status = "dispatched";
        }
        else if (order.Status == "new" || string.IsNullOrEmpty(order.Status))
        {
            order.Status = "assigned";
        }
        // Don't change status if already out_for_delivery, delivering_now, etc.
        
        order.UpdatedAt = DateTime.UtcNow;
        await _orders.UpdateAsync(order);
        return Ok(new { message = "Driver assigned", driverName = order.DriverName, newStatus = order.Status });
    }

    [HttpPost("scan/{qrCode}")]
    public async Task<IActionResult> ScanQr(string qrCode)
    {
        var order = await _orders.Query().FirstOrDefaultAsync(o => o.QrCode == qrCode);
        if (order == null) return NotFound(new { detail = "No package found with this QR code", verified = false });
        return Ok(new {
            verified = true, message = "Package verified!",
            package = new { order.Id, order.OrderNumber, order.QrCode, order.PharmacyName, order.RecipientName,
                address = $"{order.Street}, {order.City}", order.Status, order.CopayAmount, order.CopayCollected, order.DriverName }
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role)
    {
        var users = _userManager.Users.ToList();
        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            if (!string.IsNullOrEmpty(role) && !roles.Contains(role, StringComparer.OrdinalIgnoreCase)) continue;
            result.Add(new { u.Id, u.Email, u.FirstName, u.LastName, Phone = u.PhoneNumber, Role = roles.FirstOrDefault(), u.IsActive, u.CreatedAt });
        }
        return Ok(new { users = result, total = result.Count });
    }

    [HttpGet("drivers")]
    public async Task<IActionResult> GetDrivers()
    {
        var drivers = await _drivers.Query().ToListAsync();
        var result = new List<object>();
        foreach (var d in drivers)
        {
            var user = await _userManager.FindByIdAsync(d.UserId);
            result.Add(new
            {
                d.Id, d.UserId, d.VehicleType, d.VehicleNumber, d.LicenseNumber,
                d.Status, d.Rating, d.TotalDeliveries, d.IsVerified, d.CreatedAt,
                user = user == null ? null : new { user.Id, user.FirstName, user.LastName, user.Email, Phone = user.PhoneNumber, user.IsActive }
            });
        }
        return Ok(new { drivers = result, count = result.Count });
    }

    [HttpPost("drivers")]
    public async Task<IActionResult> CreateDriver([FromBody] CreateDriverDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email, Email = dto.Email, FirstName = dto.FirstName,
            LastName = dto.LastName, PhoneNumber = dto.Phone, EmailConfirmed = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });
        await _userManager.AddToRoleAsync(user, AppRoles.Driver);

        var driver = new DriverProfile
        {
            UserId = user.Id, VehicleType = dto.VehicleType,
            VehicleNumber = dto.VehicleNumber, LicenseNumber = dto.LicenseNumber
        };
        await _drivers.AddAsync(driver);
        return Ok(new { message = "Driver created", driver_id = driver.Id });
    }

    [HttpDelete("orders/{id}")]
    public async Task<IActionResult> DeleteOrder(int id)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound();
        await _orders.DeleteAsync(order);
        return Ok(new { message = "Order deleted" });
    }

    [HttpGet("pharmacies")]
    public async Task<IActionResult> GetPharmacies()
    {
        var pharmacies = await _pharmacies.Query().ToListAsync();
        return Ok(new { pharmacies, total = pharmacies.Count });
    }

    // User Management CRUD
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            return BadRequest(new { detail = "Email already exists" });

        var user = new ApplicationUser
        {
            UserName = dto.Email, Email = dto.Email,
            FirstName = dto.FirstName, LastName = dto.LastName,
            PhoneNumber = dto.Phone, EmailConfirmed = true, IsActive = dto.IsActive
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        await _userManager.AddToRoleAsync(user, dto.Role);
        return Ok(new { message = "User created", userId = user.Id });
    }

    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound(new { detail = "User not found" });
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { user.Id, user.Email, user.FirstName, user.LastName, Phone = user.PhoneNumber, Role = roles.FirstOrDefault(), user.IsActive, user.CreatedAt });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound(new { detail = "User not found" });

        user.FirstName = dto.FirstName ?? user.FirstName;
        user.LastName = dto.LastName ?? user.LastName;
        user.PhoneNumber = dto.Phone ?? user.PhoneNumber;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        // Update role if changed
        if (!string.IsNullOrEmpty(dto.Role))
        {
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (!currentRoles.Contains(dto.Role))
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, dto.Role);
            }
        }

        return Ok(new { message = "User updated" });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound(new { detail = "User not found" });

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = "User deleted" });
    }

    [HttpPut("users/{id}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound(new { detail = "User not found" });

        user.IsActive = !user.IsActive;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join(", ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = $"User {(user.IsActive ? "activated" : "deactivated")}", isActive = user.IsActive });
    }

    #region API Key Management

    [HttpGet("api-keys")]
    public async Task<IActionResult> ListApiKeys([FromQuery] int? pharmacyId)
    {
        var baseQuery = _apiKeys.Query().Include(k => k.Pharmacy);
        IQueryable<ApiKey> query = baseQuery;
        if (pharmacyId.HasValue)
            query = baseQuery.Where(k => k.PharmacyId == pharmacyId.Value);
        
        var keys = await query.Select(k => new {
            k.Id, k.PharmacyId, PharmacyName = k.Pharmacy.Name, k.Name, k.Key,
            Secret = "****" + k.Secret.Substring(k.Secret.Length - 4), // Masked
            k.IsActive, k.CreatedAt, k.LastUsedAt, k.RequestCount
        }).ToListAsync();
        
        return Ok(new { apiKeys = keys });
    }

    [HttpPost("api-keys")]
    public async Task<IActionResult> CreateApiKey([FromBody] CreateApiKeyForPharmacyDto dto)
    {
        var pharmacy = await _pharmacies.GetByIdAsync(dto.PharmacyId);
        if (pharmacy == null) return NotFound(new { detail = "Pharmacy not found" });
        
        var apiKey = new ApiKey
        {
            PharmacyId = dto.PharmacyId,
            Name = dto.Name ?? "Default API Key"
        };
        
        await _apiKeys.AddAsync(apiKey);
        
        // Return full key and secret ONLY on creation (never shown again)
        return Ok(new {
            message = "API key created. Save the secret now - it won't be shown again!",
            id = apiKey.Id,
            key = apiKey.Key,
            secret = apiKey.Secret,
            name = apiKey.Name,
            pharmacyId = apiKey.PharmacyId,
            pharmacyName = pharmacy.Name
        });
    }

    [HttpDelete("api-keys/{id}")]
    public async Task<IActionResult> DeleteApiKey(int id)
    {
        var apiKey = await _apiKeys.GetByIdAsync(id);
        if (apiKey == null) return NotFound(new { detail = "API key not found" });
        
        await _apiKeys.DeleteAsync(apiKey);
        return Ok(new { message = "API key deleted" });
    }

    [HttpPut("api-keys/{id}/toggle")]
    public async Task<IActionResult> ToggleApiKey(int id)
    {
        var apiKey = await _apiKeys.GetByIdAsync(id);
        if (apiKey == null) return NotFound(new { detail = "API key not found" });
        
        apiKey.IsActive = !apiKey.IsActive;
        await _apiKeys.UpdateAsync(apiKey);
        
        return Ok(new { message = $"API key {(apiKey.IsActive ? "activated" : "deactivated")}", isActive = apiKey.IsActive });
    }

    #endregion
}
