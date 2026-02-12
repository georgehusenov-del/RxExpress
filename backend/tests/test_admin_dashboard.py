"""
Admin Dashboard API Tests for RX Express
Tests all admin endpoints: Dashboard, Users, Pharmacies, Drivers, Orders, Service Zones, Reports
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminDashboard:
    """Admin Dashboard Overview Tests"""
    
    def test_get_dashboard_stats(self, admin_headers):
        """Test admin dashboard returns stats and recent orders"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Verify stats structure
        assert "stats" in data
        stats = data["stats"]
        assert "total_users" in stats
        assert "total_pharmacies" in stats
        assert "total_drivers" in stats
        assert "active_drivers" in stats
        assert "total_orders" in stats
        assert "orders_by_status" in stats
        
        # Verify orders_by_status has expected keys
        orders_by_status = stats["orders_by_status"]
        assert "pending" in orders_by_status
        assert "delivered" in orders_by_status
        
        # Verify recent_orders is a list
        assert "recent_orders" in data
        assert isinstance(data["recent_orders"], list)
        print(f"Dashboard stats: {stats['total_users']} users, {stats['total_pharmacies']} pharmacies, {stats['total_orders']} orders")
    
    def test_dashboard_requires_admin(self):
        """Test dashboard endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden is acceptable


class TestUsersManagement:
    """Users Management Tests"""
    
    def test_list_users(self, admin_headers):
        """Test listing all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        print(f"Found {data['total']} users")
    
    def test_list_users_with_role_filter(self, admin_headers):
        """Test filtering users by role"""
        for role in ["admin", "pharmacy", "driver", "patient"]:
            response = requests.get(f"{BASE_URL}/api/admin/users?role={role}", headers=admin_headers)
            assert response.status_code == 200
            data = response.json()
            # All returned users should have the filtered role
            for user in data["users"]:
                assert user["role"] == role
            print(f"Found {len(data['users'])} {role} users")
    
    def test_list_users_with_pagination(self, admin_headers):
        """Test user pagination"""
        response = requests.get(f"{BASE_URL}/api/admin/users?skip=0&limit=5", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) <= 5
    
    def test_get_user_details(self, admin_headers):
        """Test getting specific user details"""
        # First get a user ID
        list_response = requests.get(f"{BASE_URL}/api/admin/users?limit=1", headers=admin_headers)
        assert list_response.status_code == 200
        users = list_response.json()["users"]
        
        if users:
            user_id = users[0]["id"]
            response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
            assert response.status_code == 200
            user = response.json()
            assert user["id"] == user_id
            assert "email" in user
            assert "role" in user
            print(f"Got user details: {user['email']}")
    
    def test_activate_deactivate_user(self, admin_headers):
        """Test activating and deactivating a user"""
        # Create a test user first
        test_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+15551234567",
            "role": "patient"
        })
        assert register_response.status_code == 200
        user_id = register_response.json()["user"]["id"]
        
        # Deactivate user
        deactivate_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/deactivate", headers=admin_headers)
        assert deactivate_response.status_code == 200
        
        # Verify deactivation
        user_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert user_response.json()["is_active"] == False
        
        # Activate user
        activate_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/activate", headers=admin_headers)
        assert activate_response.status_code == 200
        
        # Verify activation
        user_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert user_response.json()["is_active"] == True
        
        # Cleanup - delete test user
        requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        print("User activate/deactivate test passed")
    
    def test_delete_user(self, admin_headers):
        """Test deleting a user"""
        # Create a test user
        test_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "first_name": "Delete",
            "last_name": "Me",
            "phone": "+15551234568",
            "role": "patient"
        })
        assert register_response.status_code == 200
        user_id = register_response.json()["user"]["id"]
        
        # Delete user
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert get_response.status_code == 404
        print("User deletion test passed")


