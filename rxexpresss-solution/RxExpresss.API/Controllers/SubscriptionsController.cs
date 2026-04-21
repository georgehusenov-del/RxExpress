using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.API.Services.Subscriptions;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Subscription management endpoints for Pharmacy users.
/// Feature-flagged via Subscriptions:Enabled — returns 404 when disabled.
/// </summary>
[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeSubscriptionService _stripe;
    private readonly IConfiguration _config;

    public SubscriptionsController(AppDbContext db, StripeSubscriptionService stripe, IConfiguration config)
    {
        _db = db;
        _stripe = stripe;
        _config = config;
    }

    private bool Enabled => _config.GetValue<bool>("Subscriptions:Enabled");

    private async Task<Pharmacy?> CurrentPharmacyAsync()
    {
        var uid = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("uid")?.Value;
        if (string.IsNullOrEmpty(uid)) return null;
        return await _db.Pharmacies.FirstOrDefaultAsync(p => p.UserId == uid);
    }

    // ───────────────────────── PUBLIC PLANS ─────────────────────────

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans()
    {
        if (!Enabled) return NotFound();
        var plans = await _db.SubscriptionPlans
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .Select(p => new
            {
                p.Id,
                p.Code,
                p.Name,
                p.Description,
                p.MonthlyPrice,
                p.AnnualPrice,
                p.Currency,
                p.MaxOrdersPerMonth,
                p.MaxActiveDrivers,
                p.ApiAccess,
                p.WebhookAccess,
                p.AdvancedReports,
                p.RouteOptimization,
                p.PrioritySupport,
                p.TrialDays,
                AnnualSavingsPercent = 20
            })
            .ToListAsync();
        return Ok(plans);
    }

    // ───────────────────────── MY SUBSCRIPTION ─────────────────────────

    [HttpGet("my")]
    public async Task<IActionResult> GetMySubscription()
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var now = DateTime.UtcNow;
        var sub = await _db.PharmacySubscriptions
            .AsNoTracking()
            .Where(s => s.PharmacyId == pharmacy.Id)
            .OrderByDescending(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.Status,
                s.Interval,
                s.TrialStart,
                s.TrialEnd,
                s.CurrentPeriodStart,
                s.CurrentPeriodEnd,
                s.CancelAtPeriodEnd,
                s.TrialConversionConfirmed,
                s.CanceledAt,
                Plan = s.Plan == null ? null : new
                {
                    s.Plan.Id,
                    s.Plan.Code,
                    s.Plan.Name,
                    s.Plan.Description,
                    s.Plan.MonthlyPrice,
                    s.Plan.AnnualPrice,
                    s.Plan.MaxOrdersPerMonth,
                    s.Plan.MaxActiveDrivers,
                    s.Plan.ApiAccess,
                    s.Plan.AdvancedReports,
                    s.Plan.RouteOptimization
                }
            })
            .FirstOrDefaultAsync();

        var usage = await _db.SubscriptionUsages.AsNoTracking()
            .Where(u => u.PharmacyId == pharmacy.Id && u.Year == now.Year && u.Month == now.Month)
            .Select(u => new { u.OrdersCreated })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            subscription = sub,
            usage = new { ordersThisMonth = usage?.OrdersCreated ?? 0 }
        });
    }

    // ───────────────────────── CHECKOUT ─────────────────────────

    public class CheckoutRequest
    {
        public int PlanId { get; set; }
        public string Interval { get; set; } = "monthly"; // monthly|annual
        public string OriginUrl { get; set; } = "";
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckout([FromBody] CheckoutRequest req)
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == req.PlanId && p.IsActive);
        if (plan == null) return BadRequest(new { error = "Plan not found." });

        var interval = string.Equals(req.Interval, "annual", StringComparison.OrdinalIgnoreCase)
            ? BillingInterval.Annual
            : BillingInterval.Monthly;

        var origin = string.IsNullOrEmpty(req.OriginUrl)
            ? $"{Request.Scheme}://{Request.Host}"
            : req.OriginUrl;

        try
        {
            var (sessionId, url) = await _stripe.CreateCheckoutSessionAsync(pharmacy, plan, interval, origin);
            return Ok(new { sessionId, url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Stripe.StripeException ex)
        {
            return StatusCode(502, new { error = $"Stripe error: {ex.Message}" });
        }
    }

    // ───────────────────────── BILLING PORTAL ─────────────────────────

    [HttpPost("portal")]
    public async Task<IActionResult> CreatePortalLink([FromBody] PortalRequest req)
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var customerId = await _db.PharmacySubscriptions.AsNoTracking()
            .Where(s => s.PharmacyId == pharmacy.Id && !string.IsNullOrEmpty(s.StripeCustomerId))
            .OrderByDescending(s => s.Id)
            .Select(s => s.StripeCustomerId)
            .FirstOrDefaultAsync();
        if (string.IsNullOrEmpty(customerId))
            return BadRequest(new { error = "No Stripe customer linked. Start a subscription first." });

        var returnUrl = string.IsNullOrEmpty(req.ReturnUrl)
            ? $"{Request.Scheme}://{Request.Host}/Pharmacy/Billing"
            : req.ReturnUrl;
        var url = await _stripe.CreateBillingPortalUrlAsync(customerId!, returnUrl);
        return Ok(new { url });
    }
    public class PortalRequest { public string ReturnUrl { get; set; } = ""; }

    // ───────────────────────── TRIAL CONVERSION ─────────────────────────

    [HttpPost("confirm-trial-conversion")]
    public async Task<IActionResult> ConfirmTrialConversion()
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var sub = await _db.PharmacySubscriptions
            .Where(s => s.PharmacyId == pharmacy.Id && !string.IsNullOrEmpty(s.StripeSubscriptionId))
            .OrderByDescending(s => s.Id)
            .FirstOrDefaultAsync();
        if (sub == null) return BadRequest(new { error = "No active subscription." });

        await _stripe.ConfirmTrialConversionAsync(sub);
        return Ok(new { ok = true, message = "You will be charged when the trial ends." });
    }

    // ───────────────────────── CANCEL ─────────────────────────

    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel([FromBody] CancelRequest req)
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var sub = await _db.PharmacySubscriptions
            .Where(s => s.PharmacyId == pharmacy.Id && !string.IsNullOrEmpty(s.StripeSubscriptionId))
            .OrderByDescending(s => s.Id)
            .FirstOrDefaultAsync();
        if (sub == null) return BadRequest(new { error = "No active subscription." });

        await _stripe.CancelSubscriptionAsync(sub, immediate: req.Immediate);
        return Ok(new { ok = true });
    }
    public class CancelRequest { public bool Immediate { get; set; } = false; }

    // ───────────────────────── INVOICES ─────────────────────────

    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices()
    {
        if (!Enabled) return NotFound();
        var pharmacy = await CurrentPharmacyAsync();
        if (pharmacy == null) return BadRequest(new { error = "Pharmacy profile not found." });

        var invoices = await _db.SubscriptionInvoices.AsNoTracking()
            .Where(i => i.PharmacySubscription!.PharmacyId == pharmacy.Id)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new
            {
                i.Id,
                i.Amount,
                i.AmountPaid,
                i.Currency,
                i.Status,
                i.PaidAt,
                i.CreatedAt,
                i.HostedInvoiceUrl,
                i.InvoicePdfUrl
            })
            .Take(50)
            .ToListAsync();
        return Ok(invoices);
    }
}
