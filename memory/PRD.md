# RX Expresss - Pharmacy Delivery Service
## Product Requirements Document

**Last Updated:** 2026-02-12 (Copay Tracking Feature Completed)

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

### What's Been Implemented

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
- **Toggle View:** Switch between List view and Smart Organizer view
- **Drag & Drop:** Drag orders between time windows to reassign delivery slots
- **Quick Driver Assignment:** Click truck icon on any order to instantly assign/unassign drivers from a dropdown
- **Backend Endpoint:** `PUT /api/admin/orders/{order_id}/reassign` for time window and driver reassignment
- **Route Optimization Preview:** Click "Optimize" button on time windows with 2+ orders to see:
  - Total distance, duration, and stops summary
  - Optimized delivery sequence using nearest neighbor algorithm
  - **Live Google Maps visualization** with dark theme, route path, and numbered markers
  - Click markers for stop details (recipient, address, ETA)
  - Estimated arrival times (ETA) for each stop
  - Distance and drive time between stops
  - "Apply Sequence" button to confirm optimized order
- **Backend Endpoint:** `POST /api/admin/orders/optimize-route` for route optimization calculations
- **Frontend Component:** `RouteMapPreview.jsx` using @react-google-maps/api
- **Full workflow implemented:**
  1. **Create Plan** - Create delivery plans for specific dates with optional drivers
  2. **Import Stops** - Batch import orders to plans (converts orders to Circuit stops)
  3. **Optimize** - Trigger async route optimization via Circuit API
  4. **Distribute** - Send optimized routes to drivers' Circuit Go app

- **Backend Endpoints:**
  - `GET /api/circuit/status` - Check Circuit API connection
  - `GET /api/circuit/drivers` - List Circuit drivers (4 drivers available)
  - `POST /api/circuit/plans/create-for-date` - Create plan with date/drivers
  - `GET /api/circuit/route-plans` - List locally stored plans
  - `GET /api/circuit/pending-orders` - Get orders ready for routing
  - `POST /api/circuit/plans/{id}/batch-import` - Add orders to plan
  - `GET /api/circuit/plans/{id}/full-status` - Comprehensive plan status
  - `POST /api/circuit/plans/{id}/optimize-and-distribute` - Start optimization
  - `DELETE /api/circuit/plans/{id}` - Delete plan and cleanup

- **Frontend Route Management Tab:**
  - Stats cards (Active Plans, Pending Orders, Circuit Drivers, Distributed)
  - Route Plans list with action buttons
  - Create Plan modal with date picker and driver selection
  - Add Orders modal with order selection
  - Plan Details modal with optimization status
  - Pending Orders table with filters

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

**P1 - High Priority:**
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
