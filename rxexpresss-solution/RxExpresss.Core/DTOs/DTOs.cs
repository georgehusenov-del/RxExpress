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
}

public class UpdateOrderStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
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

// POD
public class SubmitPodDto
{
    public string? RecipientName { get; set; }
    public string? PhotoBase64 { get; set; }  // Required - Base64 encoded photo
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
    public string Role { get; set; } = "Patient";
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
