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
    public string? SignatureData { get; set; }
    public string? PhotoData { get; set; }
    public string? RecipientName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
