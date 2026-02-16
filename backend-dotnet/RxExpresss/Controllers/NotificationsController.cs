using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using RxExpresss.Models;
using RxExpresss.Services;

namespace RxExpresss.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly MongoDbService _db;
    
    public NotificationsController(MongoDbService db)
    {
        _db = db;
    }
    
    [HttpPost("send")]
    public ActionResult SendNotification([FromBody] NotificationDto dto)
    {
        return Ok(new
        {
            success = true,
            message = $"Notification queued: {dto.Template}",
            notification_type = dto.NotificationType
        });
    }
}

public class NotificationDto
{
    public string? UserId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string NotificationType { get; set; } = "sms";
    public string Template { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
}
