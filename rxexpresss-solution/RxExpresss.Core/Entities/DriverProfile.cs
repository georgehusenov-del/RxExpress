namespace RxExpresss.Core.Entities;

public class DriverProfile
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? CircuitDriverId { get; set; } // Circuit API Driver ID
    public string VehicleType { get; set; } = "car";
    public string VehicleNumber { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "offline"; // available, on_route, on_break, offline
    public double? CurrentLatitude { get; set; }
    public double? CurrentLongitude { get; set; }
    public double? CurrentSpeed { get; set; } // Speed in m/s
    public double? CurrentHeading { get; set; } // Heading in degrees
    public DateTime? LastLocationUpdate { get; set; } // When location was last reported
    public double Rating { get; set; } = 0.0;
    public int TotalDeliveries { get; set; } = 0;
    public bool IsVerified { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ApplicationUser User { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
