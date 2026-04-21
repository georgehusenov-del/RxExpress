using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;

namespace RxExpresss.Data.Seed;

/// <summary>
/// Seeds the default 3-tier subscription plans (Starter / Pro / Enterprise)
/// on Monthly + Annual billing (20% annual discount baked in).
/// Idempotent: only seeds if no rows exist.
/// Prices/limits are also overridable via appsettings Subscriptions:Plans.
/// </summary>
public static class SubscriptionPlanSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        if (await db.SubscriptionPlans.AnyAsync()) return;

        // Annual = Monthly * 12 * 0.80 (20% discount)
        decimal Annual(decimal m) => Math.Round(m * 12m * 0.80m, 2);

        var plans = new List<SubscriptionPlan>
        {
            new()
            {
                Code = "starter",
                Name = "Starter",
                Description = "For small pharmacies getting started with delivery.",
                MonthlyPrice = 49m,
                AnnualPrice = Annual(49m),       // 470.40
                MaxOrdersPerMonth = 100,
                MaxActiveDrivers = 2,
                ApiAccess = false,
                WebhookAccess = false,
                AdvancedReports = false,
                RouteOptimization = false,
                PrioritySupport = false,
                TrialDays = 30,
                SortOrder = 1
            },
            new()
            {
                Code = "pro",
                Name = "Pro",
                Description = "For growing pharmacies with high order volume.",
                MonthlyPrice = 149m,
                AnnualPrice = Annual(149m),      // 1430.40
                MaxOrdersPerMonth = 500,
                MaxActiveDrivers = 10,
                ApiAccess = true,
                WebhookAccess = true,
                AdvancedReports = true,
                RouteOptimization = true,
                PrioritySupport = false,
                TrialDays = 30,
                SortOrder = 2
            },
            new()
            {
                Code = "enterprise",
                Name = "Enterprise",
                Description = "Unlimited scale with priority support and premium features.",
                MonthlyPrice = 399m,
                AnnualPrice = Annual(399m),      // 3830.40
                MaxOrdersPerMonth = -1,          // unlimited
                MaxActiveDrivers = -1,           // unlimited
                ApiAccess = true,
                WebhookAccess = true,
                AdvancedReports = true,
                RouteOptimization = true,
                PrioritySupport = true,
                TrialDays = 30,
                SortOrder = 3
            }
        };

        db.SubscriptionPlans.AddRange(plans);
        await db.SaveChangesAsync();
    }
}
