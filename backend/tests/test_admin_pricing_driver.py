"""
Test suite for Admin Pricing CRUD and Create Driver endpoints
Tests:
- Admin Create Driver endpoint (POST /api/admin/drivers with query params)
- Admin Pricing CRUD (GET/POST/PUT/DELETE /api/admin/pricing)
- Admin Order Status Control (PUT /api/admin/orders/{order_id}/status)
- Toggle pricing active/inactive
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminCreateDriver:
    """Test Admin Create Driver endpoint - POST /api/admin/drivers with query params"""
    
    def test_create_driver_success(self, admin_headers):
        """Test creating a new driver via admin endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        driver_data = {
            "email": f"TEST_driver_{unique_id}@test.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": f"Driver{unique_id}",
            "phone": "+1234567890",
            "vehicle_type": "car",
            "vehicle_number": f"TEST-{unique_id}",
            "license_number": f"LIC-{unique_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/drivers",
            params=driver_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Create driver failed: {response.text}"
        data = response.json()
        assert "driver_id" in data
        assert "user_id" in data
        assert data["message"] == "Driver created successfully"
        print(f"✓ Driver created successfully: {data['driver_id']}")
        
        # Store for cleanup
        return data
    
    def test_create_driver_duplicate_email(self, admin_headers):
        """Test creating driver with duplicate email fails"""
        # First create a driver
        unique_id = str(uuid.uuid4())[:8]
        driver_data = {
            "email": f"TEST_dup_{unique_id}@test.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "Duplicate",
            "phone": "+1234567890",
            "vehicle_type": "car",
            "vehicle_number": f"DUP-{unique_id}",
            "license_number": f"DUP-{unique_id}"
        }
        
        # Create first driver
        response1 = requests.post(
            f"{BASE_URL}/api/admin/drivers",
            params=driver_data,
            headers=admin_headers
        )
        assert response1.status_code == 200
        
        # Try to create with same email
        response2 = requests.post(
            f"{BASE_URL}/api/admin/drivers",
            params=driver_data,
            headers=admin_headers
        )
        assert response2.status_code == 400
        assert "already registered" in response2.json().get("detail", "").lower()
        print(f"✓ Duplicate email correctly rejected")
    
    def test_create_driver_without_auth(self):
        """Test creating driver without auth fails"""
        driver_data = {
            "email": "noauth@test.com",
            "password": "testpass123",
            "first_name": "No",
            "last_name": "Auth",
            "phone": "+1234567890",
            "vehicle_type": "car",
            "vehicle_number": "NOAUTH-123",
            "license_number": "NOAUTH-123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/drivers",
            params=driver_data
        )
        assert response.status_code in [401, 403]
        print(f"✓ Unauthorized request correctly rejected")


class TestAdminPricingCRUD:
    """Test Admin Pricing CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_headers):
        """Store admin headers for all tests"""
        self.headers = admin_headers
        self.created_pricing_ids = []
    
    def test_get_pricing_list(self, admin_headers):
        """Test GET /api/admin/pricing - List all pricing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pricing",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "pricing" in data
        assert "count" in data
        assert isinstance(data["pricing"], list)
        print(f"✓ GET pricing list successful - {data['count']} items")
    
    def test_get_pricing_with_inactive(self, admin_headers):
        """Test GET /api/admin/pricing with include_inactive=true"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pricing",
            params={"include_inactive": True},
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "pricing" in data
        print(f"✓ GET pricing with inactive successful - {data['count']} items")
    
    def test_create_pricing_next_day(self, admin_headers):
        """Test POST /api/admin/pricing - Create Next-Day pricing"""
        pricing_data = {
            "delivery_type": "next_day",
            "name": "TEST_Next-Day Standard",
            "description": "Standard next-day delivery",
            "base_price": 5.99,
            "is_active": True,
            "time_window_start": "08:00",
            "time_window_end": "12:00",
            "is_addon": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Create pricing failed: {response.text}"
        data = response.json()
        assert "pricing_id" in data
        assert data["message"] == "Pricing configuration created successfully"
        
        # Verify the created pricing
        pricing = data.get("pricing", {})
        assert pricing.get("name") == pricing_data["name"]
        assert pricing.get("base_price") == pricing_data["base_price"]
        assert pricing.get("delivery_type") == pricing_data["delivery_type"]
        
        print(f"✓ Next-Day pricing created: {data['pricing_id']}")
        return data["pricing_id"]
    
    def test_create_pricing_same_day(self, admin_headers):
        """Test POST /api/admin/pricing - Create Same-Day pricing"""
        pricing_data = {
            "delivery_type": "same_day",
            "name": "TEST_Same-Day Express",
            "description": "Same-day delivery with 2pm cutoff",
            "base_price": 9.99,
            "is_active": True,
            "cutoff_time": "14:00",
            "is_addon": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "pricing_id" in data
        print(f"✓ Same-Day pricing created: {data['pricing_id']}")
        return data["pricing_id"]
    
    def test_create_pricing_priority(self, admin_headers):
        """Test POST /api/admin/pricing - Create Priority pricing"""
        pricing_data = {
            "delivery_type": "priority",
            "name": "TEST_Priority Delivery",
            "description": "First deliveries of the day",
            "base_price": 14.99,
            "is_active": True,
            "is_addon": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "pricing_id" in data
        print(f"✓ Priority pricing created: {data['pricing_id']}")
        return data["pricing_id"]
    
    def test_create_pricing_refrigerated_addon(self, admin_headers):
        """Test POST /api/admin/pricing - Create Refrigerated add-on fee"""
        pricing_data = {
            "delivery_type": "next_day",  # Add-on can be any type
            "name": "TEST_Refrigerated Fee",
            "description": "Additional fee for temperature-controlled delivery",
            "base_price": 3.99,
            "is_active": True,
            "is_addon": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "pricing_id" in data
        assert data["pricing"]["is_addon"] == True
        print(f"✓ Refrigerated add-on pricing created: {data['pricing_id']}")
        return data["pricing_id"]
    
    def test_get_pricing_by_id(self, admin_headers):
        """Test GET /api/admin/pricing/{pricing_id}"""
        # First create a pricing
        pricing_data = {
            "delivery_type": "next_day",
            "name": "TEST_Get By ID",
            "base_price": 7.99,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        pricing_id = create_response.json()["pricing_id"]
        
        # Get by ID
        response = requests.get(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == pricing_id
        assert data["name"] == pricing_data["name"]
        print(f"✓ GET pricing by ID successful")
    
    def test_get_pricing_not_found(self, admin_headers):
        """Test GET /api/admin/pricing/{pricing_id} with invalid ID"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pricing/nonexistent-id",
            headers=admin_headers
        )
        assert response.status_code == 404
        print(f"✓ GET non-existent pricing returns 404")
    
    def test_update_pricing(self, admin_headers):
        """Test PUT /api/admin/pricing/{pricing_id}"""
        # First create a pricing
        pricing_data = {
            "delivery_type": "next_day",
            "name": "TEST_Update Me",
            "base_price": 5.99,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        pricing_id = create_response.json()["pricing_id"]
        
        # Update the pricing
        update_data = {
            "name": "TEST_Updated Name",
            "base_price": 8.99,
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}",
            json=update_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Pricing updated successfully"
        assert data["pricing"]["name"] == update_data["name"]
        assert data["pricing"]["base_price"] == update_data["base_price"]
        print(f"✓ Pricing updated successfully")
    
    def test_update_pricing_not_found(self, admin_headers):
        """Test PUT /api/admin/pricing/{pricing_id} with invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing/nonexistent-id",
            json={"name": "Test"},
            headers=admin_headers
        )
        assert response.status_code == 404
        print(f"✓ Update non-existent pricing returns 404")
    
    def test_toggle_pricing(self, admin_headers):
        """Test PUT /api/admin/pricing/{pricing_id}/toggle"""
        # First create an active pricing
        pricing_data = {
            "delivery_type": "next_day",
            "name": "TEST_Toggle Me",
            "base_price": 5.99,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        pricing_id = create_response.json()["pricing_id"]
        
        # Toggle to inactive
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}/toggle",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == False
        print(f"✓ Pricing toggled to inactive")
        
        # Toggle back to active
        response2 = requests.put(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}/toggle",
            headers=admin_headers
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["is_active"] == True
        print(f"✓ Pricing toggled back to active")
    
    def test_toggle_pricing_not_found(self, admin_headers):
        """Test PUT /api/admin/pricing/{pricing_id}/toggle with invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing/nonexistent-id/toggle",
            headers=admin_headers
        )
        assert response.status_code == 404
        print(f"✓ Toggle non-existent pricing returns 404")
    
    def test_delete_pricing(self, admin_headers):
        """Test DELETE /api/admin/pricing/{pricing_id}"""
        # First create a pricing
        pricing_data = {
            "delivery_type": "next_day",
            "name": "TEST_Delete Me",
            "base_price": 5.99,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json=pricing_data,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        pricing_id = create_response.json()["pricing_id"]
        
        # Delete the pricing
        response = requests.delete(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Pricing configuration deleted successfully"
        print(f"✓ Pricing deleted successfully")
        
        # Verify it's deleted
        get_response = requests.get(
            f"{BASE_URL}/api/admin/pricing/{pricing_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 404
        print(f"✓ Deleted pricing no longer exists")
    
    def test_delete_pricing_not_found(self, admin_headers):
        """Test DELETE /api/admin/pricing/{pricing_id} with invalid ID"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/pricing/nonexistent-id",
            headers=admin_headers
        )
        assert response.status_code == 404
        print(f"✓ Delete non-existent pricing returns 404")


class TestAdminOrderStatus:
    """Test Admin Order Status Control - PUT /api/admin/orders/{order_id}/status"""
    
    def test_get_orders_list(self, admin_headers):
        """Test GET /api/admin/orders - List all orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"✓ GET orders list successful - {data['total']} orders")
        return data.get("orders", [])
    
    def test_update_order_status_valid(self, admin_headers):
        """Test PUT /api/admin/orders/{order_id}/status with valid status"""
        # First get an order
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=admin_headers
        )
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0]["id"]
        original_status = orders[0]["status"]
        
        # Update to a different status
        new_status = "confirmed" if original_status != "confirmed" else "pending"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            params={"status": new_status, "notes": "Test status change"},
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["new_status"] == new_status
        print(f"✓ Order status updated from {original_status} to {new_status}")
    
    def test_update_order_status_invalid(self, admin_headers):
        """Test PUT /api/admin/orders/{order_id}/status with invalid status"""
        # First get an order
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=admin_headers
        )
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            params={"status": "invalid_status"},
            headers=admin_headers
        )
        
        assert response.status_code == 400
        print(f"✓ Invalid status correctly rejected")
    
    def test_update_order_status_not_found(self, admin_headers):
        """Test PUT /api/admin/orders/{order_id}/status with non-existent order"""
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/nonexistent-order-id/status",
            params={"status": "confirmed"},
            headers=admin_headers
        )
        
        assert response.status_code == 404
        print(f"✓ Non-existent order returns 404")


