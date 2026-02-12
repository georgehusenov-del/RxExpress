using System.ComponentModel.DataAnnotations;

namespace RxExpresss.DTOs;

// ============== Auth DTOs ==============
public class UserCreateDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
    
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    [Required]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    public string Role { get; set; } = "patient";
}

public class UserLoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UserResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public UserResponseDto User { get; set; } = new();
}

// ============== Address DTOs ==============
public class AddressDto
{
    [Required]
    public string Street { get; set; } = string.Empty;
    public string? AptUnit { get; set; }
    
    [Required]
    public string City { get; set; } = string.Empty;
    
    [Required]
    public string State { get; set; } = string.Empty;
    
    [Required]
    public string PostalCode { get; set; } = string.Empty;
    
    public string Country { get; set; } = "USA";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? DeliveryInstructions { get; set; }
}

// ============== Pharmacy DTOs ==============
public class PharmacyCreateDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string LicenseNumber { get; set; } = string.Empty;
    
    public string? NpiNumber { get; set; }
    
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    public string? Website { get; set; }
    
    [Required]
    public AddressDto Address { get; set; } = new();
    
    public Dictionary<string, string>? OperatingHours { get; set; }
}

public class PharmacyLocationCreateDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public AddressDto Address { get; set; } = new();
    
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    public bool IsPrimary { get; set; } = false;
    public Dictionary<string, string>? OperatingHours { get; set; }
    public string? PickupInstructions { get; set; }
}

// ============== Driver DTOs ==============
public class DriverCreateDto
{
    [Required]
    public string VehicleType { get; set; } = string.Empty;
    
    [Required]
    public string VehicleNumber { get; set; } = string.Empty;
    
    [Required]
    public string LicenseNumber { get; set; } = string.Empty;
    
    public string? InsuranceInfo { get; set; }
    public List<string> ServiceZones { get; set; } = new();
}

public class DriverLocationUpdateDto
{
    [Required]
    public string DriverId { get; set; } = string.Empty;
    
    [Required, Range(-90, 90)]
    public double Latitude { get; set; }
    
    [Required, Range(-180, 180)]
    public double Longitude { get; set; }
}

public class DriverStatusUpdateDto
{
    [Required]
    public string DriverId { get; set; } = string.Empty;
    
    [Required]
    public string Status { get; set; } = string.Empty;
}

// ============== Order DTOs ==============
public class DeliveryRecipientDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    public string? Email { get; set; }
    public string? DateOfBirth { get; set; }
    public string Relationship { get; set; } = "self";
}

public class PrescriptionItemDto
{
    [Required]
    public string MedicationName { get; set; } = string.Empty;
    
    public string? RxNumber { get; set; }
    public int Quantity { get; set; }
    public string Dosage { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public bool RequiresRefrigeration { get; set; } = false;
    public bool ControlledSubstance { get; set; } = false;
    public bool RequiresIdVerification { get; set; } = false;
}

public class PackageDto
{
    public string? Id { get; set; }
    public string? QrCode { get; set; }
    public string? Barcode { get; set; }
    public List<PrescriptionItemDto> Prescriptions { get; set; } = new();
    public double? WeightLbs { get; set; }
    public bool RequiresRefrigeration { get; set; } = false;
    public bool RequiresSignature { get; set; } = true;
    public bool RequiresIdVerification { get; set; } = false;
    public string? SpecialInstructions { get; set; }
}

public class OrderCreateDto
{
    [Required]
    public string PharmacyId { get; set; } = string.Empty;
    
    public string? PharmacyLocationId { get; set; }
    
    public string DeliveryType { get; set; } = "next_day";
    public string? TimeWindow { get; set; }
    
    [Required]
    public DeliveryRecipientDto Recipient { get; set; } = new();
    
    [Required]
    public AddressDto DeliveryAddress { get; set; } = new();
    
    public List<PackageDto> Packages { get; set; } = new();
    public string? DeliveryNotes { get; set; }
    public string? ScheduledDate { get; set; }
    public bool RequiresSignature { get; set; } = true;
    public bool RequiresPhotoProof { get; set; } = true;
    public bool RequiresIdVerification { get; set; } = false;
    public double CopayAmount { get; set; } = 0.0;
}

public class OrderUpdateDto
{
    public string? Status { get; set; }
    public string? DriverId { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? TimeWindow { get; set; }
}

public class OrderStatusUpdateDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
    
    public string? Notes { get; set; }
}

public class OrderReassignDto
{
    public string? TimeWindow { get; set; }
    public string? DriverId { get; set; }
}

// ============== Pricing DTOs ==============
public class DeliveryPricingCreateDto
{
    [Required]
    public string DeliveryType { get; set; } = string.Empty;
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Required]
    public double BasePrice { get; set; }
    
    public bool IsActive { get; set; } = true;
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
    public string? CutoffTime { get; set; }
    public bool IsAddon { get; set; } = false;
}

public class DeliveryPricingUpdateDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public double? BasePrice { get; set; }
    public bool? IsActive { get; set; }
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
    public string? CutoffTime { get; set; }
}

// ============== Route Optimization DTOs ==============
public class RouteOptimizationRequestDto
{
    public List<string> OrderIds { get; set; } = new();
    public string? Borough { get; set; }
    public string? TimeWindow { get; set; }
    public int? StartHour { get; set; }
}

// ============== Admin DTOs ==============
public class AdminStatsDto
{
    public int TotalUsers { get; set; }
    public int ActivePharmacies { get; set; }
    public int ActiveDrivers { get; set; }
    public int PendingOrders { get; set; }
    public int ReadyForPickup { get; set; }
    public int InTransit { get; set; }
    public int DeliveredToday { get; set; }
    public double CopayToCollect { get; set; }
    public double CopayCollected { get; set; }
}
