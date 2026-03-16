namespace RxExpresss.Core.Entities;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = $"RX-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    public string TrackingNumber { get; set; } = $"TRK-{Guid.NewGuid().ToString()[..10].ToUpper()}";
    public string? QrCode { get; set; }

    // Pharmacy
    public int PharmacyId { get; set; }
    public string? PharmacyName { get; set; }

    // Delivery
    public string DeliveryType { get; set; } = "next_day";
    public string? TimeWindow { get; set; }
    public string? ScheduledDate { get; set; }

    // Recipient
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string? RecipientEmail { get; set; }

    // Delivery Address
    public string Street { get; set; } = string.Empty;
    public string? AptUnit { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? DeliveryInstructions { get; set; }

    // Driver
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public string? CircuitStopId { get; set; } // Circuit API Stop ID for tracking
    
    // Gig/Route Plan
    public int? RoutePlanId { get; set; } // Which gig this order belongs to

    // Status
    public string Status { get; set; } = "new";
    public string? DeliveryNotes { get; set; }
    public bool RequiresSignature { get; set; } = true;
    public bool RequiresPhotoProof { get; set; } = true;
    public bool IsRefrigerated { get; set; } = false; // Blue/frost highlight for cold chain items

    // POD
    public string? SignatureUrl { get; set; }
    public string? PhotoUrl { get; set; }
    public string? RecipientNameSigned { get; set; }

    // Pricing
    public decimal DeliveryFee { get; set; } = 5.99m;
    public decimal TotalAmount { get; set; } = 5.99m;
    public decimal CopayAmount { get; set; } = 0.0m;
    public bool CopayCollected { get; set; } = false;

    // Timestamps
    public DateTime? ActualPickupTime { get; set; }
    public DateTime? ActualDeliveryTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Pharmacy Pharmacy { get; set; } = null!;
    public DriverProfile? Driver { get; set; }
}
