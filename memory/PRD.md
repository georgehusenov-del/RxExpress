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

### UI/UX Improvements (Latest)
- ✅ **Invisible scrollbar** - Scrollbars hidden but scrolling works
- ✅ **Collapsible sidebar** - Fixed toggle button (teal) on mobile/tablet
- ✅ **Actual QR codes** - Black/white box pattern QR images in order details and printing
- ✅ **Removed status flow from Driver page**
- ✅ Responsive design for all screen sizes

### Authentication & Authorization
- JWT-based authentication
- Role-based access: Admin, Pharmacy, Driver

### Landing Page
- Mobile hamburger menu navigation
- Privacy Policy and Terms of Service pages
- Contact: +1 (718) 799-4103, getfastdeliverywith@rxexpresss.com

### Admin Dashboard
- QR code display in order details (actual QR image)
- Print QR labels with actual QR codes
- Order management with filters
- Driver/Pharmacy/Route management

### Pharmacy Portal
- QR code display in order details
- Print QR labels with actual QR codes
- Order creation and tracking

### Driver Portal
- Clean interface (no status flow legend)
- QR-scan-based status workflow
- POD with mandatory photo

### Order Status Flow
| Status | Meaning |
|--------|---------|
| New | QR created |
| Picked Up | From pharmacy |
| In Transit | At office |
| Out for Delivery | Dispatched |
| Delivering Now | Active delivery |
| Delivered | POD complete |
| Failed | Patient not home |
| Cancelled | Pharmacy cancelled |

## Preview URL
- https://rx-express-core.preview.emergentagent.com

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Recent Changes (Feb 21, 2026)
1. ✅ Hidden scrollbars (CSS: scrollbar-width:none)
2. ✅ Fixed collapsible sidebar with toggle button
3. ✅ Actual QR code images using qrserver.com API
4. ✅ Print labels with QRCode.js generated QR codes
5. ✅ Removed status flow section from Driver portal
6. ✅ **Druglift-style Gig Management** (Latest):
   - Per-order driver unassignment (POST /api/routes/{id}/orders/{orderId}/unassign)
   - Split gig preserves assigned driver with moved orders
   - Orders remain in gig for tracking until delivery
   - Unassign button visible in gig detail for assigned orders

## Gig Management Workflow (Druglift Flow)
- **Order stays in gig** - Orders remain in gig for tracking until delivery
- **Split keeps driver** - When splitting a gig, orders keep their assigned driver
- **Per-order unassign** - Can unassign driver from individual orders (not entire gig)
- **One order = one gig** - Each order belongs to only one gig at a time

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P2) Google Maps route optimization
4. (P2) Cloud storage for POD images
5. (P2) Stripe payment flow
6. (P2) Forgot password
7. (P2) QR code print page issue (if still occurring - need user verification)

## Deployment
- DNS/SSL: Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- Hosting: Hoster.pk (IIS)
