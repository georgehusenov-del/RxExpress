namespace RxExpresss.Core.Entities;

public enum SubscriptionStatus
{
    Incomplete = 0,       // Checkout started but not finalized
    Trialing = 1,         // In trial period
    TrialPendingConfirm = 2, // Trial ending soon, awaiting user opt-in (custom state)
    Active = 3,
    PastDue = 4,          // Payment failed, grace period
    Canceled = 5,
    Unpaid = 6,           // Hard lock - payment failed repeatedly
    Expired = 7,          // Trial ended without conversion
}

public enum BillingInterval
{
    Monthly = 0,
    Annual = 1,
}

public class PharmacySubscription
{
    public int Id { get; set; }
    public int PharmacyId { get; set; }
    public int SubscriptionPlanId { get; set; }

    // Stripe IDs
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? StripeCheckoutSessionId { get; set; }
    public string? StripePriceId { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Incomplete;
    public BillingInterval Interval { get; set; } = BillingInterval.Monthly;

    // Lifecycle timestamps
    public DateTime? TrialStart { get; set; }
    public DateTime? TrialEnd { get; set; }
    public DateTime? CurrentPeriodStart { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? CanceledAt { get; set; }
    public DateTime? EndedAt { get; set; }

    // User explicit opt-in to convert trial -> paid
    public bool TrialConversionConfirmed { get; set; } = false;
    public DateTime? TrialConversionConfirmedAt { get; set; }

    // If true, Stripe sub is set to cancel at period end
    public bool CancelAtPeriodEnd { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Pharmacy? Pharmacy { get; set; }
    public SubscriptionPlan? Plan { get; set; }
}

public class SubscriptionInvoice
{
    public int Id { get; set; }
    public int PharmacySubscriptionId { get; set; }
    public string? StripeInvoiceId { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public string? HostedInvoiceUrl { get; set; }
    public string? InvoicePdfUrl { get; set; }
    public decimal Amount { get; set; }
    public decimal AmountPaid { get; set; }
    public string Currency { get; set; } = "usd";
    public string Status { get; set; } = "open"; // open/paid/void/uncollectible
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public PharmacySubscription? PharmacySubscription { get; set; }
}

/// <summary>
/// Per-period usage counter (orders created / drivers active / etc.)
/// Enforces plan limits (e.g. 100 orders/mo on Starter).
/// </summary>
public class SubscriptionUsage
{
    public int Id { get; set; }
    public int PharmacyId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }    // 1-12
    public int OrdersCreated { get; set; }
    public int ActiveDrivers { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class PaymentTransaction
{
    public int Id { get; set; }
    public int? PharmacyId { get; set; }
    public int? PharmacySubscriptionId { get; set; }
    public string? StripeSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string Kind { get; set; } = "subscription"; // subscription/one-time
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "usd";
    public string Status { get; set; } = "initiated"; // initiated/pending/paid/failed/canceled
    public string? Metadata { get; set; }   // JSON blob
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
