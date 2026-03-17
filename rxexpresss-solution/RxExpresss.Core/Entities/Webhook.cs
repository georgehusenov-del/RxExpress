namespace RxExpresss.Core.Entities;

public class Webhook
{
    public int Id { get; set; }
    public int PharmacyId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Events { get; set; } = "order.status_changed,order.delivered"; // Comma-separated events
    public string? Secret { get; set; } // For webhook signature verification
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastTriggeredAt { get; set; }
    public int FailureCount { get; set; } = 0;
    
    // Navigation
    public Pharmacy Pharmacy { get; set; } = null!;
}
