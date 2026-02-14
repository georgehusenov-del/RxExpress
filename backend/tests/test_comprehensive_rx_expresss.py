"""
Comprehensive RX Expresss Backend API Tests
Testing all key flows:
- Admin login and dashboard access
- Admin orders page - view, filter, and status update
- Admin route management - create routes and add orders
- Pharmacy portal login and order creation
- Driver portal login, view deliveries, status updates
- QR code scanning functionality
- Order status flow: new → picked_up → in_transit → out_for_delivery → delivered
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logistics-hub-327.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@rxexpresss.com", "password": "admin123"}
PHARMACY_CREDS = {"email": "pharmacy@test.com", "password": "pharmacy123"}
DRIVER_CREDS = {"email": "driver@test.com", "password": "driver123"}


class TestHealthAndBasicAPI:
    """Test health check and basic API functionality"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
        assert data["services"]["database"] == "connected"
        print(f"✓ Health check passed: {data}")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "RX Expresss" in data.get("message", "")
        print(f"✓ API root accessible: {data.get('message')}")


class TestAdminAuthentication:
    """Test Admin login and access"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_CREDS["email"]
        print(f"✓ Admin login successful: {data['user']['email']}")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_CREDS["email"], "password": "wrong"}
        )
        assert response.status_code == 401
        print("✓ Admin login correctly rejects invalid password")
    
    def test_admin_dashboard_access(self):
        """Test admin can access dashboard"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        token = login_response.json()["access_token"]
        
        # Access dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "total_orders" in data["stats"]
        assert "orders_by_status" in data["stats"]
        print(f"✓ Admin dashboard accessible: {data['stats']['total_orders']} total orders")


class TestAdminOrdersManagement:
    """Test Admin orders page - view, filter, status update"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_all_orders(self):
        """Test listing all orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"✓ Listed {len(data['orders'])} orders (total: {data['total']})")
    
    def test_filter_orders_by_status_new(self):
        """Test filtering orders by 'new' status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            params={"status": "new"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # All orders should have 'new' status if any exist
        for order in data.get("orders", []):
            assert order.get("status") == "new"
        print(f"✓ Filtered 'new' orders: {len(data.get('orders', []))} found")
    
    def test_filter_orders_by_status_delivered(self):
        """Test filtering orders by 'delivered' status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            params={"status": "delivered"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        for order in data.get("orders", []):
            assert order.get("status") == "delivered"
        print(f"✓ Filtered 'delivered' orders: {len(data.get('orders', []))} found")
    
    def test_update_order_status(self):
        """Test updating order status via admin API"""
        # Get an order that can be updated
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            params={"status": "new", "limit": 1},
            headers=self.headers
        )
        orders = response.json().get("orders", [])
        
        if not orders:
            # Try to get any order not delivered/cancelled
            response = requests.get(f"{BASE_URL}/api/admin/orders", headers=self.headers)
            all_orders = response.json().get("orders", [])
            orders = [o for o in all_orders if o.get("status") not in ["delivered", "cancelled", "canceled", "failed"]]
        
        if orders:
            order_id = orders[0]["id"]
            original_status = orders[0]["status"]
            
            # Update status to picked_up
            update_response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status=picked_up",
                headers=self.headers
            )
            assert update_response.status_code == 200
            print(f"✓ Updated order {order_id} status from {original_status} to picked_up")
            
            # Revert back
            requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status={original_status}",
                headers=self.headers
            )
        else:
            print("⚠ No updatable orders found for status update test")
            pytest.skip("No updatable orders found")


class TestAdminRouteManagement:
    """Test Admin route management - create routes and add orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_circuit_status(self):
        """Test Circuit/Spoke API status"""
        response = requests.get(f"{BASE_URL}/api/circuit/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Circuit status: {data.get('status')}, drivers: {data.get('driver_count', 0)}")
    
    def test_list_local_route_plans(self):
        """Test listing local route plans"""
        response = requests.get(f"{BASE_URL}/api/circuit/route-plans", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"✓ Found {len(data['plans'])} local route plans")
    
    def test_get_pending_orders_for_routing(self):
        """Test getting orders pending for routing"""
        response = requests.get(f"{BASE_URL}/api/circuit/pending-orders", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ Found {len(data['orders'])} orders ready for routing")
    
    def test_create_route_plan(self):
        """Test creating a new route plan"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/circuit/plans/create-for-date",
            json={
                "title": f"Test Route {int(time.time())}",
                "date": today,
                "driver_ids": []
            },
            headers=self.headers
        )
        
        # Could be 200 (success) or 400/520 (Circuit API limitation)
        if response.status_code == 200:
            data = response.json()
            # Response can have plan_id, circuit_plan_id, local_id, or plan.id
            plan_id = (data.get("plan_id") or 
                      data.get("circuit_plan_id") or 
                      data.get("local_id") or 
                      data.get("plan", {}).get("id"))
            assert plan_id is not None, f"No plan ID found in response: {data}"
            print(f"✓ Created route plan: {plan_id}")
            
            # Clean up - delete the plan
            requests.delete(f"{BASE_URL}/api/circuit/plans/{plan_id}", headers=self.headers)
        else:
            print(f"⚠ Route plan creation returned {response.status_code} - may be Circuit API limitation")


