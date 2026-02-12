using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RxExpresss.Models;

[BsonIgnoreExtraElements]
public class DeliveryRecipient
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [BsonElement("email")]
    public string? Email { get; set; }
    
    [BsonElement("date_of_birth")]
    public string? DateOfBirth { get; set; }
    
    [BsonElement("relationship")]
    public string Relationship { get; set; } = "self";
}

public class PrescriptionItem
{
    [BsonElement("medication_name")]
    public string MedicationName { get; set; } = string.Empty;
    
    [BsonElement("rx_number")]
    public string? RxNumber { get; set; }
    
    [BsonElement("quantity")]
    public int Quantity { get; set; }
    
    [BsonElement("dosage")]
    public string Dosage { get; set; } = string.Empty;
    
    [BsonElement("instructions")]
    public string? Instructions { get; set; }
    
    [BsonElement("requires_refrigeration")]
    public bool RequiresRefrigeration { get; set; } = false;
    
    [BsonElement("controlled_substance")]
    public bool ControlledSubstance { get; set; } = false;
    
    [BsonElement("requires_id_verification")]
    public bool RequiresIdVerification { get; set; } = false;
}

[BsonIgnoreExtraElements]
public class Package
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("qr_code")]
    public string QrCode { get; set; } = $"RX-PKG-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    
    [BsonElement("barcode")]
    public string? Barcode { get; set; }
    
    [BsonElement("prescriptions")]
    public List<PrescriptionItem> Prescriptions { get; set; } = new();
    
    [BsonElement("weight_lbs")]
    public double? WeightLbs { get; set; }
    
    [BsonElement("requires_refrigeration")]
    public bool RequiresRefrigeration { get; set; } = false;
    
    [BsonElement("requires_signature")]
    public bool RequiresSignature { get; set; } = true;
    
    [BsonElement("requires_id_verification")]
    public bool RequiresIdVerification { get; set; } = false;
    
    [BsonElement("special_instructions")]
    public string? SpecialInstructions { get; set; }
    
    [BsonElement("scanned_at")]
    public string? ScannedAt { get; set; }
}

