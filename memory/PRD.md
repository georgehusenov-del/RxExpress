# RX Expresss - Product Requirements Document

## Original Problem Statement
Build a full-stack pharmacy delivery service application named "RX Expresss" based on ASP.NET Core 8. The application serves pharmacies, drivers, and administrators with features for order management, QR code tracking, route planning, proof of delivery, and real-time driver tracking.

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
- **Real-Time Driver Tracking** — Admin live tracking page at `/Admin/Tracking`
  - Google Maps integration (shows map with driver markers when API key is real)
  - Driver panel showing all drivers: status, active deliveries, time since last GPS update
  - Filters: All / Online / On Route
  - Auto-refresh every 10 seconds + manual refresh
  - Driver trail/breadcrumb visualization (last 2 hours)
  - Office locations shown on map with radius circles
- **Driver Location Reporting** — Drivers automatically report GPS every 15 seconds
  - `POST /api/driver-portal/location` — lat, lng, speed, heading, accuracy
  - Updates `DriverProfile` (CurrentLatitude/Longitude/Speed/Heading/LastLocationUpdate)
  - Logs to `DriverLocationLog` for history/trail
- **Multi-Provider Route Optimization** — 3 separate service files:
  - `Services/CircuitService.cs` — Circuit/Spoke API (active by default)
  - `Services/GoogleMapsService.cs` — Google Maps Directions API
  - `Services/AppleMapsService.cs` — Apple Maps Server API
  - Active provider set in `appsettings.json` → `RouteOptimization:ActiveProvider`

### How to Activate Google Maps
Update `appsettings.json` in **both** API and Web projects:
```json
"GoogleMaps": {
    "ApiKey": "YOUR_REAL_KEY_FROM_GOOGLE_CLOUD_CONSOLE"
}
```
Enable in Google Cloud Console: **Maps JavaScript API** + **Directions API**

### Previous Updates
- Separate Driver Login at `/Driver/Login`, responsive driver dashboard
- Office Locations Management at `/Admin/Offices` with geo-lock scanning
- POD 3-photo system, Pharmacy Integration API v1, API Key Management
- Route optimization with fallback, QR scanning, service zones

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Key API Endpoints
- `POST /api/driver-portal/location` — Driver GPS report
- `GET /api/admin/tracking/drivers` — All drivers with positions + offices
- `GET /api/admin/tracking/drivers/{id}/trail?hours=2` — Location trail
- `GET /api/routes/providers` — List route optimization providers
- `POST /api/routes/{id}/optimize` — Optimize with active provider

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P1) Webhook delivery on status changes
4. (P2) Cloud storage for POD images
5. (P2) Self-Service API Key Portal
6. (P2) Stripe payment flow
7. (P2) Forgot password
8. (P2) PWA Push Notifications

## Key Files
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Admin/Tracking.cshtml` — Live tracking page
- `/app/rxexpresss-solution/RxExpresss.Core/Entities/DriverLocationLog.cs` — Location history entity
- `/app/rxexpresss-solution/RxExpresss.API/Services/GoogleMapsService.cs` — Google Maps service
- `/app/rxexpresss-solution/RxExpresss.API/Services/AppleMapsService.cs` — Apple Maps service
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/RoutesController.cs` — Route optimization
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/AdminController.cs` — Tracking + admin endpoints
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/DriverPortalController.cs` — Driver location + POD
