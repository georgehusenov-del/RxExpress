namespace RxExpresss.Core.Entities;

/// <summary>
/// Office/Hub location for geo-fencing driver scans
/// Drivers must be within radius of office to scan "At Office"
/// </summary>
public class OfficeLocation
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int RadiusMeters { get; set; } = 100; // Default 100m radius for geo-lock
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false; // Primary office
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
