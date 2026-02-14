# RX Expresss - Product Requirements Document

## Overview
RX Expresss is a full-stack pharmacy delivery service application replicating DrugLift functionality, with routing and delivery management handled by Circuit Spoke integration.

## Tech Stack
- **Backend:** Python/FastAPI (restored from .NET migration due to runtime unavailability)
- **Frontend:** React.js, Tailwind CSS, dnd-kit, lucide-react
- **Database:** MongoDB
- **External Services:** Circuit Spoke, Google Maps, (planned: Stripe, Twilio, SendGrid)

## Core Features

### Authentication (Multi-Role)
- Admin, Pharmacy, Driver, Patient roles
- JWT-based authentication
- Quick demo access for testing

### Pharmacy Portal
- Dashboard with delivery management
- Create/manage deliveries with pricing, notes, QR codes
- QR code scanning functionality

### Driver Portal
- View and manage assigned deliveries
- Scan packages
- Capture Proof of Delivery (POD)
- Mark copay as collected

### Admin Dashboard
- Smart Organizer for grouping orders
- Drag-and-drop route assignment
- Route optimization
- Real-time driver tracking
- User management with editing
- Quick-print labels

### Order Status System
Unified status values:
- `new` - New orders ready for processing
- `picked_up` - Order picked up from pharmacy
- `in_transit` - Order in transit
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `cancelled` - Order cancelled
- `failed` - Delivery failed

## Completed Work (as of Feb 14, 2026)

### Backend Migration (Reverted)
- .NET migration was attempted but reverted due to runtime unavailability in fork
- Python/FastAPI backend restored and functional

### Order Status System Overhaul
- Migrated all database orders to simplified status system
- Updated backend endpoints for new statuses
- Refactored frontend to use new status system exclusively

### Route Management Simplification
- Removed UI dependency on Circuit API connection status
- Added auto-generated route names (Route 1, Route 2, etc.)
- Added checkboxes and "Add to Route" dropdown for quick workflow

### Login Fix (Feb 14, 2026)
- Restored Python/FastAPI backend from git history
- Fixed 503 Service Unavailable errors

## In Progress Tasks

### Bulk Order Selection (P1)
- UI elements (checkboxes) exist in OrdersManagement.jsx
- Floating bulk action bar needs implementation

### Calendar Date Filtering (P1)
- Add date picker for filtering orders by date

## Upcoming Tasks

### Circuit Spoke Webhook (P1)
- Implement webhook at `/api/webhooks/circuit`
- Handle real-time updates from Circuit

### Twilio/SendGrid Notifications (P1)
- Order status update notifications
- Alerts and communication

## Future/Backlog

### Proof of Delivery (POD) - P2
- Full flow for capturing signatures/photos

### Stripe Integration - P2
- Payment handling

### Pharmacy Software Integration - P2
- Awaiting user clarification

### Figma Design Implementation - P2
- Need accessible Figma link from user

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | admin123 |
| Pharmacy | pharmacy@test.com | pharmacy123 |
| Driver | driver@test.com | driver123 |

## Key Files

### Backend
- `/app/backend/server.py` - Main FastAPI application (3800+ lines)
- `/app/backend/models.py` - Data models
- `/app/backend/auth.py` - Authentication
- `/app/backend/circuit_service.py` - Circuit integration
- `/app/backend/maps_service.py` - Google Maps integration

### Frontend
- `/app/frontend/src/components/admin/OrdersManagement.jsx` - Orders page (needs refactoring)
- `/app/frontend/src/components/admin/RouteManagement.jsx` - Route management
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin overview

## API Endpoints (Key)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/pending-orders` - Orders with 'new' status
- `GET /api/orders` - All orders
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}/status` - Update order status

## Known Issues
- OrdersManagement.jsx is 2000+ lines and needs refactoring into smaller components
- Bulk action bar functionality not implemented
- Calendar date filtering not started

## Changelog
- **Feb 14, 2026:** Fixed login issue by restoring Python/FastAPI backend
