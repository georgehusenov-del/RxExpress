namespace RxExpresss.Core.DTOs;

// API Key DTOs
public class CreateApiKeyDto
{
    public string Name { get; set; } = "Default API Key";
}

public class ApiKeyResponseDto
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public int RequestCount { get; set; }
}

// Webhook DTOs
public class RegisterWebhookDto
{
    public string Url { get; set; } = string.Empty;
    public List<string> Events { get; set; } = new() { "order.status_changed", "order.delivered" };
}

public class WebhookResponseDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public List<string> Events { get; set; } = new();
    public string? Secret { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Integration Order DTOs (for external systems)
public class IntegrationCreateOrderDto
{
    // Patient/Recipient Info
    public string PatientName { get; set; } = string.Empty;
    public string PatientPhone { get; set; } = string.Empty;
    public string? PatientEmail { get; set; }
    
    // Delivery Address
    public string Street { get; set; } = string.Empty;
    public string? AptUnit { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    
    // Delivery Options
    public string DeliveryType { get; set; } = "same_day"; // same_day, next_day, scheduled
    public string? TimeWindow { get; set; } // morning, afternoon, evening
    public string? ScheduledDate { get; set; } // yyyy-MM-dd format
    public string? DeliveryInstructions { get; set; }
    
    // Prescription Info
    public string? RxNumber { get; set; }
    public decimal CopayAmount { get; set; } = 0;
    public bool RequiresSignature { get; set; } = true;
    public bool RequiresRefrigeration { get; set; } = false;
    
    // Optional: External Reference
    public string? ExternalOrderId { get; set; } // Pharmacy's internal order ID
}

public class IntegrationOrderResponseDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    
    // Recipient
    public string RecipientName { get; set; } = string.Empty;
    public string DeliveryAddress { get; set; } = string.Empty;
    
    // Delivery
    public string DeliveryType { get; set; } = string.Empty;
    public string? TimeWindow { get; set; }
    public decimal CopayAmount { get; set; }
    public bool CopayCollected { get; set; }
    
    // Driver Info (when assigned)
    public string? DriverName { get; set; }
    public string? DriverPhone { get; set; }
    
    // Timestamps
    public DateTime? EstimatedDeliveryTime { get; set; }
    public DateTime? ActualPickupTime { get; set; }
    public DateTime? ActualDeliveryTime { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // POD (when delivered)
    public string? PhotoUrl { get; set; }
    public string? SignatureUrl { get; set; }
    public string? RecipientNameSigned { get; set; }
    public string? DeliveryNotes { get; set; }
}

public class IntegrationTrackingResponseDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public List<TrackingEventDto> Events { get; set; } = new();
    public DriverLocationDto? DriverLocation { get; set; }
}

public class TrackingEventDto
{
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class DriverLocationDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// Webhook Payload DTOs
public class WebhookPayloadDto
{
    public string Event { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public WebhookOrderDataDto Data { get; set; } = new();
}

public class WebhookOrderDataDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public string? ExternalOrderId { get; set; }
    
    // POD fields (only for delivered events)
    public string? PhotoUrl { get; set; }
    public string? SignatureUrl { get; set; }
    public string? RecipientNameSigned { get; set; }
    public string? DeliveryNotes { get; set; }
    public DateTime? DeliveredAt { get; set; }
}
