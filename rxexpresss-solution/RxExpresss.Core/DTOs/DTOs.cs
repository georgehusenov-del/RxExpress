namespace RxExpresss.Core.DTOs;

// Auth
public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = "Patient";
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = new();
}

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

// Orders
public class CreateOrderDto
{
    public int PharmacyId { get; set; }
    public string DeliveryType { get; set; } = "next_day";
    public string? TimeWindow { get; set; }
    public string? ScheduledDate { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string? RecipientEmail { get; set; }
    public string Street { get; set; } = string.Empty;
    public string? AptUnit { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? DeliveryInstructions { get; set; }
    public decimal CopayAmount { get; set; } = 0;
    public bool IsRefrigerated { get; set; } = false;
}

public class UpdateOrderStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool? IsRefrigerated { get; set; }
}

// Pharmacy
public class CreatePharmacyDto
{
    public string Name { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string? NpiNumber { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

// Driver
public class CreateDriverDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = "driver123";
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string VehicleType { get; set; } = "car";
    public string VehicleNumber { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
}

// Pricing
public class CreatePricingDto
{
    public string DeliveryType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public bool IsActive { get; set; } = true;
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
}

// POD - Proof of Delivery with 3 required photos
public class SubmitPodDto
{
    public string? RecipientName { get; set; }
    public string? PhotoBase64 { get; set; }  // Legacy - single photo (backward compatible)
    public string? PhotoHomeBase64 { get; set; }  // Photo 1: Picture of the home/house
    public string? PhotoAddressBase64 { get; set; }  // Photo 2: Picture showing address
    public string? PhotoPackageBase64 { get; set; }  // Photo 3: Package in front of home
    public string? SignatureBase64 { get; set; }  // Optional - Base64 encoded signature
    public string? Notes { get; set; }  // Optional delivery notes
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

// Forgot Password
public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

// Register Pharmacy
public class RegisterPharmacyDto
{
    public string PharmacyName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

// User Management
public class CreateUserDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = "Operator";
    public bool IsActive { get; set; } = true;
}

public class UpdateUserDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

// Route Plan Update
public class UpdatePlanDto
{
    public string? Title { get; set; }
    public string? Date { get; set; }
    public string? Status { get; set; }
    public string? OptimizationStatus { get; set; }
    public bool? Distributed { get; set; }
}

// Admin API Key Management
public class CreateApiKeyForPharmacyDto
{
    public int PharmacyId { get; set; }
    public string? Name { get; set; }
}

// Office Location Management
public class CreateOfficeLocationDto
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int? RadiusMeters { get; set; }
    public bool? IsDefault { get; set; }
}

public class UpdateOfficeLocationDto
{
    public string? Name { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? RadiusMeters { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsDefault { get; set; }
}


// Permissions
public class SetPermissionsDto
{
    public List<string> Permissions { get; set; } = new();
}

// Admin Order Creation
public class AdminCreateOrderDto
{
    public int PharmacyId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string? RecipientEmail { get; set; }
    public string Street { get; set; } = string.Empty;
    public string? AptUnit { get; set; }
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string PostalCode { get; set; } = string.Empty;
    public string? DeliveryType { get; set; }
    public string? TimeWindow { get; set; }
    public string? ScheduledDate { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? DeliveryInstructions { get; set; }
    public decimal CopayAmount { get; set; }
    public bool IsRefrigerated { get; set; }
}

// Duplicate Order
public class DuplicateOrderDto
{
    public decimal LabourCost { get; set; } = 10.00m;
}

// Log Attempt
public class LogAttemptDto
{
    public string Status { get; set; } = "failed"; // "failed" or "delivered"
    public string? DriverName { get; set; }
    public string? FailureReason { get; set; }
    public string? Notes { get; set; }
}
