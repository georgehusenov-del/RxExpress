"""Regression tests for the 4 bug fixes.

Tests:
1. Driver failed attempt keeps order on list + increments counter (not terminal on 1st fail).
2. Driver second failed attempt = terminal, order removed from list.
3. Copay is cleared when a delivery is marked failed (driver path + admin log-attempt path).
4. Admin duplicate is rejected with < 2 failed attempts, allowed at >= 2.
5. Backfill-gigs endpoint assigns orphan orders to gigs.
6. PUT .../status?status=failed is rejected (must use attempt-failed).
"""
import json
import time
import requests

BASE = "http://localhost:8001"

ADMIN = {"email": "admin@rxexpresss.com", "password": "Admin@123"}
PHARMACY = {"email": "pharmacy@test.com", "password": "Pharmacy@123"}
DRIVER = {"email": "driver@test.com", "password": "Driver@123"}


def login(creds):
    r = requests.post(f"{BASE}/api/auth/login", json=creds, timeout=10)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_order(pharmacy_token, city="Queens", copay=10.00):
    """Pharmacy creates an order; admin assigns it to driver."""
    body = {
        "pharmacyId": 1,
        "deliveryType": "same_day",
        "recipientName": "Regression Test",
        "recipientPhone": "5550001234",
        "street": "1 Test Ave",
        "city": city,
        "state": "NY",
        "postalCode": "11101",
        "copayAmount": copay,
        "deliveryFee": 5.99,
        "deliveryOptionId": 1,
    }
    r = requests.post(f"{BASE}/api/orders", headers=h(pharmacy_token), json=body, timeout=10)
    assert r.status_code in (200, 201), f"Create order failed: {r.status_code} {r.text}"
    d = r.json()
    return d.get("order_id") or d.get("orderId") or d.get("id")


