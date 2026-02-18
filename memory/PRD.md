# RX Expresss - Product Requirements Document

## Project Overview
RX Expresss is a full-stack pharmacy delivery service application serving NYC boroughs. Migrated from Python/React/MongoDB to ASP.NET Core 8 with clean architecture.

## Tech Stack
- **Backend:** ASP.NET Core 8 Web API, EF Core with SQLite (dev) / SQL Server (prod)
- **Frontend:** ASP.NET Core MVC with Razor views (.cshtml)
- **Authentication:** ASP.NET Identity with JWT tokens
- **External:** Circuit API for route optimization (configurable)

## Deployment Configuration
- **Production/Preview:** Uses `/api` prefix for API calls (Kubernetes ingress routing)
- **Visual Studio Local:** Uses `http://localhost:5001/api` (Development appsettings)

## Completed Features (Feb 17, 2026)

### Landing Page (✓)
- [x] Hero section with branding and CTA
- [x] Features showcase grid
- [x] Contact form section
- [x] Smooth scrolling navigation (no new tabs)
- [x] Navigation: Login, Add Pharmacy links

### Authentication (✓)
- [x] Login page with role-based redirect
- [x] **Forgot Password link** on login page
- [x] Forgot Password page
- [x] Register Pharmacy page
- [x] JWT token generation

### Pharmacy Dashboard (✓)
- [x] Pharmacy profile display
- [x] Orders list with **Tracking URL column**
- [x] **Popup modal for order creation** (replaces inline form)
- [x] Delivery type tabs: Next-Day, Same-Day, Priority, Scheduled
- [x] Price summary with refrigeration option
- [x] Click-to-copy tracking URLs

### Public Tracking Page (✓) - NEW
- [x] `/Track/{code}` route for public order tracking
- [x] Status timeline visualization
- [x] Order details (recipient, address, delivery type)
- [x] Driver information when assigned
- [x] Search by order number or QR code

### Admin Dashboard (✓)
- [x] Overview statistics
- [x] NYC borough breakdown
- [x] Recent orders list
- [x] Copay tracking

### User Management - Admin (✓)
- [x] List users with role filter
- [x] Create new user
- [x] Edit user details
- [x] Delete user
- [x] Toggle active/inactive status

### Routes/Gigs Management - Admin (✓)
- [x] Pending orders with checkboxes
- [x] Create gig with driver selection
- [x] Active/Completed gigs tabs
- [x] Add orders to gig
- [x] Assign driver modal
- [x] Optimize route (Circuit placeholder)
- [x] Distribute to drivers
- [x] Google Maps route navigation

### QR Code Scanning (✓)
- [x] **Camera scanning** with html5-qrcode library
- [x] Manual QR code entry
- [x] Tab toggle between Camera Scan and Manual Entry
- [x] Package verification with details

### Driver Portal (✓)
- [x] Active Deliveries tab
- [x] **Delivery History tab** 
- [x] Online/Offline status toggle
- [x] **Camera QR scanning** for package verification
- [x] **POD modal** with recipient name, photo, notes
- [x] Status progression buttons
- [x] Copay collection
- [x] Google Maps navigation

### Circuit Integration (✓) - NEW
- [x] CircuitService class created
- [x] Driver registration endpoint
- [x] Plan creation/optimization endpoints
- [x] Stop management
- [x] CircuitDriverId field on Driver entity
- [x] CircuitPlanId field on RoutePlan entity
- [x] CircuitStopId field on Order entity
- [x] **Note:** Requires CIRCUIT_API_KEY environment variable

### Service Zones/Pricing (✓)
- [x] CRUD for delivery zones
- [x] CRUD for pricing models

## API Endpoints

