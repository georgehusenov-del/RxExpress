namespace RxExpresss.Core.Entities;

public class RoutePlan
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string Status { get; set; } = "draft"; // draft, optimized, distributed
    public string OptimizationStatus { get; set; } = "not_started";
    public bool Distributed { get; set; } = false;
    public string? CircuitPlanId { get; set; } // Circuit API Plan ID
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class RoutePlanDriver
{
    public int Id { get; set; }
    public int RoutePlanId { get; set; }
    public int DriverId { get; set; }
    public RoutePlan RoutePlan { get; set; } = null!;
    public DriverProfile Driver { get; set; } = null!;
}

public class RoutePlanOrder
{
    public int Id { get; set; }
    public int RoutePlanId { get; set; }
    public int OrderId { get; set; }
    public RoutePlan RoutePlan { get; set; } = null!;
    public Order Order { get; set; } = null!;
}

public class ServiceZone
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string ZipCodes { get; set; } = ""; // comma-separated
    public double DeliveryFee { get; set; } = 5.99;
    public string SameDayCutoff { get; set; } = "14:00";
    public double PrioritySurcharge { get; set; } = 5.00;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
