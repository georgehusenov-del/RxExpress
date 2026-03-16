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
- ✅ **Refrigerated Items (Blue/Frost)** - Cold chain items highlighted with blue gradient background and ❄️ badge
- ✅ **Print Label Fix** - Opens print dialog directly instead of save-to-file
- ✅ **In Transit → Office Reassignment Flow** - Packages at office are unassigned from driver for admin reassignment to appropriate route
- ✅ **Out for Delivery → POD Fix** - Delivering Now shows POD buttons directly without requiring additional scan
- ✅ **Driver Delivery History** - Enhanced to show detailed completed deliveries with POD info

### UI/UX Improvements
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
- Refrigerated checkbox in edit modal
- Driver/Pharmacy/Route management

### Pharmacy Portal
- QR code display in order details
- Print QR labels with actual QR codes
- Order creation and tracking

### Driver Portal
- Clean interface (no status flow legend)
- QR-scan-based status workflow
- POD with mandatory photo
- Refrigerated items highlighted in blue
- Enhanced delivery history with POD details

### Order Status Flow
| Status | Meaning |
|--------|---------|
| New | QR created |
| Assigned | Driver assigned |
| Picked Up | From pharmacy |
| In Transit | At office (driver unassigned for reassignment) |
| Out for Delivery | Dispatched to route |
| Delivering Now | Active delivery (POD buttons visible) |
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

## Recent Changes (March 16, 2026)
1. ✅ **Refresh Button** - Admin Orders page has quick refresh in topbar
2. ✅ **Refrigerated Items** - IsRefrigerated field added to Order entity, blue/frost styling
3. ✅ **Print Dialog** - Print Label now triggers print dialog using window.print()
4. ✅ **In Transit Workflow** - Driver scans at office → order unassigned → admin reassigns to route driver
5. ✅ **POD Flow** - Delivering Now status shows POD buttons directly (no scan required)
6. ✅ **History Enhanced** - Driver history shows phone, state, POD photos, signatures

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

## Deployment
- DNS/SSL: Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- Hosting: Hoster.pk (IIS)
