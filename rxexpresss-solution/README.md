# RX Expresss - ASP.NET Core 8 Solution

## Running in Visual Studio

### Step 1: Set Multiple Startup Projects
1. Right-click the **Solution** `RxExpresss` in Solution Explorer
2. Select **"Configure Startup Projects..."**
3. Choose **"Multiple startup projects"**
4. Set both projects to **"Start"**:
   - `RxExpresss.API` → Action: **Start**
   - `RxExpresss.Web` → Action: **Start**
   - `RxExpresss.Core` → Action: None
   - `RxExpresss.Data` → Action: None
   - `RxExpresss.Identity` → Action: None
5. Click **OK**

### Step 2: Run (F5)
- **API** will start on `http://localhost:5001` (opens Swagger)
- **Web** will start on `http://localhost:5000` (opens Login page)
- Login with: `admin@rxexpresss.com` / `Admin@123`

### If you want to run only ONE project:
- Right-click **RxExpresss.Web** → "Set as Startup Project" → F5
- But you ALSO need the API running, so open a terminal and run:
  ```
  cd RxExpresss.API
  dotnet run
  ```

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rxexpresss.com | Admin@123 |
| Pharmacy | pharmacy@test.com | Pharmacy@123 |
| Driver | driver@test.com | Driver@123 |

## Project Structure
```
RxExpresss.sln
├── RxExpresss.API        (Web API - port 5001)    → Controllers only
├── RxExpresss.Web        (MVC - port 5000)        → Views, CSS, JS
├── RxExpresss.Core       (Class Library)           → Entities, DTOs, Interfaces
├── RxExpresss.Data       (Class Library)           → DbContext, Repository, Migrations
├── RxExpresss.Identity   (Class Library)           → JWT Service
└── DatabaseScript_SqlServer.sql                    → SQL Server DDL
```

## Database
- Default: **SQLite** (auto-created as `RxExpresss.db`)
- To switch to **SQL Server**, change `appsettings.json` in API project:
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=RxExpresssDb;Trusted_Connection=true;TrustServerCertificate=true"
  }
  ```
- Run `DatabaseScript_SqlServer.sql` on your SQL Server first
- SuperAdmin user is auto-seeded on first run

## Troubleshooting

### "Output type library" error
→ You're trying to run a library project. Set **RxExpresss.Web** or **RxExpresss.API** as startup project.

### "wwwroot not found" error
→ Fixed automatically. The API creates wwwroot folder if missing.

### Login not redirecting
→ Make sure API is running on port 5001. Check `appsettings.Development.json` in Web project has `"ApiBaseUrl": "http://localhost:5001/api"`
