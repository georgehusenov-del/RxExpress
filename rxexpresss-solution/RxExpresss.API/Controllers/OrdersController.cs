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

    public OrdersController(IRepository<Order> orders, IRepository<Pharmacy> pharmacies)
    {
        _orders = orders; _pharmacies = pharmacies;
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
            DeliveryNotes = dto.DeliveryNotes, CopayAmount = dto.CopayAmount,
            QrCode = QrCodeGenerator.Generate(dto.City), Status = "new"
        };

        await _orders.AddAsync(order);
        return Ok(new { message = "Order created", order_id = order.Id, order_number = order.OrderNumber, qr_code = order.QrCode });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int? pharmacyId, [FromQuery] int skip = 0, [FromQuery] int limit = 100)
    {
        var query = _orders.Query();
        if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
        if (pharmacyId.HasValue) query = query.Where(o => o.PharmacyId == pharmacyId.Value);
        var total = await query.CountAsync();
        var orders = await query.OrderByDescending(o => o.CreatedAt).Skip(skip).Take(limit)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyId, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.RecipientName, o.RecipientPhone, o.Street, o.City, o.State, o.PostalCode, o.DriverId, o.DriverName, o.Status, o.DeliveryFee, o.TotalAmount, o.CopayAmount, o.CopayCollected, o.DeliveryNotes, o.CreatedAt, o.UpdatedAt })
            .ToListAsync();
        return Ok(new { orders, total });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var order = await _orders.Query().Where(o => o.Id == id)
            .Select(o => new { o.Id, o.OrderNumber, o.TrackingNumber, o.QrCode, o.PharmacyId, o.PharmacyName, o.DeliveryType, o.TimeWindow, o.ScheduledDate, o.RecipientName, o.RecipientPhone, o.RecipientEmail, o.Street, o.AptUnit, o.City, o.State, o.PostalCode, o.Latitude, o.Longitude, o.DeliveryInstructions, o.DriverId, o.DriverName, o.Status, o.DeliveryNotes, o.RequiresSignature, o.RequiresPhotoProof, o.SignatureUrl, o.PhotoUrl, o.RecipientNameSigned, o.DeliveryFee, o.TotalAmount, o.CopayAmount, o.CopayCollected, o.ActualPickupTime, o.ActualDeliveryTime, o.CreatedAt, o.UpdatedAt })
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
}
