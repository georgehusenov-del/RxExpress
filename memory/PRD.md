# RX Expresss - Product Requirements Document

## Overview
RX Expresss is a full-stack pharmacy delivery service application replicating DrugLift functionality, with routing and delivery management integrated with Circuit Spoke.

## Tech Stack
- **Backend:** Python/FastAPI
- **Frontend:** React.js, Tailwind CSS, dnd-kit, lucide-react, date-fns
- **Database:** MongoDB
- **External Services:** Circuit Spoke, Google Maps, Stripe

## Core Features

### Multi-Role Authentication
- Admin, Pharmacy, Driver, Patient roles
- JWT-based authentication
- Quick demo access for testing

### Pharmacy Portal
- Dashboard with delivery management
- Create/manage deliveries with pricing, notes, QR codes
- Copay tracking
- Time window selection (8am-1pm, 1pm-4pm, 4pm-10pm)
- Refrigerated package indicators

### Driver Portal
- View assigned deliveries
- QR code scanning for pickup/delivery
- Proof of Delivery (POD) with signature and photo capture
- Status updates (Available, On Break, Offline)
- GPS navigation integration

### Admin Dashboard
- Overview with statistics (Total Users, Pharmacies, Drivers, Orders)
- Three view modes: Categories, List, Smart Organizer
- Drag-and-drop route assignment
- Bulk order selection with floating action bar
- **Calendar date filtering** - Filter orders by date
- Borough-based organization (Queens, Brooklyn, Manhattan, Staten Island, Bronx)
- Route optimization
- Real-time status management
- Quick-print labels

### Order Status System
Unified status values:
- `new` - New orders ready for processing
- `picked_up` - Package picked up from pharmacy
- `in_transit` - Order in transit/warehouse
- `out_for_delivery` - Assigned to delivery person
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `canceled` - Order canceled

## Completed Implementations (Feb 14, 2026)

### 1. Calendar Date Filter
- Added date picker popover to Orders page header
- Quick buttons: Today, Yesterday, Clear
- Full calendar month view
- Filters orders by created_at date

### 2. Bulk Order Selection
- Checkboxes on all order cards in Smart Organizer view
- Floating action bar at bottom when orders selected
- Bulk status change dropdown
- Bulk print functionality
- Clear selection button

### 3. Circuit Spoke Webhook
- Endpoint: `POST /api/webhooks/circuit`
- Production URL: `https://backend.rxexpresss.com/api/webhooks/circuit`
- Handles events:
  - `stop.completed` / `stop.succeeded` - Mark orders as delivered
  - `stop.failed` / `stop.attempted` - Mark orders as failed
  - `stop.out_for_delivery` - Update order status
  - `plan.optimized` - Update plan optimization status
  - `plan.distributed` - Mark plan as distributed
  - `driver.location` - Update driver location
- Webhook logging for debugging
- Logs endpoint: `GET /api/webhooks/circuit/logs`

### 4. Proof of Delivery (POD)
- Full signature pad with canvas drawing
- Photo capture option
- Recipient name confirmation
- Delivery notes field
- Validation for signature-required packages
- GPS location capture on submission

### 5. Stripe Integration
- Checkout session creation
- Payment status polling
- Webhook handling for payment events
- Transaction logging in database

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | admin123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |

## Key Files

### Backend
- `/app/backend/server.py` - Main FastAPI application (3900+ lines)
- `/app/backend/models.py` - Data models
- `/app/backend/auth.py` - Authentication
- `/app/backend/circuit_service.py` - Circuit integration
- `/app/backend/maps_service.py` - Google Maps integration
- `/app/backend/notifications.py` - Notification service

### Frontend
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Orders page with date filter, bulk selection
- `/app/frontend/src/components/admin/RouteManagement.jsx` - Route management
- `/app/frontend/src/components/driver/DriverPortal.jsx` - Driver portal
- `/app/frontend/src/components/pod/ProofOfDeliveryModal.jsx` - POD modal
- `/app/frontend/src/components/pod/SignaturePad.jsx` - Signature canvas
- `/app/frontend/src/components/pod/PhotoCapture.jsx` - Photo capture

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/orders` - List orders with filters
- `PUT /api/admin/orders/{id}/status` - Update order status
- `GET /api/admin/drivers` - List drivers
- `GET /api/admin/drivers/locations` - Driver locations

### Circuit Integration
- `GET /api/circuit/status` - Connection status
- `POST /api/circuit/plans/create-for-date` - Create route plan
- `POST /api/circuit/plans/{id}/batch-import` - Batch import orders
- `POST /api/circuit/plans/{id}/optimize-and-distribute` - Optimize routes

### Webhooks
- `POST /api/webhooks/circuit` - Circuit Spoke webhook
- `POST /api/webhook/stripe` - Stripe payment webhook
- `GET /api/webhooks/circuit/logs` - View webhook logs

### Driver Portal
- `GET /api/driver-portal/profile` - Driver profile
- `GET /api/driver-portal/deliveries` - Assigned deliveries
- `POST /api/driver-portal/deliveries/{id}/pod` - Submit POD
- `PUT /api/driver-portal/status` - Update driver status

## Upcoming Tasks (Priority Order)

### P1 - Immediate
- Twilio SMS notifications for order updates
- SendGrid email notifications

### P2 - Short Term
- Pharmacy software integration
- Enhanced reporting & analytics

### P3 - Future
- Implement Figma design (need accessible link)
- Cancel time optimization

## Changelog

### Feb 14, 2026
- Fixed backend by restoring Python/FastAPI (was broken due to .NET migration in fork)
- Added Calendar date filter to Orders page
- Implemented Circuit Spoke webhook endpoint with full event handling
- Verified bulk order selection with floating action bar
- Verified POD (Proof of Delivery) with signature and photo capture
- Verified Stripe integration is working
- **Simplified Routes page to use "Gig" naming (Gig 1, Gig 2, Gig 3...)**
- **Added clean card grid layout for gigs with gradient number badges**
- **Streamlined "New Gig" creation modal**
- All comprehensive testing passed (100% backend, 100% frontend)

## Known Issues
- OrdersManagement.jsx is 2200+ lines and should be refactored into smaller components
- Twilio/SendGrid not configured (marked as MOCKED in test reports)

## Notes
- Preview URL: https://order-management-hub-7.preview.emergentagent.com
- Circuit API is connected with 4 drivers configured