class TestPricingAccessControl:
    """Test access control for pricing endpoints"""
    
    def test_pricing_without_auth(self):
        """Test pricing endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing")
        assert response.status_code in [401, 403]
        print(f"✓ GET pricing without auth rejected")
    
    def test_create_pricing_without_auth(self):
        """Test create pricing requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/pricing",
            json={"delivery_type": "next_day", "name": "Test", "base_price": 5.99}
        )
        assert response.status_code in [401, 403]
        print(f"✓ POST pricing without auth rejected")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(admin_headers):
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Get admin token for cleanup
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        return
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Cleanup pricing
    pricing_response = requests.get(
        f"{BASE_URL}/api/admin/pricing",
        params={"include_inactive": True},
        headers=headers
    )
    if pricing_response.status_code == 200:
        for pricing in pricing_response.json().get("pricing", []):
            if pricing.get("name", "").startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/admin/pricing/{pricing['id']}",
                    headers=headers
                )
    
    # Cleanup drivers
    drivers_response = requests.get(f"{BASE_URL}/api/admin/drivers", headers=headers)
    if drivers_response.status_code == 200:
        for driver in drivers_response.json().get("drivers", []):
            user = driver.get("user", {})
            if user.get("email", "").startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/admin/drivers/{driver['id']}",
                    headers=headers
                )
    
    print("✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
