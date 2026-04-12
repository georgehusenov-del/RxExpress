# RX Expresss - Product Requirements Document

## Original Problem Statement
Build a full-stack pharmacy delivery service application named "RX Expresss" based on ASP.NET Core 8. The application serves pharmacies, drivers, and administrators with features for order management, QR code tracking, route planning, and proof of delivery.

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

### Latest Updates (April 12, 2026)
- **Multi-Provider Route Optimization** — Admin can choose between 3 route optimization providers:
  - **Circuit** — Original provider, API key configured, falls back to local when API fails
  - **Google Maps** — Directions API with traffic-aware waypoint optimization (dummy key, local fallback)
  - **Apple Maps** — MapKit Server API with nearest-neighbor optimization (dummy key, local fallback)
- **Provider Selection Modal** — UI shows all 3 providers with status badges ("API Ready" / "Local Fallback")
- **Optimization Results Display** — Shows optimized stop order, distance, duration after optimization
- **Provider Tracking** — Each gig stores which provider was used (`OptimizationProvider` field)
- **GET /api/routes/providers** — New endpoint listing available providers and their configuration status

### Previous Updates (March 29, 2026)
- Separate Driver Login Page — Mobile-friendly login at `/Driver/Login`
- Responsive Driver Dashboard — Works on all screen sizes
- Office Locations Management — Admin can add/edit/delete office locations at `/Admin/Offices`
- Geo-Lock for Office Scanning — After pickup, drivers can't scan "At Office" until within 100m of office
- Geocoding Feature — Get coordinates from address using Nominatim API

### Previous Updates (March 19, 2026)
- POD Folder Location Fix — Photos save to Web project's wwwroot/pod
- Route Optimization Fix — Graceful fallback to local optimization when Circuit API fails
- 3-Photo POD URLs in API — All API endpoints return photoHomeUrl, photoAddressUrl, photoPackageUrl

### Previous Updates (March 17, 2026)
- POD (Proof of Delivery) Fix — PhotoUrl properly returned
- Pharmacy Integration API v1 — Complete REST API for pharmacy software systems
- API Key Management — Admin endpoints to create/manage API credentials
- API Documentation Page — Available at `/developers`
- External Order ID Support

### Previous Updates (March 16, 2026)
- Admin Orders Refresh Button
- Blue QR Codes for Refrigerated Items
- Print Label
- In Transit → Office Reassignment Flow
- Pharmacy Refrigeration Checkbox
- Driver Delivery History

### Order Status Flow
| Status | Label | Meaning |
|--------|-------|---------|
| new | New | Order placed, waiting for pickup |
| assigned | Assigned | Driver assigned for pharmacy pickup |
| picked_up | Picked Up | Package picked up, en route to office |
| in_transit | In Transit | At office, preparing for dispatch |
| dispatched | Dispatched | Left office with delivery driver |
| out_for_delivery | Out for Delivery | On route to delivery location |
| delivering_now | At Location | Driver at delivery location |
| delivered | Delivered | Successfully delivered with POD |
| failed | Failed | Delivery attempt failed |
| cancelled | Cancelled | Order cancelled |

## Route Optimization Providers
| Provider | File | Status | Fallback |
|----------|------|--------|----------|
| Circuit | `Services/CircuitService.cs` | API key configured | Local optimization |
| Google Maps | `Services/GoogleMapsService.cs` | Dummy key | Local (city/postal grouping) |
| Apple Maps | `Services/AppleMapsService.cs` | Dummy key | Local (nearest-neighbor heuristic) |

### How to Add Real API Keys:
- **Google Maps**: Get API key from https://console.cloud.google.com/ → Enable Directions API → Update `appsettings.json` → `GoogleMaps:ApiKey`
- **Apple Maps**: Get credentials from https://developer.apple.com/account/ → Create Maps ID → Update `appsettings.json` → `AppleMaps:AuthToken`
- **Circuit**: Already configured in `appsettings.json` → `Circuit:ApiKey`

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Test API Key (HealthFirst Pharmacy)
- Key: `a4b4800042b34202b746e1213f1c77c6`
- Secret: `111369031c114d7a942869f49c66584e2a09f404f35c4453a03120faa8f7627e`

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P1) Webhook delivery implementation (trigger webhooks on status changes)
4. (P2) Cloud storage for POD images
5. (P2) Self-Service API Key Portal for pharmacies
6. (P2) Stripe payment flow
7. (P2) Forgot password
8. (P2) PWA Push Notifications

## Deployment
- DNS/SSL: Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- Hosting: Hoster.pk (IIS)

## Key Files Reference
- `/app/rxexpresss-solution/RxExpresss.API/Services/GoogleMapsService.cs` - Google Maps route optimization
- `/app/rxexpresss-solution/RxExpresss.API/Services/AppleMapsService.cs` - Apple Maps route optimization
- `/app/rxexpresss-solution/RxExpresss.API/Services/CircuitService.cs` - Circuit route optimization (original)
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/RoutesController.cs` - Route management with multi-provider optimization
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Admin/Routes.cshtml` - Admin Routes UI with provider selection
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/IntegrationController.cs` - Integration API
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/DriverPortalController.cs` - POD submission
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/AdminController.cs` - Admin API (offices, API keys)
- `/app/rxexpresss-solution/RxExpresss.Core/Entities/RoutePlan.cs` - RoutePlan entity (includes OptimizationProvider)
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Driver/Login.cshtml` - Mobile driver login
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Driver/Index.cshtml` - Driver dashboard with geo-lock
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Admin/Offices.cshtml` - Office management UI
