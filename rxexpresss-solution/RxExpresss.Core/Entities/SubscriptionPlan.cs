namespace RxExpresss.Core.Entities;

/// <summary>
/// Subscription plan tier (Starter / Pro / Enterprise).
/// Plans are cached here locally but the source of truth for Prices lives in Stripe.
/// Editable via appsettings.json -> Subscriptions:Plans OR seeded from Stripe.
/// </summary>
public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;        // "starter" | "pro" | "enterprise"
    public string Name { get; set; } = string.Empty;        // Display name
    public string Description { get; set; } = string.Empty;

    // Stripe IDs
    public string? StripeProductId { get; set; }
    public string? StripeMonthlyPriceId { get; set; }
    public string? StripeAnnualPriceId { get; set; }

    // Pricing (display)
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }   // 20% discount baked in
    public string Currency { get; set; } = "usd";

    // Feature limits (-1 = unlimited)
    public int MaxOrdersPerMonth { get; set; }
    public int MaxActiveDrivers { get; set; }
    public bool ApiAccess { get; set; }
    public bool WebhookAccess { get; set; }
    public bool AdvancedReports { get; set; }
    public bool RouteOptimization { get; set; }
    public bool PrioritySupport { get; set; }

    // Trial
    public int TrialDays { get; set; } = 30;

    // Meta
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
