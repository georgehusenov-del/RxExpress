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
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
public class AdminController : ControllerBase
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<DriverProfile> _drivers;
    private readonly IRepository<ApiKey> _apiKeys;
    private readonly IRepository<OfficeLocation> _officeLocations;
    private readonly IRepository<DriverLocationLog> _locationLogs;
    private readonly IRepository<UserPermission> _permissions;
    private readonly IRepository<OrderAttemptLog> _attemptLogs;
    private readonly IRepository<ServiceZone> _zones;
    private readonly IRepository<RoutePlan> _plans;
    private readonly IRepository<RoutePlanOrder> _planOrders;
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminController(IRepository<Order> orders, IRepository<Pharmacy> pharmacies,
        IRepository<DriverProfile> drivers, IRepository<ApiKey> apiKeys, 
        IRepository<OfficeLocation> officeLocations, IRepository<DriverLocationLog> locationLogs,
        IRepository<UserPermission> permissions, IRepository<OrderAttemptLog> attemptLogs,
        IRepository<ServiceZone> zones, IRepository<RoutePlan> plans,
        IRepository<RoutePlanOrder> planOrders,
        UserManager<ApplicationUser> userManager)
    {
        _orders = orders; _pharmacies = pharmacies;
        _drivers = drivers; _apiKeys = apiKeys; 
        _officeLocations = officeLocations; _locationLogs = locationLogs;
        _permissions = permissions; _attemptLogs = attemptLogs;
        _zones = zones; _plans = plans; _planOrders = planOrders;
        _userManager = userManager;
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
                o.PhotoUrl, o.PhotoHomeUrl, o.PhotoAddressUrl, o.PhotoPackageUrl,
                o.SignatureUrl, o.RecipientNameSigned, o.DeliveryNotes, o.ActualDeliveryTime
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
        var callerRoles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
        var isAdmin = callerRoles.Contains(AppRoles.Admin);
        
        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            if (!string.IsNullOrEmpty(role) && !roles.Contains(role, StringComparer.OrdinalIgnoreCase)) continue;
            
            // Manager/Operator cannot see Admin users
            if (!isAdmin && roles.Contains(AppRoles.Admin)) continue;
            
            // Operator cannot see Manager users
            if (callerRoles.Contains(AppRoles.Operator) && roles.Contains(AppRoles.Manager)) continue;
            
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

    #region Office Locations Management

    [HttpGet("office-locations")]
    public async Task<IActionResult> GetOfficeLocations()
    {
        var offices = await _officeLocations.Query()
            .OrderByDescending(o => o.IsDefault)
            .ThenBy(o => o.Name)
            .Select(o => new { o.Id, o.Name, o.Address, o.City, o.State, o.PostalCode, o.Latitude, o.Longitude, o.RadiusMeters, o.IsActive, o.IsDefault, o.CreatedAt })
            .ToListAsync();
        return Ok(new { offices });
    }

    [HttpPost("office-locations")]
    public async Task<IActionResult> CreateOfficeLocation([FromBody] CreateOfficeLocationDto dto)
    {
        var office = new OfficeLocation
        {
            Name = dto.Name,
            Address = dto.Address,
            City = dto.City,
            State = dto.State,
            PostalCode = dto.PostalCode,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            RadiusMeters = dto.RadiusMeters ?? 100,
            IsActive = true,
            IsDefault = dto.IsDefault ?? false
        };

        // If this is set as default, unset other defaults
        if (office.IsDefault)
        {
            var existingDefaults = await _officeLocations.Query().Where(o => o.IsDefault).ToListAsync();
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
                await _officeLocations.UpdateAsync(existing);
            }
        }

        await _officeLocations.AddAsync(office);
        return Ok(new { message = "Office location created", office = new { office.Id, office.Name, office.Address, office.Latitude, office.Longitude } });
    }

    [HttpPut("office-locations/{id}")]
    public async Task<IActionResult> UpdateOfficeLocation(int id, [FromBody] UpdateOfficeLocationDto dto)
    {
        var office = await _officeLocations.GetByIdAsync(id);
        if (office == null) return NotFound(new { detail = "Office location not found" });

        if (!string.IsNullOrEmpty(dto.Name)) office.Name = dto.Name;
        if (!string.IsNullOrEmpty(dto.Address)) office.Address = dto.Address;
        if (!string.IsNullOrEmpty(dto.City)) office.City = dto.City;
        if (!string.IsNullOrEmpty(dto.State)) office.State = dto.State;
        if (!string.IsNullOrEmpty(dto.PostalCode)) office.PostalCode = dto.PostalCode;
        if (dto.Latitude.HasValue) office.Latitude = dto.Latitude.Value;
        if (dto.Longitude.HasValue) office.Longitude = dto.Longitude.Value;
        if (dto.RadiusMeters.HasValue) office.RadiusMeters = dto.RadiusMeters.Value;
        if (dto.IsActive.HasValue) office.IsActive = dto.IsActive.Value;
        
        if (dto.IsDefault == true)
        {
            var existingDefaults = await _officeLocations.Query().Where(o => o.IsDefault && o.Id != id).ToListAsync();
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
                await _officeLocations.UpdateAsync(existing);
            }
            office.IsDefault = true;
        }
        
        office.UpdatedAt = DateTime.UtcNow;
        await _officeLocations.UpdateAsync(office);
        return Ok(new { message = "Office location updated", office = new { office.Id, office.Name, office.Latitude, office.Longitude } });
    }

    [HttpDelete("office-locations/{id}")]
    public async Task<IActionResult> DeleteOfficeLocation(int id)
    {
        var office = await _officeLocations.GetByIdAsync(id);
        if (office == null) return NotFound(new { detail = "Office location not found" });
        
        if (office.IsDefault)
            return BadRequest(new { detail = "Cannot delete default office. Set another office as default first." });
        
        await _officeLocations.DeleteAsync(office);
        return Ok(new { message = "Office location deleted" });
    }

    #endregion

    #region Driver Tracking

    /// <summary>
    /// GET /api/admin/tracking/drivers — All drivers with current GPS positions
    /// </summary>
    [HttpGet("tracking/drivers")]
    public async Task<IActionResult> GetDriverLocations()
    {
        var drivers = await _drivers.Query().ToListAsync();
        var result = new List<object>();

        foreach (var d in drivers)
        {
            var user = await _userManager.FindByIdAsync(d.UserId);
            
            // Count active deliveries for this driver
            var activeDeliveries = await _orders.Query()
                .CountAsync(o => o.DriverId == d.Id && 
                    (o.Status == "assigned" || o.Status == "picked_up" || o.Status == "dispatched" || 
                     o.Status == "out_for_delivery" || o.Status == "delivering_now"));

            result.Add(new
            {
                d.Id,
                name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                phone = user?.PhoneNumber,
                d.Status,
                d.VehicleType,
                d.VehicleNumber,
                latitude = d.CurrentLatitude,
                longitude = d.CurrentLongitude,
                speed = d.CurrentSpeed,
                heading = d.CurrentHeading,
                lastUpdate = d.LastLocationUpdate,
                isOnline = d.LastLocationUpdate.HasValue && 
                    (DateTime.UtcNow - d.LastLocationUpdate.Value).TotalMinutes < 5,
                activeDeliveries
            });
        }

        // Also return office locations for map display
        var offices = await _officeLocations.Query()
            .Where(o => o.IsActive)
            .Select(o => new { o.Id, o.Name, o.Address, o.City, o.Latitude, o.Longitude, o.RadiusMeters, o.IsDefault })
            .ToListAsync();

        return Ok(new { drivers = result, offices });
    }

    /// <summary>
    /// GET /api/admin/tracking/drivers/{id}/trail — Location history (last 2 hours) for trail/breadcrumb
    /// </summary>
    [HttpGet("tracking/drivers/{id}/trail")]
    public async Task<IActionResult> GetDriverTrail(int id, [FromQuery] int hours = 2)
    {
        var cutoff = DateTime.UtcNow.AddHours(-hours);
        var trail = await _locationLogs.Query()
            .Where(l => l.DriverId == id && l.Timestamp >= cutoff)
            .OrderBy(l => l.Timestamp)
            .Select(l => new { l.Latitude, l.Longitude, l.Speed, l.Heading, l.Timestamp })
            .ToListAsync();

        return Ok(new { trail, count = trail.Count });
    }

    #endregion

    #region Permissions Management

    /// <summary>
    /// GET /api/admin/permissions/available — All available permission keys with labels
    /// </summary>
    [HttpGet("permissions/available")]
    public IActionResult GetAvailablePermissions()
    {
        var grouped = Permissions.All
            .GroupBy(p => p.Category)
            .Select(g => new { category = g.Key, permissions = g.Select(p => new { key = p.Key, label = p.Label }) });
        return Ok(new { permissions = grouped });
    }

    /// <summary>
    /// GET /api/admin/permissions/my — Current user's permissions
    /// </summary>
    [HttpGet("permissions/my")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
        
        // Admin has all permissions
        if (roles.Contains(AppRoles.Admin))
            return Ok(new { permissions = Permissions.All.Select(p => p.Key).ToList(), role = "Admin" });

        var perms = await _permissions.Query()
            .Where(p => p.UserId == userId)
            .Select(p => p.PermissionKey)
            .ToListAsync();

        return Ok(new { permissions = perms, role = roles.FirstOrDefault() ?? "" });
    }

    /// <summary>
    /// GET /api/admin/permissions/user/{userId} — Get a specific user's permissions
    /// </summary>
    [HttpGet("permissions/user/{userId}")]
    public async Task<IActionResult> GetUserPermissions(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound(new { detail = "User not found" });
        
        var roles = await _userManager.GetRolesAsync(user);
        var perms = await _permissions.Query()
            .Where(p => p.UserId == userId)
            .Select(p => p.PermissionKey)
            .ToListAsync();

        return Ok(new { 
            userId, 
            name = $"{user.FirstName} {user.LastName}",
            role = roles.FirstOrDefault(),
            permissions = perms 
        });
    }

    /// <summary>
    /// PUT /api/admin/permissions/user/{userId} — Set a user's permissions (replaces all)
    /// Admin can set Manager/Operator permissions. Manager can set Operator permissions.
    /// </summary>
    [HttpPut("permissions/user/{userId}")]
    public async Task<IActionResult> SetUserPermissions(string userId, [FromBody] SetPermissionsDto dto)
    {
        var targetUser = await _userManager.FindByIdAsync(userId);
        if (targetUser == null) return NotFound(new { detail = "User not found" });

        var targetRoles = await _userManager.GetRolesAsync(targetUser);
        var callerRoles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";

        // Authorization: Admin can manage Manager/Operator, Manager can manage Operator
        if (callerRoles.Contains(AppRoles.Admin))
        {
            // Admin can manage anyone except other admins
            if (targetRoles.Contains(AppRoles.Admin))
                return BadRequest(new { detail = "Cannot modify admin permissions" });
        }
        else if (callerRoles.Contains(AppRoles.Manager))
        {
            // Manager can only manage Operators
            if (!targetRoles.Contains(AppRoles.Operator))
                return Forbid();
            
            // Manager can only assign permissions they themselves have
            var myPerms = await _permissions.Query()
                .Where(p => p.UserId == callerId)
                .Select(p => p.PermissionKey)
                .ToListAsync();
            
            var invalidPerms = dto.Permissions.Except(myPerms).ToList();
            if (invalidPerms.Any())
                return BadRequest(new { detail = $"You cannot assign permissions you don't have: {string.Join(", ", invalidPerms)}" });
        }
        else
        {
            return Forbid();
        }

        // Remove existing permissions
        var existing = await _permissions.Query().Where(p => p.UserId == userId).ToListAsync();
        foreach (var p in existing) await _permissions.DeleteAsync(p);

        // Add new permissions
        foreach (var key in dto.Permissions)
        {
            await _permissions.AddAsync(new UserPermission
            {
                UserId = userId,
                PermissionKey = key,
                GrantedByUserId = callerId
            });
        }

        return Ok(new { message = "Permissions updated", count = dto.Permissions.Count });
    }

    #endregion

    #region Admin Order Creation & Duplication

    /// <summary>
    /// POST /api/admin/orders — Admin creates an order (with pharmacy dropdown)
    /// </summary>
    [HttpPost("orders/create")]
    public async Task<IActionResult> AdminCreateOrder([FromBody] AdminCreateOrderDto dto)
    {
        var pharmacy = await _pharmacies.Query().FirstOrDefaultAsync(p => p.Id == dto.PharmacyId);
        if (pharmacy == null) return BadRequest(new { detail = "Pharmacy not found" });

        var order = new Order
        {
            PharmacyId = dto.PharmacyId,
            PharmacyName = pharmacy.Name,
            DeliveryType = dto.DeliveryType ?? "next_day",
            TimeWindow = dto.TimeWindow,
            ScheduledDate = dto.ScheduledDate,
            RecipientName = dto.RecipientName,
            RecipientPhone = dto.RecipientPhone,
            RecipientEmail = dto.RecipientEmail,
            Street = dto.Street,
            AptUnit = dto.AptUnit,
            City = dto.City,
            State = dto.State ?? "NY",
            PostalCode = dto.PostalCode,
            DeliveryNotes = dto.DeliveryNotes,
            DeliveryInstructions = dto.DeliveryInstructions,
            CopayAmount = dto.CopayAmount,
            IsRefrigerated = dto.IsRefrigerated,
            QrCode = QrCodeGenerator.Generate(dto.City),
            Status = "new",
            AttemptNumber = 1
        };

        await _orders.AddAsync(order);
        await AutoAssignToGig(order);

        return Ok(new { message = "Order created", orderId = order.Id, orderNumber = order.OrderNumber, qrCode = order.QrCode });
    }

    /// <summary>
    /// POST /api/admin/orders/{id}/duplicate — Duplicate a failed order with new QR code
    /// </summary>
    [HttpPost("orders/{id}/duplicate")]
    public async Task<IActionResult> DuplicateOrder(int id, [FromBody] DuplicateOrderDto dto)
    {
        var original = await _orders.GetByIdAsync(id);
        if (original == null) return NotFound(new { detail = "Order not found" });

        // Find the root parent order
        var rootOrderId = original.ParentOrderId ?? original.Id;

        // Block duplicate if any active duplicate already exists (not failed/cancelled/delivered)
        var activeDuplicate = await _orders.Query()
            .FirstOrDefaultAsync(o => o.ParentOrderId == rootOrderId 
                && o.Status != "failed" && o.Status != "cancelled" && o.Status != "delivered");
        
        if (activeDuplicate != null)
        {
            return BadRequest(new { 
                detail = $"Cannot duplicate: an active duplicate already exists (Order #{activeDuplicate.OrderNumber}, Status: {activeDuplicate.Status}). Wait until it is delivered, failed, or cancelled." 
            });
        }

        // Count total attempts across all duplicates of this order
        var allRelated = await _orders.Query()
            .Where(o => o.Id == rootOrderId || o.ParentOrderId == rootOrderId)
            .ToListAsync();
        var maxAttempt = allRelated.Max(o => o.AttemptNumber);

        // Create duplicate with new QR code — status is "in_transit" (goes back to office for reassignment)
        var duplicate = new Order
        {
            PharmacyId = original.PharmacyId,
            PharmacyName = original.PharmacyName,
            DeliveryType = original.DeliveryType,
            TimeWindow = original.TimeWindow,
            ScheduledDate = original.ScheduledDate,
            RecipientName = original.RecipientName,
            RecipientPhone = original.RecipientPhone,
            RecipientEmail = original.RecipientEmail,
            Street = original.Street,
            AptUnit = original.AptUnit,
            City = original.City,
            State = original.State,
            PostalCode = original.PostalCode,
            DeliveryNotes = original.DeliveryNotes,
            DeliveryInstructions = original.DeliveryInstructions,
            CopayAmount = original.CopayAmount,
            IsRefrigerated = original.IsRefrigerated,
            QrCode = QrCodeGenerator.Generate(original.City), // NEW QR code
            Status = "in_transit", // Goes to office for driver reassignment
            ParentOrderId = rootOrderId,
            AttemptNumber = maxAttempt + 1,
            LabourCost = dto.LabourCost
        };

        await _orders.AddAsync(duplicate);
        await AutoAssignToGig(duplicate);

        return Ok(new { 
            message = "Order duplicated with new QR code (status: In Transit — ready for driver assignment)",
            newOrderId = duplicate.Id,
            newOrderNumber = duplicate.OrderNumber,
            newQrCode = duplicate.QrCode,
            attemptNumber = duplicate.AttemptNumber,
            labourCost = duplicate.LabourCost,
            status = "in_transit"
        });
    }

    /// <summary>
    /// GET /api/admin/orders/{id}/history — Full attempt history for an order (all duplicates)
    /// </summary>
    [HttpGet("orders/{id}/history")]
    public async Task<IActionResult> GetOrderHistory(int id)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound(new { detail = "Order not found" });

        var rootOrderId = order.ParentOrderId ?? order.Id;

        // Get all related orders (original + all duplicates)
        var allOrders = await _orders.Query()
            .Where(o => o.Id == rootOrderId || o.ParentOrderId == rootOrderId)
            .OrderBy(o => o.AttemptNumber)
            .Select(o => new {
                o.Id, o.OrderNumber, o.QrCode, o.Status, o.AttemptNumber,
                o.FailedAttempts, o.LabourCost, o.DriverName,
                o.CreatedAt, o.ActualDeliveryTime, o.DeliveryNotes,
                o.ParentOrderId
            })
            .ToListAsync();

        // Get attempt logs
        var orderIds = allOrders.Select(o => o.Id).ToList();
        var logs = await _attemptLogs.Query()
            .Where(l => orderIds.Contains(l.OrderId))
            .OrderBy(l => l.Timestamp)
            .Select(l => new { l.OrderId, l.AttemptNumber, l.Status, l.DriverName, l.FailureReason, l.Notes, l.Timestamp })
            .ToListAsync();

        return Ok(new {
            rootOrderId,
            totalAttempts = allOrders.Count,
            totalFailed = allOrders.Sum(o => o.FailedAttempts),
            totalLabourCost = allOrders.Sum(o => o.LabourCost),
            orders = allOrders,
            logs
        });
    }

    /// <summary>
    /// POST /api/admin/orders/{id}/log-attempt — Log a delivery attempt (success or failure)
    /// </summary>
    [HttpPost("orders/{id}/log-attempt")]
    public async Task<IActionResult> LogAttempt(int id, [FromBody] LogAttemptDto dto)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound(new { detail = "Order not found" });

        order.FailedAttempts++;
        order.UpdatedAt = DateTime.UtcNow;
        if (dto.Status == "failed") order.Status = "failed";
        await _orders.UpdateAsync(order);

        await _attemptLogs.AddAsync(new OrderAttemptLog
        {
            OrderId = id,
            AttemptNumber = order.FailedAttempts,
            Status = dto.Status,
            DriverName = dto.DriverName ?? order.DriverName,
            DriverId = order.DriverId,
            FailureReason = dto.FailureReason,
            Notes = dto.Notes
        });

        var canDuplicate = order.FailedAttempts >= 2;

        return Ok(new { 
            message = $"Attempt logged: {dto.Status}",
            failedAttempts = order.FailedAttempts,
            canDuplicate,
            duplicateMessage = canDuplicate ? "This order has failed 2+ times. You can duplicate it with a new QR code." : null
        });
    }

    private async Task AutoAssignToGig(Order order)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var cityLower = order.City.ToLower().Trim();
        var zone = await _zones.Query()
            .FirstOrDefaultAsync(z => z.IsActive && z.Name.ToLower() == cityLower);
        
        if (zone == null)
            zone = await _zones.Query()
                .FirstOrDefaultAsync(z => z.IsActive && (z.Name.ToLower().Contains(cityLower) || cityLower.Contains(z.Name.ToLower())));
        
        if (zone == null) return;

        var gig = await _plans.Query()
            .FirstOrDefaultAsync(p => p.ServiceZoneId == zone.Id && p.Date == today && p.Status == "draft");
        
        if (gig == null)
        {
            gig = new RoutePlan { Title = $"{zone.Name} - {today}", Date = today, ServiceZoneId = zone.Id, Status = "draft", IsAutoCreated = true };
            await _plans.AddAsync(gig);
        }

        order.RoutePlanId = gig.Id;
        await _orders.UpdateAsync(order);
        await _planOrders.AddAsync(new RoutePlanOrder { RoutePlanId = gig.Id, OrderId = order.Id });
    }

    #endregion
}
