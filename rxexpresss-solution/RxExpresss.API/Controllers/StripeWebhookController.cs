using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.API.Services.Subscriptions;
using RxExpresss.Core.Entities;
using RxExpresss.Data.Context;
using Stripe;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Stripe webhook receiver. Idempotent handling of subscription lifecycle events.
/// Configure endpoint + signing secret in Stripe Dashboard -> Developers -> Webhooks.
/// </summary>
[ApiController]
[Route("api/stripe/webhook")]
public class StripeWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeSubscriptionService _stripe;
    private readonly IConfiguration _config;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(AppDbContext db, StripeSubscriptionService stripe, IConfiguration config, ILogger<StripeWebhookController> logger)
    {
        _db = db;
        _stripe = stripe;
        _config = config;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Receive()
    {
        if (!_config.GetValue<bool>("Subscriptions:Enabled"))
            return NotFound();

        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        Event stripeEvent;
        try
        {
            var secret = _stripe.WebhookSecret;
            if (!string.IsNullOrEmpty(secret))
            {
                stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    secret);
            }
            else
            {
                // Dev mode — no signature verification.
                stripeEvent = EventUtility.ParseEvent(json);
            }
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Invalid Stripe webhook signature.");
            return BadRequest();
        }

        try
        {
            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                    await HandleCheckoutCompleted((Stripe.Checkout.Session)stripeEvent.Data.Object);
                    break;
                case "customer.subscription.created":
                case "customer.subscription.updated":
                    await HandleSubscriptionUpserted((Subscription)stripeEvent.Data.Object);
                    break;
                case "customer.subscription.deleted":
                    await HandleSubscriptionDeleted((Subscription)stripeEvent.Data.Object);
                    break;
                case "customer.subscription.trial_will_end":
                    await HandleTrialWillEnd((Subscription)stripeEvent.Data.Object);
                    break;
                case "customer.subscription.paused":
                    await HandleSubscriptionPaused((Subscription)stripeEvent.Data.Object);
                    break;
                case "invoice.payment_succeeded":
                case "invoice.payment_failed":
                case "invoice.finalized":
                    await HandleInvoiceEvent((Invoice)stripeEvent.Data.Object, stripeEvent.Type);
                    break;
                default:
                    _logger.LogInformation("Unhandled Stripe event: {Type}", stripeEvent.Type);
                    break;
            }
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling Stripe event {Type}", stripeEvent.Type);
            return StatusCode(500);
        }
    }

    private async Task HandleCheckoutCompleted(Stripe.Checkout.Session session)
    {
        var sub = await _db.PharmacySubscriptions
            .FirstOrDefaultAsync(s => s.StripeCheckoutSessionId == session.Id);
        if (sub == null) return;

        if (!string.IsNullOrEmpty(session.SubscriptionId))
            sub.StripeSubscriptionId = session.SubscriptionId;
        if (!string.IsNullOrEmpty(session.CustomerId))
            sub.StripeCustomerId = session.CustomerId;
        sub.UpdatedAt = DateTime.UtcNow;

        // Mark transaction paid/initiated accordingly
        var tx = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.StripeSessionId == session.Id);
        if (tx != null)
        {
            tx.Status = session.PaymentStatus == "paid" ? "paid" : "pending";
            tx.StripeSubscriptionId = session.SubscriptionId;
            tx.PharmacySubscriptionId = sub.Id;
            tx.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private async Task HandleSubscriptionUpserted(Subscription s)
    {
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeSubscriptionId == s.Id);
        if (sub == null)
        {
            // fallback via customer id
            sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeCustomerId == s.CustomerId && x.Status == SubscriptionStatus.Incomplete);
            if (sub == null) return;
            sub.StripeSubscriptionId = s.Id;
        }

        sub.Status = StripeSubscriptionService.MapStatus(s.Status, sub.TrialConversionConfirmed);
        sub.TrialStart = s.TrialStart;
        sub.TrialEnd = s.TrialEnd;
        sub.CurrentPeriodStart = s.CurrentPeriodStart;
        sub.CurrentPeriodEnd = s.CurrentPeriodEnd;
        sub.CancelAtPeriodEnd = s.CancelAtPeriodEnd;
        if (s.CanceledAt != null) sub.CanceledAt = s.CanceledAt;
        if (s.EndedAt != null) sub.EndedAt = s.EndedAt;
        sub.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    private async Task HandleSubscriptionDeleted(Subscription s)
    {
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeSubscriptionId == s.Id);
        if (sub == null) return;
        sub.Status = SubscriptionStatus.Canceled;
        sub.CanceledAt = s.CanceledAt ?? DateTime.UtcNow;
        sub.EndedAt = s.EndedAt ?? DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task HandleTrialWillEnd(Subscription s)
    {
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeSubscriptionId == s.Id);
        if (sub == null) return;
        // Flip to TrialPendingConfirm if user hasn't opted in yet — UI will prompt.
        if (!sub.TrialConversionConfirmed)
        {
            sub.Status = SubscriptionStatus.TrialPendingConfirm;
            sub.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            // NOTIFY: send email/SMS to pharmacy asking them to confirm conversion or they will be canceled.
        }
    }

    private async Task HandleSubscriptionPaused(Subscription s)
    {
        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeSubscriptionId == s.Id);
        if (sub == null) return;
        sub.Status = SubscriptionStatus.Expired;
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task HandleInvoiceEvent(Invoice inv, string eventType)
    {
        if (string.IsNullOrEmpty(inv.SubscriptionId)) return;

        var sub = await _db.PharmacySubscriptions.FirstOrDefaultAsync(x => x.StripeSubscriptionId == inv.SubscriptionId);
        if (sub == null) return;

        var existing = await _db.SubscriptionInvoices.FirstOrDefaultAsync(i => i.StripeInvoiceId == inv.Id);
        if (existing == null)
        {
            existing = new SubscriptionInvoice
            {
                PharmacySubscriptionId = sub.Id,
                StripeInvoiceId = inv.Id
            };
            _db.SubscriptionInvoices.Add(existing);
        }
        existing.Amount = (inv.AmountDue) / 100m;
        existing.AmountPaid = (inv.AmountPaid) / 100m;
        existing.Currency = inv.Currency;
        existing.Status = inv.Status ?? "open";
        existing.HostedInvoiceUrl = inv.HostedInvoiceUrl;
        existing.InvoicePdfUrl = inv.InvoicePdf;
        existing.StripePaymentIntentId = inv.PaymentIntentId;

        if (eventType == "invoice.payment_succeeded")
        {
            existing.Status = "paid";
            existing.PaidAt = DateTime.UtcNow;
        }
        else if (eventType == "invoice.payment_failed")
        {
            // Hard lock on repeated failures — Stripe transitions sub to unpaid after retries.
            // We only update our invoice row here; subscription status flows via customer.subscription.updated.
        }

        await _db.SaveChangesAsync();
    }
}
