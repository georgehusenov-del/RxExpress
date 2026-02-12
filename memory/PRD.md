# RX Expresss - Pharmacy Delivery Service
## Product Requirements Document

**Last Updated:** 2026-02-12

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

---

### User Personas

1. **Patients** - End customers who need prescription delivery
   - Track deliveries via public tracking page
   - Receive notifications about delivery status
   - View delivery proof

2. **Pharmacies** - Healthcare providers sending prescriptions
   - Register pharmacy profile
   - Create delivery orders (Same-Day, Next-Day, Priority, Time Window)
   - Track delivery status
   - Scan packages during preparation for pickup verification
   - View delivery history and reports

3. **Drivers** - Delivery personnel (managed via Circuit/Spoke)
   - **Dedicated Driver Portal at /driver**
   - View assigned deliveries with full details
   - **Update their status (Available, On Break, Offline)**
   - **Scan packages during pickup and delivery**
   - **Update delivery status in real-time**
   - Navigate to delivery addresses
   - Submit delivery proof (signature/photo)

4. **Administrators** - Platform managers
   - Full oversight of users, pharmacies, drivers, orders
   - Verify pharmacies and drivers
   - Manage service zones
   - View system-wide analytics and reports
   - Full control over package tracking, scanning history, and verification
   - **Change any order status at any time**
   - Cancel orders when needed
   - **Full control over delivery pricing**

---

### What's Been Implemented

#### Phase 1: Backend API ✅
- Multi-role authentication (patient, pharmacy, driver, admin)
- Order management with delivery types (same_day, next_day, priority, time_window)
- Driver registration and tracking
- Pharmacy registration and management
- Payment processing via Stripe
- WebSocket real-time tracking
- Service zones management
- Circuit/Spoke integration for routing

#### Phase 2: Dispatcher Dashboard ✅
- Landing page with branding
- Login page with demo credentials
- Real-time map visualization
- Active deliveries sidebar
- Order details modal
- Assign driver functionality

#### Phase 3: Pharmacy Portal ✅
- Pharmacy dashboard with stats
- Create delivery modal
- Order list with filtering
- Order details view
- QR Code scanner for package verification during pickup

#### Phase 4: Admin Dashboard ✅
- Overview Tab: Dashboard with stats
- Users Management: Full CRUD
- Pharmacies Management: Verify pharmacies
- Drivers Management: Full CRUD (Create, Update, Verify, Activate, Deactivate, Delete)
- Orders Management: **Full status control**
- Service Zones Management: CRUD zones
- QR Scanning Tab: Package tracking, scan history, analytics
- Reports: Daily metrics
- **Pricing Management Tab**: Full control over delivery pricing

#### Phase 5: QR Code Scanning ✅
- QRScanner Component: Camera and manual entry support
- Admin QR Scanning Tab with full package tracking
- Pharmacy Portal scanning for pickup verification
- Backend APIs for scan logging and verification

#### Phase 6: Admin Status Control ✅
- **PUT /api/admin/orders/{order_id}/status** endpoint
- Change Status modal in Orders Management
- Status dropdown with all options (Pending → Cancelled)
- Optional notes field for status changes
- Status change logging

#### Phase 7: Driver Portal ✅
- **Dedicated /driver route**
- Driver profile card with stats
- **Status toggle (Available, On Break, Offline)**
- Active/Completed delivery tabs
- **Delivery cards with QR scan buttons (Pickup/Delivery)**
- **Update delivery status modal**
- Navigate to delivery addresses
- Refresh deliveries button
- Mobile-optimized responsive design
- **Backend APIs:**
  - `GET /api/driver-portal/profile`
  - `GET /api/driver-portal/deliveries`
  - `PUT /api/driver-portal/deliveries/{order_id}/status`
  - `POST /api/driver-portal/deliveries/{order_id}/scan`
  - `PUT /api/driver-portal/location`
  - `PUT /api/driver-portal/status`

#### Phase 8: Public Tracking ✅
- Public tracking page accessible via tracking number
- No authentication required
- Real-time status updates

#### Phase 9: Admin Delivery Pricing Control ✅ (Completed 2026-02-12)
- **DeliveryPricing model** in models.py
- **Full CRUD API endpoints:**
  - `GET /api/admin/pricing` - List all pricing configurations
  - `GET /api/admin/pricing/{id}` - Get specific pricing
  - `POST /api/admin/pricing` - Create new pricing
  - `PUT /api/admin/pricing/{id}` - Update pricing
  - `DELETE /api/admin/pricing/{id}` - Delete pricing
  - `PUT /api/admin/pricing/{id}/toggle` - Toggle active/inactive
