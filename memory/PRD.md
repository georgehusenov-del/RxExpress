# RX Expresss - Pharmacy Delivery Service
## Product Requirements Document

**Last Updated:** 2026-02-12

---

### Original Problem Statement
Build a standalone backend API for a pharmacy delivery service similar to DrugLift (www.rxexpresss.com). The API should support:
- User authentication (patients, pharmacies, drivers)
- Prescription/order management
- Real-time delivery tracking
- Driver assignment & routing
- Photo verification & electronic signatures
- Notifications (SMS/email/push)
- Payment processing

**Enhancement Added:** Dispatcher dashboard with real-time driver tracking map visualization.

---

### User Personas

1. **Patients** - End customers who need prescription delivery
   - Register/login to the platform
   - Create delivery orders
   - Track deliveries in real-time
   - Make payments
   - View delivery proof

2. **Pharmacies** - Healthcare providers sending prescriptions
   - Register pharmacy profile
   - Receive new orders
   - Confirm order preparation
   - Track delivery status

3. **Drivers** - Delivery personnel
   - Register driver profile with vehicle info
   - Receive delivery assignments
   - Update location in real-time
   - Submit delivery proof (signature/photo)
   - Manage availability status

4. **Dispatchers** - Operations managers
   - View all active deliveries on map
   - Assign drivers to orders
   - Monitor driver locations in real-time
   - Update order statuses

---

### Core Requirements (Static)

#### Authentication & Authorization
- JWT-based authentication
- Role-based access control (patient, pharmacy, driver, admin)
- Secure password hashing with bcrypt

#### Order Management
- Create prescription delivery orders
- Assign drivers to orders
- Track order status lifecycle (pending → confirmed → assigned → picked_up → in_transit → delivered)
- Support for multiple prescriptions per order

#### Real-Time Tracking
- WebSocket connections for live tracking
- Driver location updates
- Order status broadcasting

#### Delivery Verification
- Electronic signature capture
- Photo proof of delivery
- Location verification

#### Payments
- Stripe checkout integration
- Payment status tracking
- Webhook handling

#### Notifications
- SMS notifications via Twilio
- Email notifications via SendGrid
- Order confirmations, driver assignments, delivery completions

#### Maps & Routing
- Geocoding addresses
- Distance calculations
- Route optimization (when Google Maps configured)

---

### What's Been Implemented

#### Phase 1: Backend API (2026-02-12)

**Authentication Endpoints:**
- POST /api/auth/register - User registration
- POST /api/auth/login - User login with JWT
- GET /api/auth/me - Get current user

**Pharmacies Endpoints:**
- POST /api/pharmacies/register - Register pharmacy
- GET /api/pharmacies/ - List pharmacies
- GET /api/pharmacies/{id} - Get pharmacy details

**Drivers Endpoints:**
- POST /api/drivers/register - Register driver
- GET /api/drivers/ - List drivers
- GET /api/drivers/me - Get driver profile
- PUT /api/drivers/location - Update location
- PUT /api/drivers/status - Update status

**Orders Endpoints:**
- POST /api/orders/ - Create order
- GET /api/orders/ - List orders
- GET /api/orders/{id} - Get order details
- PUT /api/orders/{id}/assign - Assign driver
- PUT /api/orders/{id}/status - Update status

**Delivery Endpoints:**
- POST /api/delivery/proof - Submit delivery proof
- GET /api/delivery/proof/{order_id} - Get proof

**Payments Endpoints:**
- POST /api/payments/checkout/create - Create checkout session
- GET /api/payments/checkout/status/{session_id} - Get status

**Tracking Endpoints:**
- GET /api/tracking/order/{order_id} - Get tracking info
- GET /api/tracking/driver/{driver_id}/history - Get location history

**Maps Endpoints:**
- POST /api/maps/geocode - Geocode address
- POST /api/maps/distance-matrix - Calculate distances
- POST /api/maps/optimize-route - Optimize delivery route
- GET /api/maps/estimate/{order_id} - Estimate delivery time

**WebSocket Endpoints:**
- WS /api/ws/track/{order_id} - Track order in real-time
- WS /api/ws/driver/{driver_id} - Driver location updates

#### Phase 2: Dispatcher Dashboard (2026-02-12)

**Frontend Features:**
- Landing page with branding
- Login page with demo credentials
- Full dispatcher dashboard with:
  - Real-time map visualization
  - Active deliveries sidebar
  - Driver tracking markers
  - Order details modal
  - Assign driver modal
  - Status update actions
  - Map zoom controls
  - Auto-refresh (30 seconds)

---

### Integrations Status

| Integration | Status | Notes |
|-------------|--------|-------|
| MongoDB | ✅ Connected | Primary database |
| Stripe | ✅ Configured | Using sk_test_emergent |
| Google Maps | ⚠️ Not Configured | Mock data provided - add API key for real geocoding |
| Twilio SMS | ⚠️ Not Configured | Add TWILIO_* credentials in .env |
| SendGrid | ⚠️ Not Configured | Add SENDGRID_API_KEY in .env |

---

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@test.com | testpass123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |

---

### Deployment Readiness

**Status: ✅ READY**

- All services running (backend, frontend, MongoDB)
- Health endpoints responding
- Environment variables properly configured
- No hardcoded secrets in code
- CORS configured for all origins

**Required for Production:**
1. Set strong JWT_SECRET_KEY
2. Configure CORS_ORIGINS to specific domains
3. Add Google Maps API key for geocoding
4. Add Twilio credentials for SMS
5. Add SendGrid API key for emails
6. Use production Stripe keys

---

### Prioritized Backlog

**P0 - Critical (Done):**
- ✅ Core API endpoints
- ✅ Authentication system
- ✅ Order management
- ✅ Driver tracking
- ✅ Dispatcher dashboard

**P1 - High Priority:**
- Configure Google Maps API key
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Add rate limiting for API endpoints
- Mobile driver app

**P2 - Medium Priority:**
- Admin dashboard
- Driver rating system
- Order history analytics
- Push notification support (Firebase)
- Customer mobile app

**P3 - Low Priority:**
- Multi-language support
- Advanced route optimization with multiple stops
- Driver earnings reports
- Customer feedback system
- Inventory management integration

---

### Technical Stack

- **Backend:** FastAPI (Python 3.11)
- **Frontend:** React 19 with Tailwind CSS & shadcn/ui
- **Database:** MongoDB with Motor (async driver)
- **Authentication:** JWT with python-jose
- **Payments:** Stripe via emergentintegrations
- **Real-time:** WebSockets
- **Maps:** Google Maps API (optional)
- **Notifications:** Twilio (SMS), SendGrid (Email)

---

### API Documentation

Available at: `/api/docs` (Swagger UI)
