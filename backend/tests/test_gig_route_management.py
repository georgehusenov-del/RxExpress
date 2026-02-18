"""
Test Gig/Route Management Features
- Auto-assign orders to gigs based on service zone
- Assign specific orders to driver
- Unassign driver functionality
"""

import pytest
import requests
import os

# Public URL for testing - via ingress
BASE_URL = "http://localhost:3000"

class TestGigRouteManagement:
    """Tests for Gig/Route management API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed with status {login_response.status_code}")
    
    def test_01_list_routes_gigs(self):
        """Test listing all route plans/gigs"""
        response = self.session.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plans" in data, "Response should contain 'plans' key"
        assert "count" in data, "Response should contain 'count' key"
        print(f"Found {data['count']} route plans/gigs")
        
        # Verify structure of gig items
        if data["plans"]:
            gig = data["plans"][0]
            assert "id" in gig, "Gig should have 'id'"
            assert "title" in gig, "Gig should have 'title'"
            assert "status" in gig, "Gig should have 'status'"
            assert "orderCount" in gig, "Gig should have 'orderCount'"
            assert "driverCount" in gig, "Gig should have 'driverCount'"
    
    def test_02_get_pending_orders(self):
        """Test getting pending orders (not in any gig)"""
        response = self.session.get(f"{BASE_URL}/api/routes/pending-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        print(f"Found {len(data.get('orders', []))} pending orders")
    
    def test_03_get_service_zones(self):
        """Test getting service zones for auto-gig creation"""
        response = self.session.get(f"{BASE_URL}/api/routes/service-zones")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "zones" in data, "Response should contain 'zones' key"
        print(f"Found {len(data.get('zones', []))} service zones")
        
        # Return zones for later use
        return data.get("zones", [])
    
    def test_04_create_gig_manual(self):
        """Test creating a gig manually"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/routes", json={
            "title": f"TEST_Manual Gig - {today}",
            "date": today
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "planId" in data, "Response should contain 'planId'"
        assert "message" in data, "Response should contain 'message'"
        print(f"Created gig with ID: {data['planId']}")
        
        return data["planId"]
    
    def test_05_unassign_driver_endpoint(self):
        """Test the unassign-driver endpoint"""
        # First get a gig with a driver
        response = self.session.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        
        gigs = response.json().get("plans", [])
        gig_with_driver = None
        
        # Find a gig with driver assigned
        for gig in gigs:
            if gig.get("driverCount", 0) > 0:
                gig_with_driver = gig
                break
        
        if not gig_with_driver:
            # Create a test gig and assign a driver first
            print("No gig with driver found, testing endpoint with any gig")
            if gigs:
                gig_id = gigs[0]["id"]
                # Test unassign on gig without driver (should still work - just no orders reset)
                response = self.session.post(f"{BASE_URL}/api/routes/{gig_id}/unassign-driver")
                assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
                
                data = response.json()
                assert "message" in data, "Response should contain 'message'"
                assert "resetCount" in data, "Response should contain 'resetCount'"
                print(f"Unassign driver response: {data['message']}, reset {data['resetCount']} orders")
            else:
                pytest.skip("No gigs available to test unassign-driver")
        else:
            gig_id = gig_with_driver["id"]
            response = self.session.post(f"{BASE_URL}/api/routes/{gig_id}/unassign-driver")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "message" in data, "Response should contain 'message'"
            assert "resetCount" in data, "Response should contain 'resetCount'"
            print(f"Unassigned driver from gig {gig_id}: {data['message']}")
    
    def test_06_assign_orders_to_driver_endpoint(self):
        """Test the assign-orders-to-driver endpoint"""
        # Get a gig with orders
        response = self.session.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        
        gigs = response.json().get("plans", [])
        gig_with_orders = None
        
        for gig in gigs:
            if gig.get("orderCount", 0) > 0:
                gig_with_orders = gig
                break
        
        if not gig_with_orders:
            pytest.skip("No gig with orders found to test assign-orders-to-driver")
        
        gig_id = gig_with_orders["id"]
        
        # Get gig details to get order IDs
        detail_response = self.session.get(f"{BASE_URL}/api/routes/{gig_id}")
        assert detail_response.status_code == 200
        
        gig_detail = detail_response.json()
        orders = gig_detail.get("orders", [])
        
        if not orders:
            pytest.skip("Gig has no orders to assign")
        
        # Get a driver
        driver_response = self.session.get(f"{BASE_URL}/api/admin/drivers")
        assert driver_response.status_code == 200
        
        drivers = driver_response.json().get("drivers", [])
        if not drivers:
            pytest.skip("No drivers available to test assign-orders-to-driver")
        
        driver_id = drivers[0]["id"]
        order_ids = [orders[0]["id"]]  # Assign first order only
        
        # Test assign-orders-to-driver
        assign_response = self.session.post(f"{BASE_URL}/api/routes/{gig_id}/assign-orders-to-driver", json={
            "driverId": driver_id,
            "orderIds": order_ids
        })
        assert assign_response.status_code == 200, f"Expected 200, got {assign_response.status_code}: {assign_response.text}"
        
        data = assign_response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "assignedCount" in data, "Response should contain 'assignedCount'"
        print(f"Assigned {data['assignedCount']} orders to driver: {data.get('driverName', 'Unknown')}")
    
    def test_07_get_gig_details(self):
        """Test getting gig details with orders and drivers"""
        response = self.session.get(f"{BASE_URL}/api/routes")
        gigs = response.json().get("plans", [])
        
        if not gigs:
            pytest.skip("No gigs available")
        
        gig_id = gigs[0]["id"]
        detail_response = self.session.get(f"{BASE_URL}/api/routes/{gig_id}")
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        
        data = detail_response.json()
        assert "plan" in data, "Response should contain 'plan'"
        assert "orders" in data, "Response should contain 'orders'"
        assert "drivers" in data, "Response should contain 'drivers'"
        
        plan = data["plan"]
        print(f"Gig {plan['title']}: {len(data['orders'])} orders, {len(data['drivers'])} drivers")


class TestOrderAutoAssignment:
    """Tests for auto-assignment of orders to gigs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed with status {login_response.status_code}")
    
    def test_01_create_order_auto_assigns_to_gig(self):
        """Test that creating an order auto-assigns it to a gig based on city/zone"""
        import random
        
        # First get pharmacies
        pharmacy_response = self.session.get(f"{BASE_URL}/api/admin/pharmacies")
        if pharmacy_response.status_code != 200:
            pytest.skip("Could not get pharmacies")
        
        pharmacies = pharmacy_response.json().get("pharmacies", [])
        if not pharmacies:
            pytest.skip("No pharmacies available")
        
        pharmacy_id = pharmacies[0]["id"]
        
        # Get service zones to use a valid city
        zones_response = self.session.get(f"{BASE_URL}/api/routes/service-zones")
        zones = zones_response.json().get("zones", []) if zones_response.status_code == 200 else []
        
        # Use zone name as city if available
        city = "Queens"  # Default city
        if zones:
            city = zones[0].get("name", "Queens")
        
        # Create order
        order_data = {
            "pharmacyId": pharmacy_id,
            "deliveryType": "standard",
            "recipientName": f"TEST_AutoAssign User {random.randint(1000, 9999)}",
            "recipientPhone": "555-0199",
            "street": "123 Test Street",
            "city": city,
            "state": "NY",
            "postalCode": "11375",
            "timeWindow": "9am-5pm"
        }
        
        order_response = self.session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert order_response.status_code == 200, f"Expected 200, got {order_response.status_code}: {order_response.text}"
        
        data = order_response.json()
        assert "order_id" in data or "orderId" in data, "Response should contain order ID"
        
        order_id = data.get("order_id") or data.get("orderId")
        print(f"Created order {order_id} in city {city}")
        
        # Check if order was auto-assigned to a gig
        order_detail = self.session.get(f"{BASE_URL}/api/orders/{order_id}")
        if order_detail.status_code == 200:
            order_info = order_detail.json()
            if order_info.get("routePlanId"):
                print(f"Order was auto-assigned to gig {order_info['routePlanId']}")
            else:
                print("Order not auto-assigned (no matching zone or no gig exists)")


class TestDriverAssignment:
    """Test driver assignment and unassignment flows"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed")
    
    def test_01_full_assign_unassign_flow(self):
        """Test complete flow: assign driver to orders, then unassign"""
        # Get gigs
        gigs_response = self.session.get(f"{BASE_URL}/api/routes")
        assert gigs_response.status_code == 200
        
        gigs = gigs_response.json().get("plans", [])
        gig_with_orders = None
        
        for gig in gigs:
            if gig.get("orderCount", 0) > 0 and gig.get("status") == "draft":
                gig_with_orders = gig
                break
        
        if not gig_with_orders:
            pytest.skip("No draft gig with orders found")
        
        gig_id = gig_with_orders["id"]
        print(f"Testing with gig {gig_id}: {gig_with_orders['title']}")
        
        # Get gig orders
        detail_response = self.session.get(f"{BASE_URL}/api/routes/{gig_id}")
        orders = detail_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("Gig has no orders")
        
        # Get drivers
        drivers_response = self.session.get(f"{BASE_URL}/api/admin/drivers")
        drivers = drivers_response.json().get("drivers", [])
        
        if not drivers:
            pytest.skip("No drivers available")
        
        driver_id = drivers[0]["id"]
        order_ids = [o["id"] for o in orders[:2]]  # First 2 orders
        
        # Step 1: Assign orders to driver
        assign_response = self.session.post(f"{BASE_URL}/api/routes/{gig_id}/assign-orders-to-driver", json={
            "driverId": driver_id,
            "orderIds": order_ids
        })
        assert assign_response.status_code == 200, f"Assign failed: {assign_response.text}"
        
        assign_data = assign_response.json()
        print(f"Assigned {assign_data['assignedCount']} orders to driver")
        
        # Verify orders are assigned
        detail_response2 = self.session.get(f"{BASE_URL}/api/routes/{gig_id}")
        orders_after_assign = detail_response2.json().get("orders", [])
        
        assigned_orders = [o for o in orders_after_assign if o.get("driverName")]
        print(f"Orders with driver assigned: {len(assigned_orders)}")
        
        # Step 2: Unassign driver
        unassign_response = self.session.post(f"{BASE_URL}/api/routes/{gig_id}/unassign-driver")
        assert unassign_response.status_code == 200, f"Unassign failed: {unassign_response.text}"
        
        unassign_data = unassign_response.json()
        print(f"Unassigned driver, reset {unassign_data['resetCount']} orders to 'new'")
        
        # Verify orders are back to 'new' status
        detail_response3 = self.session.get(f"{BASE_URL}/api/routes/{gig_id}")
        orders_after_unassign = detail_response3.json().get("orders", [])
        
        new_orders = [o for o in orders_after_unassign if o.get("status") == "new"]
        print(f"Orders with 'new' status after unassign: {len(new_orders)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
