# RX Expresss - Product Requirements Document

## Overview
RX Expresss is a full-stack pharmacy delivery service application replicating DrugLift functionality, with routing and delivery management integrated with Circuit Spoke.

## Tech Stack
- **Backend:** Python/FastAPI
- **Frontend:** React.js, Tailwind CSS, Shadcn/UI, Lucide React, date-fns
- **Database:** MongoDB
- **External Services:** Circuit Spoke, Google Maps, Stripe
- **Maps:** Leaflet (react-leaflet) for visualization, Google Maps for navigation

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
- Scheduled bulk delivery option ($9 flat rate, min 15 packages)

### Driver Portal
- View assigned deliveries **sorted by stop order** (stop 1, stop 2, stop 3...)
- **Stop number badges** on each delivery card
- **Navigate icon** next to each delivery to open Google Maps
- **Navigate Full Route button** to open all stops in Google Maps sequence
- QR code scanning for pickup/delivery
- Proof of Delivery (POD) with signature and photo capture
- Online/Offline status toggle
- GPS navigation integration
- Copay collection confirmation

### Admin Dashboard
- Overview with statistics (Total Users, Pharmacies, Drivers, Orders)
- Two view modes: Categories, List
- Bulk order selection with floating action bar
- Calendar date filtering
- Borough-based organization
- Route optimization
- Real-time status management
- Quick-print labels
- **Map View toggle** on Orders page showing all delivery locations
- **Color-coded markers** by order status (amber=new, blue=picked_up, etc.)

### Route Management
- **Map View toggle** showing orders ready for routing
- Active Gigs display with numbered badges
- **Clickable gig cards** that open details modal
- **Gig Details Modal** with:
  - Sorted stops by route order
  - Navigate Full Route button for Google Maps
  - Route Map preview (Leaflet)
  - Driver assignment status
  - Optimization status
- Driver assignment dropdown
- Auto-assign by borough feature
- Route optimization via Circuit API

### Order Status System
Unified status values:
- `new` - New orders ready for processing
- `picked_up` - Package picked up from pharmacy
- `in_transit` - Order in transit/warehouse
- `out_for_delivery` - Assigned to delivery person
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `canceled` - Order canceled

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | admin123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |

## Key Files

### Backend
- `/app/backend/server.py` - Main FastAPI application
- `/app/backend/models.py` - Data models
- `/app/backend/auth.py` - Authentication
- `/app/backend/circuit_service.py` - Circuit integration

### Frontend
- `/app/frontend/src/components/driver/DriverPortal.jsx` - Driver portal with sorted stops and navigation
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Orders page with Map View
- `/app/frontend/src/components/admin/RouteManagement.jsx` - Routes page with Map View and Gig Details Modal
- `/app/frontend/src/components/maps/DeliveryMap.jsx` - Reusable Leaflet map component
- `/app/frontend/src/components/pod/ProofOfDeliveryModal.jsx` - POD modal

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

### Circuit Integration
- `GET /api/circuit/status` - Connection status
- `POST /api/circuit/plans/create-for-date` - Create route plan
- `POST /api/circuit/plans/{id}/batch-import` - Batch import orders
- `POST /api/circuit/plans/{id}/optimize-and-distribute` - Optimize routes
- `GET /api/circuit/route-plans/{id}/full-status` - Get full plan status with linked orders
- `POST /api/circuit/plans/{id}/assign-driver` - Assign driver to gig

### Driver Portal
- `GET /api/driver-portal/profile` - Driver profile
- `GET /api/driver-portal/deliveries` - Assigned deliveries (includes stop_sequence)
- `POST /api/driver-portal/deliveries/{id}/pod` - Submit POD
- `PUT /api/driver-portal/status` - Update driver status

## Changelog

### Feb 14, 2026 (Session 5) - Navigation & Visualization Features
- **Driver Portal Enhancements:**
  - Deliveries now sorted by `stop_sequence` (stop 1, 2, 3...)
  - Added stop number badges in teal gradient circles
  - Added navigation icon (blue arrow) next to each delivery
  - Added "Navigate Full Route (X stops)" button to open all stops in Google Maps
  
- **Admin Routes Page Enhancements:**
  - Added Map View toggle showing orders ready for routing (Leaflet map)
  - Gig cards are now clickable - open Gig Details Modal
  - Gig Details Modal shows: sorted stops, status, driver, "Navigate Full Route" button, route map
  
- **Admin Orders Page Enhancements:**
  - Added Map View toggle showing all order locations on Leaflet map
  - Color-coded markers by status (amber=new, blue=picked_up, purple=in_transit, teal=out_for_delivery, green=delivered)
  - Status legend below map

- **New Component:**
  - Created `/app/frontend/src/components/maps/DeliveryMap.jsx` - Reusable Leaflet map component
  - Helper functions: `buildGoogleMapsRouteUrl()`, `buildSingleAddressUrl()`

- All tests passed (100% frontend)
- Test report: `/app/test_reports/iteration_16.json`

### Feb 14, 2026 (Session 4)
- Removed "Smart Organizer" view from Orders page
- Removed Driver Rating UI
- Fixed Route Optimization API call (empty body issue)
- Fixed Gig Assignment API
- Fixed Order Details Modal crash

### Previous Sessions
- Full POD implementation (signature, photo, GPS)
- Circuit Spoke webhook integration
- Stripe backend integration
- QR scanning for pickup/delivery
- Auto-assign orders by borough
- Scheduled bulk delivery type

## Upcoming Tasks

### P1 - Immediate
- Twilio SMS notifications for order updates
- SendGrid email notifications
- Bulk order selection in "List" view

### P2 - Short Term
- Cloud storage for POD images (AWS S3)
- Stripe frontend checkout flow
- Pharmacy software integration

### P3 - Future
- Backend refactoring (split server.py into routers)
- Enhanced reporting & analytics
- Implement Figma design (need accessible link)

## Known Issues
- Gig Details Modal may show "No stops" if orders are not linked via Circuit API (data-dependent)
- Figma design link is inaccessible (BLOCKED)
- Cloud storage for PODs is still local persistent file storage

## Notes
- Preview URL: https://logistics-hub-327.preview.emergentagent.com
- Circuit API connected with 4 drivers configured
- Leaflet library used for map visualization (free, no API key required)
