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
- Drivers Management: Verify drivers
- Orders Management: **Full status control**
- Service Zones Management: CRUD zones
- QR Scanning Tab: Package tracking, scan history, analytics
- Reports: Daily metrics

#### Phase 5: QR Code Scanning ✅
- QRScanner Component: Camera and manual entry support
- Admin QR Scanning Tab with full package tracking
- Pharmacy Portal scanning for pickup verification
- Backend APIs for scan logging and verification

#### Phase 6: Admin Status Control ✅ (Completed 2026-02-12)
- **PUT /api/admin/orders/{order_id}/status** endpoint
- Change Status modal in Orders Management
- Status dropdown with all options (Pending → Cancelled)
- Optional notes field for status changes
- Status change logging

#### Phase 7: Driver Portal ✅ (Completed 2026-02-12)
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

**P1 - High Priority:**
- Configure Google Maps API key for real geocoding
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Multi-location support for pharmacies
- Proof of Delivery with photo/signature capture

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
- **Maps:** Google Maps API (optional)
- **Notifications:** Twilio (SMS), SendGrid (Email)
- **QR Scanning:** html5-qrcode library

---

### Key Files

- `/app/backend/server.py` - Main API server with all endpoints
- `/app/backend/models.py` - Database models
- `/app/backend/auth.py` - Authentication logic
- `/app/backend/circuit_service.py` - Circuit/Spoke integration
- `/app/frontend/src/App.js` - React router
- `/app/frontend/src/components/admin/` - Admin dashboard components
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Admin status control
- `/app/frontend/src/components/driver/DriverPortal.jsx` - Driver interface
- `/app/frontend/src/components/scanner/QRScanner.jsx` - Reusable QR scanner
- `/app/frontend/src/components/pharmacy/` - Pharmacy portal components
- `/app/frontend/src/components/tracking/` - Public tracking page

---

### API Documentation

Available at: `/api/docs` (Swagger UI)

### Key API Endpoints

**Admin Status Control:**
- `PUT /api/admin/orders/{order_id}/status` - Change order status (admin only)

**Driver Portal:**
- `GET /api/driver-portal/profile` - Get driver profile and stats
- `GET /api/driver-portal/deliveries` - Get assigned deliveries
- `PUT /api/driver-portal/deliveries/{order_id}/status` - Update delivery status
- `POST /api/driver-portal/deliveries/{order_id}/scan` - Scan package
- `PUT /api/driver-portal/location` - Update driver location
- `PUT /api/driver-portal/status` - Update driver availability status
