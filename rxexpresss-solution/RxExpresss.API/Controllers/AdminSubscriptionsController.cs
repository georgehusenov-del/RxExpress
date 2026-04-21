using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.API.Services.Subscriptions;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Admin-side subscription management. MRR, active subs, cancel/refund on behalf of pharmacy.
/// Feature-flagged via Subscriptions:Enabled.
/// </summary>
[ApiController]
[Route("api/admin/subscriptions")]
[Authorize(Roles = "Admin,Manager")]
public class AdminSubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeSubscriptionService _stripe;
    private readonly IConfiguration _config;

    public AdminSubscriptionsController(AppDbContext db, StripeSubscriptionService stripe, IConfiguration config)
    {
        _db = db;
        _stripe = stripe;
        _config = config;
    }

    private bool Enabled => _config.GetValue<bool>("Subscriptions:Enabled");

    // ───────────────────────── LIST ─────────────────────────

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = null, [FromQuery] string? planCode = null, [FromQuery] string? search = null)
    {
        if (!Enabled) return NotFound();

        var q = _db.PharmacySubscriptions.AsNoTracking();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<SubscriptionStatus>(status, true, out var st))
            q = q.Where(s => s.Status == st);

        if (!string.IsNullOrEmpty(planCode))
            q = q.Where(s => s.Plan!.Code == planCode);

        if (!string.IsNullOrEmpty(search))
            q = q.Where(s => s.Pharmacy!.Name.Contains(search) || s.Pharmacy.Email.Contains(search));

        var rows = await q.OrderByDescending(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.PharmacyId,
                PharmacyName = s.Pharmacy!.Name,
                PharmacyEmail = s.Pharmacy.Email,
                PlanCode = s.Plan!.Code,
                PlanName = s.Plan.Name,
                s.Status,
                s.Interval,
                Amount = s.Interval == BillingInterval.Monthly ? s.Plan.MonthlyPrice : s.Plan.AnnualPrice,
                s.TrialEnd,
                s.CurrentPeriodStart,
                s.CurrentPeriodEnd,
                s.CancelAtPeriodEnd,
                s.TrialConversionConfirmed,
                s.CreatedAt,
                s.CanceledAt,
                s.StripeSubscriptionId,
                s.StripeCustomerId
            })
            .Take(500)
            .ToListAsync();

        return Ok(rows);
    }

    // ───────────────────────── SUMMARY / MRR ─────────────────────────

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        if (!Enabled) return NotFound();

        var rows = await _db.PharmacySubscriptions.AsNoTracking()
            .Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trialing || s.Status == SubscriptionStatus.TrialPendingConfirm || s.Status == SubscriptionStatus.PastDue)
            .Select(s => new
            {
                s.Status,
                s.Interval,
                Monthly = s.Plan!.MonthlyPrice,
                Annual = s.Plan.AnnualPrice
            })
            .ToListAsync();

        var active = rows.Count(r => r.Status == SubscriptionStatus.Active);
        var trialing = rows.Count(r => r.Status == SubscriptionStatus.Trialing || r.Status == SubscriptionStatus.TrialPendingConfirm);
        var pastDue = rows.Count(r => r.Status == SubscriptionStatus.PastDue);

        // MRR = sum(monthly equivalent of all paying subs)
        decimal mrr = rows
            .Where(r => r.Status == SubscriptionStatus.Active || r.Status == SubscriptionStatus.PastDue)
            .Sum(r => r.Interval == BillingInterval.Monthly ? r.Monthly : r.Annual / 12m);

        // ARR
        decimal arr = mrr * 12m;

        // This month revenue (paid invoices) — sum client-side for SQLite decimal compat
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var paidThisMonth = await _db.SubscriptionInvoices.AsNoTracking()
            .Where(i => i.Status == "paid" && i.PaidAt != null && i.PaidAt >= monthStart)
            .Select(i => i.AmountPaid)
            .ToListAsync();
        var revThisMonth = paidThisMonth.Sum();

        return Ok(new
        {
            active,
            trialing,
            pastDue,
            totalPaying = active + pastDue,
            mrr = Math.Round(mrr, 2),
            arr = Math.Round(arr, 2),
            revenueThisMonth = Math.Round(revThisMonth, 2)
        });
    }

    // ───────────────────────── ACTIONS ─────────────────────────

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelReq req)
    {
        if (!Enabled) return NotFound();
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(s => s.Id == id);
        if (sub == null) return NotFound();
        await _stripe.CancelSubscriptionAsync(sub, immediate: req.Immediate);
        return Ok(new { ok = true });
    }
    public class CancelReq { public bool Immediate { get; set; } = false; }

    [HttpPost("{id:int}/refund-latest")]
    public async Task<IActionResult> Refund(int id)
    {
        if (!Enabled) return NotFound();
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(s => s.Id == id);
        if (sub == null) return NotFound();
        var refundId = await _stripe.RefundLatestInvoiceAsync(sub);
        return Ok(new { ok = refundId != null, refundId });
    }

    [HttpPost("sync-plans")]
    public async Task<IActionResult> SyncPlans()
    {
        if (!Enabled) return NotFound();
        try
        {
            await _stripe.SyncPlansWithStripeAsync();
            return Ok(new { ok = true, message = "Plans synced with Stripe." });
        }
        catch (Stripe.StripeException ex)
        {
            return StatusCode(502, new { error = ex.Message });
        }
    }

    // ───────────────────────── PLAN MGMT ─────────────────────────

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        if (!Enabled) return NotFound();
        var plans = await _db.SubscriptionPlans.AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .ToListAsync();
        return Ok(plans);
    }

    [HttpPut("plans/{id:int}")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] SubscriptionPlan update)
    {
        if (!Enabled) return NotFound();
        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == id);
        if (plan == null) return NotFound();

        plan.Name = update.Name;
        plan.Description = update.Description;
        plan.MonthlyPrice = update.MonthlyPrice;
        plan.AnnualPrice = update.AnnualPrice;
        plan.MaxOrdersPerMonth = update.MaxOrdersPerMonth;
        plan.MaxActiveDrivers = update.MaxActiveDrivers;
        plan.ApiAccess = update.ApiAccess;
        plan.WebhookAccess = update.WebhookAccess;
        plan.AdvancedReports = update.AdvancedReports;
        plan.RouteOptimization = update.RouteOptimization;
        plan.PrioritySupport = update.PrioritySupport;
        plan.TrialDays = update.TrialDays;
        plan.IsActive = update.IsActive;
        plan.SortOrder = update.SortOrder;
        plan.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(plan);
    }
}
