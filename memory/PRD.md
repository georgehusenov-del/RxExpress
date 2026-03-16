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

### Latest Updates (March 16, 2026)
- ✅ **Admin Orders Refresh Button** - Quick data reload without page refresh
- ✅ **Blue QR Codes for Refrigerated Items** - QR code IMAGE is blue (using qrserver.com color parameter), not just text
- ✅ **Print Label** - Opens print dialog (user must select physical printer, not "Save as PDF")
- ✅ **In Transit → Office Reassignment Flow**:
  - When package scanned "In Transit" arrives at office → driver unassigned
  - When admin assigns NEW driver to in_transit order → status changes to "out_for_delivery" (not back to picked_up)
- ✅ **Pharmacy Refrigeration Checkbox** - Now properly saves to database when creating orders
- ✅ **Driver Delivery History** - Enhanced to show detailed completed deliveries with POD info

### Order Status Flow
| Status | Meaning |
|--------|---------|
| New | QR created |
| Assigned | Driver assigned to new order |
| Picked Up | From pharmacy |
| In Transit | At office (driver unassigned for reassignment) |
| **Out for Delivery** | Assigned to route driver (from in_transit) |
| Delivering Now | Active delivery (POD buttons visible) |
| Delivered | POD complete |
| Failed | Patient not home |
| Cancelled | Pharmacy cancelled |

**Key Workflow:**
1. Pharmacy creates order → "new"
2. Admin assigns pickup driver → "assigned"
3. Driver picks up → "picked_up"
4. Driver scans at office → "in_transit" (driver unassigned)
5. Admin assigns delivery driver → **"out_for_delivery"** (NOT back to assigned/picked_up)
6. Driver at location → "delivering_now"
7. POD completed → "delivered"

### UI/UX Improvements
- ✅ **Invisible scrollbar** - Scrollbars hidden but scrolling works
- ✅ **Collapsible sidebar** - Fixed toggle button (teal) on mobile/tablet
- ✅ **Blue QR code images** - Refrigerated items have blue QR codes using `&color=0288d1`
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
- Blue QR code images for refrigerated items
- Print QR labels with blue QR codes for refrigerated
- Refrigerated checkbox in edit modal
- Order management with filters and refresh button
- Driver/Pharmacy/Route management

### Pharmacy Portal
- "Requires Refrigeration" checkbox saves to database
- Blue QR codes in order list for refrigerated items
- Order creation and tracking

### Driver Portal
- Clean interface (no status flow legend)
- QR-scan-based status workflow
- POD with mandatory photo
- Blue QR codes for refrigerated items
- Enhanced delivery history with POD details

## Preview URL
- https://rx-express-core.preview.emergentagent.com

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Gig Management Workflow (Druglift Flow)
- **Order stays in gig** - Orders remain in gig for tracking until delivery
- **Split keeps driver** - When splitting a gig, orders keep their assigned driver
- **Per-order unassign** - Can unassign driver from individual orders (not entire gig)
- **One order = one gig** - Each order belongs to only one gig at a time

## Known Limitations
- **Print Dialog** - Shows system print dialog. If user's default printer is "Save as PDF", it will show save dialog. User needs to select physical printer in the dialog.

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P2) Google Maps route optimization
4. (P2) Cloud storage for POD images
5. (P2) Stripe payment flow
6. (P2) Forgot password

## Deployment
- DNS/SSL: Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- Hosting: Hoster.pk (IIS)
