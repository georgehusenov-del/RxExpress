namespace RxExpresss.Core.Entities;

/// <summary>
/// Tracks each delivery attempt for an order.
/// Used for history: how many times attempted, who attempted, failures.
/// </summary>
public class OrderAttemptLog
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int AttemptNumber { get; set; } // 1, 2, 3...
    public string Status { get; set; } = ""; // "delivered", "failed"
    public string? DriverName { get; set; }
    public int? DriverId { get; set; }
    public string? FailureReason { get; set; }
    public string? Notes { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation
    public Order Order { get; set; } = null!;
}
