using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.DTOs;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;
using System.Security.Cryptography;
using System.Text;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Integration API v1 - For pharmacy software systems to connect to RX Expresss
/// Authentication: API Key + Secret in headers
/// </summary>
[ApiController]
[Route("api/v1")]
public class IntegrationController : ControllerBase
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<ApiKey> _apiKeys;
    private readonly IRepository<Webhook> _webhooks;
    private readonly IRepository<ServiceZone> _zones;
    private readonly IRepository<RoutePlan> _plans;
    private readonly IRepository<RoutePlanOrder> _planOrders;
    private readonly IRepository<DriverProfile> _drivers;
    private readonly ILogger<IntegrationController> _logger;

    public IntegrationController(
        IRepository<Order> orders,
        IRepository<Pharmacy> pharmacies,
        IRepository<ApiKey> apiKeys,
        IRepository<Webhook> webhooks,
        IRepository<ServiceZone> zones,
        IRepository<RoutePlan> plans,
        IRepository<RoutePlanOrder> planOrders,
        IRepository<DriverProfile> drivers,
        ILogger<IntegrationController> logger)
    {
        _orders = orders;
        _pharmacies = pharmacies;
        _apiKeys = apiKeys;
        _webhooks = webhooks;
        _zones = zones;
        _plans = plans;
        _planOrders = planOrders;
        _drivers = drivers;
        _logger = logger;
    }

    #region Authentication Helper

    private async Task<(bool IsValid, ApiKey? Key, Pharmacy? Pharmacy)> ValidateApiKeyAsync()
    {
        // Get API key from header
        if (!Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeader))
            return (false, null, null);
        
        if (!Request.Headers.TryGetValue("X-API-Secret", out var apiSecretHeader))
            return (false, null, null);

        var keyValue = apiKeyHeader.ToString();
        var secretValue = apiSecretHeader.ToString();

        var apiKey = await _apiKeys.Query()
            .Include(k => k.Pharmacy)
            .FirstOrDefaultAsync(k => k.Key == keyValue && k.Secret == secretValue && k.IsActive);

        if (apiKey == null)
            return (false, null, null);

        // Update usage stats
        apiKey.LastUsedAt = DateTime.UtcNow;
        apiKey.RequestCount++;
        await _apiKeys.UpdateAsync(apiKey);

        return (true, apiKey, apiKey.Pharmacy);
    }

    private static string GetStatusLabel(string status) => status switch
    {
        "new" => "New",
        "assigned" => "Assigned",
        "picked_up" => "Picked Up",
        "in_transit" => "In Transit",
        "dispatched" => "Dispatched",
        "out_for_delivery" => "Out for Delivery",
        "delivering_now" => "At Location",
        "delivered" => "Delivered",
        "failed" => "Failed",
        "cancelled" => "Cancelled",
        _ => status
    };

    #endregion

    #region Orders API

    /// <summary>
    /// Create a new delivery order
    /// </summary>
    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] IntegrationCreateOrderDto dto)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        // Validate required fields
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            return BadRequest(new { error = "Patient name is required", code = "MISSING_PATIENT_NAME" });
        if (string.IsNullOrWhiteSpace(dto.PatientPhone))
            return BadRequest(new { error = "Patient phone is required", code = "MISSING_PATIENT_PHONE" });
        if (string.IsNullOrWhiteSpace(dto.Street))
            return BadRequest(new { error = "Street address is required", code = "MISSING_STREET" });
        if (string.IsNullOrWhiteSpace(dto.City))
            return BadRequest(new { error = "City is required", code = "MISSING_CITY" });
        if (string.IsNullOrWhiteSpace(dto.PostalCode))
            return BadRequest(new { error = "Postal code is required", code = "MISSING_POSTAL_CODE" });

        var order = new Order
        {
            PharmacyId = pharmacy.Id,
            PharmacyName = pharmacy.Name,
            RecipientName = dto.PatientName,
            RecipientPhone = dto.PatientPhone,
            RecipientEmail = dto.PatientEmail,
            Street = dto.Street,
            AptUnit = dto.AptUnit,
            City = dto.City,
            State = dto.State ?? "NY",
            PostalCode = dto.PostalCode,
            DeliveryType = dto.DeliveryType,
            TimeWindow = dto.TimeWindow,
            ScheduledDate = dto.ScheduledDate,
            DeliveryInstructions = dto.DeliveryInstructions,
            CopayAmount = dto.CopayAmount,
            RequiresSignature = dto.RequiresSignature,
            IsRefrigerated = dto.RequiresRefrigeration,
            ExternalOrderId = dto.ExternalOrderId,
            QrCode = QrCodeGenerator.Generate(dto.City),
            Status = "new"
        };

        await _orders.AddAsync(order);
        await AutoAssignToGig(order);

        _logger.LogInformation("Integration API: Order {OrderNumber} created by pharmacy {PharmacyId}", order.OrderNumber, pharmacy.Id);

        return Ok(new
        {
            success = true,
            order = new IntegrationOrderResponseDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                TrackingNumber = order.TrackingNumber,
                QrCode = order.QrCode ?? "",
                Status = order.Status,
                StatusLabel = GetStatusLabel(order.Status),
                RecipientName = order.RecipientName,
                DeliveryAddress = $"{order.Street}, {order.City}, {order.State} {order.PostalCode}",
                DeliveryType = order.DeliveryType,
                TimeWindow = order.TimeWindow,
                CopayAmount = order.CopayAmount,
                CopayCollected = order.CopayCollected,
                CreatedAt = order.CreatedAt
            }
        });
    }

    /// <summary>
    /// Get order details by ID or order number
    /// </summary>
    [HttpGet("orders/{identifier}")]
    public async Task<IActionResult> GetOrder(string identifier)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        Order? order;
        if (int.TryParse(identifier, out var orderId))
        {
            order = await _orders.Query()
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.Id == orderId && o.PharmacyId == pharmacy.Id);
        }
        else
        {
            order = await _orders.Query()
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => (o.OrderNumber == identifier || o.TrackingNumber == identifier || o.ExternalOrderId == identifier) && o.PharmacyId == pharmacy.Id);
        }

        if (order == null)
            return NotFound(new { error = "Order not found", code = "ORDER_NOT_FOUND" });

        return Ok(new
        {
            order = MapOrderToResponse(order)
        });
    }

    /// <summary>
    /// List all orders for this pharmacy
    /// </summary>
    [HttpGet("orders")]
    public async Task<IActionResult> ListOrders([FromQuery] string? status, [FromQuery] string? date, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        limit = Math.Min(limit, 100); // Max 100 per page
        var skip = (page - 1) * limit;

        var query = _orders.Query().Where(o => o.PharmacyId == pharmacy.Id);
        
        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);
        
        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var targetDate))
            query = query.Where(o => o.CreatedAt.Date == targetDate.Date);

        var total = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Include(o => o.Driver)
            .ToListAsync();

        return Ok(new
        {
            orders = orders.Select(MapOrderToResponse),
            pagination = new
            {
                page,
                limit,
                total,
                totalPages = (int)Math.Ceiling((double)total / limit)
            }
        });
    }

    /// <summary>
    /// Get real-time tracking for an order
    /// </summary>
    [HttpGet("orders/{identifier}/tracking")]
    public async Task<IActionResult> GetTracking(string identifier)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        Order? order;
        if (int.TryParse(identifier, out var orderId))
        {
            order = await _orders.Query()
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.Id == orderId && o.PharmacyId == pharmacy.Id);
        }
        else
        {
            order = await _orders.Query()
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => (o.OrderNumber == identifier || o.TrackingNumber == identifier) && o.PharmacyId == pharmacy.Id);
        }

        if (order == null)
            return NotFound(new { error = "Order not found", code = "ORDER_NOT_FOUND" });

        var events = new List<TrackingEventDto>
        {
            new() { Status = "new", Description = "Order placed", Timestamp = order.CreatedAt }
        };

        if (order.ActualPickupTime.HasValue)
            events.Add(new() { Status = "picked_up", Description = "Picked up from pharmacy", Timestamp = order.ActualPickupTime.Value });

        if (order.Status == "out_for_delivery" || order.Status == "delivering_now" || order.Status == "delivered")
            events.Add(new() { Status = "out_for_delivery", Description = "Out for delivery", Timestamp = order.UpdatedAt });

        if (order.ActualDeliveryTime.HasValue)
            events.Add(new() { Status = "delivered", Description = "Delivered", Timestamp = order.ActualDeliveryTime.Value });

        DriverLocationDto? driverLocation = null;
        if (order.Driver != null && order.Driver.CurrentLatitude.HasValue && order.Driver.CurrentLongitude.HasValue)
        {
            driverLocation = new DriverLocationDto
            {
                Latitude = order.Driver.CurrentLatitude.Value,
                Longitude = order.Driver.CurrentLongitude.Value,
                UpdatedAt = DateTime.UtcNow
            };
        }

        return Ok(new IntegrationTrackingResponseDto
        {
            OrderNumber = order.OrderNumber,
            TrackingNumber = order.TrackingNumber,
            Status = order.Status,
            StatusLabel = GetStatusLabel(order.Status),
            Events = events,
            DriverLocation = driverLocation
        });
    }

    /// <summary>
    /// Cancel an order (only if not yet picked up)
    /// </summary>
    [HttpDelete("orders/{identifier}")]
    public async Task<IActionResult> CancelOrder(string identifier)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        Order? order;
        if (int.TryParse(identifier, out var orderId))
        {
            order = await _orders.Query().FirstOrDefaultAsync(o => o.Id == orderId && o.PharmacyId == pharmacy.Id);
        }
        else
        {
            order = await _orders.Query().FirstOrDefaultAsync(o => (o.OrderNumber == identifier || o.ExternalOrderId == identifier) && o.PharmacyId == pharmacy.Id);
        }

        if (order == null)
            return NotFound(new { error = "Order not found", code = "ORDER_NOT_FOUND" });

        // Can only cancel if not yet picked up
        var cancelableStatuses = new[] { "new", "assigned" };
        if (!cancelableStatuses.Contains(order.Status))
            return BadRequest(new { error = $"Cannot cancel order in '{order.Status}' status. Order must be 'new' or 'assigned'.", code = "CANNOT_CANCEL" });

        order.Status = "cancelled";
        order.UpdatedAt = DateTime.UtcNow;
        order.DeliveryNotes = "Cancelled via API";
        await _orders.UpdateAsync(order);

        _logger.LogInformation("Integration API: Order {OrderNumber} cancelled by pharmacy {PharmacyId}", order.OrderNumber, pharmacy.Id);

        return Ok(new { success = true, message = "Order cancelled", orderNumber = order.OrderNumber });
    }

    #endregion

    #region Webhooks API

    /// <summary>
    /// Register a webhook to receive order status updates
    /// </summary>
    [HttpPost("webhooks")]
    public async Task<IActionResult> RegisterWebhook([FromBody] RegisterWebhookDto dto)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        if (string.IsNullOrWhiteSpace(dto.Url))
            return BadRequest(new { error = "Webhook URL is required", code = "MISSING_URL" });

        if (!Uri.TryCreate(dto.Url, UriKind.Absolute, out var uri) || (uri.Scheme != "https" && uri.Scheme != "http"))
            return BadRequest(new { error = "Invalid webhook URL. Must be a valid HTTP/HTTPS URL.", code = "INVALID_URL" });

        // Generate webhook secret for signature verification
        var secret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        var webhook = new Webhook
        {
            PharmacyId = pharmacy.Id,
            Url = dto.Url,
            Events = string.Join(",", dto.Events),
            Secret = secret,
            IsActive = true
        };

        await _webhooks.AddAsync(webhook);

        return Ok(new WebhookResponseDto
        {
            Id = webhook.Id,
            Url = webhook.Url,
            Events = dto.Events,
            Secret = webhook.Secret,
            IsActive = webhook.IsActive,
            CreatedAt = webhook.CreatedAt
        });
    }

    /// <summary>
    /// List registered webhooks
    /// </summary>
    [HttpGet("webhooks")]
    public async Task<IActionResult> ListWebhooks()
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        var webhooks = await _webhooks.Query()
            .Where(w => w.PharmacyId == pharmacy.Id)
            .ToListAsync();

        return Ok(new
        {
            webhooks = webhooks.Select(w => new WebhookResponseDto
            {
                Id = w.Id,
                Url = w.Url,
                Events = w.Events.Split(',').ToList(),
                Secret = w.Secret,
                IsActive = w.IsActive,
                CreatedAt = w.CreatedAt
            })
        });
    }

    /// <summary>
    /// Delete a webhook
    /// </summary>
    [HttpDelete("webhooks/{id}")]
    public async Task<IActionResult> DeleteWebhook(int id)
    {
        var (isValid, apiKey, pharmacy) = await ValidateApiKeyAsync();
        if (!isValid || pharmacy == null)
            return Unauthorized(new { error = "Invalid API credentials", code = "INVALID_CREDENTIALS" });

        var webhook = await _webhooks.Query().FirstOrDefaultAsync(w => w.Id == id && w.PharmacyId == pharmacy.Id);
        if (webhook == null)
            return NotFound(new { error = "Webhook not found", code = "WEBHOOK_NOT_FOUND" });

        await _webhooks.DeleteAsync(webhook);
        return Ok(new { success = true, message = "Webhook deleted" });
    }

    #endregion

    #region Helpers

    private IntegrationOrderResponseDto MapOrderToResponse(Order order)
    {
        return new IntegrationOrderResponseDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            TrackingNumber = order.TrackingNumber,
            QrCode = order.QrCode ?? "",
            Status = order.Status,
            StatusLabel = GetStatusLabel(order.Status),
            RecipientName = order.RecipientName,
            DeliveryAddress = $"{order.Street}{(string.IsNullOrEmpty(order.AptUnit) ? "" : $", {order.AptUnit}")}, {order.City}, {order.State} {order.PostalCode}",
            DeliveryType = order.DeliveryType,
            TimeWindow = order.TimeWindow,
            CopayAmount = order.CopayAmount,
            CopayCollected = order.CopayCollected,
            DriverName = order.DriverName,
            ActualPickupTime = order.ActualPickupTime,
            ActualDeliveryTime = order.ActualDeliveryTime,
            CreatedAt = order.CreatedAt,
            PhotoUrl = order.PhotoUrl,
            SignatureUrl = order.SignatureUrl,
            RecipientNameSigned = order.RecipientNameSigned,
            DeliveryNotes = order.DeliveryNotes
        };
    }

    private async Task AutoAssignToGig(Order order)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var cityLower = order.City.ToLower().Trim();
        
        var zone = await _zones.Query()
            .FirstOrDefaultAsync(z => z.IsActive && z.Name.ToLower() == cityLower);
        
        if (zone == null)
        {
            zone = await _zones.Query()
                .FirstOrDefaultAsync(z => z.IsActive && (
                    z.Name.ToLower().Contains(cityLower) || 
                    cityLower.Contains(z.Name.ToLower())
                ));
        }
        
        if (zone == null) return;
        
        var gig = await _plans.Query()
            .FirstOrDefaultAsync(p => p.ServiceZoneId == zone.Id && p.Date == today && p.Status == "draft");
        
        if (gig == null)
        {
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
        
        var existingPlanOrder = await _planOrders.Query()
            .FirstOrDefaultAsync(po => po.OrderId == order.Id);
        
        if (existingPlanOrder == null)
        {
            await _planOrders.AddAsync(new RoutePlanOrder { RoutePlanId = gig.Id, OrderId = order.Id });
        }
        
        order.RoutePlanId = gig.Id;
        await _orders.UpdateAsync(order);
    }

    #endregion
}
