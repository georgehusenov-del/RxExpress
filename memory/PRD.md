# RX Expresss - Product Requirements Document

## Original Problem Statement
Build a full-stack pharmacy delivery service application named "RX Expresss" based on ASP.NET Core 8.

## Current Architecture
```
/app/rxexpresss-solution/
├── RxExpresss.API/        # ASP.NET Core Web API
├── RxExpresss.Web/        # ASP.NET Core MVC (frontend)
├── RxExpresss.Core/       # Class library (entities, DTOs)
├── RxExpresss.Data/       # DbContext, repositories
├── RxExpresss.Identity/   # JWT service, auth logic
└── RxExpresss.sln
```

## Core Features Implemented

### Latest Updates (April 21, 2026 — Evening)
- **Stripe Subscriptions Module (DORMANT / Ready for Launch)**
  - 3-tier catalog: Starter ($49/mo, 100 orders), Pro ($149/mo, 500 orders, all features), Enterprise ($399/mo, unlimited) — Monthly + Annual (20% discount)
  - 30-day trial with **card required upfront but no auto-charge**: Stripe `trial_will_end` webhook flips sub to `TrialPendingConfirm`; user must explicitly click Confirm to convert to paid, otherwise sub is paused/expired (hard lock).
  - Feature gate with hard-lock: `SubscriptionFeatureGate.CanUseFeatureAsync(pharmacyId, feature)` blocks orders when Canceled/Unpaid/Expired or monthly limit reached
  - **Admin UI** (`/Admin/Subscriptions`): MRR/ARR/Active/Trialing/PastDue/Revenue, list all pharmacies subs, cancel (now or at period end), refund latest invoice, Sync Plans with Stripe, Plans editor
  - **Pharmacy UI** (`/Pharmacy/Billing`): 3 plan cards with Monthly/Annual toggle, current subscription panel with usage meter, trial-ending alert with Confirm button, Stripe billing portal, invoice history
  - **Stripe webhook** `/api/stripe/webhook` handles checkout.session.completed, customer.subscription.*, trial_will_end, invoice.payment_*
  - **Feature flag** `Subscriptions:Enabled=false` (default) → all endpoints return 404 and sidebar nav items are commented out. Flip to `true` to launch.
  - **Launch runbook**: `/app/rxexpresss-solution/SUBSCRIPTIONS_LAUNCH.md`
  - **SQL migration**: `/app/rxexpresss-solution/SqlServer_Subscriptions.sql` (creates 5 tables + seeds plans, idempotent)
  - Stripe.net 47.0.0 NuGet installed. API key `sk_test_emergent` in env; LIVE key replaces at launch.

### Latest Updates (April 21, 2026)
- **Admin & Pharmacy Reports Module**
  - Filters: From/To date, pharmacy (admin), driver, status
  - Quick presets: Today, Last 7/30 days, This Month, Last Month, This Year
  - Summary tiles: Total, Delivered, Failed, Pending, Revenue, Copay (collected/pending), Avg delivery
  - Breakdowns: Monthly, By Pharmacy (admin), By Driver, By Status
  - CSV export with current filters applied
  - Endpoints: `GET /api/admin/reports/{summary,monthly,by-pharmacy,by-driver,export}`, `GET /api/pharmacies/reports/{summary,monthly,by-driver,drivers-list,export}`
  - Schema-drift safe: all queries use `.Select()` projection
- **Sidebar fix**: Pharmacy & Driver roles now see their full scoped nav (previously filtered by admin permission map)

### Latest Updates (April 16, 2026)
- **Role Hierarchy:** Admin > Manager > Operator > Pharmacy > Driver (Patient removed)
- **Per-User Permissions:** 28 granular permissions across 13 categories (page + action level)
- **Permission Management:** Admin assigns Manager permissions, Manager assigns Operator permissions
- **Admin Order Creation:** Create orders with pharmacy dropdown
- **Order Duplication:** After 2 failed attempts → duplicate with new QR code + labour cost
- **Attempt History:** Full timeline of all delivery attempts across duplicates

### Previous Updates (April 12, 2026)
- Real-Time Driver Tracking with Google Maps
- Multi-Provider Route Optimization (Circuit/Google Maps/Apple Maps)

### Previous Updates (March 29, 2026)
- Separate Driver Login, Responsive Dashboard, Office Locations, Geo-Lock Scanning

## Role & Permission System
| Role | Access | Creates |
|------|--------|---------|
| Admin | Everything | Managers, Operators, Pharmacies, Drivers |
| Manager | Based on admin-assigned permissions | Operators |
| Operator | Based on manager-assigned permissions | - |
| Pharmacy | Own portal | Orders |
| Driver | Own portal | POD submissions |

**28 Permissions:** orders.view/create/edit/delete/duplicate, routes.view/create/optimize/assign, drivers.view/create/edit, tracking.view, pharmacies.view/create, users.view/create/edit, pricing.view/edit, scanning.view, zones.view/edit, offices.view/edit, apikeys.view/create, reports.view

## Order Duplication Flow
1. Order created → delivered or fails
2. After 2 failed attempts → "Duplicate Order" option appears
3. Admin enters labour cost (e.g., $10) → new order created with new QR code
4. New order links to original via `ParentOrderId`
5. If duplicate also fails 2 times → same process repeats
6. Full history available via `/api/admin/orders/{id}/history`

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Manager | manager@rxexpresss.com | Manager@123 |
| Operator | operator@rxexpresss.com | Operator@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P1) Webhook delivery on status changes
4. (P2) Cloud storage for POD images
5. (P2) Self-Service API Key Portal
6. (P2) Stripe payment flow
7. (P2) Forgot password
8. (P2) PWA Push Notifications