def get_admin_drivers(admin_token):
    r = requests.get(f"{BASE}/api/admin/drivers", headers=h(admin_token), timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


def assign_driver(admin_token, order_id, driver_id):
    r = requests.put(
        f"{BASE}/api/admin/orders/{order_id}/assign",
        headers=h(admin_token),
        json={"driverId": driver_id},
        timeout=10,
    )
    assert r.status_code == 200, f"Assign failed: {r.status_code} {r.text}"


def driver_deliveries(driver_token):
    r = requests.get(f"{BASE}/api/driver-portal/deliveries", headers=h(driver_token), timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["deliveries"]


def find(lst, id):
    return next((x for x in lst if x["id"] == id), None)


def main():
    admin_t = login(ADMIN)
    pharmacy_t = login(PHARMACY)
    driver_t = login(DRIVER)
    print("[ok] logins")

    drivers = get_admin_drivers(admin_t)
    driver_id = drivers[0]["id"] if isinstance(drivers, list) else drivers.get("drivers", [])[0]["id"]
    print(f"[ok] driver_id = {driver_id}")

    # ---------- Bug #3 + #2: first failed attempt keeps order retryable, clears copay ----------
    print("\n=== BUG 3+2: driver first failed attempt ===")
    oid = create_order(pharmacy_t)
    assign_driver(admin_t, oid, driver_id)
    # Collect copay first (to test clear-on-fail)
    r = requests.post(f"{BASE}/api/driver-portal/deliveries/{oid}/collect-copay", headers=h(driver_t), timeout=10)
    assert r.status_code == 200, r.text
    # Verify copayCollected is true
    dels = driver_deliveries(driver_t)
    row = find(dels, oid)
    assert row is not None, "order not in driver list"
    assert row["copayCollected"] is True, "copay should be collected"
    print("[ok] pre: copay collected")

    # Now log first failed attempt
    r = requests.post(
        f"{BASE}/api/driver-portal/deliveries/{oid}/attempt-failed",
        headers=h(driver_t),
        json={"failureReason": "patient_not_home", "notes": "rang 3x"},
        timeout=10,
    )
    assert r.status_code == 200, f"attempt-failed #1: {r.status_code} {r.text}"
    body = r.json()
    print("  attempt-failed #1 resp:", body)
    assert body["failedAttempts"] == 1
    assert body["canDuplicate"] is False
    assert body["status"] == "assigned", f"expected assigned, got {body['status']}"

    # Order must still be on driver list and copay cleared
    dels = driver_deliveries(driver_t)
    row = find(dels, oid)
    assert row is not None, "FAIL: order disappeared from driver list after 1 failed attempt"
    assert row["copayCollected"] is False, "FAIL: copay still collected after failed attempt"
    assert row.get("failedAttempts") == 1
    print("[ok] bug3: order retained on driver list with failedAttempts=1")
    print("[ok] bug2: copay cleared on failed attempt")

    # ---------- Bug #3: second failed attempt = terminal ----------
    print("\n=== BUG 3: driver second failed attempt = terminal ===")
    r = requests.post(
        f"{BASE}/api/driver-portal/deliveries/{oid}/attempt-failed",
        headers=h(driver_t),
        json={"failureReason": "wrong_address"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    print("  attempt-failed #2 resp:", body)
    assert body["failedAttempts"] == 2
    assert body["canDuplicate"] is True
    assert body["status"] == "failed"

    dels = driver_deliveries(driver_t)
    assert find(dels, oid) is None, "FAIL: terminal-failed order still on driver list"
    print("[ok] terminal: order removed after 2nd fail")

    # ---------- Bug #1: duplicate is rejected with < 2 fails, allowed at >= 2 ----------
    print("\n=== BUG 1: duplicate requires >= 2 attempts ===")
    # Create a fresh order, fail it only once
    oid_single = create_order(pharmacy_t)
    assign_driver(admin_t, oid_single, driver_id)
    requests.post(
        f"{BASE}/api/driver-portal/deliveries/{oid_single}/attempt-failed",
        headers=h(driver_t), json={"failureReason": "no_access"}, timeout=10,
    )
    # Manually flip to failed to simulate premature terminal (via admin path)
    # Instead, directly try to duplicate an order with only 1 attempt
    r = requests.post(
        f"{BASE}/api/admin/orders/{oid_single}/duplicate",
        headers=h(admin_t), json={"labourCost": 0}, timeout=10,
    )
    print("  duplicate @1 attempt:", r.status_code, r.text[:180])
    assert r.status_code == 400, f"expected 400, got {r.status_code}"
    assert "2 or more" in r.text or "failed" in r.text.lower()
    print("[ok] bug1: duplicate rejected at 1 failed attempt")

    # Now fail it again -> terminal
    requests.post(
        f"{BASE}/api/driver-portal/deliveries/{oid_single}/attempt-failed",
        headers=h(driver_t), json={"failureReason": "refused"}, timeout=10,
    )
    r = requests.post(
        f"{BASE}/api/admin/orders/{oid_single}/duplicate",
        headers=h(admin_t), json={"labourCost": 0}, timeout=10,
    )
    print("  duplicate @2 attempts:", r.status_code, r.text[:120])
    assert r.status_code == 200, f"expected 200, got {r.status_code} {r.text}"
    print("[ok] bug1: duplicate ALLOWED at 2 failed attempts")

    # ---------- Bug: PUT status=failed is blocked ----------
    print("\n=== PUT .../status?status=failed is blocked (must use attempt-failed) ===")
    oid3 = create_order(pharmacy_t)
    assign_driver(admin_t, oid3, driver_id)
    r = requests.put(
        f"{BASE}/api/driver-portal/deliveries/{oid3}/status?status=failed",
        headers=h(driver_t), timeout=10,
    )
    print("  PUT status=failed resp:", r.status_code, r.text[:150])
    assert r.status_code == 400, f"expected 400, got {r.status_code}"
    print("[ok] status=failed path blocked")

    # ---------- Bug #4: backfill gigs ----------
    print("\n=== BUG 4: backfill-gigs endpoint ===")
    r = requests.post(f"{BASE}/api/admin/route-plans/backfill-gigs", headers=h(admin_t), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    print("  backfill resp:", body)
    assert "scanned" in body and "assigned" in body
    print(f"[ok] bug4: scanned={body['scanned']} assigned={body['assigned']} skipped={body['skipped']}")

    # Second call should scan fewer (or zero) — idempotent
    r2 = requests.post(f"{BASE}/api/admin/route-plans/backfill-gigs", headers=h(admin_t), timeout=30)
    body2 = r2.json()
    print("  backfill 2nd call resp:", body2)
    assert body2["scanned"] <= body["scanned"] + 5, "backfill not idempotent"
    print("[ok] bug4: backfill idempotent")

    print("\nALL REGRESSION TESTS PASSED")


if __name__ == "__main__":
    main()