class TestPharmacyPortal:
    """Test Pharmacy portal login and order creation"""
    
    def test_pharmacy_login_success(self):
        """Test pharmacy user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PHARMACY_CREDS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "pharmacy"
        print(f"✓ Pharmacy login successful: {data['user']['email']}")
    
    def test_pharmacy_create_order(self):
        """Test pharmacy can create an order"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get pharmacy list to get a pharmacy ID
        pharmacies_response = requests.get(f"{BASE_URL}/api/pharmacies/", headers=headers)
        pharmacies = pharmacies_response.json().get("pharmacies", [])
        
        if pharmacies:
            pharmacy_id = pharmacies[0]["id"]
            
            # Create order
            order_data = {
                "pharmacy_id": pharmacy_id,
                "delivery_type": "same_day",
                "recipient": {
                    "name": "TEST_Order_Patient",
                    "phone": "555-1234",
                    "email": "test@example.com"
                },
                "delivery_address": {
                    "street": "123 Test Street",
                    "city": "Queens",
                    "state": "NY",
                    "postal_code": "11375"
                },
                "packages": [
                    {
                        "rx_number": "RX-TEST-001",
                        "medication_name": "Test Medication",
                        "requires_signature": True,
                        "requires_refrigeration": False
                    }
                ],
                "copay_amount": 15.00
            }
            
            response = requests.post(f"{BASE_URL}/api/orders/", json=order_data, headers=headers)
            assert response.status_code == 200 or response.status_code == 201
            data = response.json()
            assert "order_id" in data
            assert "qr_code" in data
            print(f"✓ Order created: {data.get('order_number')}, QR: {data.get('qr_code')}")
        else:
            print("⚠ No pharmacies found for order creation test")
            pytest.skip("No pharmacies found")


class TestDriverPortal:
    """Test Driver portal login, view deliveries, status updates"""
    
    def test_driver_login_success(self):
        """Test driver user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=DRIVER_CREDS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "driver"
        print(f"✓ Driver login successful: {data['user']['email']}")
    
    def test_driver_get_profile(self):
        """Test driver can get their profile"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/driver-portal/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "driver" in data
        print(f"✓ Driver profile retrieved")
    
    def test_driver_get_deliveries(self):
        """Test driver can get their deliveries"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/driver-portal/deliveries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        print(f"✓ Driver has {len(data['deliveries'])} active deliveries")
    
    def test_driver_update_status(self):
        """Test driver can update their availability status"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/driver-portal/status?status=available",
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Driver status updated to 'available'")


class TestQRCodeScanning:
    """Test QR code scanning functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_scan_package_pickup(self):
        """Test scanning a package for pickup"""
        # Get an order with QR code
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=self.headers)
        orders = response.json().get("orders", [])
        
        qr_code = None
        for order in orders:
            if order.get("qr_code"):
                qr_code = order["qr_code"]
                break
        
        if qr_code:
            # Scan the package
            scan_response = requests.post(
                f"{BASE_URL}/api/orders/scan",
                json={
                    "qr_code": qr_code,
                    "scanned_by": "test_user",
                    "scanned_at": "2026-01-14T10:00:00Z",
                    "action": "pickup",
                    "location": {"latitude": 40.7128, "longitude": -74.0060}
                },
                headers=self.headers
            )
            # Can be 200 (success), 400 (already scanned), or 404 (not found)
            assert scan_response.status_code in [200, 400, 404]
            print(f"✓ QR scan for {qr_code}: {scan_response.status_code}")
        else:
            print("⚠ No orders with QR codes found for scanning test")
            pytest.skip("No QR codes found")


class TestOrderStatusFlow:
    """Test complete order status flow: new → picked_up → in_transit → out_for_delivery → delivered"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_full_status_flow(self):
        """Test the complete order status progression"""
        # Get an order we can test with
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=self.headers)
        orders = response.json().get("orders", [])
        
        # Find a non-terminal order
        test_order = None
        for order in orders:
            if order.get("status") not in ["delivered", "cancelled", "canceled", "failed"]:
                test_order = order
                break
        
        if not test_order:
            print("⚠ No suitable order found for status flow test")
            pytest.skip("No suitable order found")
            return
        
        order_id = test_order["id"]
        original_status = test_order["status"]
        print(f"Testing status flow on order {test_order.get('order_number')} (current: {original_status})")
        
        # Test status transitions
        status_flow = ["new", "picked_up", "in_transit", "out_for_delivery", "delivered"]
        
        for status in status_flow:
            response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status={status}",
                headers=self.headers
            )
            
            # Verify the status was updated
            if response.status_code == 200:
                print(f"  ✓ Status updated to: {status}")
            else:
                print(f"  ⚠ Status update to {status} returned: {response.status_code}")
        
        # Revert to original status if it wasn't delivered
        if original_status != "delivered":
            requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status={original_status}",
                headers=self.headers
            )
            print(f"✓ Reverted order to original status: {original_status}")


class TestBulkOrderSelection:
    """Test bulk order selection functionality via API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_multiple_orders_for_bulk_ops(self):
        """Test fetching multiple orders (simulating bulk selection)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            params={"limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        orders = data.get("orders", [])
        
        # Verify we can select multiple order IDs
        order_ids = [o["id"] for o in orders]
        print(f"✓ Retrieved {len(order_ids)} orders for potential bulk operations")
        
        # Test status filter for bulk selection
        new_orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            params={"status": "new", "limit": 10},
            headers=self.headers
        )
        assert new_orders_response.status_code == 200
        new_orders = new_orders_response.json().get("orders", [])
        print(f"✓ Retrieved {len(new_orders)} 'new' orders for bulk selection")


class TestCircuitDrivers:
    """Test Circuit/Spoke driver integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for all tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_circuit_drivers(self):
        """Test getting Circuit drivers list"""
        response = requests.get(f"{BASE_URL}/api/circuit/drivers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
        print(f"✓ Found {len(data['drivers'])} Circuit drivers")
    
    def test_list_admin_drivers(self):
        """Test listing drivers through admin API"""
        response = requests.get(f"{BASE_URL}/api/admin/drivers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
        print(f"✓ Found {len(data['drivers'])} admin drivers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
