# RX Expresss - Product Requirements Document

## Overview
RX Expresss is a pharmacy delivery service application built with ASP.NET Core 8 Clean Architecture.

## Tech Stack
- **Backend:** ASP.NET Core 8 (C#) - Clean Architecture
  - `RxExpresss.API` - Controllers, Program.cs
  - `RxExpresss.Core` - Entities, DTOs, Interfaces, Utilities
  - `RxExpresss.Data` - EF Core DbContext, Repository Pattern, Seed
  - `RxExpresss.Identity` - JWT Authentication Service
- **Frontend:** Pure HTML, CSS, JavaScript (Bootstrap-like theme)
- **Database:** SQLite (dev) / SQL Server (production)
- **Auth:** ASP.NET Identity + JWT + Role-based Authorization

## Roles
- **Admin** - Full system management
- **Pharmacy** - Create/manage delivery orders
- **Driver** - View/manage assigned deliveries, POD
- **Patient** - Track deliveries

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Solution Structure
```
/rxexpresss-solution/
  RxExpresss.sln
  RxExpresss.API/          (Web API + Static Frontend)
  RxExpresss.Core/         (Entities, DTOs, Interfaces)
  RxExpresss.Data/         (DbContext, Repository, Migrations, Seed)
  RxExpresss.Identity/     (JWT Service)
  DatabaseScript_SqlServer.sql  (SQL Server DDL + seed)
```

## Frontend Structure
```
wwwroot/
  index.html              (Login page)
  css/style.css           (Bootstrap-like theme)
  js/api-service.js       (Generic API client + auth)
  admin/                  (Admin pages: dashboard, orders, drivers, users)
  pharmacy/               (Pharmacy pages: dashboard, create-order)
  driver/                 (Driver portal: deliveries, POD)
```

## Changelog

### Feb 16, 2026 - Complete Rewrite (Clean Architecture)
- Built 4-project solution: API, Core, Data, Identity
- ASP.NET Identity with 4 roles + JWT authentication
- Repository Pattern with generic IRepository<T>
- EF Core with SQLite + SQL Server migration script
- Pure HTML/CSS/JS frontend organized by role
- Database seeded with SuperAdmin + test users
- All tests passed (100% - iteration_20.json)

## Upcoming Tasks
- [ ] Add more admin CRUD pages (pricing, pharmacies management)
- [ ] Order assignment to drivers
- [ ] QR code scanning in driver portal
- [ ] Proof of Delivery with signature/photo upload
- [ ] Switch to SQL Server for production
- [ ] Deploy to IIS/Azure
