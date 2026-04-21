# RX Expresss — Subscriptions Launch Runbook

This module is fully implemented but **dormant**. Follow these steps the day you want to go live.

## 1. Feature Flag (the master switch)

Edit `RxExpresss.API/appsettings.json`:

```json
"Subscriptions": { "Enabled": true },
"Stripe": {
    "ApiKey": "sk_live_XXXX",     // Replace with LIVE key from Stripe Dashboard
    "WebhookSecret": "whsec_XXXX" // From Stripe Dashboard -> Developers -> Webhooks
}
```

All Subscription API endpoints return **404** while `Enabled=false`, so the feature is invisible to end users until you flip this.

## 2. Create the DB tables (production SQL Server)

Run the provided script on production:

```
/app/rxexpresss-solution/SqlServer_Subscriptions.sql
```

Idempotent — safe to re-run. Creates 5 tables + seeds the 3 default plans
(Starter / Pro / Enterprise, Monthly + Annual at 20% discount).

## 3. Uncomment the "LAUNCH" marked lines

Search the codebase for `// LAUNCH:` and uncomment:

| File | What it enables |
|------|-----------------|
| `RxExpresss.API/Program.cs` | Seeds plans into DB on startup (optional — the SQL in step 2 already seeds). |
| `RxExpresss.Web/Controllers/AdminController.cs` | Shows "Subscriptions" link in Admin sidebar. |
| `RxExpresss.Web/Controllers/PharmacyController.cs` | Shows "Billing & Plan" link in Pharmacy sidebar. |
| `RxExpresss.API/Controllers/OrdersController.cs` | Enforces plan order-limits on `POST /api/orders` (blocks with 402 when limit hit). To wire it up, inject `SubscriptionFeatureGate` via ctor (see field `_featureGate`). |

## 4. Sync Stripe Products + Prices

Login as Admin → Go to `/Admin/Subscriptions` → click **Sync Plans with Stripe**.
This creates Products/Prices in Stripe using your LIVE key. The Stripe price IDs
are stored back into our DB.

Alternatively, cURL:
```bash
curl -X POST https://<domain>/api/admin/subscriptions/sync-plans \
     -H "Authorization: Bearer <ADMIN_JWT>"
```

## 5. Configure Stripe Webhook

In Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

- URL: `https://<your-domain>/api/stripe/webhook`
- Events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `customer.subscription.trial_will_end`
    - `customer.subscription.paused`
    - `invoice.finalized`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`

Copy the signing secret (`whsec_...`) into `appsettings.json -> Stripe:WebhookSecret`.

## 6. Trial Behavior (what the user wanted)

- Card is required upfront at checkout (`payment_method_collection=always`).
- Subscription enters `trialing` state for 30 days — **no charge**.
- 3 days before trial end, Stripe fires `customer.subscription.trial_will_end`.
- Our webhook flips the sub to `TrialPendingConfirm`. Pharmacy Billing page
  shows a red banner + **"Confirm & Keep Subscription"** button.
- If pharmacy clicks Confirm → `confirm-trial-conversion` API → Stripe proceeds to charge on trial end.
- If pharmacy does NOT confirm → `trialSettings.endBehavior.missingPaymentMethod = "pause"`
  means Stripe pauses collection at trial end. Our webhook marks sub as `Expired`,
  which hard-locks the pharmacy (read-only) per your choice.

## 7. Feature Gating (hard lock)

`SubscriptionFeatureGate.CanUseFeatureAsync(pharmacyId, feature)` returns
`(false, reason)` when:

- No subscription exists
- Status is Canceled / Unpaid / Expired
- Monthly order limit reached
- Feature not included in plan (API / webhooks / advanced reports / route optimization)

Wire `[HttpPost]` endpoints you want gated — the pattern is shown (commented)
in `OrdersController.Create`. Add `SubscriptionFeatureGate` via ctor DI, call it,
return HTTP 402 with `{ error: "subscription_required", detail }`.

## 8. Admin capabilities

`/Admin/Subscriptions` gives:

- MRR / ARR / active / trialing / past-due counts
- Revenue this month (from paid invoices)
- Cancel at period end **or** immediately for any pharmacy
- Refund the latest paid invoice
- Edit plan pricing / limits / features (PUT `/api/admin/subscriptions/plans/{id}`)

## 9. Test with Stripe test mode first

Before flipping to live keys, use `sk_test_emergent` (already set) +
Stripe test cards (`4242 4242 4242 4242`). Verify full flow then swap to live.

## 10. Rollback

If anything goes sideways at launch, just set:
```json
"Subscriptions": { "Enabled": false }
```
Pages disappear, APIs return 404. The code and data remain intact.
