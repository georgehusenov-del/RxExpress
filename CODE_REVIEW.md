# RX Expresss - Code Review Document
### Pharmacy Delivery Service Application
**Prepared:** February 16, 2026
**Version:** 2.0 (ASP.NET Core 8 Backend)

---

## 1. Project Overview

**RX Expresss** is a full-stack pharmacy delivery management platform (similar to DrugLift) connecting pharmacies, drivers, and patients for fast, secure prescription delivery. Features include route optimization via Circuit Spoke, QR code-based package tracking, Proof of Delivery (signature + photo), copay collection, and multi-role dashboards.

**Live Preview:** https://pharmacy-gig-hub.preview.emergentagent.com

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | ASP.NET Core | 8.0 |
| **Frontend** | React.js | 19.0 |
| **Database** | MongoDB | Latest |
| **UI Framework** | Tailwind CSS + Shadcn/UI | 3.4 |
| **Maps (visual)** | Leaflet / react-leaflet | 1.9 / 5.0 |
| **Maps (navigation)** | Google Maps API | - |
| **Route Optimization** | Circuit Spoke API | v0.2b |
| **Payments** | Stripe (backend only) | - |
| **PWA** | Service Worker + Manifest | - |
| **Mobile Wrapper** | Capacitor | 6.x |
| **Auth** | JWT (BCrypt hashing) | - |

---

## 3. Architecture

```
                    +-------------------+
                    |   React Frontend  |
                    |   (Port 3000)     |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Nginx / Ingress  |
                    |  /api -> :8001    |
                    +--------+----------+
                             |
                    +--------v----------+
                    | ASP.NET Core 8    |
                    | (Port 8001)       |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     |  MongoDB   |  | Circuit API |  | Google Maps |
     | rxexpress_db| | (Routing)   |  | (Navigation)|
     +------------+  +-------------+  +-------------+
```

---

## 4. Directory Structure

```
/app/
+-- backend-dotnet/RxExpresss/          # ASP.NET Core 8 Backend (ACTIVE)
|   +-- Controllers/                     # 17 API Controllers
|   |   +-- AuthController.cs            # Login, Register, Me (153 lines)
|   |   +-- AdminController.cs           # Dashboard, Users, Orders, Drivers, POD, Pricing (1296 lines)
|   |   +-- OrdersController.cs          # CRUD, Scan, Assign (439 lines)
|   |   +-- DriverPortalController.cs    # Deliveries, POD, Scan, Copay, Status (564 lines)
|   |   +-- CircuitController.cs         # Route plans, Optimize, Auto-assign (656 lines)
|   |   +-- PharmaciesController.cs      # Register, Locations, My pharmacy (243 lines)
|   |   +-- DriversController.cs         # Register, List, Status, Location (204 lines)
|   |   +-- PricingController.cs         # CRUD pricing configs (198 lines)
|   |   +-- ZonesController.cs           # Service zones CRUD (152 lines)
|   |   +-- DeliveryController.cs        # Proof of delivery submit/get (112 lines)
|   |   +-- MapsController.cs            # Geocode, Distance matrix (107 lines)
|   |   +-- ReportsController.cs         # Dashboard, Deliveries, Driver perf (94 lines)
|   |   +-- PaymentsController.cs        # Stripe checkout (73 lines)
|   |   +-- PublicTrackingController.cs   # Public order tracking (66 lines)
|   |   +-- TrackingController.cs        # Order/driver tracking (57 lines)
|   |   +-- WebhooksController.cs        # Stripe + Circuit webhooks (41 lines)
|   |   +-- NotificationsController.cs   # Send notifications (41 lines)
|   +-- Models/
|   |   +-- User.cs                      # User, Address, Pharmacy, DriverProfile, LocationPoint
|   |   +-- Order.cs                     # Order, Package, PrescriptionItem, DeliveryPricing
|   |   +-- ScanLog.cs                   # QR scan audit log
|   |   +-- Enums.cs                     # UserRole, OrderStatus, DriverStatus, etc.
|   +-- DTOs/
|   |   +-- DTOs.cs                      # All request/response DTOs (323 lines)
|   +-- Services/
|   |   +-- MongoDbService.cs            # MongoDB connection + collections
|   |   +-- AuthService.cs              # JWT generation, BCrypt password hashing
|   +-- Extensions/
|   |   +-- ClaimsPrincipalExtensions.cs # GetUserId(), GetUserRole(), GetUserEmail()
|   +-- Program.cs                       # App config, JWT, CORS, Swagger, Static files
|   +-- appsettings.json                 # MongoDB, JWT, Circuit, Google Maps config
|   +-- RxExpresss.csproj               # NuGet packages
|
+-- backend/                             # Original Python/FastAPI Backend (LEGACY - reference only)
|   +-- server.py                        # Monolithic FastAPI app (4400+ lines)
|   +-- models.py, auth.py, etc.
|
+-- frontend/
|   +-- public/
|   |   +-- manifest.json               # PWA manifest
|   |   +-- service-worker.js           # Offline caching
|   |   +-- offline.html                # Offline fallback page
|   |   +-- icon-*.png                  # App icons (various sizes)
|   +-- src/
|   |   +-- App.js                      # Routes, ProtectedRoute, Auth provider
|   |   +-- index.js                    # Entry point, SW registration
|   |   +-- index.css                   # Tailwind + custom CSS vars
|   |   +-- components/
|   |   |   +-- admin/                  # Admin dashboard pages (12 files)
|   |   |   +-- pharmacy/              # Pharmacy portal (5 files)
|   |   |   +-- driver/                # Driver portal (1 file, 800+ lines)
|   |   |   +-- pod/                   # Proof of delivery (3 files)
|   |   |   +-- scanner/              # QR scanner (1 file)
|   |   |   +-- maps/                 # Leaflet map component (1 file)
|   |   |   +-- tracking/             # Public tracking page (1 file)
|   |   |   +-- dispatch/             # Legacy dispatch dashboard (3 files)
|   |   |   +-- pwa/                  # Install prompt (1 file)
|   |   |   +-- ui/                   # Shadcn/UI components (40+ files)
|   |   +-- hooks/
|   |   |   +-- useAuth.js            # Auth context + token management
|   |   |   +-- useCapacitor.js       # Native platform hook
|   |   +-- lib/
|   |   |   +-- api.js                # Axios API client
|   |   |   +-- utils.js              # Tailwind class merger
|   |   |   +-- websocket.js          # WebSocket client (legacy)
|   |   +-- pages/
|   |       +-- LoginPage.jsx         # Login/Register page
|   +-- capacitor.config.json          # Capacitor native app config
|   +-- APP_STORE_GUIDE.md            # iOS/Android build + submission guide
```