[BsonIgnoreExtraElements]
public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("order_number")]
    public string OrderNumber { get; set; } = $"RX-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    
    [BsonElement("tracking_number")]
    public string TrackingNumber { get; set; } = $"TRK-{Guid.NewGuid().ToString()[..10].ToUpper()}";
    
    [BsonElement("qr_code")]
    public string? QrCode { get; set; }
    
    // Pharmacy info
    [BsonElement("pharmacy_id")]
    public string PharmacyId { get; set; } = string.Empty;
    
    [BsonElement("pharmacy_location_id")]
    public string? PharmacyLocationId { get; set; }
    
    [BsonElement("pharmacy_name")]
    public string? PharmacyName { get; set; }
    
    // Delivery type
    [BsonElement("delivery_type")]
    public string DeliveryType { get; set; } = "next_day";
    
    [BsonElement("time_window")]
    public string? TimeWindow { get; set; }
    
    // Recipient
    [BsonElement("recipient")]
    public DeliveryRecipient Recipient { get; set; } = new();
    
    [BsonElement("delivery_address")]
    public Address DeliveryAddress { get; set; } = new();
    
    [BsonElement("pickup_address")]
    public Address? PickupAddress { get; set; }
    
    // Packages
    [BsonElement("packages")]
    public List<Package> Packages { get; set; } = new();
    
    [BsonElement("total_packages")]
    public int TotalPackages { get; set; } = 0;
    
    // Driver
    [BsonElement("driver_id")]
    public string? DriverId { get; set; }
    
    [BsonElement("driver_name")]
    public string? DriverName { get; set; }
    
    // Status & Timing
    [BsonElement("status")]
    public string Status { get; set; } = "pending";
    
    [BsonElement("scheduled_date")]
    public string? ScheduledDate { get; set; }
    
    [BsonElement("estimated_pickup_time")]
    public string? EstimatedPickupTime { get; set; }
    
    [BsonElement("estimated_delivery_start")]
    public string? EstimatedDeliveryStart { get; set; }
    
    [BsonElement("estimated_delivery_end")]
    public string? EstimatedDeliveryEnd { get; set; }
    
    [BsonElement("actual_pickup_time")]
    public string? ActualPickupTime { get; set; }
    
    [BsonElement("actual_delivery_time")]
    public string? ActualDeliveryTime { get; set; }
    
    // Delivery requirements
    [BsonElement("delivery_notes")]
    public string? DeliveryNotes { get; set; }
    
    [BsonElement("requires_signature")]
    public bool RequiresSignature { get; set; } = true;
    
    [BsonElement("requires_photo_proof")]
    public bool RequiresPhotoProof { get; set; } = true;
    
    [BsonElement("requires_id_verification")]
    public bool RequiresIdVerification { get; set; } = false;
    
    // Proof of delivery
    [BsonElement("signature_url")]
    public string? SignatureUrl { get; set; }
    
    [BsonElement("photo_urls")]
    public List<string> PhotoUrls { get; set; } = new();
    
    [BsonElement("recipient_name_signed")]
    public string? RecipientNameSigned { get; set; }
    
    [BsonElement("id_verified")]
    public bool IdVerified { get; set; } = false;
    
    [BsonElement("delivery_location")]
    public LocationPoint? DeliveryLocation { get; set; }
    
    // Circuit integration
    [BsonElement("circuit_plan_id")]
    public string? CircuitPlanId { get; set; }
    
    [BsonElement("circuit_stop_id")]
    public string? CircuitStopId { get; set; }
    
    [BsonElement("circuit_tracking_url")]
    public string? CircuitTrackingUrl { get; set; }
    
    // Pricing
    [BsonElement("service_zone_id")]
    public string? ServiceZoneId { get; set; }
    
    [BsonElement("delivery_fee")]
    public double DeliveryFee { get; set; } = 5.99;
    
    [BsonElement("priority_surcharge")]
    public double PrioritySurcharge { get; set; } = 0.0;
    
    [BsonElement("total_amount")]
    public double TotalAmount { get; set; } = 5.99;
    
    // Copay collection
    [BsonElement("copay_amount")]
    public double CopayAmount { get; set; } = 0.0;
    
    [BsonElement("copay_collected")]
    public bool CopayCollected { get; set; } = false;
    
    [BsonElement("copay_collected_at")]
    public string? CopayCollectedAt { get; set; }
    
    [BsonElement("copay_collection_method")]
    public string? CopayCollectionMethod { get; set; }
    
    // Payment
    [BsonElement("payment_status")]
    public string PaymentStatus { get; set; } = "pending";
    
    [BsonElement("payment_session_id")]
    public string? PaymentSessionId { get; set; }
    
    // Tracking
    [BsonElement("tracking_url")]
    public string? TrackingUrl { get; set; }
    
    [BsonElement("tracking_updates")]
    public List<Dictionary<string, object>> TrackingUpdates { get; set; } = new();
    
    // Timestamps
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class DeliveryPricing
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("delivery_type")]
    public string DeliveryType { get; set; } = string.Empty;
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("description")]
    public string? Description { get; set; }
    
    [BsonElement("base_price")]
    public double BasePrice { get; set; } = 0.0;
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("time_window_start")]
    public string? TimeWindowStart { get; set; }
    
    [BsonElement("time_window_end")]
    public string? TimeWindowEnd { get; set; }
    
    [BsonElement("cutoff_time")]
    public string? CutoffTime { get; set; }
    
    [BsonElement("is_addon")]
    public bool IsAddon { get; set; } = false;
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    
    [BsonElement("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class ServiceZone
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MongoId { get; set; }
    
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;
    
    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
    
    [BsonElement("zip_codes")]
    public List<string> ZipCodes { get; set; } = new();
    
    [BsonElement("cities")]
    public List<string> Cities { get; set; } = new();
    
    [BsonElement("states")]
    public List<string> States { get; set; } = new();
    
    [BsonElement("delivery_fee")]
    public double DeliveryFee { get; set; } = 5.99;
    
    [BsonElement("same_day_cutoff")]
    public string SameDayCutoff { get; set; } = "14:00";
    
    [BsonElement("priority_surcharge")]
    public double PrioritySurcharge { get; set; } = 5.00;
    
    [BsonElement("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}
