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

### Latest Updates (March 17, 2026)
- ✅ **POD (Proof of Delivery) Fix** - PhotoUrl now properly returned in Admin and Pharmacy order lists
- ✅ **Pharmacy Integration API v1** - Complete REST API for pharmacy software systems to connect
  - `POST /api/v1/orders` - Create delivery orders
  - `GET /api/v1/orders` - List orders with pagination
  - `GET /api/v1/orders/{identifier}` - Get by ID, order number, tracking number, or external ID
  - `GET /api/v1/orders/{identifier}/tracking` - Real-time tracking with driver location
  - `DELETE /api/v1/orders/{identifier}` - Cancel orders
  - `POST /api/v1/webhooks` - Register status update webhooks
  - `GET /api/v1/webhooks` - List registered webhooks
  - `DELETE /api/v1/webhooks/{id}` - Delete webhooks
- ✅ **API Key Management** - Admin endpoints to create/manage API credentials for pharmacies
- ✅ **API Documentation Page** - Available at `/developers`
- ✅ **External Order ID Support** - Pharmacies can reference their internal order IDs

### Previous Updates (March 16, 2026)
- ✅ **Admin Orders Refresh Button** - Quick data reload without page refresh
- ✅ **Blue QR Codes for Refrigerated Items** - QR code IMAGE is blue (using qrserver.com color parameter)
- ✅ **Print Label** - Opens print dialog (user must select physical printer, not "Save as PDF")
- ✅ **In Transit → Office Reassignment Flow**
- ✅ **Pharmacy Refrigeration Checkbox** - Now properly saves to database
- ✅ **Driver Delivery History** - Enhanced with POD details

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

### Integration API Authentication
- API Key + Secret header authentication
- Headers: `X-API-Key` and `X-API-Secret`
- Admin creates API keys via `/api/admin/api-keys`

### Database Entities Added
- `ApiKey` - Stores pharmacy API credentials
- `Webhook` - Stores webhook registrations
- `Order.ExternalOrderId` - External system reference

## Preview URL
- https://driver-pod-camera.preview.emergentagent.com
- API Docs: https://driver-pod-camera.preview.emergentagent.com/developers

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Test API Key (for HealthFirst Pharmacy)
- Key: `a4b4800042b34202b746e1213f1c77c6`
- Secret: `111369031c114d7a942869f49c66584e2a09f404f35c4453a03120faa8f7627e`

## Backlog
1. (P1) Circuit Webhook implementation
2. (P1) Twilio/SendGrid notifications
3. (P1) Webhook delivery implementation (trigger webhooks on status changes)
4. (P2) Google Maps route optimization
5. (P2) Cloud storage for POD images
6. (P2) Stripe payment flow
7. (P2) Forgot password

## Deployment
- DNS/SSL: Cloudflare
- Backend: backend.rxexpresss.com
- Frontend: rxexpresss.com
- Hosting: Hoster.pk (IIS)

## Key Files Reference
- `/app/rxexpresss-solution/RxExpresss.API/Controllers/IntegrationController.cs` - Integration API
- `/app/rxexpresss-solution/RxExpresss.Core/Entities/ApiKey.cs` - API Key entity
- `/app/rxexpresss-solution/RxExpresss.Core/Entities/Webhook.cs` - Webhook entity
- `/app/rxexpresss-solution/RxExpresss.Core/DTOs/IntegrationDtos.cs` - Integration DTOs
- `/app/rxexpresss-solution/RxExpresss.Web/Views/Home/ApiDocs.cshtml` - API Documentation
