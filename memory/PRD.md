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
- **Copay collection confirmation** - Checkbox before POD can be submitted
- **Pickup scanning** - QR scan changes order status to picked_up

### Admin Dashboard
- Overview with statistics (Total Users, Pharmacies, Drivers, Orders)
- Two view modes: Categories, List
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

### Feb 14, 2026 (Session 4)
- **Fix 1: Assign Driver to Gig**:
  - Driver assignment API was already working
  - UI dropdown on Routes page shows 4 available Circuit drivers
  - One-click assignment updates both local DB and Circuit API
  - Verified: George Husenov assigned to Gig 10 successfully

- **Fix 2: Route Optimization**:
  - Fixed `circuit_service.py` - POST requests without body now send empty object `{}` instead of `None`
  - This resolved the "Body cannot be empty when content-type is set to 'application/json'" error
  - Route optimization works correctly when driver is assigned (409 error for "no drivers" is expected behavior)

- **Fix 3: Remove Smart Organizer from Orders**:
  - Completely removed Smart Organizer view button from Orders Management
  - Removed all related code: DndContext, DraggableOrderCard, DroppableTimeWindow components
  - Removed unused state variables: expandedBoroughs, expandedTimeWindows, activeId, activeOrder, sensors
  - Removed unused functions: handleDragStart, handleDragEnd, handleDragCancel, organizedOrders memo
  - Removed Route Optimization Preview Modal (only used by Smart Organizer)
  - Cleaned up imports: removed DnD-kit, unused lucide icons (Sun, Sunset, Moon, GripVertical)
  - Orders page now has only "Categories" and "List" view modes

- **Fix 4: Order Details Modal**:
  - Fixed missing `Edit` icon import in OrdersManagement.jsx
  - Order Details modal now opens correctly when clicking Eye icon
  - Shows: order number, tracking ID, recipient info, delivery details, packages, pricing

- **Fix 5: Remove Driver Rating from Driver Management**:
  - Removed Rating column from drivers table header
  - Removed Rating cell from driver table rows
  - Removed Rating display from driver details modal
  - Removed unused `Star` icon import

- All tests passed (100% backend: 6/6, 100% frontend: 9/9)
- Test report: `/app/test_reports/iteration_15.json`

### Feb 14, 2026 (Session 3)
- **Copay Collection Checkbox Fix**:
  - Copay checkbox now only shows for orders with `copay_amount > 0`
  - Orders without copay have POD button enabled by default
  - Displays the exact copay amount: "Collect copay $XX.XX"
  - Warning shows specific amount: "Collect $XX.XX copay to enable POD"

- **Scheduled Bulk Delivery - Pharmacy Portal**:
  - Added new "Scheduled" tab to Create Delivery modal
  - $9 flat rate pricing
  - 8AM-10PM delivery window
  - Minimum 15 packages required (with validation)
  - Local deliveries only
  - Date picker for scheduling in advance (min 1 day ahead)
  - Badges: "Min 15+ packages", "8AM-10PM", "Local only"

- **Scheduled Bulk Delivery - Admin Portal**:
  - Added "Scheduled Bulk" delivery type to pricing management
  - New form fields: minimum_packages, local_only, allow_future_date
  - Displays constraints: "Min 15 packages", "Local Only" badges
  - Editable via admin pricing interface

- All tests passed (100% frontend verification)

- **QR Scanner for Pickup Tab**:
  - "Scan for Pickup" button on each pickup card opens QR Scanner modal
  - Scanner modal shows "Pickup" action badge
  - Supports camera scanning and manual QR code entry
  - On successful pickup scan, order status changes to `picked_up`
  - Records `actual_pickup_time` timestamp

- **Backend Enhancements**:
  - Updated `/api/orders/scan` to handle pickup action and change status from `ready_for_pickup` → `picked_up`
  - Updated `/api/driver-portal/deliveries` to include pickup statuses (`new`, `pending`, `confirmed`, `ready_for_pickup`)
  - Added `keep_status` parameter to order assignment endpoint for pickup workflow
  - DeliveryPricing model extended with: `minimum_packages`, `local_only`, `allow_future_date`
  - Added "scheduled" to DeliveryType enum

- All tests passed (100% backend, 100% frontend)

### Feb 14, 2026 (Session 2 - Continued)
- **Driver Scan → POD Flow**: After driver scans delivery label, POD modal automatically opens
- **Cleaned Up Extra Routes**: Deleted 12 test/duplicate routes, only Gig 6-9 with actual orders remain
- **POD Cloud Storage**:
  - Signatures saved to `/api/uploads/signatures/{pod_id}_signature.png`
  - Photos saved to `/api/uploads/photos/{pod_id}_photo.jpg`
  - Static file serving endpoints added for retrieving stored POD images
- **Enhanced Reports & Analytics**:
  - New `/api/reports/dashboard` endpoint with comprehensive stats
  - New `/api/reports/drivers/performance` endpoint with driver metrics
  - New `/api/reports/deliveries` endpoint with filtered delivery data
  - Reports UI with 3 tabs: Overview, Drivers, Boroughs
  - Date range picker and CSV export functionality
  - Top Pharmacies list, Order Status Breakdown, Daily Trends chart
- All tests passed (100% backend, 100% frontend)

### Feb 14, 2026 (Session 2)
- **Revamped Driver Portal with 3 Tabs**:
  - **Deliveries tab**: Shows out_for_delivery/in_transit orders with "Scan Delivery" and "Complete POD" buttons
  - **Pick Ups tab**: Shows new orders for pickup with "Scan for Pickup" button (status changes to picked_up only)
  - **Completed tab**: Shows today's completed deliveries count
  - Removed rating/stars from driver profile
  - Removed status options (Available/On Break/Offline), replaced with simple Online/Offline toggle
  - Out for delivery packages no longer show pickup scan option
- **Implemented Auto-Assign Orders by Borough** - New endpoint POST /api/circuit/auto-assign-by-borough
  - Automatically groups "out for delivery" orders by NYC borough (Q=Queens, B=Brooklyn, M=Manhattan, X=Bronx, S=Staten Island)
  - Creates new gigs (Gig N) for each borough with orders
  - Imports orders as stops to Circuit plans
- **Implemented One-Click Driver Assignment** - New endpoint POST /api/circuit/plans/{plan_id}/assign-driver
  - Easy dropdown on each gig card to assign drivers
  - Shows all 4 available Circuit drivers
  - Assigned drivers displayed with green background
- **Updated Route Management UI**:
  - Added "Auto-Assign" button in header (amber color with lightning icon)
  - Added "Assign Driver" dropdown on each gig card
  - Added borough badges (Queens/Brooklyn/Manhattan/Other) on gig cards
- All tests passed (100% backend, 100% frontend)

### Feb 14, 2026 (Session 1)
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
- Preview URL: https://rx-route-optimize.preview.emergentagent.com
- Circuit API is connected with 4 drivers configured (Usman, George Husenov, Tigran Ayrapetov, Test dd)


