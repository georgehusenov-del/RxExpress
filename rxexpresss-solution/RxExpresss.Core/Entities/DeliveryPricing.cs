namespace RxExpresss.Core.Entities;

public class DeliveryPricing
{
    public int Id { get; set; }
    public string DeliveryType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public bool IsActive { get; set; } = true;
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
    public string? CutoffTime { get; set; }
    public bool IsAddon { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ScanLog
{
    public int Id { get; set; }
    public string QrCode { get; set; } = string.Empty;
    public int? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string Action { get; set; } = "verify";
    public string ScannedBy { get; set; } = string.Empty;
    public string? ScannedByName { get; set; }
    public string? ScannedByRole { get; set; }
    public DateTime ScannedAt { get; set; } = DateTime.UtcNow;

    public Order? Order { get; set; }
}
