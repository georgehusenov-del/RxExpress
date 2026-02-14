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
- **Scheduled bulk delivery option ($9 flat rate, min 15 packages, 2+ days in advance)**

### Driver Portal
- View assigned deliveries **sorted by stop order** (stop 1, stop 2, stop 3...)
- **Shows package QR code** (e.g., S79D5-PKG1) instead of order number
- **Stop number badges** on each delivery card
- **Navigate icon** next to each delivery to open Google Maps
- **Navigate Full Route button** to open all stops in Google Maps sequence
- QR code scanning for pickup/delivery
- **POD only enabled after scanning package** ("Scan package first to enable POD" message)
- Proof of Delivery (POD) with signature and photo capture
- Online/Offline status toggle
- GPS navigation integration
- Copay collection confirmation (only shown after scan)

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

### Route Management (Gig Management)
- **Map View toggle** showing orders ready for routing
- Active Gigs display with numbered badges
- **Clickable gig cards** that open details modal
- **Gig Details Modal** with:
  - Sorted stops by route order
  - Navigate Full Route button for Google Maps
  - Route Map preview (Leaflet)
  - Driver assignment status
  - Optimization status
- **Full Gig Editing:**
  - Edit button opens modal to change name, date, driver
  - Orders button opens modal to remove orders from gig
  - Delete button removes gig (with confirmation)
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
- `/app/frontend/src/components/driver/DriverPortal.jsx` - Driver portal with scan-first POD and QR display
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Orders page with Map View
- `/app/frontend/src/components/admin/RouteManagement.jsx` - Routes page with Edit/Delete gig modals
- `/app/frontend/src/components/pharmacy/CreateDeliveryModal.jsx` - Delivery creation with 2-day scheduled min
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
- `GET /api/circuit/route-plans/{id}/full-status` - Get full plan status
- `POST /api/circuit/plans/{id}/assign-driver` - Assign driver to gig
- **`PUT /api/circuit/route-plans/{plan_id}` - Update gig (name, date)**
- **`DELETE /api/circuit/order/{order_id}/unlink` - Remove order from gig**

### Driver Portal
- `GET /api/driver-portal/profile` - Driver profile
- `GET /api/driver-portal/deliveries` - Assigned deliveries
- `POST /api/driver-portal/deliveries/{id}/pod` - Submit POD
- `PUT /api/driver-portal/status` - Update driver status

## Changelog

### Feb 14, 2026 (Session 6) - Gig Management & Driver POD Fix
- **Gig Management:**
  - Added Edit button on each gig card → opens modal with name, date, driver fields
  - Added Orders button → opens modal to remove orders from gig
  - Added Delete button → removes gig with confirmation
  - New backend endpoints: PUT /api/circuit/route-plans/{id}, DELETE /api/circuit/order/{id}/unlink

- **Driver Portal POD Fix:**
  - POD button now disabled by default with message "Scan package first to enable POD"
  - POD only enabled after driver scans the delivery QR code
  - Scan button changes to "Scanned ✓" after successful scan
  - Copay collection checkbox only shown after scan

- **Driver Package Display Fix:**
  - Shows package QR code (e.g., S79D5-PKG1) instead of order number (e.g., RX-34C6D215)
  - Uses borough prefix format for easy identification

- **Scheduled Delivery Fix:**
  - Changed minimum from 1 day to 2 days in advance
  - Date picker min attribute updated
  - Helper text: "Choose a date at least 2 days in advance"

- All tests passed (100% backend and frontend)
- Test report: `/app/test_reports/iteration_17.json`

### Feb 14, 2026 (Session 5) - Navigation & Visualization Features
- Driver portal: sorted stops, navigation icons, Navigate Full Route button
- Admin Routes: Map View toggle, clickable gig cards, Gig Details Modal
- Admin Orders: Map View toggle with color-coded markers
- Created DeliveryMap.jsx reusable Leaflet component

### Previous Sessions
- Full POD implementation (signature, photo, GPS)
- Circuit Spoke webhook integration
- Stripe backend integration
- QR scanning for pickup/delivery
- Auto-assign orders by borough
- Removed Smart Organizer and Driver Ratings

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
- Figma design link is inaccessible (BLOCKED)
- Cloud storage for PODs is still local persistent file storage

## Notes
- Preview URL: https://logistics-hub-327.preview.emergentagent.com
- Circuit API connected with 4 drivers configured
- Leaflet library used for map visualization (free, no API key required)
