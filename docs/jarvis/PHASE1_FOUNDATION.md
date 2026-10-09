# Master Jarvis — Phase 1 foundation (iteration 1)

## Scope

First implementation is **read-only**, admin-only, and does not invoke external language models.
This is a new code slice built on the existing ASP.NET Core 8 RX Express backend; it is not a production-ready autonomous manager.

### API endpoints

All require an authenticated **Admin** JWT:

- `GET /api/jarvis/overview` — operational aggregates for the current **UTC** day, outstanding unassigned count and driver status counts.
- `GET /api/jarvis/unassigned?limit=20` — limited queue of unassigned orders, without patient details.
- `GET /api/jarvis/drivers` — minimal driver availability metadata without identifying information or coordinates.
- `POST /api/jarvis/commands/preview` — deterministic text-intent preview. Accepts `{"command":"Show unassigned orders"}`. Write/action requests are **never executed**.

### Local integration testing (staging only)

```bash
dotnet restore rxexpresss-solution/RxExpresss.sln
dotnet build rxexpresss-solution/RxExpresss.sln --configuration Release
```

Run API in a test environment with synthetic data. Use an Admin JWT obtained through your normal authorized login. Example:

```bash
curl -H "Authorization: Bearer $ADMIN_JWT" https://YOUR-STAGING-API/api/jarvis/overview
curl -H "Authorization: Bearer $ADMIN_JWT" https://YOUR-STAGING-API/api/jarvis/unassigned
curl -H "Authorization: Bearer $ADMIN_JWT" https://YOUR-STAGING-API/api/jarvis/drivers
curl -X POST https://YOUR-STAGING-API/api/jarvis/commands/preview \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"command":"Show unassigned orders"}'
```

Check: unauthenticated → 401, pharmacy/driver JWT → 403, admin → 200.
Check: command `"assign all routes"` → `executed:false`, no database changes.
Do not send real patient data or tokens to third-party language models.

## Findings requiring remediation before Jarvis write access

1. `OrdersController.UpdateStatus` and `AdminController.UpdateOrderStatus` can set statuses without a centralized, validated state-machine/custody policy. A delivery cannot be marked completed by Jarvis without genuine scan/POD events.
2. `AuthController.Register` uses a caller-supplied role in a registration path. Restrict roles and registration before exposing automation.
3. `RoutesController.AssignDriver` updates every order in a route to `assigned`, even if orders have already progressed. Replace with validated, transactional, per-order assignments.
4. Review authentication defaults, production secrets, API error exposure and repository-tracked development assets. Do not copy sample passwords into production.
5. Verify deployed production version against repository version; this repository may lag previous patch files or existing production changes.
6. Add durable audit/event store, action-idempotency keys, tenant scope, human takeover lock, failure retries, structured policies and tests.

## Planned next increments

- **Iteration 2:** Backend permission/state-machine hardening; server-side policy service; safe dispatch dry run with accurate driver eligibility.
- **Iteration 3:** Durable task log, read/write gateway, audited approval workflow, first bounded dispatch action in staging.
- **Iteration 4:** Owner Control UI, human voice/text chat integration, live push/events, individual-agent supervision.
- **Later:** Full autonomous business operations; tenant-isolated XYZ managers; autonomous vehicle partner interface.

## Architectural rule

Jarvis orchestrates through typed, authorized backend tools. Never give an LLM raw SQL, production database administrator access, unrestricted role impersonation, or direct authority to synthesize package scans, signatures, or GPS evidence. Human takeover must reliably stop new autonomous actions while preserving ongoing human delivery operations.
