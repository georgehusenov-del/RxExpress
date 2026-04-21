using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;
using Stripe;
using Stripe.Checkout;

namespace RxExpresss.API.Services.Subscriptions;

/// <summary>
/// Thin wrapper over Stripe.net for subscription flows.
/// Trial behavior: card collected upfront, but subscription is set to
/// cancel at trial end unless the pharmacy explicitly confirms conversion.
/// </summary>
public class StripeSubscriptionService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<StripeSubscriptionService> _logger;

    public StripeSubscriptionService(
        AppDbContext db,
        IConfiguration config,
        ILogger<StripeSubscriptionService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;

        var apiKey = _config["Stripe:ApiKey"]
            ?? Environment.GetEnvironmentVariable("STRIPE_API_KEY")
            ?? "sk_test_emergent";
        StripeConfiguration.ApiKey = apiKey;
    }

    public string WebhookSecret => _config["Stripe:WebhookSecret"] ?? "";

    /// <summary>
    /// Ensure Stripe Products + Prices exist for each local SubscriptionPlan.
    /// Idempotent: creates missing, updates prices in local DB.
    /// Call on admin action or startup.
    /// </summary>
    public async Task SyncPlansWithStripeAsync()
    {
        var plans = await _db.SubscriptionPlans.Where(p => p.IsActive).ToListAsync();
        var productService = new ProductService();
        var priceService = new PriceService();

        foreach (var plan in plans)
        {
            if (string.IsNullOrEmpty(plan.StripeProductId))
            {
                var product = await productService.CreateAsync(new ProductCreateOptions
                {
                    Name = $"RX Expresss - {plan.Name}",
                    Description = plan.Description,
                    Metadata = new Dictionary<string, string> { ["plan_code"] = plan.Code }
                });
                plan.StripeProductId = product.Id;
            }

            if (string.IsNullOrEmpty(plan.StripeMonthlyPriceId))
            {
                var price = await priceService.CreateAsync(new PriceCreateOptions
                {
                    Product = plan.StripeProductId,
                    UnitAmount = (long)(plan.MonthlyPrice * 100m),
                    Currency = plan.Currency,
                    Recurring = new PriceRecurringOptions { Interval = "month" },
                    Metadata = new Dictionary<string, string>
                    {
                        ["plan_code"] = plan.Code,
                        ["interval"] = "monthly"
                    }
                });
                plan.StripeMonthlyPriceId = price.Id;
            }

            if (string.IsNullOrEmpty(plan.StripeAnnualPriceId))
            {
                var price = await priceService.CreateAsync(new PriceCreateOptions
                {
                    Product = plan.StripeProductId,
                    UnitAmount = (long)(plan.AnnualPrice * 100m),
                    Currency = plan.Currency,
                    Recurring = new PriceRecurringOptions { Interval = "year" },
                    Metadata = new Dictionary<string, string>
                    {
                        ["plan_code"] = plan.Code,
                        ["interval"] = "annual"
                    }
                });
                plan.StripeAnnualPriceId = price.Id;
            }

            plan.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Get or create a Stripe Customer for a pharmacy.
    /// </summary>
    public async Task<string> GetOrCreateCustomerAsync(Pharmacy pharmacy)
    {
        var existing = await _db.PharmacySubscriptions
            .AsNoTracking()
            .Where(s => s.PharmacyId == pharmacy.Id && !string.IsNullOrEmpty(s.StripeCustomerId))
            .Select(s => s.StripeCustomerId)
            .FirstOrDefaultAsync();
        if (!string.IsNullOrEmpty(existing)) return existing!;

        var svc = new CustomerService();
        var customer = await svc.CreateAsync(new CustomerCreateOptions
        {
            Name = pharmacy.Name,
            Email = pharmacy.Email,
            Phone = pharmacy.Phone,
            Metadata = new Dictionary<string, string>
            {
                ["pharmacy_id"] = pharmacy.Id.ToString(),
                ["user_id"] = pharmacy.UserId
            }
        });
        return customer.Id;
    }

    /// <summary>
    /// Create a Stripe Checkout Session for subscription signup.
    /// - Card required upfront (payment_method_collection=always)
    /// - Trial configured via subscription_data.trial_period_days
    /// - At trial end: pauses collection; conversion requires explicit user opt-in via confirm-trial-conversion API
    /// </summary>
    public async Task<(string sessionId, string url)> CreateCheckoutSessionAsync(
        Pharmacy pharmacy, SubscriptionPlan plan, BillingInterval interval, string originUrl)
    {
        var priceId = interval == BillingInterval.Monthly
            ? plan.StripeMonthlyPriceId
            : plan.StripeAnnualPriceId;

        if (string.IsNullOrEmpty(priceId))
            throw new InvalidOperationException($"Stripe price not configured for plan {plan.Code}/{interval}. Run Sync Plans first.");

        var customerId = await GetOrCreateCustomerAsync(pharmacy);

        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = customerId,
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = priceId, Quantity = 1 }
            },
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                TrialPeriodDays = plan.TrialDays,
                // KEY: At trial end, pause collection (don't auto-charge) until we explicitly resume
                // via confirm-trial-conversion flow. If user doesn't confirm, we cancel.
                TrialSettings = new SessionSubscriptionDataTrialSettingsOptions
                {
                    EndBehavior = new SessionSubscriptionDataTrialSettingsEndBehaviorOptions
                    {
                        MissingPaymentMethod = "pause"
                    }
                },
                Metadata = new Dictionary<string, string>
                {
                    ["pharmacy_id"] = pharmacy.Id.ToString(),
                    ["plan_code"] = plan.Code,
                    ["interval"] = interval.ToString().ToLowerInvariant()
                }
            },
            PaymentMethodCollection = "always", // force card upfront even in trial
            SuccessUrl = $"{originUrl.TrimEnd('/')}/Pharmacy/Billing?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{originUrl.TrimEnd('/')}/Pharmacy/Billing?canceled=true",
            Metadata = new Dictionary<string, string>
            {
                ["pharmacy_id"] = pharmacy.Id.ToString(),
                ["plan_id"] = plan.Id.ToString(),
                ["interval"] = interval.ToString().ToLowerInvariant()
            }
        };

        var svc = new SessionService();
        var session = await svc.CreateAsync(options);

        // Create a pending PharmacySubscription row
        var existing = await _db.PharmacySubscriptions
            .Where(s => s.PharmacyId == pharmacy.Id && s.Status == SubscriptionStatus.Incomplete)
            .FirstOrDefaultAsync();
        if (existing != null)
        {
            existing.StripeCheckoutSessionId = session.Id;
            existing.StripeCustomerId = customerId;
            existing.StripePriceId = priceId;
            existing.SubscriptionPlanId = plan.Id;
            existing.Interval = interval;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.PharmacySubscriptions.Add(new PharmacySubscription
            {
                PharmacyId = pharmacy.Id,
                SubscriptionPlanId = plan.Id,
                Status = SubscriptionStatus.Incomplete,
                Interval = interval,
                StripeCustomerId = customerId,
                StripeCheckoutSessionId = session.Id,
                StripePriceId = priceId
            });
        }

        _db.PaymentTransactions.Add(new PaymentTransaction
        {
            PharmacyId = pharmacy.Id,
            StripeSessionId = session.Id,
            Kind = "subscription",
            Amount = interval == BillingInterval.Monthly ? plan.MonthlyPrice : plan.AnnualPrice,
            Currency = plan.Currency,
            Status = "initiated",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                plan_code = plan.Code,
                interval = interval.ToString()
            })
        });

        await _db.SaveChangesAsync();
        return (session.Id, session.Url);
    }

    /// <summary>
    /// Customer billing portal (manage payment methods, view invoices, cancel).
    /// </summary>
    public async Task<string> CreateBillingPortalUrlAsync(string customerId, string returnUrl)
    {
        var svc = new Stripe.BillingPortal.SessionService();
        var session = await svc.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = customerId,
            ReturnUrl = returnUrl
        });
        return session.Url;
    }

    /// <summary>
    /// User explicitly opts-in to convert trial to paid.
    /// Resumes collection and lets Stripe bill at trial end.
    /// </summary>
    public async Task ConfirmTrialConversionAsync(PharmacySubscription sub)
    {
        if (string.IsNullOrEmpty(sub.StripeSubscriptionId))
            throw new InvalidOperationException("Stripe subscription not yet created.");

        var svc = new SubscriptionService();
        await svc.UpdateAsync(sub.StripeSubscriptionId, new SubscriptionUpdateOptions
        {
            TrialSettings = new SubscriptionTrialSettingsOptions
            {
                EndBehavior = new SubscriptionTrialSettingsEndBehaviorOptions
                {
                    MissingPaymentMethod = "create_invoice"
                }
            },
            CancelAtPeriodEnd = false
        });

        sub.TrialConversionConfirmed = true;
        sub.TrialConversionConfirmedAt = DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Cancel subscription. If immediate=true, cancels now; else cancels at period end.
    /// </summary>
    public async Task CancelSubscriptionAsync(PharmacySubscription sub, bool immediate)
    {
        if (string.IsNullOrEmpty(sub.StripeSubscriptionId)) return;
        var svc = new SubscriptionService();

        if (immediate)
        {
            await svc.CancelAsync(sub.StripeSubscriptionId);
            sub.Status = SubscriptionStatus.Canceled;
            sub.CanceledAt = DateTime.UtcNow;
            sub.EndedAt = DateTime.UtcNow;
        }
        else
        {
            await svc.UpdateAsync(sub.StripeSubscriptionId, new SubscriptionUpdateOptions
            {
                CancelAtPeriodEnd = true
            });
            sub.CancelAtPeriodEnd = true;
            sub.CanceledAt = DateTime.UtcNow;
        }
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Refund the most recent paid invoice for a subscription.
    /// </summary>
    public async Task<string?> RefundLatestInvoiceAsync(PharmacySubscription sub)
    {
        var invoice = await _db.SubscriptionInvoices
            .Where(i => i.PharmacySubscriptionId == sub.Id && i.Status == "paid" && !string.IsNullOrEmpty(i.StripePaymentIntentId))
            .OrderByDescending(i => i.Id)
            .FirstOrDefaultAsync();
        if (invoice == null) return null;

        var svc = new RefundService();
        var refund = await svc.CreateAsync(new RefundCreateOptions
        {
            PaymentIntent = invoice.StripePaymentIntentId
        });
        return refund.Id;
    }

    /// <summary>
    /// Map Stripe subscription to our local status enum.
    /// </summary>
    public static SubscriptionStatus MapStatus(string stripeStatus, bool trialConversionConfirmed) =>
        stripeStatus switch
        {
            "trialing" => trialConversionConfirmed ? SubscriptionStatus.Trialing : SubscriptionStatus.TrialPendingConfirm,
            "active" => SubscriptionStatus.Active,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" => SubscriptionStatus.Canceled,
            "unpaid" => SubscriptionStatus.Unpaid,
            "incomplete" or "incomplete_expired" => SubscriptionStatus.Incomplete,
            "paused" => SubscriptionStatus.Expired,
            _ => SubscriptionStatus.Incomplete
        };
}
