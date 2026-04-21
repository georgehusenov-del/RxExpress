using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;

namespace RxExpresss.API.Services.Subscriptions;

/// <summary>
/// Resolves whether a pharmacy may use a given feature right now.
/// Hard-locks pharmacies whose subscription is Canceled/Unpaid/Expired.
/// Enforces numeric limits (orders per month, drivers) per plan.
/// </summary>
public class SubscriptionFeatureGate
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public SubscriptionFeatureGate(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public bool IsSubscriptionsEnabled
        => _config.GetValue<bool>("Subscriptions:Enabled");

    /// <summary>
    /// Returns (allowed, reason) for a pharmacy's access to a feature.
    /// When Subscriptions:Enabled=false, always allowed (launch toggle).
    /// </summary>
    public async Task<(bool allowed, string? reason)> CanUseFeatureAsync(
        int pharmacyId, SubscriptionFeature feature)
    {
        if (!IsSubscriptionsEnabled) return (true, null);

        var sub = await _db.PharmacySubscriptions
            .AsNoTracking()
            .Where(s => s.PharmacyId == pharmacyId)
            .OrderByDescending(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.Status,
                s.SubscriptionPlanId,
                Plan = new
                {
                    s.Plan!.Code,
                    s.Plan.MaxOrdersPerMonth,
                    s.Plan.MaxActiveDrivers,
                    s.Plan.ApiAccess,
                    s.Plan.WebhookAccess,
                    s.Plan.AdvancedReports,
                    s.Plan.RouteOptimization
                }
            })
            .FirstOrDefaultAsync();

        if (sub == null)
            return (false, "No active subscription. Please choose a plan to continue.");

        // Hard lock states
        if (sub.Status is SubscriptionStatus.Canceled
            or SubscriptionStatus.Unpaid
            or SubscriptionStatus.Expired)
            return (false, "Your subscription is inactive. Please reactivate to continue.");

        // Feature boolean checks
        switch (feature)
        {
            case SubscriptionFeature.ApiAccess:
                if (!sub.Plan.ApiAccess) return (false, "API access not included in your plan.");
                break;
            case SubscriptionFeature.WebhookAccess:
                if (!sub.Plan.WebhookAccess) return (false, "Webhooks not included in your plan.");
                break;
            case SubscriptionFeature.AdvancedReports:
                if (!sub.Plan.AdvancedReports) return (false, "Advanced reports not included in your plan.");
                break;
            case SubscriptionFeature.RouteOptimization:
                if (!sub.Plan.RouteOptimization) return (false, "Route optimization not included in your plan.");
                break;
            case SubscriptionFeature.CreateOrder:
                if (sub.Plan.MaxOrdersPerMonth >= 0)
                {
                    var now = DateTime.UtcNow;
                    var usage = await _db.SubscriptionUsages.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.PharmacyId == pharmacyId && u.Year == now.Year && u.Month == now.Month);
                    var used = usage?.OrdersCreated ?? 0;
                    if (used >= sub.Plan.MaxOrdersPerMonth)
                        return (false, $"Monthly order limit reached ({sub.Plan.MaxOrdersPerMonth}). Upgrade your plan to continue.");
                }
                break;
            case SubscriptionFeature.AddDriver:
                // Drivers are global in RX Expresss (not pharmacy-owned). Skipped for now.
                // LAUNCH: when drivers become pharmacy-scoped, enforce MaxActiveDrivers here.
                break;
        }

        return (true, null);
    }

    /// <summary>Increment current-period usage counter for a pharmacy.</summary>
    public async Task IncrementOrderUsageAsync(int pharmacyId)
    {
        if (!IsSubscriptionsEnabled) return;
        var now = DateTime.UtcNow;
        var usage = await _db.SubscriptionUsages
            .FirstOrDefaultAsync(u => u.PharmacyId == pharmacyId && u.Year == now.Year && u.Month == now.Month);
        if (usage == null)
        {
            usage = new SubscriptionUsage { PharmacyId = pharmacyId, Year = now.Year, Month = now.Month };
            _db.SubscriptionUsages.Add(usage);
        }
        usage.OrdersCreated += 1;
        usage.UpdatedAt = now;
        await _db.SaveChangesAsync();
    }
}

public enum SubscriptionFeature
{
    CreateOrder,
    AddDriver,
    ApiAccess,
    WebhookAccess,
    AdvancedReports,
    RouteOptimization,
}
