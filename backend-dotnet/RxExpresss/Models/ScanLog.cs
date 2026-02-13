using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RxExpresss.Models;

[BsonIgnoreExtraElements]
public class ScanLog
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("qr_code")]
    public string QrCode { get; set; } = string.Empty;
    
    [BsonElement("order_id")]
    public string? OrderId { get; set; }
    
    [BsonElement("order_number")]
    public string? OrderNumber { get; set; }
    
    [BsonElement("action")]
    public string Action { get; set; } = "verify";
    
    [BsonElement("scanned_by")]
    public string ScannedBy { get; set; } = string.Empty;
    
    [BsonElement("scanned_at")]
    public string ScannedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("location")]
    public LocationPoint? Location { get; set; }
    
    [BsonElement("scanned_by_name")]
    public string? ScannedByName { get; set; }
    
    [BsonElement("scanned_by_role")]
    public string? ScannedByRole { get; set; }
}