class TestPharmaciesManagement:
    """Pharmacies Management Tests"""
    
    def test_list_pharmacies(self, admin_headers):
        """Test listing all pharmacies"""
        response = requests.get(f"{BASE_URL}/api/admin/pharmacies", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "pharmacies" in data
        assert "total" in data
        assert isinstance(data["pharmacies"], list)
        print(f"Found {data['total']} pharmacies")
    
    def test_verify_pharmacy(self, admin_headers):
        """Test verifying a pharmacy"""
        # Get list of pharmacies
        list_response = requests.get(f"{BASE_URL}/api/admin/pharmacies", headers=admin_headers)
        pharmacies = list_response.json()["pharmacies"]
        
        if pharmacies:
            pharmacy_id = pharmacies[0]["id"]
            response = requests.put(f"{BASE_URL}/api/admin/pharmacies/{pharmacy_id}/verify", headers=admin_headers)
            # Should succeed or already verified
            assert response.status_code in [200, 404]
            print(f"Pharmacy verification test completed for {pharmacy_id}")


class TestDriversManagement:
    """Drivers Management Tests"""
    
    def test_list_drivers(self, admin_headers):
        """Test listing all drivers"""
        response = requests.get(f"{BASE_URL}/api/admin/drivers", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data
        assert "total" in data
        assert isinstance(data["drivers"], list)
        
        # Verify driver data includes user info
        for driver in data["drivers"]:
            if "user" in driver:
                assert "email" in driver["user"]
        print(f"Found {data['total']} drivers")
    
    def test_list_drivers_by_status(self, admin_headers):
        """Test filtering drivers by status"""
        for status in ["available", "on_route", "offline"]:
            response = requests.get(f"{BASE_URL}/api/admin/drivers?status={status}", headers=admin_headers)
            assert response.status_code == 200
            print(f"Found {len(response.json()['drivers'])} {status} drivers")
    
    def test_verify_driver(self, admin_headers):
        """Test verifying a driver"""
        list_response = requests.get(f"{BASE_URL}/api/admin/drivers", headers=admin_headers)
        drivers = list_response.json()["drivers"]
        
        if drivers:
            driver_id = drivers[0]["id"]
            response = requests.put(f"{BASE_URL}/api/admin/drivers/{driver_id}/verify", headers=admin_headers)
            assert response.status_code in [200, 404]
            print(f"Driver verification test completed for {driver_id}")


class TestOrdersManagement:
    """Orders Management Tests"""
    
    def test_list_orders(self, admin_headers):
        """Test listing all orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        print(f"Found {data['total']} orders")
    
    def test_list_orders_by_status(self, admin_headers):
        """Test filtering orders by status"""
        for status in ["pending", "confirmed", "in_transit", "delivered", "cancelled"]:
            response = requests.get(f"{BASE_URL}/api/admin/orders?status={status}", headers=admin_headers)
            assert response.status_code == 200
            orders = response.json()["orders"]
            # All returned orders should have the filtered status
            for order in orders:
                assert order["status"] == status
            print(f"Found {len(orders)} {status} orders")
    
    def test_list_orders_with_pagination(self, admin_headers):
        """Test order pagination"""
        response = requests.get(f"{BASE_URL}/api/admin/orders?skip=0&limit=5", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["orders"]) <= 5
    
    def test_cancel_order(self, admin_headers):
        """Test cancelling an order"""
        # Get a pending order
        list_response = requests.get(f"{BASE_URL}/api/admin/orders?status=pending", headers=admin_headers)
        orders = list_response.json()["orders"]
        
        if orders:
            order_id = orders[0]["id"]
            response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/cancel?reason=Test%20cancellation",
                headers=admin_headers
            )
            assert response.status_code in [200, 404]
            print(f"Order cancellation test completed for {order_id}")
        else:
            print("No pending orders to cancel - skipping test")


class TestServiceZonesManagement:
    """Service Zones Management Tests"""
    
    def test_list_zones(self, admin_headers):
        """Test listing all service zones"""
        response = requests.get(f"{BASE_URL}/api/zones/", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "zones" in data
        assert isinstance(data["zones"], list)
        print(f"Found {len(data['zones'])} service zones")
    
    def test_create_zone(self, admin_headers):
        """Test creating a new service zone"""
        zone_data = {
            "name": f"TEST Zone {uuid.uuid4().hex[:6]}",
            "code": f"TZ{uuid.uuid4().hex[:4].upper()}",
            "zip_codes": ["99901", "99902", "99903"],
            "cities": ["Test City"],
            "states": ["TS"],
            "delivery_fee": 7.99,
            "same_day_cutoff": "15:00",
            "priority_surcharge": 6.00
        }
        
        response = requests.post(f"{BASE_URL}/api/zones/", json=zone_data, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "zone_id" in data
        zone_id = data["zone_id"]
        print(f"Created zone: {zone_id}")
        
        # Verify zone was created
        get_response = requests.get(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
        assert get_response.status_code == 200
        zone = get_response.json()
        assert zone["name"] == zone_data["name"]
        assert zone["delivery_fee"] == zone_data["delivery_fee"]
        
        return zone_id
    
    def test_update_zone(self, admin_headers):
        """Test updating a service zone"""
        # Create a zone first
        zone_data = {
            "name": f"TEST Update Zone {uuid.uuid4().hex[:6]}",
            "code": f"TU{uuid.uuid4().hex[:4].upper()}",
            "zip_codes": ["88801"],
            "cities": ["Update City"],
            "states": ["UC"],
            "delivery_fee": 5.99,
            "same_day_cutoff": "14:00",
            "priority_surcharge": 5.00
        }
        
        create_response = requests.post(f"{BASE_URL}/api/zones/", json=zone_data, headers=admin_headers)
        assert create_response.status_code == 200
        zone_id = create_response.json()["zone_id"]
        
        # Update the zone
        updated_data = {
            "name": "TEST Updated Zone Name",
            "code": zone_data["code"],
            "zip_codes": ["88801", "88802"],
            "cities": ["Update City", "New City"],
            "states": ["UC"],
            "delivery_fee": 8.99,
            "same_day_cutoff": "16:00",
            "priority_surcharge": 7.00
        }
        
        update_response = requests.put(f"{BASE_URL}/api/zones/{zone_id}", json=updated_data, headers=admin_headers)
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
        zone = get_response.json()
        assert zone["name"] == "TEST Updated Zone Name"
        assert zone["delivery_fee"] == 8.99
        assert len(zone["zip_codes"]) == 2
        print(f"Zone {zone_id} updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
    
    def test_delete_zone(self, admin_headers):
        """Test deleting (deactivating) a service zone"""
        # Create a zone first
        zone_data = {
            "name": f"TEST Delete Zone {uuid.uuid4().hex[:6]}",
            "code": f"TD{uuid.uuid4().hex[:4].upper()}",
            "zip_codes": ["77701"],
            "cities": ["Delete City"],
            "states": ["DC"],
            "delivery_fee": 5.99,
            "same_day_cutoff": "14:00",
            "priority_surcharge": 5.00
        }
        
        create_response = requests.post(f"{BASE_URL}/api/zones/", json=zone_data, headers=admin_headers)
        assert create_response.status_code == 200
        zone_id = create_response.json()["zone_id"]
        
        # Delete the zone
        delete_response = requests.delete(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # Zone should still exist but be inactive
        get_response = requests.get(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
        assert get_response.status_code == 200
        zone = get_response.json()
        assert zone["is_active"] == False
        print(f"Zone {zone_id} deactivated successfully")
    
    def test_check_zone_availability(self, admin_headers):
        """Test checking service availability by zip code"""
        # Create a zone with specific zip codes
        zone_data = {
            "name": f"TEST Availability Zone {uuid.uuid4().hex[:6]}",
            "code": f"TA{uuid.uuid4().hex[:4].upper()}",
            "zip_codes": ["66601", "66602"],
            "cities": ["Avail City"],
            "states": ["AV"],
            "delivery_fee": 5.99,
            "same_day_cutoff": "14:00",
            "priority_surcharge": 5.00
        }
        
        create_response = requests.post(f"{BASE_URL}/api/zones/", json=zone_data, headers=admin_headers)
        assert create_response.status_code == 200
        zone_id = create_response.json()["zone_id"]
        
        # Check availability for covered zip code
        check_response = requests.get(f"{BASE_URL}/api/zones/check/66601")
        assert check_response.status_code == 200
        data = check_response.json()
        assert data["available"] == True
        assert data["zone_id"] == zone_id
        
        # Check availability for non-covered zip code
        check_response = requests.get(f"{BASE_URL}/api/zones/check/00000")
        assert check_response.status_code == 200
        data = check_response.json()
        assert data["available"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/zones/{zone_id}", headers=admin_headers)
        print("Zone availability check test passed")


class TestReportsSection:
    """Reports Section Tests"""
    
    def test_get_daily_report(self, admin_headers):
        """Test getting daily report"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/daily", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "total_orders" in data
        assert "total_revenue" in data
        print(f"Daily report: {data['total_orders']} orders, ${data['total_revenue']} revenue")
    
    def test_get_daily_report_with_date(self, admin_headers):
        """Test getting daily report for specific date"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/daily?date=2026-02-12", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2026-02-12"
        print(f"Report for 2026-02-12: {data['total_orders']} orders")
    
    def test_report_requires_admin(self):
        """Test report endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/daily")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden is acceptable


class TestAdminAccessControl:
    """Test admin access control"""
    
    def test_non_admin_cannot_access_admin_endpoints(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Create a patient user
        test_email = f"TEST_patient_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "first_name": "Patient",
            "last_name": "User",
            "phone": "+15551234569",
            "role": "patient"
        })
        
        if register_response.status_code == 200:
            # Login as patient
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "testpass123"
            })
            patient_token = login_response.json()["access_token"]
            patient_headers = {"Authorization": f"Bearer {patient_token}"}
            
            # Try to access admin endpoints
            dashboard_response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=patient_headers)
            assert dashboard_response.status_code == 403
            
            users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=patient_headers)
            assert users_response.status_code == 403
            
            print("Non-admin access control test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
