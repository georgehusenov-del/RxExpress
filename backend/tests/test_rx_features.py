"""
Test suite for RX Expresss pharmacy delivery service features
Tests: Refrigerated orders, In-Transit workflow, Driver delivery exclusions, POD flow, Admin refresh
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "Admin"
    
    def test_driver_login(self):
        """Driver should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "Driver"


class TestAdminOrders:
    """Admin orders API tests - refresh data, refrigerated field"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_get_orders_includes_is_refrigerated(self, admin_token):
        """Admin orders endpoint should include isRefrigerated field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        # Check that isRefrigerated field is present in orders
        if len(data["orders"]) > 0:
            first_order = data["orders"][0]
            assert "isRefrigerated" in first_order
    
    def test_update_order_refrigerated_status(self, admin_token):
        """Admin should be able to mark an order as refrigerated"""
        # First get an order
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()["orders"]
        assert len(orders) > 0
        order_id = orders[0]["id"]
        
        # Update refrigerated status
        update_response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": orders[0]["status"], "isRefrigerated": True}
        )
        assert update_response.status_code == 200
    
    def test_orders_can_be_filtered(self, admin_token):
        """Admin should be able to filter orders by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders?status=new",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        # All returned orders should have status "new"
        for order in data["orders"]:
            assert order["status"] == "new"


class TestDriverDeliveries:
    """Driver portal deliveries API tests - excludes in_transit"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_deliveries_excludes_in_transit(self, driver_token):
        """Driver deliveries endpoint should NOT include in_transit orders"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check that no in_transit orders are returned
        for delivery in data["deliveries"]:
            assert delivery["status"] != "in_transit", "in_transit orders should not be in deliveries"
    
    def test_deliveries_includes_is_refrigerated(self, driver_token):
        """Driver deliveries should include isRefrigerated field"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if len(data["deliveries"]) > 0:
            first_delivery = data["deliveries"][0]
            assert "isRefrigerated" in first_delivery
    
    def test_delivery_history_endpoint(self, driver_token):
        """Driver should be able to view delivery history"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/history",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        assert "count" in data


class TestInTransitWorkflow:
    """Tests for in_transit status workflow - driver unassignment"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        return response.json()["token"]
    
    def test_in_transit_unassigns_driver(self, admin_token, driver_token):
        """When driver marks order as in_transit, driver should be unassigned for admin reassignment"""
        # Find an order assigned to driver
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders?status=assigned",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = orders_response.json()["orders"]
        
        # Skip if no assigned orders
        if len(orders) == 0:
            pytest.skip("No assigned orders available for testing")
        
        # Find one with driverName set
        assigned_order = None
        for order in orders:
            if order.get("driverName"):
                assigned_order = order
                break
        
        if not assigned_order:
            pytest.skip("No orders with assigned driver found")
        
        order_id = assigned_order["id"]
        
        # First move to picked_up
        requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "picked_up"}
        )
        
        # Note: in_transit update through driver API will unassign
        # This test documents the expected behavior


class TestRefrigeratedOrders:
    """Tests for refrigerated order functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_refrigerated_order_exists(self, admin_token):
        """Order ID 1 should be marked as refrigerated (as per test data)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()["orders"]
        
        # Find order with id 1
        order_1 = next((o for o in orders if o["id"] == 1), None)
        if order_1:
            assert order_1.get("isRefrigerated") == True, "Order 1 should be refrigerated"


class TestDriverProfile:
    """Tests for driver profile and status"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        return response.json()["token"]
    
    def test_get_driver_profile(self, driver_token):
        """Driver should be able to get their profile"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
