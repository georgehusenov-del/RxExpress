# RX Expresss - Product Requirements Document

## Original Problem Statement
Build a full-stack pharmacy delivery service application named "RX Expresss" based on ASP.NET Core 8. The application serves pharmacies, drivers, and administrators with features for order management, QR code tracking, route planning, and proof of delivery.

## Current Architecture
```
/app/rxexpresss-solution/
├── RxExpresss.API/        # ASP.NET Core Web API project
├── RxExpresss.Web/        # ASP.NET Core MVC project (frontend)
├── RxExpresss.Core/       # Class library (entities, DTOs, services, interfaces)
├── RxExpresss.Data/       # Class library (DbContext, repositories, migrations)
├── RxExpresss.Identity/   # Class library (JWT service, auth logic)
└── RxExpresss.sln         # Main solution file
```

## Core Features Implemented

### Authentication & Authorization
- JWT-based authentication
- Role-based access: Admin, Pharmacy, Driver
- Login, logout, session management

### Landing Page
- Responsive hero section with mobile hamburger menu
- Features showcase
- Contact form
- Updated contact info: +1 (718) 799-4103, getfastdeliverywith@rxexpresss.com
- Privacy Policy and Terms of Service pages
- Separate CSS file (landing.css) - no inline styles

### Responsive Design
- Collapsible sidebar with hamburger icon (3-line menu)
- Mobile-first responsive styles
- Breakpoints: 1024px (tablet), 768px (mobile), 480px (small mobile)
- Touch-friendly navigation
- Adaptive layouts for all screen sizes

### Admin Dashboard
- Dashboard with statistics
- Order management with filters (date, status, pharmacy)
- QR code printing functionality (shared print-qr.js)
- Driver management
- Pharmacy management
- Route/Gig management
- Service zones management
- Pricing configuration
- QR scanning page
- POD viewing capability

### Pharmacy Portal
- Profile display
- Order creation with delivery options
- Order tracking (case-insensitive search)
- QR code printing functionality
- POD viewing capability

### Driver Portal
- Status toggle (Online/Offline)
- QR-scan-based status workflow (no manual status changes):
  - New → Picked Up (scan at pharmacy)
  - Picked Up → In Transit (scan at office)
  - In Transit → Out for Delivery (scan when dispatching)
  - Out for Delivery → Delivering Now (scan when starting delivery)
  - Delivering Now → Delivered (POD with mandatory photo)
  - Delivering Now → Failed (if patient not home)
- Delivery history
- Route navigation (Google Maps)
- Copay collection

### Order Status Flow
| Status | Meaning |
|--------|---------|
| New | QR created, order placed |
| Picked Up | Package picked up from pharmacy |
| In Transit | Package arrived at office |
| Out for Delivery | Package dispatched for route |
| Delivering Now | Driver actively delivering this package |
| Delivered | POD complete |
| Failed | Patient not home / delivery issue |
| Cancelled | Pharmacy cancelled or max attempts |

### Tracking
- Public tracking page with timeline
- Case-insensitive search (Order #, Tracking #, QR Code)

## Configuration Files

### API appsettings.json
- SQL Server connection to production database
- JWT configuration
- Circuit API keys

### Web appsettings.Production.json
- API base URL: https://backend.rxexpresss.com/api
- Logging configuration

## Test Accounts (Commented out in production)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Recent Changes (Feb 21, 2026)
1. Added Privacy Policy page (/Home/PrivacyPolicy)
2. Added Terms of Service page (/Home/TermsOfService)
3. Updated landing page with mobile hamburger menu
4. Implemented collapsible sidebar with hamburger icon
5. Added comprehensive responsive styles for all screen sizes
6. Commented out test accounts from login page
7. Updated contact info (phone and email)
8. Fixed pharmacy order tracking (case-insensitive search)
9. Added QR code printing from Admin and Pharmacy portals
10. Created shared print-qr.js for label printing
11. Updated Driver portal to QR-scan-based status changes only
12. Added "delivering_now" status to the workflow
13. Added Failed Delivery modal for drivers
14. Legal page styles moved to landing.css (no inline styles)

## File Structure for CSS/JS
```
/wwwroot/
├── css/
│   ├── site.css        # Main application styles
│   └── landing.css     # Landing page and legal page styles
└── js/
    ├── api-service.js  # API communication service
    └── print-qr.js     # Shared QR label printing function
```

## Backlog / Future Tasks
1. **(P1)** Implement Circuit Spoke Webhook Logic
2. **(P1)** Integrate Twilio/SendGrid Notifications
3. **(P2)** Replace Circuit with Google Maps API for route optimization
4. **(P2)** Cloud Storage for POD images (Azure Blob/AWS S3)
5. **(P2)** Stripe Frontend Payment Flow
6. **(P2)** Forgot Password implementation
7. **(P3)** Pharmacy Software Integration (needs clarification)

## Known Issues
- POD images stored locally in wwwroot/uploads (not production-ready)
- Circuit webhook endpoint is placeholder
- Preview environment doesn't have .NET runtime installed

## Deployment
- DNS and SSL managed via Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- SSL Mode: Full (Strict)
- Hosting: Hoster.pk with IIS
