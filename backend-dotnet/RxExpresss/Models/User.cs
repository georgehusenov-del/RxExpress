using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RxExpresss.Models;

[BsonIgnoreExtraElements]
public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;
    
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [BsonElement("first_name")]
    public string FirstName { get; set; } = string.Empty;
    
    [BsonElement("last_name")]
    public string LastName { get; set; } = string.Empty;
    
    [BsonElement("role")]
    public string Role { get; set; } = "patient";
    
    [BsonElement("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("is_verified")]
    public bool IsVerified { get; set; } = false;
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

[BsonIgnoreExtraElements]
public class Address
{
    [BsonElement("street")]
    public string Street { get; set; } = string.Empty;
    
    [BsonElement("apt_unit")]
    public string? AptUnit { get; set; }
    
    [BsonElement("city")]
    public string City { get; set; } = string.Empty;
    
    [BsonElement("state")]
    public string State { get; set; } = string.Empty;
    
    [BsonElement("postal_code")]
    public string PostalCode { get; set; } = string.Empty;
    
    [BsonElement("country")]
    public string Country { get; set; } = "USA";
    
    [BsonElement("latitude")]
    public double? Latitude { get; set; }
    
    [BsonElement("longitude")]
    public double? Longitude { get; set; }
    
    [BsonElement("delivery_instructions")]
    public string? DeliveryInstructions { get; set; }
}

[BsonIgnoreExtraElements]
public class LocationPoint
{
    [BsonElement("latitude")]
    public double Latitude { get; set; }
    
    [BsonElement("longitude")]
    public double Longitude { get; set; }
    
    [BsonElement("address")]
    public string? Address { get; set; }
    
    [BsonElement("timestamp")]
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
}

[BsonIgnoreExtraElements]
public class PharmacyLocation
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("address")]
    public Address Address { get; set; } = new();
    
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [BsonElement("is_primary")]
    public bool IsPrimary { get; set; } = false;
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("operating_hours")]
    public Dictionary<string, string>? OperatingHours { get; set; }
    
    [BsonElement("pickup_instructions")]
    public string? PickupInstructions { get; set; }
}

[BsonIgnoreExtraElements]
public class Pharmacy
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("user_id")]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("license_number")]
    public string LicenseNumber { get; set; } = string.Empty;
    
    [BsonElement("npi_number")]
    public string? NpiNumber { get; set; }
    
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;
    
    [BsonElement("website")]
    public string? Website { get; set; }
    
    [BsonElement("address")]
    public Address? Address { get; set; }
    
    [BsonElement("locations")]
    public List<PharmacyLocation> Locations { get; set; } = new();
    
    [BsonElement("service_zones")]
    public List<string> ServiceZones { get; set; } = new();
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("is_verified")]
    public bool IsVerified { get; set; } = false;
    
    [BsonElement("rating")]
    public double Rating { get; set; } = 0.0;
    
    [BsonElement("total_deliveries")]
    public int TotalDeliveries { get; set; } = 0;
    
    [BsonElement("api_key")]
    public string? ApiKey { get; set; }
    
    [BsonElement("webhook_url")]
    public string? WebhookUrl { get; set; }
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("operating_hours")]
    public Dictionary<string, string>? OperatingHours { get; set; }
}

[BsonIgnoreExtraElements]
public class DriverProfile
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("user_id")]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("vehicle_type")]
    public string VehicleType { get; set; } = string.Empty;
    
    [BsonElement("vehicle_number")]
    public string VehicleNumber { get; set; } = string.Empty;
    
    [BsonElement("license_number")]
    public string LicenseNumber { get; set; } = string.Empty;
    
    [BsonElement("insurance_info")]
    public string? InsuranceInfo { get; set; }
    
    [BsonElement("status")]
    public string Status { get; set; } = "offline";
    
    [BsonElement("current_location")]
    public LocationPoint? CurrentLocation { get; set; }
    
    [BsonElement("service_zones")]
    public List<string> ServiceZones { get; set; } = new();
    
    [BsonElement("rating")]
    public double Rating { get; set; } = 0.0;
    
    [BsonElement("total_deliveries")]
    public int TotalDeliveries { get; set; } = 0;
    
    [BsonElement("is_verified")]
    public bool IsVerified { get; set; } = false;
    
    [BsonElement("circuit_driver_id")]
    public string? CircuitDriverId { get; set; }
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}
