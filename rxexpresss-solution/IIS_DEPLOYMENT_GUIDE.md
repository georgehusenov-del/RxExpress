# RX Expresss - IIS Deployment Guide

## Prerequisites
- Windows Server with IIS installed
- .NET 8.0 Runtime & Hosting Bundle installed
- URL Rewrite Module for IIS (optional, for API proxy)
- SQL Server (for production database)

## Step 1: Publish the Projects

Open PowerShell in the solution directory and run:

```powershell
# Publish Web Frontend
dotnet publish RxExpresss.Web -c Release -o C:\inetpub\rxexpresss\web

# Publish API Backend  
dotnet publish RxExpresss.API -c Release -o C:\inetpub\rxexpresss\api
```

## Step 2: Configure SQL Server Connection

Edit `C:\inetpub\rxexpresss\api\appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SQL_SERVER;Database=RxExpresss;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True"
  },
  "Jwt": {
    "Key": "YOUR-SUPER-SECRET-KEY-MINIMUM-32-CHARACTERS!",
    "Issuer": "RxExpresss",
    "Audience": "RxExpresss"
  }
}
```

## Step 3: Run SQL Server Migration

Execute the SQL script on your SQL Server:
- File: `SqlServer_Migration.sql`
- This creates all tables and seeds initial data

## Step 4: Create IIS Application Pools

1. Open IIS Manager
2. Create two Application Pools:
   - **rxexpresss-web** (No Managed Code, 64-bit)
   - **rxexpresss-api** (No Managed Code, 64-bit)

## Step 5: Create IIS Websites

### Option A: Two Separate Sites (Recommended)

**Site 1: Web Frontend**
- Name: rxexpresss-web
- Physical Path: `C:\inetpub\rxexpresss\web`
- Application Pool: rxexpresss-web
- Binding: https://rxexpresss.com:443

**Site 2: API Backend**
- Name: rxexpresss-api
- Physical Path: `C:\inetpub\rxexpresss\api`
- Application Pool: rxexpresss-api
- Binding: http://localhost:8001

Then configure URL Rewrite in the Web site to proxy `/api/*` to the API site.

### Option B: Single Site with Virtual Application

1. Create main site pointing to `C:\inetpub\rxexpresss\web`
2. Add Application under the site:
   - Alias: `api`
   - Physical Path: `C:\inetpub\rxexpresss\api`
   - Application Pool: rxexpresss-api

## Step 6: Configure URL Rewrite (for Option A)

Install URL Rewrite Module if not installed, then add this to web.config in the Web folder:

```xml
<rewrite>
  <rules>
    <rule name="API Proxy" stopProcessing="true">
      <match url="^api/(.*)" />
      <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
    </rule>
  </rules>
</rewrite>
```

## Step 7: Set Folder Permissions

Grant IIS_IUSRS and the Application Pool identity full permissions to:
- `C:\inetpub\rxexpresss\api\wwwroot` (for POD photo uploads)
- `C:\inetpub\rxexpresss\api\logs` (for logging)

```powershell
icacls "C:\inetpub\rxexpresss\api\wwwroot" /grant "IIS_IUSRS:(OI)(CI)F"
icacls "C:\inetpub\rxexpresss\api\logs" /grant "IIS_IUSRS:(OI)(CI)F"
```

## Step 8: Test the Deployment

1. Browse to https://rxexpresss.com - should show landing page
2. Browse to https://rxexpresss.com/api/health - should return `{"status":"healthy"}`
3. Try logging in with admin@rxexpresss.com / Admin@123

## Troubleshooting

### 502 Bad Gateway on /api/*
- Check if API site is running in IIS
- Check Application Pool is started
- Check logs at `C:\inetpub\rxexpresss\api\logs\stdout*.log`
- Verify port 8001 is not blocked by firewall

### CSS Not Loading
- Clear browser cache
- Check if static files are being served (browse to /css/site.css directly)
- Ensure IIS static content feature is enabled

### Database Errors
- Verify SQL Server connection string
- Check if migration script was run
- Check API logs for detailed error messages

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |
