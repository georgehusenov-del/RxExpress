# RX Express - Pharmacy Delivery Service API
## Product Requirements Document

### Original Problem Statement
Build a standalone backend API for a pharmacy delivery service similar to DrugLift (www.rxexpresss.com). The API should support:
- User authentication (patients, pharmacies, drivers)
- Prescription/order management
- Real-time delivery tracking
- Driver assignment & routing
- Photo verification & electronic signatures
- Notifications (SMS/email/push)
- Payment processing

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

4. **Admins** - Platform administrators
   - Manage users, pharmacies, drivers
   - View all orders and analytics

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

### What's Been Implemented (2026-02-12)

#### Backend API Endpoints

**Authentication:**
- POST /api/auth/register - User registration
- POST /api/auth/login - User login with JWT
- GET /api/auth/me - Get current user

**Pharmacies:**
- POST /api/pharmacies/register - Register pharmacy
- GET /api/pharmacies/ - List pharmacies
- GET /api/pharmacies/{id} - Get pharmacy details

**Drivers:**
- POST /api/drivers/register - Register driver
- GET /api/drivers/ - List drivers
- GET /api/drivers/me - Get driver profile
- PUT /api/drivers/location - Update location
- PUT /api/drivers/status - Update status

**Orders:**
- POST /api/orders/ - Create order
- GET /api/orders/ - List orders
- GET /api/orders/{id} - Get order details
- PUT /api/orders/{id}/assign - Assign driver
- PUT /api/orders/{id}/status - Update status

**Delivery:**
- POST /api/delivery/proof - Submit delivery proof
- GET /api/delivery/proof/{order_id} - Get proof

**Payments:**
- POST /api/payments/checkout/create - Create checkout session
- GET /api/payments/checkout/status/{session_id} - Get status

**Tracking:**
- GET /api/tracking/order/{order_id} - Get tracking info
- GET /api/tracking/driver/{driver_id}/history - Get location history

**Maps:**
- POST /api/maps/geocode - Geocode address
- POST /api/maps/distance-matrix - Calculate distances
- POST /api/maps/optimize-route - Optimize delivery route
- GET /api/maps/estimate/{order_id} - Estimate delivery time

**Notifications:**
- POST /api/notifications/send - Send notification

**WebSockets:**
- WS /api/ws/track/{order_id} - Track order in real-time
- WS /api/ws/driver/{driver_id} - Driver location updates

### Integrations Status

| Integration | Status | Notes |
|-------------|--------|-------|
| MongoDB | ✅ Connected | Database for all data storage |
| Stripe | ✅ Configured | Using sk_test_emergent |
| Google Maps | ⚠️ Not Configured | Returns mock data - add API key for real geocoding |
| Twilio SMS | ⚠️ Not Configured | Add TWILIO_* credentials in .env |
| SendGrid | ⚠️ Not Configured | Add SENDGRID_API_KEY in .env |

### Prioritized Backlog

**P0 - Critical (Immediate):**
- None - Core API is functional

**P1 - High Priority:**
- Configure Google Maps API key for real geocoding
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Add rate limiting for API endpoints

**P2 - Medium Priority:**
- Add admin dashboard endpoints
- Implement driver rating system
- Add order history analytics
- Push notification support (Firebase)

**P3 - Low Priority:**
- Multi-language support
- Advanced route optimization
- Driver earnings reports
- Customer feedback system

### Next Tasks
1. Provide API documentation endpoint (/docs)
2. Add rate limiting with slowapi
3. Configure external integrations (Maps, Twilio, SendGrid)
4. Build frontend dashboard for dispatchers
5. Add comprehensive logging and monitoring

### Technical Stack
- **Backend:** FastAPI (Python 3.11)
- **Database:** MongoDB with Motor (async driver)
- **Authentication:** JWT with python-jose
- **Payments:** Stripe via emergentintegrations
- **Real-time:** WebSockets
- **Maps:** Google Maps API
- **Notifications:** Twilio (SMS), SendGrid (Email)