- **PricingManagement.jsx** component in Admin Dashboard
- Support for delivery types: Next-Day, Same-Day, Priority
- Support for add-on fees (e.g., Refrigerated)
- Time window configuration
- Cutoff time for Same-Day delivery
- Active/Inactive toggling

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
| Circuit/Spoke | ✅ Connected | Route optimization, POD |
| Google Maps | ⚠️ PLACEHOLDER | Mock data provided |
| Twilio SMS | ⚠️ PLACEHOLDER | Add credentials in .env |
| SendGrid | ⚠️ PLACEHOLDER | Add credentials in .env |

---

### Current Pricing Configurations

| Type | Name | Price | Description |
|------|------|-------|-------------|
| Next-Day | Next-Day Standard | $5.99 | Standard next-day delivery with morning window (8am-12pm) |
| Same-Day | Same-Day Express | $9.99 | Order before 2pm, delivered same day |
| Priority | Priority First | $14.99 | First delivery of the day (8am-10am) |
| Add-on | Refrigerated Fee | $3.00 | Additional fee for temperature-controlled delivery |

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
- ✅ Driver portal
- ✅ Admin create/manage drivers
- ✅ Admin delivery pricing control

**P1 - High Priority:**
- Configure Google Maps API key for real geocoding
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Complete Proof of Delivery (POD) implementation
- Multi-location support for pharmacies

**P2 - Medium Priority:**
- Enhanced reporting & analytics
- Driver rating system
- Pharmacy software API for integrations

**P3 - Low Priority:**
- Multi-language support
- Advanced route optimization
- Customer feedback system
- Push notifications (Firebase)

---

### Technical Stack

- **Backend:** FastAPI (Python 3.11)
- **Frontend:** React 19 with Tailwind CSS & shadcn/ui
- **Database:** MongoDB with Motor (async driver)
- **Authentication:** JWT with python-jose, bcrypt
- **Payments:** Stripe via emergentintegrations
- **Real-time:** WebSockets
- **Routing:** Circuit/Spoke API
- **Maps:** Google Maps API (placeholder)
- **Notifications:** Twilio (SMS), SendGrid (Email) - placeholders
- **QR Scanning:** html5-qrcode library

---

### Key Files

- `/app/backend/server.py` - Main API server with all endpoints (~2400 lines)
- `/app/backend/models.py` - Database models including DeliveryPricing
- `/app/backend/auth.py` - Authentication logic
- `/app/backend/circuit_service.py` - Circuit/Spoke integration
- `/app/frontend/src/App.js` - React router
- `/app/frontend/src/lib/api.js` - All API functions including pricing
- `/app/frontend/src/components/admin/AdminDashboard.jsx` - Admin panel with pricing tab
- `/app/frontend/src/components/admin/PricingManagement.jsx` - Pricing management UI
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Admin status control
- `/app/frontend/src/components/admin/DriversManagement.jsx` - Driver CRUD
- `/app/frontend/src/components/driver/DriverPortal.jsx` - Driver interface
- `/app/frontend/src/components/scanner/QRScanner.jsx` - Reusable QR scanner
- `/app/frontend/src/components/pharmacy/` - Pharmacy portal components
- `/app/frontend/src/components/tracking/` - Public tracking page

---

### API Documentation

Available at: `/api/docs` (Swagger UI)

### Key API Endpoints

**Admin Pricing Control:**
- `GET /api/admin/pricing` - List all pricing (query: include_inactive)
- `GET /api/admin/pricing/{id}` - Get pricing by ID
- `POST /api/admin/pricing` - Create pricing configuration
- `PUT /api/admin/pricing/{id}` - Update pricing
- `DELETE /api/admin/pricing/{id}` - Delete pricing
- `PUT /api/admin/pricing/{id}/toggle` - Toggle active/inactive

**Admin Status Control:**
- `PUT /api/admin/orders/{order_id}/status` - Change order status (admin only)

**Admin Driver Management:**
- `POST /api/admin/drivers` - Create driver (query params)
- `PUT /api/admin/drivers/{id}` - Update driver
- `DELETE /api/admin/drivers/{id}` - Delete driver
- `PUT /api/admin/drivers/{id}/activate` - Activate driver
- `PUT /api/admin/drivers/{id}/deactivate` - Deactivate driver

**Driver Portal:**
- `GET /api/driver-portal/profile` - Get driver profile and stats
- `GET /api/driver-portal/deliveries` - Get assigned deliveries
- `PUT /api/driver-portal/deliveries/{order_id}/status` - Update delivery status
- `POST /api/driver-portal/deliveries/{order_id}/scan` - Scan package
- `PUT /api/driver-portal/location` - Update driver location
- `PUT /api/driver-portal/status` - Update driver availability status

---

### Test Reports

- `/app/test_reports/iteration_5.json` - Latest test report (100% pass rate)