**Code Volume:**
- Backend (C#): ~5,800 lines across 30 files
- Frontend (React): ~14,800 lines custom code + ~3,000 lines Shadcn/UI

---

## 5. Database Schema (MongoDB)

### Collections

| Collection | Document Model | Key Fields |
|-----------|---------------|------------|
| `users` | User | id, email, password_hash, role (admin/pharmacy/driver/patient), is_active |
| `pharmacies` | Pharmacy | id, user_id, name, license_number, address, locations[] |
| `drivers` | DriverProfile | id, user_id, vehicle_type, status, current_location, circuit_driver_id |
| `orders` | Order | id, order_number, qr_code, pharmacy_id, driver_id, status, recipient, delivery_address, packages[], copay_amount, tracking_updates[] |
| `delivery_pricing` | DeliveryPricing | id, delivery_type, name, base_price, is_active, time_window_start/end |
| `service_zones` | ServiceZone | id, name, code, zip_codes[], delivery_fee |
| `scan_logs` | ScanLog | id, qr_code, order_id, action, scanned_by, scanned_at |
| `route_plans` | RoutePlan | id, title, date, driver_ids[], order_ids[], status, optimization_status |

### Order Status Flow
```
pending -> confirmed -> ready_for_pickup -> assigned -> picked_up -> in_transit -> out_for_delivery -> delivered
                                                                                                    -> failed
                                                        -> cancelled
```

---

## 6. API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Get JWT token |
| GET | `/me` | Yes | Current user info |

### Admin (`/api/admin`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Stats: users, orders, drivers, copay |
| GET/PUT/DELETE | `/users/{id}` | User CRUD |
| GET | `/orders` | Filtered order list |
| PUT | `/orders/{id}/status` | Update order status |
| PUT | `/orders/{id}/cancel` | Cancel order |
| PUT | `/orders/{id}/reassign` | Reassign driver/time window |
| POST | `/orders/optimize-route` | Route optimization preview |
| GET/POST/PUT/DELETE | `/drivers/{id}` | Driver CRUD |
| POST | `/drivers/{id}/simulate-location` | Test GPS |
| GET | `/pricing`, `/pricing/{id}` | Pricing CRUD |
| GET | `/scans`, `/scans/stats` | QR scan audit |
| GET | `/packages` | Package management |
| POST | `/packages/verify/{qrCode}` | Verify package QR |
| GET | `/pod`, `/pod/{id}` | Proof of delivery records |
| GET | `/reports/daily` | Daily delivery report |

### Orders (`/api/orders`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create order |
| GET | `/` | List orders (filtered) |
| GET | `/{id}` | Get order details |
| PUT | `/{id}/assign` | Assign driver |
| PUT | `/{id}/status` | Update status |
| PUT | `/{id}/cancel` | Cancel order |
| POST | `/scan` | Scan QR code |

### Driver Portal (`/api/driver-portal`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Driver's own profile |
| GET | `/deliveries` | Assigned deliveries list |
| GET | `/deliveries/{id}` | Delivery details |
| PUT | `/deliveries/{id}/status` | Update delivery status |
| POST | `/deliveries/{id}/pod` | Submit proof of delivery |
| POST | `/deliveries/{id}/scan` | Scan package QR |
| POST | `/deliveries/{id}/collect-copay` | Confirm copay collected |
| POST | `/deliveries/{id}/complete` | Complete delivery |
| PUT | `/status` | Toggle online/offline |
| PUT | `/location` | Update GPS location |

### Circuit/Route Management (`/api/circuit`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Circuit API connection test |
| GET | `/drivers` | Available drivers |
| GET | `/route-plans` | All route plans (gigs) |
| POST | `/plans/create-for-date` | Create new gig |
| POST | `/plans/{id}/batch-import` | Add orders to gig |
| POST | `/plans/{id}/optimize-and-distribute` | Optimize routes + assign |
| POST | `/plans/{id}/assign-driver` | Assign driver to gig |
| PUT | `/route-plans/{id}` | Edit gig (name, date, driver) |
| DELETE | `/order/{id}/unlink` | Remove order from gig |
| DELETE | `/plans/{id}` | Delete gig |
| POST | `/auto-assign-by-borough` | Auto-assign by NYC borough |
| GET | `/pending-orders` | Orders ready for routing |

### Other Endpoints
| Route | Description |
|-------|-------------|
| `/api/pharmacies/*` | Pharmacy CRUD + locations |
| `/api/drivers/*` | Driver registration + listing |
| `/api/pricing/*` | Public pricing info |
| `/api/zones/*` | Service zones CRUD |
| `/api/delivery/proof` | Submit/get POD |
| `/api/tracking/order/{id}` | Order tracking data |
| `/api/track/{trackingNumber}` | Public tracking (no auth) |
| `/api/payments/checkout/*` | Stripe checkout |
| `/api/maps/geocode` | Address geocoding |
| `/api/reports/*` | Dashboard, deliveries, driver performance |
| `/api/notifications/send` | Send notification |
| `/api/webhook/stripe` | Stripe webhook |
| `/api/webhooks/circuit` | Circuit webhook |

---

## 7. Authentication Flow

1. User calls `POST /api/auth/login` with email + password
2. Backend verifies BCrypt password hash from MongoDB
3. Returns JWT token with claims: `sub` (userId), `email`, `role`
4. Token has `issuer: "RxExpresss"`, `audience: "RxExpresss"`, expires in 7 days
5. Frontend stores token in localStorage via `useAuth` hook
6. All authenticated requests include `Authorization: Bearer <token>`
7. Backend validates via ASP.NET `[Authorize]` attribute + JWT middleware

---

## 8. Key Features

### Multi-Role System
- **Admin**: Full dashboard with user/order/driver management, route optimization, reports
- **Pharmacy**: Create deliveries, manage orders, view pricing, bulk scheduling
- **Driver**: View assigned stops (sorted by route order), QR scanning, POD submission, copay collection
- **Patient**: Public tracking via tracking number

### QR Code System
- Each order gets a borough-prefixed QR code (e.g., `Q4F2A1` for Queens, `B7E3C9` for Brooklyn)
- Package-level QR codes (e.g., `S79D5-PKG1`)
- Driver must scan QR before POD is enabled
- All scans logged in `scan_logs` for audit

### Proof of Delivery (POD)
- Digital signature capture (canvas-based)
- Photo capture (camera or file)
- GPS coordinates recorded
- Copay collection confirmation
- Files stored locally at `/app/backend/uploads/{signatures|photos}/`

### Route Optimization (Circuit Spoke)
- Create "gigs" (route plans) for specific dates
- Batch import orders into gigs
- Optimize stop order (nearest-neighbor fallback if Circuit unavailable)
- Auto-assign orders by NYC borough
- Driver assignment per gig

### PWA + Mobile
- Progressive Web App with offline support
- Capacitor configured for iOS/Android native builds
- Install prompt for mobile browsers
- Safe-area CSS for notched devices

---

## 9. Configuration

### Backend (`appsettings.json`)
```json
{
  "MongoDb": { "ConnectionString": "mongodb://localhost:27017", "DatabaseName": "rxexpress_db" },
  "Jwt": { "SecretKey": "...", "ExpirationMinutes": "10080" },
  "Circuit": { "ApiKey": "..." },
  "GoogleMaps": { "ApiKey": "..." }
}
```

### Frontend (`.env`)
```
REACT_APP_BACKEND_URL=https://pharmacy-gig-hub.preview.emergentagent.com
REACT_APP_GOOGLE_MAPS_API_KEY=...
```

---

## 10. How to Run Locally

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- MongoDB (local or Atlas)
- Yarn

### Backend
```bash
cd backend-dotnet/RxExpresss
dotnet restore
dotnet run --urls "http://0.0.0.0:8001"
```

### Frontend
```bash
cd frontend
yarn install
yarn start     # Dev server on port 3000
```

### Build for Production
```bash
cd frontend
yarn build                  # Creates /build folder
npx cap sync                # Sync to native platforms (if added)
npx cap open ios            # Open Xcode (macOS only)
npx cap open android        # Open Android Studio
```

---

## 11. Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | admin123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |

---

## 12. NuGet Packages (Backend)

| Package | Version | Purpose |
|---------|---------|---------|
| MongoDB.Driver | 3.6.0 | MongoDB connectivity |
| BCrypt.Net-Next | 4.0.3 | Password hashing |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.0 | JWT auth middleware |
| System.IdentityModel.Tokens.Jwt | 8.0.0 | JWT token generation |
| Swashbuckle.AspNetCore | 6.6.2 | Swagger/OpenAPI docs |

---

## 13. NPM Packages (Frontend - Key Ones)

| Package | Purpose |
|---------|---------|
| react-router-dom | Client-side routing |
| axios | HTTP client for API calls |
| leaflet + react-leaflet | Map visualization |
| html5-qrcode | QR code scanning |
| qrcode.react | QR code rendering |
| recharts | Charts for reports |
| date-fns | Date formatting |
| @capacitor/core + plugins | Native mobile wrapper |
| lucide-react | Icon library |

---

## 14. Known Limitations / TODO

### Currently Mocked
- Stripe checkout returns mock session IDs (no real payment processing)
- Notifications endpoint accepts requests but doesn't actually send SMS/email
- Maps geocoding returns default NYC coordinates
- Circuit API webhook is a placeholder

### Production Readiness Items
- [ ] POD images stored locally (should migrate to S3/Azure Blob)
- [ ] No rate limiting on API endpoints
- [ ] No input sanitization beyond basic validation
- [ ] WebSocket/SignalR not implemented for real-time tracking
- [ ] No email verification on registration
- [ ] Swagger only enabled in Development mode
- [ ] CORS allows all origins (should restrict in production)
- [ ] JWT secret hardcoded in appsettings.json (use env vars / Key Vault)
- [ ] No HTTPS enforcement (handled by reverse proxy in prod)
- [ ] Admin endpoints have `[Authorize]` but no role-based authorization checks on most
- [ ] `server.py` (Python backend) still present - can be removed for clean codebase

### Feature Backlog
- [ ] Bulk order selection checkboxes in admin order list
- [ ] Circuit Spoke webhook business logic
- [ ] Twilio SMS notifications
- [ ] SendGrid email notifications
- [ ] Stripe frontend checkout flow
- [ ] SignalR real-time tracking

---

## 15. Deployment Notes

The app is containerized and deployed on Emergent's Kubernetes infrastructure:
- Frontend builds to static files served by Nginx
- Backend runs as a .NET process on port 8001
- Nginx routes `/api/*` to backend, everything else to frontend
- MongoDB runs locally in the container
- To start the .NET backend: `bash /app/backend/start-dotnet.sh`

For self-hosting, see `frontend/APP_STORE_GUIDE.md` for iOS/Android build instructions.

---

## 16. Questions for Reviewer

1. Should we implement role-based authorization middleware instead of checking `User.GetUserRole()` in each controller?
2. The AdminController is 1,296 lines - should we split it into multiple controllers?
3. Should we add a caching layer (Redis) for frequently accessed data like pricing?
4. What's our strategy for POD image storage in production (S3 vs Azure Blob)?
5. Should we implement health checks for MongoDB connectivity?
6. Do we need API versioning (e.g., `/api/v1/`) before launch?

---

*Generated from codebase at /app/ - Use "Save to Github" in Emergent to get the full source.*
