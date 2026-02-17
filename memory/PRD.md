# RX Expresss - Product Requirements Document

## Project Overview
RX Expresss is a full-stack pharmacy delivery service application serving NYC boroughs. The application has been migrated from Python/React/MongoDB to ASP.NET Core 8 with a clean architecture pattern.

## Tech Stack
- **Backend:** ASP.NET Core 8 Web API, EF Core with SQLite (dev) / SQL Server (prod)
- **Frontend:** ASP.NET Core MVC with Razor views (.cshtml)
- **Authentication:** ASP.NET Identity with JWT tokens
- **Architecture:** Clean architecture with 5 projects (API, Web, Core, Data, Identity)

## User Roles
1. **Admin** - Full system access, manage users, routes, pricing, scanning
2. **Pharmacy** - Create orders, view order status
3. **Driver** - View assigned deliveries, update status, complete POD

## Completed Features

### Core Infrastructure (✓)
- [x] Multi-project .NET solution structure
- [x] Entity Framework Core with SQLite database
- [x] ASP.NET Identity with JWT authentication
- [x] Role-based authorization (Admin, Pharmacy, Driver)
- [x] Data seeding for test accounts and sample data

### Landing Page (✓)
- [x] Hero section with branding
- [x] Features showcase grid
- [x] Contact form section
- [x] Navigation with Login and Add Pharmacy links

### Authentication (✓)
- [x] Login page with role-based redirect
- [x] Forgot Password page
- [x] Register Pharmacy page (pending admin approval workflow)
- [x] JWT token generation and validation

### Admin Dashboard (✓)
- [x] Overview with statistics (users, orders, drivers)
- [x] NYC borough breakdown
- [x] Recent orders list
- [x] Copay tracking (to collect/collected)

### User Management - Admin (✓)
- [x] List all users with role filter
- [x] Create new user (Admin, Pharmacy, Driver, Patient)
- [x] Edit user details
- [x] Delete user
- [x] Toggle active/inactive status

### Routes/Gigs Management - Admin (✓)
- [x] View pending orders with checkboxes
- [x] Create new gig with title, date, optional drivers
- [x] Active Gigs tab with manage actions
- [x] Completed Gigs tab (history)
- [x] Add orders to gig
- [x] Assign driver to gig
- [x] Optimize route (Circuit integration placeholder)
- [x] Distribute to drivers
- [x] View gig details with stops
- [x] Remove order from gig
- [x] Google Maps integration for route navigation

### QR Code Scanning - Admin (✓)
- [x] Camera scanning using html5-qrcode library
- [x] Manual QR code entry
- [x] Package verification with details display
- [x] Tab switch between Camera Scan and Manual Entry

### Order Management - Admin (✓)
- [x] List orders with filters
- [x] Edit order status
- [x] Assign driver to order
- [x] Bug Fix: Prevent status "assigned" without selecting driver

### Driver Portal (✓)
- [x] Active Deliveries tab
- [x] Delivery History tab
- [x] Online/Offline status toggle
- [x] QR code scanning for package verification (camera + manual)
- [x] Status progression (Pick Up → Transit → Out for Delivery → Delivered)
- [x] POD (Proof of Delivery) modal with recipient name
- [x] Copay collection tracking
- [x] Google Maps navigation links
- [x] Full route navigation

### Pharmacy Dashboard (✓)
- [x] Order creation form
- [x] Order list view
- [x] QR code display

### Service Zones - Admin (✓)
- [x] CRUD for delivery zones
- [x] Zip code assignment
- [x] Delivery fee configuration

### Pricing - Admin (✓)
- [x] CRUD for delivery pricing
- [x] Price by delivery type
- [x] Time window configuration

## Pending/In Progress

### Circuit Integration (P1)
- [ ] Circuit API connection for route optimization
- [ ] Webhook handler for status updates

### Notifications (P1)
- [ ] Twilio SMS integration
- [ ] SendGrid email notifications

### Cloud Storage (P2)
- [ ] AWS S3/Azure Blob for POD photos
- [ ] Photo upload and retrieval

### Payment Flow (P2)
- [ ] Stripe checkout integration
- [ ] Payment history

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register new user
- POST `/api/auth/forgot-password` - Password reset
- POST `/api/auth/register-pharmacy` - Pharmacy registration
- GET `/api/auth/me` - Get current user

### Admin
- GET `/api/admin/dashboard-stats` - Dashboard statistics
- GET `/api/admin/users` - List users
- GET `/api/admin/users/{id}` - Get user by ID
- POST `/api/admin/users` - Create user
- PUT `/api/admin/users/{id}` - Update user
- DELETE `/api/admin/users/{id}` - Delete user
- PUT `/api/admin/users/{id}/toggle-active` - Toggle user active status
- GET `/api/admin/drivers` - List drivers
- GET `/api/admin/pharmacies` - List pharmacies

### Orders
- GET `/api/orders` - List orders
- POST `/api/orders` - Create order
- PUT `/api/admin/orders/{id}/status` - Update order status
- PUT `/api/admin/orders/{id}/assign` - Assign driver

### Routes
- GET `/api/routes` - List route plans
- GET `/api/routes/{id}` - Get route plan details
- POST `/api/routes` - Create route plan
- PUT `/api/routes/{id}` - Update route plan
- DELETE `/api/routes/{id}` - Delete route plan
- POST `/api/routes/{id}/add-orders` - Add orders to plan
- POST `/api/routes/{id}/assign-driver` - Assign driver to plan
- DELETE `/api/routes/{id}/orders/{orderId}` - Remove order from plan
- GET `/api/routes/pending-orders` - Get orders ready for routing

### Driver Portal
- GET `/api/driver-portal/profile` - Get driver profile
- GET `/api/driver-portal/deliveries` - Get active deliveries
- GET `/api/driver-portal/history` - Get delivery history
- PUT `/api/driver-portal/status` - Update driver status
- PUT `/api/driver-portal/deliveries/{id}/status` - Update delivery status
- POST `/api/driver-portal/deliveries/{id}/pod` - Submit POD
- POST `/api/driver-portal/deliveries/{id}/collect-copay` - Mark copay collected

### Pricing & Zones
- GET, POST `/api/pricing` - List/Create pricing
- PUT, DELETE `/api/pricing/{id}` - Update/Delete pricing
- GET, POST `/api/zones` - List/Create zones
- PUT, DELETE `/api/zones/{id}` - Update/Delete zones

### QR Scanning
- POST `/api/admin/scan/{qrCode}` - Scan QR code

## Known Limitations
1. Circuit API integration is mocked - no real API key configured
2. POD photos save to local filesystem, not cloud storage
3. Email notifications not implemented (forgot password just logs token)

## File Structure
```
/app/rxexpresss-solution/
├── RxExpresss.API/        # Web API controllers
├── RxExpresss.Web/        # MVC frontend with .cshtml views
├── RxExpresss.Core/       # Entities, DTOs, Interfaces
├── RxExpresss.Data/       # DbContext, Repositories, Migrations
├── RxExpresss.Identity/   # JWT Service
└── RxExpresss.sln

/app/android-app/          # Android WebView wrapper project
```

---
*Last Updated: February 17, 2026*
