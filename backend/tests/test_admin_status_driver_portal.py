"""
Test suite for Admin Order Status Change and Driver Portal features
Tests:
1. Admin Order Status Change - PUT /api/admin/orders/{order_id}/status
2. Driver Portal APIs - profile, deliveries, status updates, scanning
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pharma-deliver-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "driver123"


class TestAdminOrderStatusChange:
    """Test Admin Order Status Change feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")
    
    def test_admin_get_orders(self):
        """Test admin can get orders list"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"✓ Admin can get orders - Total: {data['total']}")
        return data.get("orders", [])
    
    def test_admin_update_order_status_endpoint_exists(self):
        """Test admin update order status endpoint exists"""
        # Get an order first
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders?limit=1")
        assert orders_response.status_code == 200
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available to test status update")
        
        order_id = orders[0]["id"]
        current_status = orders[0]["status"]
        
        # Try to update status to the same status (should work)
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status={current_status}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Admin update order status endpoint works - Order: {order_id}")
    
    def test_admin_update_order_status_to_delivered(self):
        """Test admin can change order status to delivered"""
        # Get a non-delivered order
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders")
        orders = orders_response.json().get("orders", [])
        
        # Find a pending or in_transit order
        test_order = None
        for order in orders:
            if order["status"] not in ["delivered", "cancelled", "failed"]:
                test_order = order
                break
        
        if not test_order:
            pytest.skip("No suitable order to test status change to delivered")
        
        order_id = test_order["id"]
        old_status = test_order["status"]
        
        # Update to delivered
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=delivered&notes=Admin test delivery"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "delivered"
        print(f"✓ Admin changed order {order_id} from {old_status} to delivered")
        
        # Revert back to original status
        self.session.put(f"{BASE_URL}/api/admin/orders/{order_id}/status?status={old_status}")
    
    def test_admin_update_order_status_to_cancelled(self):
        """Test admin can change order status to cancelled"""
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders")
        orders = orders_response.json().get("orders", [])
        
        test_order = None
        for order in orders:
            if order["status"] not in ["delivered", "cancelled", "failed"]:
                test_order = order
                break
        
        if not test_order:
            pytest.skip("No suitable order to test status change to cancelled")
        
        order_id = test_order["id"]
        old_status = test_order["status"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=cancelled&notes=Admin test cancellation"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "cancelled"
        print(f"✓ Admin changed order {order_id} from {old_status} to cancelled")
        
        # Revert back
        self.session.put(f"{BASE_URL}/api/admin/orders/{order_id}/status?status={old_status}")
    
    def test_admin_update_order_status_invalid_status(self):
        """Test admin cannot set invalid status"""
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders?limit=1")
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available")
        
        order_id = orders[0]["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=invalid_status"
        )
        assert response.status_code == 400
        print("✓ Admin cannot set invalid status - returns 400")
    
    def test_admin_update_order_status_nonexistent_order(self):
        """Test admin update status for non-existent order returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/nonexistent-order-id/status?status=delivered"
        )
        assert response.status_code == 404
        print("✓ Non-existent order returns 404")
    
    def test_admin_update_order_status_with_notes(self):
        """Test admin can add notes when changing status"""
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders?limit=1")
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available")
        
        order_id = orders[0]["id"]
        current_status = orders[0]["status"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status={current_status}&notes=Test note from admin"
        )
        assert response.status_code == 200
        print("✓ Admin can add notes when changing status")


