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
   - View delivery history and reports

3. **Drivers** - Delivery personnel (managed via Circuit/Spoke)
   - Receive delivery assignments
   - Update location in real-time
   - Submit delivery proof (signature/photo)

4. **Administrators** - Platform managers
   - Full oversight of users, pharmacies, drivers, orders
   - Verify pharmacies and drivers
   - Manage service zones
   - View system-wide analytics and reports
   - Cancel orders when needed

---

### What's Been Implemented

#### Phase 1: Backend API
- Multi-role authentication (patient, pharmacy, driver, admin)
- Order management with delivery types (same_day, next_day, priority, time_window)
- Driver registration and tracking
- Pharmacy registration and management
- Payment processing via Stripe
- WebSocket real-time tracking
- Service zones management
- Circuit/Spoke integration for routing

#### Phase 2: Dispatcher Dashboard
- Landing page with branding
- Login page with demo credentials
- Real-time map visualization
- Active deliveries sidebar
- Order details modal
- Assign driver functionality

#### Phase 3: Pharmacy Portal
- Pharmacy dashboard with stats
- Create delivery modal
- Order list with filtering
- Order details view

#### Phase 4: Admin Dashboard ✅ (Completed 2026-02-12)
- **Overview Tab**: Dashboard with stats (Total Users, Pharmacies, Drivers, Orders), Recent Orders, Today's Performance
- **Users Management**: List, search, filter by role, view details, activate/deactivate, delete users
- **Pharmacies Management**: List, search, view details, verify pharmacies
- **Drivers Management**: List, search, view details, verify drivers
- **Orders Management**: List, search, filter by status, view details, cancel orders
- **Service Zones Management**: List, create, edit, delete zones with delivery fees and cutoff times
- **Reports**: Daily reports with metrics (deliveries, completions, failures, revenue), on-time performance, deliveries by type and zone

#### Phase 5: Public Tracking
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

**P0 - Critical (Done):**
- ✅ Core API endpoints
- ✅ Authentication system (4 roles)
- ✅ Order management
- ✅ Driver tracking
- ✅ Dispatcher dashboard
- ✅ Pharmacy portal
- ✅ Admin dashboard
- ✅ Public tracking page

**P1 - High Priority:**
- QR Code scanning for package management
- Configure Google Maps API key for real geocoding
- Configure Twilio for SMS notifications
- Configure SendGrid for email notifications
- Multi-location support for pharmacies

**P2 - Medium Priority:**
- Enhanced reporting & analytics
- Driver rating system
- Pharmacy software API for integrations
- Mobile driver app (DrugLift Go equivalent)

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

---

### Key Files

- `/app/backend/server.py` - Main API server with all endpoints
- `/app/backend/models.py` - Database models
- `/app/backend/auth.py` - Authentication logic
- `/app/backend/circuit_service.py` - Circuit/Spoke integration
- `/app/frontend/src/App.js` - React router
- `/app/frontend/src/components/admin/` - Admin dashboard components
- `/app/frontend/src/components/pharmacy/` - Pharmacy portal components
- `/app/frontend/src/components/tracking/` - Public tracking page

---

### API Documentation

Available at: `/api/docs` (Swagger UI)
