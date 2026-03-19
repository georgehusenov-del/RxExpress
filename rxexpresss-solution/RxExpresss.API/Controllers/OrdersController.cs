using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<ServiceZone> _zones;
    private readonly IRepository<RoutePlan> _plans;
    private readonly IRepository<RoutePlanOrder> _planOrders;

    public OrdersController(
        IRepository<Order> orders, 
        IRepository<Pharmacy> pharmacies,
        IRepository<ServiceZone> zones,
        IRepository<RoutePlan> plans,
        IRepository<RoutePlanOrder> planOrders)
    {
        _orders = orders; 
        _pharmacies = pharmacies;
        _zones = zones;
        _plans = plans;
        _planOrders = planOrders;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        var pharmacy = await _pharmacies.GetByIdAsync(dto.PharmacyId);
        if (pharmacy == null) return NotFound(new { detail = "Pharmacy not found" });

        var order = new Order
        {
            PharmacyId = dto.PharmacyId, PharmacyName = pharmacy.Name,
            DeliveryType = dto.DeliveryType, TimeWindow = dto.TimeWindow,
            ScheduledDate = dto.ScheduledDate, RecipientName = dto.RecipientName,
            RecipientPhone = dto.RecipientPhone, RecipientEmail = dto.RecipientEmail,
            Street = dto.Street, AptUnit = dto.AptUnit, City = dto.City,
            State = dto.State, PostalCode = dto.PostalCode,
            Latitude = dto.Latitude, Longitude = dto.Longitude,
            DeliveryNotes = dto.DeliveryNotes, 
            DeliveryInstructions = dto.DeliveryInstructions,
            CopayAmount = dto.CopayAmount,
            IsRefrigerated = dto.IsRefrigerated,
            QrCode = QrCodeGenerator.Generate(dto.City), 
            Status = "new"
        };

        await _orders.AddAsync(order);
        
        // Auto-assign to gig based on city/service zone
        await AutoAssignToGig(order);

        return Ok(new { message = "Order created", order_id = order.Id, order_number = order.OrderNumber, qr_code = order.QrCode });
    }

    private async Task AutoAssignToGig(Order order)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        
        // Find service zone by city name (exact or close match)
        var cityLower = order.City.ToLower().Trim();
        var zone = await _zones.Query()
            .FirstOrDefaultAsync(z => z.IsActive && z.Name.ToLower() == cityLower);
        
        if (zone == null)
        {
            // Try partial match
            zone = await _zones.Query()
                .FirstOrDefaultAsync(z => z.IsActive && (
                    z.Name.ToLower().Contains(cityLower) || 
                    cityLower.Contains(z.Name.ToLower())
                ));
        }
        
        if (zone == null)
        {
            // Try to find by zip code
            zone = await _zones.Query()
                .Where(z => z.IsActive)
                .ToListAsync()
                .ContinueWith(t => t.Result.FirstOrDefault(z => 
                    z.ZipCodes.Split(',').Any(zip => zip.Trim() == order.PostalCode)));
        }
        
        if (zone == null) return; // No matching zone, order stays unassigned
        
        // Find existing gig for this zone and date, or create new one
        var gig = await _plans.Query()
            .FirstOrDefaultAsync(p => p.ServiceZoneId == zone.Id && p.Date == today && p.Status == "draft");
        
        if (gig == null)
        {
            // Create new gig for this zone
            gig = new RoutePlan
            {
                Title = $"{zone.Name} - {today}",
                Date = today,
                ServiceZoneId = zone.Id,
                Status = "draft",
                IsAutoCreated = true
            };
            await _plans.AddAsync(gig);
        }
        
        // Check if order already in a gig
        var existingPlanOrder = await _planOrders.Query()
            .FirstOrDefaultAsync(po => po.OrderId == order.Id);
        
        if (existingPlanOrder == null)
        {
            // Add order to gig
            await _planOrders.AddAsync(new RoutePlanOrder { RoutePlanId = gig.Id, OrderId = order.Id });
        }
        
        order.RoutePlanId = gig.Id;
        await _orders.UpdateAsync(order);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int? pharmacyId, [FromQuery] int skip = 0, [FromQuery] int limit = 100)
    {
        var query = _orders.Query();
        if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
        if (pharmacyId.HasValue) query = query.Where(o => o.PharmacyId == pharmacyId.Value);
        var total = await query.CountAsync();
        var orders = await query.OrderByDescending(o => o.CreatedAt).Skip(skip).Take(limit)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyId, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.RecipientName, o.RecipientPhone, o.Street, o.City, o.State, o.PostalCode, o.DriverId, o.DriverName, o.Status, o.DeliveryFee, o.TotalAmount, o.CopayAmount, o.CopayCollected, o.DeliveryNotes, o.IsRefrigerated, o.PhotoUrl, o.PhotoHomeUrl, o.PhotoAddressUrl, o.PhotoPackageUrl, o.SignatureUrl, o.RecipientNameSigned, o.ActualDeliveryTime, o.CreatedAt, o.UpdatedAt })
            .ToListAsync();
        return Ok(new { orders, total });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var order = await _orders.Query().Where(o => o.Id == id)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyId, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.ScheduledDate, o.RecipientName, o.RecipientPhone, o.RecipientEmail, o.Street, o.AptUnit, o.City, o.State, o.PostalCode, o.Latitude, o.Longitude, o.DeliveryInstructions, o.DriverId, o.DriverName, o.Status, o.DeliveryNotes, o.RequiresSignature, o.RequiresPhotoProof, o.IsRefrigerated, o.SignatureUrl, o.PhotoUrl, o.PhotoHomeUrl, o.PhotoAddressUrl, o.PhotoPackageUrl, o.RecipientNameSigned, o.DeliveryFee, o.TotalAmount, o.CopayAmount, o.CopayCollected, o.ActualPickupTime, o.ActualDeliveryTime, o.CreatedAt, o.UpdatedAt })
            .FirstOrDefaultAsync();
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order == null) return NotFound();
        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;
        if (dto.Status == "picked_up") order.ActualPickupTime = DateTime.UtcNow;
        if (dto.Status == "delivered") order.ActualDeliveryTime = DateTime.UtcNow;
        await _orders.UpdateAsync(order);
        return Ok(new { message = $"Status updated to {dto.Status}" });
    }

    [HttpGet("track/{code}")]
    [AllowAnonymous]
    public async Task<IActionResult> Track(string code)
    {
        // Case-insensitive search for order number, tracking number, or QR code
        var codeUpper = code.ToUpper();
        var order = await _orders.Query()
            .Where(o => o.OrderNumber.ToUpper() == codeUpper || 
                       o.TrackingNumber.ToUpper() == codeUpper || 
                       (o.QrCode != null && o.QrCode.ToUpper() == codeUpper))
            .Select(o => new { 
                o.OrderNumber, o.TrackingNumber, o.QrCode, o.Status, 
                o.RecipientName, o.Street, o.City, o.State, o.PostalCode,
                o.DeliveryType, o.TimeWindow, o.CopayAmount, o.CopayCollected,
                o.DriverName, o.ActualPickupTime, o.ActualDeliveryTime, o.CreatedAt
            })
            .FirstOrDefaultAsync();
        if (order == null) return NotFound(new { detail = "Order not found" });
        return Ok(order);
    }

    [HttpPost("reassign-to-gigs")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ReassignAllToGigs()
    {
        // Get all orders without a route plan
        var unassignedOrders = await _orders.Query()
            .Where(o => o.RoutePlanId == null)
            .ToListAsync();

        int assigned = 0;
        foreach (var order in unassignedOrders)
        {
            await AutoAssignToGig(order);
            if (order.RoutePlanId != null) assigned++;
        }

        return Ok(new { message = $"Assigned {assigned} orders to gigs", total = unassignedOrders.Count });
    }
}
