# RX Expresss - Pharmacy Delivery Service
## Product Requirements Document

**Last Updated:** 2026-02-13 (Simplified Order Status System)

---

### Original Problem Statement
Build a full-stack pharmacy delivery service application named "RX Expresss" that replicates DrugLift's functionality. The application should support:
- Multi-role authentication (Admin, Pharmacy, Driver, Patient)
- Prescription/order management with multiple delivery types
- Real-time delivery tracking
- Driver assignment & routing via Circuit/Spoke integration
- Photo verification & electronic signatures
- Notifications (SMS/email/push)
- Payment processing
- Admin dashboard for platform management
- QR Code scanning for package verification
- **Admin can change delivery status anytime**
- **Dedicated driver interface for scanning during deliveries**
- **Admin control over delivery pricing**
- **Full Circuit/Spoke route optimization workflow**
- **Copay Tracking** - Pharmacies specify copay, drivers collect, admin tracks

---

### Technology Stack
- **Frontend:** React.js, Tailwind CSS, Shadcn/UI, @dnd-kit, @react-google-maps/api
- **Backend:** ASP.NET Core 8.0 Web API (C#) - **REWRITTEN FROM PYTHON/FASTAPI**
- **Database:** MongoDB with MongoDB.Driver
- **Authentication:** JWT Bearer tokens

---

### What's Been Implemented

#### Phase 17: Simplified Order Status System ✅ (2026-02-13)
- **Status Flow Simplified:** New → Processing → Ready → Assigned → In Transit → Delivered
- **Status Labels:**
  - `pending` → **"New"** (Order just received)
  - `confirmed` → **"Processing"** (Pharmacy preparing order)
  - `ready_for_pickup` → **"Ready"** (Ready for driver pickup)
  - `assigned` → **"Assigned"** (Driver assigned)
  - `in_transit` → **"In Transit"** (Out for delivery)
  - `delivered` → **"Delivered"** (Successfully delivered)
  - `cancelled` → **"Cancelled"** (Order cancelled)
- **Updated Components:**
  - Admin OrdersManagement.jsx - Categories view, List view, Status dropdown
  - Pharmacy OrdersList.jsx and OrderDetailsModal.jsx
  - Driver DriverPortal.jsx - Status badges and update dropdown
- **UI Improvements:** Status dropdown now shows descriptions for each status

#### Phase 16: Pricing Tab UI Redesign ✅ (2026-02-13)
- **Pharmacy Portal:** Redesigned the "Create New Delivery" modal with a tab-based interface
- **Tabs Structure:**
  - **Next Day** tab (Blue): Shows 3 time window options (8AM-1PM Morning, 1PM-4PM Afternoon, 4PM-10PM Evening) - all at $9.50
  - **Same Day** tab (Amber): Shows Same-Day Express option at $18 with cutoff time badge
  - **Priority** tab (Purple): Shows Priority First option at $25 with 8AM-10AM time window
- **User Experience:** Pharmacies can now easily select delivery type by clicking tabs, then choose specific time windows
- **Auto-selection:** When switching tabs, the first option is automatically selected
- **Add-ons & Copay:** Sections remain accessible below the tabs for refrigeration fees and copay collection

#### Phase 15: Admin Routing Page Fix ✅ (2026-02-13)
- **Issue:** Admin "Routes" page was showing "Connection failed" error after backend rewrite
- **Root Cause:** The .NET backend (`/app/backend-dotnet/RxExpresss`) was not running
- **Fix:** Started the .NET backend with `dotnet run --urls "http://0.0.0.0:8001"`
- **Verified Working:**
  - Circuit API status: "Connected" 
  - Route plans listing (3 active plans)
  - Pending orders for routing (3 orders)
  - Circuit drivers list (4 drivers)
  - Create/View/Optimize/Distribute/Delete plan operations

#### Phase 14: Backend Rewrite to ASP.NET Core ✅ (2026-02-12)
- Complete backend rewrite from Python/FastAPI to ASP.NET Core 8.0 C#
- **New Project Structure:**
  - `/app/backend-dotnet/RxExpresss/` - Main project directory
  - `Controllers/` - AuthController, AdminController, OrdersController, DriversController, PharmaciesController, PricingController, **CircuitController**
  - `Models/` - User.cs, Order.cs, Enums.cs (MongoDB models with BsonIgnoreExtraElements)
  - `DTOs/` - DTOs.cs (request/response DTOs)
  - `Services/` - MongoDbService.cs, AuthService.cs
- **Key Features Preserved:**
  - JWT authentication with role-based access
  - All API routes remain the same for frontend compatibility
  - MongoDB database connection unchanged
  - Route optimization with Haversine distance calculation
  - Admin dashboard stats, orders, drivers management
  - Order status updates, reassignment, cancellation
  - **Full Circuit/Spoke API integration in CircuitController.cs**

#### Phase 1-8: Core Features ✅
- Multi-role authentication (Admin, Pharmacy, Driver, Patient)
- Order management with delivery types
- Admin Dashboard with all management features
- QR Code scanning
- Driver Portal with POD
- Admin status control
- Admin pricing control
- Multi-location pharmacy support

#### Phase 9: Google Maps Integration ✅ (2026-02-12)
- Configured with real API key
- Geocoding endpoint working with real coordinates
- Distance matrix API available

#### Phase 10: Circuit/Spoke Route Optimization ✅ (2026-02-12)

#### Phase 11: Copay Tracking Feature ✅ (2026-02-12)
- **Pharmacy Portal:** Copay input field in CreateDeliveryModal
- **Driver Portal:** Collect copay endpoint (`POST /api/driver-portal/deliveries/{order_id}/collect-copay`)
- **Admin Dashboard:** Copay Collection section with "Copay to Collect" and "Copay Collected" stats
- **Backend:** MongoDB aggregation pipeline for copay statistics
- **Test Results:** 100% pass rate (15/15 backend, all frontend verified)

#### Phase 12: Smart Organizer Feature ✅ (2026-02-12)
- **Smart Organizer View:** Groups active orders by NYC borough (Q, B, M, S, X) and time window (8am-1pm, 1pm-4pm, 4pm-10pm)
- **Borough Summary Cards:** Shows order count per borough at a glance
- **Collapsible Sections:** Easy navigation through orders by area and time
- **Time Window Icons:** Visual indicators (☀️ morning, 🌅 afternoon, 🌙 evening)
- **Quick Actions:** View details and change status directly from the organized view
- **Toggle View:** Switch between List view, Smart Organizer view, and Categories view
- **Drag & Drop:** Drag orders between time windows to reassign delivery slots
- **Quick Driver Assignment:** Click truck icon on any order to instantly assign/unassign drivers from a dropdown
- **Backend Endpoint:** `PUT /api/admin/orders/{order_id}/reassign` for time window and driver reassignment

#### Phase 13: Categories View ✅ (2026-02-12)
- **New "Categories" View Mode:** Organizes all orders by status:
  - Ready for Pickup (cyan) - Packages ready to be picked up by drivers
  - Pending (amber) - Orders awaiting confirmation
  - Assigned (indigo) - Orders assigned to drivers
  - Confirmed (blue) - Confirmed orders ready to be processed
- **Summary Stat Cards:** Quick overview of order counts per status category
- **Collapsible Category Sections:** Expand/collapse to view orders in each status
- **Order Details:** Shows order number, QR code, recipient, location, time window, delivery type
- **Driver Assignment Badge:** Visual indicator for orders with drivers assigned
- **Quick Actions:** View details, change status, assign driver, track order, cancel order
- **Copay Display:** Shows copay amount for orders with pending copay collection
- **Default View:** Categories view is now the default view mode

---

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | admin123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |
| Patient | patient@test.com | testpass123 |

---

### Integrations Status

| Integration | Status | Notes |
|-------------|--------|-------|
| MongoDB | ✅ Connected | Primary database |
| Stripe | ✅ Configured | Using test key |
| Circuit/Spoke | ✅ **CONNECTED** | Route optimization, 4 drivers available |
| Google Maps | ✅ **CONFIGURED** | Real geocoding working |
| Twilio SMS | ⚠️ PLACEHOLDER | Add credentials in .env |
| SendGrid | ⚠️ PLACEHOLDER | Add credentials in .env |

---

### Circuit/Spoke Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTE OPTIMIZATION WORKFLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATE PLAN                                                  │
│     POST /api/circuit/plans/create-for-date                      │
│     { "title": "Morning Routes", "date": "2026-02-12" }          │
│                              │                                   │
│                              ▼                                   │
│  2. ADD ORDERS TO PLAN                                           │
│     POST /api/circuit/plans/{id}/batch-import                    │
│     { "order_ids": ["order1", "order2", ...] }                   │
│                              │                                   │
│                              ▼                                   │
│  3. OPTIMIZE ROUTES                                              │
│     POST /api/circuit/plans/{id}/optimize-and-distribute         │
│     Returns operation_id for polling                             │
│                              │                                   │
│                              ▼                                   │
│  4. POLL FOR COMPLETION                                          │
│     GET /api/circuit/operations/{operation_id}                   │
│     Wait until "done": true                                      │
│                              │                                   │
│                              ▼                                   │
│  5. DISTRIBUTE TO DRIVERS                                        │
│     Routes sent to Circuit Go app automatically                  │
│     Drivers receive optimized delivery sequence                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Current Pricing Configurations

| Type | Name | Price | Description |
|------|------|-------|-------------|
| Next-Day | Next-Day Standard | $5.99 | Standard next-day delivery (8am-12pm) |
| Same-Day | Same-Day Express | $9.99 | Order before 2pm, delivered same day |
| Priority | Priority First | $14.99 | First delivery of the day (8am-10am) |
| Add-on | Refrigerated Fee | $3.00 | Temperature-controlled delivery |

---

### Prioritized Backlog

**P0 - Critical (All Done):**
- ✅ Core API endpoints
- ✅ Authentication system (4 roles)
- ✅ Order management
- ✅ Driver tracking
- ✅ Dispatcher dashboard
- ✅ Pharmacy portal
- ✅ Admin dashboard
- ✅ Public tracking page
- ✅ QR Code scanning
- ✅ Admin status control
- ✅ Driver portal with POD
- ✅ Admin driver management
- ✅ Admin delivery pricing control
- ✅ Google Maps integration
- ✅ **Circuit/Spoke route optimization**
- ✅ **Admin Routing Page (Fixed 2026-02-13)**

**P1 - High Priority:**
- ⚠️ **Backend Supervisor Configuration:** The .NET backend runs manually. Consider setting up auto-start mechanism
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Enhanced reporting & analytics

**P2 - Medium Priority:**
- Driver rating system
- Pharmacy software API for integrations
- Push notifications (Firebase)

---

### Key API Endpoints

**Circuit/Spoke Route Management:**
- `GET /api/circuit/status` - Connection status
- `GET /api/circuit/drivers` - List Circuit drivers
- `POST /api/circuit/plans/create-for-date` - Create plan
- `GET /api/circuit/route-plans` - List local plans
- `GET /api/circuit/pending-orders` - Orders ready for routing
- `POST /api/circuit/plans/{id}/batch-import` - Add orders
- `GET /api/circuit/plans/{id}/full-status` - Plan details
- `POST /api/circuit/plans/{id}/optimize-and-distribute` - Optimize
- `DELETE /api/circuit/plans/{id}` - Delete plan

**Admin Pricing:**
- `GET/POST/PUT/DELETE /api/admin/pricing` - CRUD pricing

**Admin Order Control:**
- `PUT /api/admin/orders/{id}/status` - Change status

**Copay Tracking:**
- `POST /api/orders/` - Create order with `copay_amount` field
- `GET /api/admin/dashboard` - Returns `copay_to_collect`, `copay_collected` stats
- `POST /api/driver-portal/deliveries/{order_id}/collect-copay` - Driver marks copay collected

---

### Test Reports

- `/app/test_reports/iteration_8.json` - Latest (Copay Tracking - 100% pass rate)
- `/app/test_reports/iteration_7.json` - Circuit/Spoke (100% pass rate)
