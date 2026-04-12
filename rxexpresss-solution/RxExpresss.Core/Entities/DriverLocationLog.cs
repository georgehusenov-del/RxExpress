namespace RxExpresss.Core.Entities;

/// <summary>
/// Stores driver GPS location history for trail/breadcrumb visualization
/// </summary>
public class DriverLocationLog
{
    public int Id { get; set; }
    public int DriverId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Speed { get; set; } // m/s
    public double? Heading { get; set; } // degrees
    public double? Accuracy { get; set; } // meters
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation
    public DriverProfile Driver { get; set; } = null!;
}