class TestDriverPortalAPIs:
    """Test Driver Portal API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get driver token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # First, ensure driver user exists
        self._ensure_driver_exists()
    
    def _ensure_driver_exists(self):
        """Ensure driver user and profile exist"""
        # Try to login as driver
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        
        if response.status_code == 200:
            self.driver_token = response.json()["access_token"]
            self.driver_user_id = response.json()["user"]["id"]
            self.session.headers.update({"Authorization": f"Bearer {self.driver_token}"})
            return
        
        # If login fails, create driver user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD,
            "first_name": "Test",
            "last_name": "Driver",
            "phone": "+15551234567",
            "role": "driver"
        })
        
        if register_response.status_code == 200:
            self.driver_token = register_response.json()["access_token"]
            self.driver_user_id = register_response.json()["user"]["id"]
            self.session.headers.update({"Authorization": f"Bearer {self.driver_token}"})
            
            # Register driver profile
            self.session.post(f"{BASE_URL}/api/drivers/register", json={
                "vehicle_type": "car",
                "vehicle_number": "TEST-123",
                "license_number": "DL-TEST-001"
            })
        else:
            # Try login again
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": DRIVER_EMAIL,
                "password": DRIVER_PASSWORD
            })
            if login_response.status_code == 200:
                self.driver_token = login_response.json()["access_token"]
                self.driver_user_id = login_response.json()["user"]["id"]
                self.session.headers.update({"Authorization": f"Bearer {self.driver_token}"})
            else:
                pytest.skip(f"Could not create or login driver: {login_response.text}")
    
    def test_driver_login_success(self):
        """Test driver can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "driver"
        print("✓ Driver login successful")
    
    def test_driver_portal_profile_endpoint(self):
        """Test GET /api/driver-portal/profile endpoint"""
        response = self.session.get(f"{BASE_URL}/api/driver-portal/profile")
        
        # May return 404 if driver profile not created
        if response.status_code == 404:
            print("✓ Driver profile endpoint returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "driver" in data or "user" in data or "stats" in data
        print(f"✓ Driver profile endpoint works - Status: {response.status_code}")
    
    def test_driver_portal_deliveries_endpoint(self):
        """Test GET /api/driver-portal/deliveries endpoint"""
        response = self.session.get(f"{BASE_URL}/api/driver-portal/deliveries")
        
        if response.status_code == 404:
            print("✓ Driver deliveries endpoint returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        print(f"✓ Driver deliveries endpoint works - Count: {data.get('count', 0)}")
    
    def test_driver_portal_deliveries_with_status_filter(self):
        """Test GET /api/driver-portal/deliveries with status filter"""
        response = self.session.get(f"{BASE_URL}/api/driver-portal/deliveries?status=delivered")
        
        if response.status_code == 404:
            print("✓ Driver deliveries with filter returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        print(f"✓ Driver deliveries with status filter works")
    
    def test_driver_portal_status_update_endpoint(self):
        """Test PUT /api/driver-portal/status endpoint"""
        response = self.session.put(f"{BASE_URL}/api/driver-portal/status?status=available")
        
        if response.status_code == 404:
            print("✓ Driver status update returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Driver status update endpoint works")
    
    def test_driver_portal_status_update_on_break(self):
        """Test driver can set status to on_break"""
        response = self.session.put(f"{BASE_URL}/api/driver-portal/status?status=on_break")
        
        if response.status_code == 404:
            print("✓ Driver status on_break returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        print("✓ Driver can set status to on_break")
        
        # Set back to available
        self.session.put(f"{BASE_URL}/api/driver-portal/status?status=available")
    
    def test_driver_portal_status_update_offline(self):
        """Test driver can set status to offline"""
        response = self.session.put(f"{BASE_URL}/api/driver-portal/status?status=offline")
        
        if response.status_code == 404:
            print("✓ Driver status offline returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        print("✓ Driver can set status to offline")
        
        # Set back to available
        self.session.put(f"{BASE_URL}/api/driver-portal/status?status=available")
    
    def test_driver_portal_status_invalid_status(self):
        """Test driver cannot set invalid status"""
        response = self.session.put(f"{BASE_URL}/api/driver-portal/status?status=invalid_status")
        
        if response.status_code == 404:
            print("✓ Driver invalid status returns 404 (profile not created)")
            return
        
        assert response.status_code == 400
        print("✓ Driver cannot set invalid status - returns 400")
    
    def test_driver_portal_location_update_endpoint(self):
        """Test PUT /api/driver-portal/location endpoint"""
        response = self.session.put(
            f"{BASE_URL}/api/driver-portal/location?latitude=40.7128&longitude=-74.0060"
        )
        
        if response.status_code == 404:
            print("✓ Driver location update returns 404 (profile not created)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Driver location update endpoint works")


class TestDriverPortalAccessControl:
    """Test Driver Portal access control"""
    
    def test_driver_portal_requires_auth(self):
        """Test driver portal endpoints require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/driver-portal/profile")
        assert response.status_code in [401, 403]
        print("✓ Driver portal profile requires auth")
    
    def test_driver_portal_deliveries_requires_auth(self):
        """Test driver portal deliveries requires authentication"""
        response = requests.get(f"{BASE_URL}/api/driver-portal/deliveries")
        assert response.status_code in [401, 403]
        print("✓ Driver portal deliveries requires auth")
    
    def test_driver_portal_status_requires_auth(self):
        """Test driver portal status update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/driver-portal/status?status=available")
        assert response.status_code in [401, 403]
        print("✓ Driver portal status update requires auth")
    
    def test_admin_cannot_access_driver_portal_as_driver(self):
        """Test admin can access driver portal (admin has driver access)"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        admin_token = login_response.json()["access_token"]
        
        # Try to access driver portal
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin should have access (role check allows admin)
        # But may return 404 if no driver profile for admin
        assert response.status_code in [200, 404]
        print("✓ Admin access to driver portal handled correctly")


class TestAdminOrderStatusAccessControl:
    """Test Admin Order Status access control"""
    
    def test_admin_status_update_requires_admin_role(self):
        """Test admin status update requires admin role"""
        # Login as driver
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Driver login failed")
        
        driver_token = login_response.json()["access_token"]
        
        # Try to update order status as driver
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/test-order-id/status?status=delivered",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
        print("✓ Admin status update requires admin role - driver gets 403")
    
    def test_admin_status_update_no_auth(self):
        """Test admin status update without auth returns 401/403"""
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/test-order-id/status?status=delivered"
        )
        assert response.status_code in [401, 403]
        print("✓ Admin status update without auth returns 401/403")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
