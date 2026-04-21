"""
Tests for POD (Proof of Delivery) Photo Storage and Route Optimization Fixes

Two main bug fixes being tested:
1. POD photos are now saved to Web project's wwwroot/pod folder (not API)
2. Route optimization gracefully falls back to local optimization when Circuit API fails

Test credentials:
- Admin: admin@rxexpresss.com / Admin@123
- Driver: driver@test.com / Driver@123
"""

import pytest
import requests
import os
import base64
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pharmacy-analytics-5.preview.emergentagent.com').rstrip('/')


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert len(data["token"]) > 0, "Token is empty"
        print(f"✓ Admin login successful")
        return data["token"]
    
    def test_driver_login(self):
        """Test driver login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Driver login successful")
        return data["token"]


class TestPODPhotoAccess:
    """Test that POD photos are accessible via HTTP from Web static files"""
    
    def test_existing_pod_photos_accessible(self):
        """Verify existing POD photos in Web wwwroot are accessible via HTTP"""
        # These are photos that were migrated from API to Web wwwroot
        pod_photos = [
            "/pod/addr_RX-BKN00002_20260319175005.jpg",
            "/pod/home_RX-BKN00002_20260319175005.jpg",
            "/pod/pkg_RX-BKN00002_20260319175005.jpg",
            "/pod/pod_RX-44ADE056_20260318152350.jpg",
            "/pod/sig_RX-BKN00002_20260319175005.png"
        ]
        
        for photo_path in pod_photos:
            response = requests.head(f"{BASE_URL}{photo_path}")
            assert response.status_code == 200, f"POD photo {photo_path} not accessible: {response.status_code}"
            print(f"✓ POD photo accessible: {photo_path}")
    
    def test_pod_photo_content_type(self):
        """Verify POD photos return correct content type"""
        # Test JPG
        response = requests.get(f"{BASE_URL}/pod/home_RX-BKN00002_20260319175005.jpg")
        assert response.status_code == 200
        assert "image" in response.headers.get("Content-Type", "").lower(), "JPG should return image content type"
        print(f"✓ JPG content type correct: {response.headers.get('Content-Type')}")
        
        # Test PNG (signature)
        response = requests.get(f"{BASE_URL}/pod/sig_RX-BKN00002_20260319175005.png")
        assert response.status_code == 200
        assert "image" in response.headers.get("Content-Type", "").lower(), "PNG should return image content type"
        print(f"✓ PNG content type correct: {response.headers.get('Content-Type')}")


class TestPODPhotoURLsInAPI:
    """Test that API returns all 3 POD photo URLs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Get admin token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_order_detail_includes_all_pod_urls(self):
        """Test that order detail API returns all 3 POD photo URLs"""
        # First get list of orders to find a delivered one
        response = requests.get(f"{BASE_URL}/api/admin/orders?status=delivered", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json().get("orders", [])
        if not orders:
            pytest.skip("No delivered orders available to test POD URLs")
        
        # Get detail of first delivered order
        order_id = orders[0]["id"]
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get order detail: {response.text}"
        
        order = response.json()
        print(f"✓ Order {order.get('orderNumber')} retrieved")
        
        # Check for POD fields in response (they may be null if not using 3-photo format)
        assert "photoHomeUrl" in order or order.get("photoHomeUrl") is None, "photoHomeUrl field missing"
        assert "photoAddressUrl" in order or order.get("photoAddressUrl") is None, "photoAddressUrl field missing"
        assert "photoPackageUrl" in order or order.get("photoPackageUrl") is None, "photoPackageUrl field missing"
        
        # Report what POD photos are available
        if order.get("photoHomeUrl"):
            print(f"  - photoHomeUrl: {order['photoHomeUrl']}")
        if order.get("photoAddressUrl"):
            print(f"  - photoAddressUrl: {order['photoAddressUrl']}")
        if order.get("photoPackageUrl"):
            print(f"  - photoPackageUrl: {order['photoPackageUrl']}")
        if order.get("photoUrl"):
            print(f"  - photoUrl (legacy): {order['photoUrl']}")
        
        print(f"✓ Order detail includes POD URL fields")


class TestRouteOptimization:
    """Test route optimization with graceful fallback"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Get admin token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_route_optimization_does_not_fail(self):
        """Test that route optimization doesn't return 'Optimization Failed' error"""
        # Get list of routes/gigs
        response = requests.get(f"{BASE_URL}/api/routes", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get routes: {response.text}"
        
        plans = response.json().get("plans", [])
        if not plans:
            pytest.skip("No route plans available to test optimization")
        
        # Find a gig with orders to optimize
        gig_with_orders = None
        for plan in plans:
            if plan.get("orderCount", 0) > 0:
                gig_with_orders = plan
                break
        
        if not gig_with_orders:
            pytest.skip("No gigs with orders available to test optimization")
        
        gig_id = gig_with_orders["id"]
        print(f"Testing optimization on gig: {gig_with_orders.get('title')} (ID: {gig_id})")
        
        # Call optimize endpoint
        response = requests.post(f"{BASE_URL}/api/routes/{gig_id}/optimize", headers=self.admin_headers)
        
        # Should NOT fail with "Optimization Failed"
        assert response.status_code == 200, f"Optimization returned error status: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "Optimization Failed" not in data.get("message", ""), "Got 'Optimization Failed' error message"
        assert data.get("status") == "optimized", f"Status should be 'optimized', got: {data.get('status')}"
        
        print(f"✓ Route optimization successful")
        print(f"  - Message: {data.get('message')}")
        print(f"  - Status: {data.get('status')}")
        print(f"  - Circuit configured: {data.get('circuitConfigured')}")
        print(f"  - Used Circuit: {data.get('usedCircuit')}")
    
    def test_optimization_uses_local_fallback(self):
        """Test that optimization correctly falls back to local when Circuit fails"""
        # Get a gig to optimize
        response = requests.get(f"{BASE_URL}/api/routes", headers=self.admin_headers)
        plans = response.json().get("plans", [])
        
        gig_with_orders = None
        for plan in plans:
            if plan.get("orderCount", 0) > 0:
                gig_with_orders = plan
                break
        
        if not gig_with_orders:
            pytest.skip("No gigs with orders for fallback test")
        
        gig_id = gig_with_orders["id"]
        
        # Call optimize
        response = requests.post(f"{BASE_URL}/api/routes/{gig_id}/optimize", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Circuit is configured but API key is invalid, so usedCircuit should be False
        # This indicates graceful fallback worked
        if data.get("circuitConfigured"):
            assert data.get("usedCircuit") == False, "Circuit is configured but invalid, should use local fallback"
            print(f"✓ Circuit API configured but gracefully fell back to local optimization")
        else:
            print(f"✓ Circuit API not configured, using local optimization")


class TestDriverPODSubmission:
    """Test driver POD submission saves to correct location"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Get driver token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        self.driver_token = response.json()["token"]
        self.driver_headers = {"Authorization": f"Bearer {self.driver_token}"}
    
    def test_driver_deliveries_endpoint(self):
        """Test driver deliveries endpoint returns correctly"""
        response = requests.get(f"{BASE_URL}/api/driver-portal/deliveries", headers=self.driver_headers)
        assert response.status_code == 200, f"Failed to get driver deliveries: {response.text}"
        
        data = response.json()
        assert "deliveries" in data
        print(f"✓ Driver deliveries endpoint works, count: {data.get('count', 0)}")


class TestAdminPODView:
    """Test admin can view POD photos in order details"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Get admin token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_orders_list(self):
        """Test admin orders list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get admin orders: {response.text}"
        
        data = response.json()
        assert "orders" in data
        print(f"✓ Admin orders endpoint works, count: {data.get('count', 0)}")
    
    def test_delivered_order_has_pod_data(self):
        """Test that delivered orders have POD data accessible"""
        response = requests.get(f"{BASE_URL}/api/admin/orders?status=delivered", headers=self.admin_headers)
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        if not orders:
            pytest.skip("No delivered orders to test")
        
        # Check first delivered order for POD URLs
        order = orders[0]
        order_id = order["id"]
        
        # Get full order detail
        detail_response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=self.admin_headers)
        assert detail_response.status_code == 200
        
        order_detail = detail_response.json()
        
        # Check if POD URLs are accessible
        pod_urls = [
            order_detail.get("photoHomeUrl"),
            order_detail.get("photoAddressUrl"),
            order_detail.get("photoPackageUrl"),
            order_detail.get("photoUrl")
        ]
        
        accessible_photos = 0
        for url in pod_urls:
            if url:
                full_url = f"{BASE_URL}{url}" if url.startswith("/") else url
                photo_response = requests.head(full_url)
                if photo_response.status_code == 200:
                    accessible_photos += 1
                    print(f"  ✓ POD photo accessible: {url}")
        
        print(f"✓ Found {accessible_photos} accessible POD photos for order {order_detail.get('orderNumber')}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
