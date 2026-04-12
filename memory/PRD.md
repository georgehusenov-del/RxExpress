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
- **Multi-Provider Route Optimization** — 3 separate service files:
  - `Services/CircuitService.cs` — Circuit/Spoke API (active by default)
  - `Services/GoogleMapsService.cs` — Google Maps Directions API
  - `Services/AppleMapsService.cs` — Apple Maps Server API
- Only one provider active at a time, controlled via `appsettings.json` → `RouteOptimization:ActiveProvider`
- No UI modal — Optimize button directly uses the configured provider
- `GET /api/routes/providers` — Lists all 3 providers with configuration status

### How to Switch Route Provider
Change in `appsettings.json`:
```json
"RouteOptimization": {
    "ActiveProvider": "circuit"      // or "google_maps" or "apple_maps"
}
```
Also update the corresponding API key:
- Google Maps: `GoogleMaps:ApiKey`
- Apple Maps: `AppleMaps:AuthToken`
- Circuit: `Circuit:ApiKey` (already configured)

### Previous Updates (March 29, 2026)
- Separate Driver Login Page at `/Driver/Login`
- Responsive Driver Dashboard
- Office Locations Management at `/Admin/Offices`
- Geo-Lock for Office Scanning (100m radius)

### Previous Updates (March 19, 2026)
- POD Folder Location Fix — Photos save to Web project's wwwroot/pod
- Route Optimization Fix — Graceful fallback
- 3-Photo POD URLs in API

### Previous Updates (March 17, 2026)
- Pharmacy Integration API v1
- API Key Management
- API Documentation at `/developers`

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P1) Webhook delivery implementation
4. (P2) Cloud storage for POD images
5. (P2) Self-Service API Key Portal
6. (P2) Stripe payment flow
7. (P2) Forgot password
8. (P2) PWA Push Notifications

## Key Files Reference
- `/app/rxexpresss-solution/RxExpresss.API/Services/GoogleMapsService.cs`
- `/app/rxexpresss-solution/RxExpresss.API/Services/AppleMapsService.cs`
- `/app/rxexpresss-solution/RxExpresss.API/Services/CircuitService.cs`
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/RoutesController.cs`
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Admin/Routes.cshtml`
- `/app/rxexpresss-solution/RxExpresss.API/appsettings.json`
