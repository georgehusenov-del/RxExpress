using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/delivery")]
[Authorize]
public class DeliveryController : ControllerBase
{
    private readonly MongoDbService _db;
    
    public DeliveryController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpPost("proof")]
    public async Task<ActionResult> SubmitDeliveryProof([FromBody] DeliveryProofDto dto)
    {
        var order = await _db.Orders.Find(o => o.Id == dto.OrderId).FirstOrDefaultAsync();
        if (order == null)
            return NotFound(new { detail = "Order not found" });
        
        var updateBuilder = Builders<Order>.Update
            .Set(o => o.Status, "delivered")
            .Set(o => o.ActualDeliveryTime, DateTime.UtcNow.ToString("o"))
            .Set(o => o.UpdatedAt, DateTime.UtcNow.ToString("o"));
        
        if (!string.IsNullOrEmpty(dto.SignatureData))
        {
            var sigFilename = $"sig_{order.Id}_{DateTime.UtcNow.Ticks}.png";
            var sigPath = Path.Combine("/app/backend/uploads/signatures", sigFilename);
            Directory.CreateDirectory(Path.GetDirectoryName(sigPath)!);
            var sigBytes = Convert.FromBase64String(dto.SignatureData.Contains(",") 
                ? dto.SignatureData.Split(",")[1] : dto.SignatureData);
            await System.IO.File.WriteAllBytesAsync(sigPath, sigBytes);
            updateBuilder = updateBuilder.Set(o => o.SignatureUrl, $"/api/uploads/signatures/{sigFilename}");
        }
        
        if (!string.IsNullOrEmpty(dto.PhotoBase64))
        {
            var photoFilename = $"photo_{order.Id}_{DateTime.UtcNow.Ticks}.png";
            var photoPath = Path.Combine("/app/backend/uploads/photos", photoFilename);
            Directory.CreateDirectory(Path.GetDirectoryName(photoPath)!);
            var photoBytes = Convert.FromBase64String(dto.PhotoBase64.Contains(",") 
                ? dto.PhotoBase64.Split(",")[1] : dto.PhotoBase64);
            await System.IO.File.WriteAllBytesAsync(photoPath, photoBytes);
            updateBuilder = updateBuilder.Push(o => o.PhotoUrls, $"/api/uploads/photos/{photoFilename}");
        }
        
        if (!string.IsNullOrEmpty(dto.RecipientName))
            updateBuilder = updateBuilder.Set(o => o.RecipientNameSigned, dto.RecipientName);
        if (dto.IdVerified)
            updateBuilder = updateBuilder.Set(o => o.IdVerified, true);
        
        updateBuilder = updateBuilder.Set(o => o.DeliveryLocation, new LocationPoint
        {
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Timestamp = DateTime.UtcNow.ToString("o")
        });
        
        var trackingUpdate = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "status", "delivered" },
            { "notes", "Proof of delivery submitted" }
        };
        updateBuilder = updateBuilder.Push(o => o.TrackingUpdates, trackingUpdate);
        
        await _db.Orders.UpdateOneAsync(o => o.Id == dto.OrderId, updateBuilder);
        
        return Ok(new { success = true, message = "Delivery proof submitted successfully" });
    }
    
    [HttpGet("proof/{orderId}")]
    public async Task<ActionResult> GetDeliveryProof(string orderId)
    {
        var order = await _db.Orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null)
            return NotFound(new { detail = "Order not found" });
        
        return Ok(new
        {
            order_id = order.Id,
            signature_url = order.SignatureUrl,
            photo_urls = order.PhotoUrls,
            recipient_name_signed = order.RecipientNameSigned,
            id_verified = order.IdVerified,
            delivery_location = order.DeliveryLocation,
            delivered_at = order.ActualDeliveryTime
        });
    }
}

public class DeliveryProofDto
{
    public string OrderId { get; set; } = string.Empty;
    public string? SignatureData { get; set; }
    public string? PhotoBase64 { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RelationshipToPatient { get; set; } = "self";
    public bool IdVerified { get; set; } = false;
    public string? IdType { get; set; }
    public string? DeliveryNotes { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