### Public (No Auth)
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/register-pharmacy` - Pharmacy registration
- `GET /api/orders/track/{code}` - **Public order tracking**

### Admin
- User CRUD: `GET/POST/PUT/DELETE /api/admin/users`
- `PUT /api/admin/users/{id}/toggle-active`
- `GET /api/admin/dashboard-stats`
- `POST /api/admin/scan/{code}` - QR scan

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order

### Routes
- `GET/POST /api/routes` - Route plans
- `POST /api/routes/{id}/add-orders`
- `POST /api/routes/{id}/assign-driver`

### Driver Portal
- `GET /api/driver-portal/deliveries` - Active deliveries
- `GET /api/driver-portal/history` - **Delivery history**
- `PUT /api/driver-portal/status` - Online/offline
- `POST /api/driver-portal/deliveries/{id}/pod` - Submit POD

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Pending Tasks

### P1 - High Priority
- [ ] Circuit API key configuration
- [ ] Twilio/SendGrid notifications
- [ ] Email for forgot password

### P2 - Medium Priority
- [ ] AWS S3/Azure Blob for POD photos
- [ ] Stripe payment integration
- [ ] Cancel time optimization

## File Structure
```
/app/rxexpresss-solution/
├── RxExpresss.API/        # Web API + CircuitService
├── RxExpresss.Web/        # MVC frontend
├── RxExpresss.Core/       # Entities, DTOs
├── RxExpresss.Data/       # DbContext, Repos
└── RxExpresss.Identity/   # JWT Service
```

## Database Migrations

### Current State
- **SQLite Development Database:** `/app/rxexpresss-solution/RxExpresss.API/RxExpresss.db`
- **Migrations Applied:**
  1. `20260217085512_Init` - Initial schema with all core tables
  2. `20260217142736_AddCircuitFields` - Added Circuit integration fields

### Circuit Integration Fields (Added Feb 17, 2026)
- `DriverProfile.CircuitDriverId` (NVARCHAR) - Driver ID in Circuit system
- `RoutePlan.CircuitPlanId` (NVARCHAR) - Route plan ID in Circuit system
- `Order.CircuitStopId` (NVARCHAR) - Stop ID in Circuit system for tracking

### SQL Server Production Script
Location: `/app/sql_scripts/sqlserver_migrations.sql`

This script:
- Creates all tables with SQL Server data types
- Includes both Init and AddCircuitFields migrations
- Adds seed data for roles (Admin, Pharmacy, Driver)
- Idempotent - can be run multiple times safely

**To deploy to SQL Server:**
1. Update `appsettings.json` with SQL Server connection string
2. Run `/app/sql_scripts/sqlserver_migrations.sql` on target database
3. Change connection string in production from SQLite to SQL Server

## Known Notes
1. Circuit API is configured but requires API key
2. POD photos save locally (not cloud)
3. CircuitDriverId column added manually to SQLite - needs proper migration for prod

## Bug Fixes (Feb 17, 2026 - Session 2)

### Bug 1: "Order Not Found" on Public Tracking Page - FIXED
- **Symptom:** Tracking page showed "Order Not Found" even for valid QR codes
- **Root Cause 1:** API_BASE URL was not properly constructed with full origin
- **Root Cause 2:** Nginx wasn't configured to proxy /api requests to backend port 8001
- **Fix:** 
  - Updated Track.cshtml to construct API_BASE with window.location.origin
  - Configured nginx at /etc/nginx/sites-enabled/default to proxy /api/* to port 8001

### Bug 2: Driver Portal Manual QR Scan Not Working - FIXED
- **Symptom:** Clicking "Verify" button did nothing, modal stayed open
- **Root Cause 1:** JavaScript syntax error - extra closing brace in Driver/Index.cshtml
- **Root Cause 2:** html5QrCode.stop() throws when scanner isn't running
- **Fix:**
  - Removed extra closing brace that was causing syntax errors
  - Added `scannerRunning` flag to track scanner state
  - Made closeScanModal and stopQrScanner async with proper error handling
  - Created /wwwroot/js/qr-scanner-patch.js as fallback

## Enhancements (Feb 18, 2026)

### Gig Workflow Improvements
- [x] **Auto-Create Gigs** - Creates gigs for all service zones based on date
- [x] **Split Gig** - Admin can split gig into two if area has too many orders
- [x] **Status Sync Bug Fix** - Orders assigned via Gig now show "assigned" in Order Management
- [x] **Improved UI** - Gig cards with icons, stats, and action buttons
- [x] **Service Zone Support** - Gigs can be linked to service zones (Manhattan, Brooklyn, Queens, Bronx, Staten Island)

### Order Management Improvements
- [x] **Filters Added** - Date, Pharmacy, Status filters
- [x] **Status Icons** - Colored SVG icons for each status (New=blue, Assigned=purple, Delivered=green, etc.)
- [x] **Action Icons** - View (eye), Edit (pencil), Map (location pin) icons replace text buttons

### API Proxy Enhancement
- [x] **Web Frontend Proxy** - /api requests from frontend now proxy to backend on port 8001
- [x] **Seamless Integration** - No need for CORS or separate API URL configuration

### New API Endpoints
- `POST /api/routes/auto-create` - Auto-create gigs for all service zones
- `POST /api/routes/{id}/split` - Split a gig into two
- `POST /api/routes/{id}/optimize` - Trigger Circuit API route optimization
- `GET /api/routes/service-zones` - Get active service zones
- `GET /api/routes/pending-orders` - Get orders ready for routing (new, not in any gig)

### Circuit API Integration
- [x] **API Key Configured** - Circuit API key added to appsettings.json
- [x] **Date Format Fix** - Fixed date format for Circuit API (day/month/year integers)
- [x] **Optimization Working** - Route optimization marks gig as "optimized"

## POD (Proof of Delivery) Enhancement (Feb 18, 2026)

### Driver Portal POD Flow
- [x] **Mandatory Photo** - Photo is required for delivery completion (validation on frontend + backend)
- [x] **Optional Signature** - Signature pad available but optional (for "leave at door" instructions)
- [x] **Photo Upload** - Photos saved as base64 to `/pod/` folder with order number timestamp
- [x] **Signature Capture** - Canvas-based signature pad with clear button
- [x] **POD Storage** - Files saved to `/wwwroot/pod/` with naming: `pod_{orderNumber}_{timestamp}.jpg`

### POD Display for Admin & Pharmacy
- [x] **Order Details Modal** - Shows POD section when order is delivered
- [x] **Photo Display** - Clickable image that opens full-size in new tab
- [x] **Signature Display** - Shows signature image if available
- [x] **Recipient Name** - Shows who received the delivery
- [x] **Delivery Time** - Shows actual delivery timestamp

### Delivery Instructions
- [x] **Order Creation** - Added "Delivery Instructions" field for special instructions
- [x] **Driver View** - Instructions displayed in delivery card for driver
- [x] **Signature Logic** - Helps driver know if signature should be collected

---
*Last Updated: February 18, 2026 - Gig Workflow, Order Management & POD Enhancements*
