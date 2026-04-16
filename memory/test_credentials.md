# RX Expresss - Test Credentials

| Role         | Email                      | Password       | Login URL       |
| :----------- | :------------------------- | :------------- | :-------------- |
| **Admin**    | `admin@rxexpresss.com`     | `Admin@123`    | `/Home/Login`   |
| **Manager**  | `manager@rxexpresss.com`   | `Manager@123`  | `/Home/Login`   |
| **Operator** | `operator@rxexpresss.com`  | `Operator@123` | `/Home/Login`   |
| **Pharmacy** | `pharmacy@test.com`        | `Pharmacy@123` | `/Home/Login`   |
| **Driver**   | `driver@test.com`          | `Driver@123`   | `/Driver/Login` |

## Role Hierarchy
Admin > Manager > Operator > Pharmacy > Driver

- **Admin**: Has all 28 permissions (hardcoded)
- **Manager**: Has all 28 permissions (seeded)
- **Operator**: Has 8 permissions (seeded): orders.view, orders.create, drivers.view, routes.view, routes.create, routes.assign, pricing.view

## Test API Key (HealthFirst Pharmacy)
- Key: `a4b4800042b34202b746e1213f1c77c6`
- Secret: `111369031c114d7a942869f49c66584e2a09f404f35c4453a03120faa8f7627e`
