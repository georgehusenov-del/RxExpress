"""
Tests for RX Expresss .NET Backend API (ASP.NET Core 8)
Testing migrated endpoints from Python FastAPI to .NET

Test Categories:
- Health Check
- Authentication (login with admin, pharmacy, driver credentials)
- Admin Dashboard endpoints
- Circuit routing endpoints
- Pricing endpoints (public)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pharmacy-gig-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@rxexpresss.com", "password": "admin123"}
PHARMACY_CREDS = {"email": "pharmacy@test.com", "password": "pharmacy123"}
DRIVER_CREDS = {"email": "driver@test.com", "password": "driver123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def pharmacy_token():
    """Get pharmacy authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Pharmacy authentication failed")


@pytest.fixture(scope="module")
def driver_token():
    """Get driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Driver authentication failed")


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_200(self):
        """Test GET /api/health returns 200 with status=healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"PASS: Health check returned status={data.get('status')}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test POST /api/auth/login with admin credentials returns access_token and user object"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        
        # Verify access_token exists
        assert "access_token" in data
        assert len(data["access_token"]) > 0
        
        # Verify user object
        assert "user" in data
        user = data["user"]
        assert user["email"] == ADMIN_CREDS["email"]
        assert user["role"] == "admin"
        assert "id" in user
        print(f"PASS: Admin login successful, user_id={user['id']}")
    
    def test_pharmacy_login_success(self):
        """Test POST /api/auth/login with pharmacy credentials returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["user"]["email"] == PHARMACY_CREDS["email"]
        assert data["user"]["role"] == "pharmacy"
        print(f"PASS: Pharmacy login successful")
    
    def test_driver_login_success(self):
        """Test POST /api/auth/login with driver credentials returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["user"]["email"] == DRIVER_CREDS["email"]
        assert data["user"]["role"] == "driver"
        print(f"PASS: Driver login successful")
    
    def test_invalid_credentials_returns_401(self):
        """Test POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: Invalid credentials returned 401 with detail='{data['detail']}'")
    
    def test_get_current_user_with_valid_token(self, admin_token):
        """Test GET /api/auth/me with valid token returns current user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == ADMIN_CREDS["email"]
        assert data["role"] == "admin"
        assert "id" in data
        print(f"PASS: /api/auth/me returned current user email={data['email']}")


class TestAdminDashboard:
    """Admin dashboard endpoint tests"""
    
    def test_dashboard_returns_stats_object(self, admin_token):
        """Test GET /api/admin/dashboard returns stats object with total_users, total_orders etc"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        
        # Verify required fields exist
        assert "total_users" in stats
        assert "total_orders" in stats
        assert "total_pharmacies" in stats
        assert "total_drivers" in stats
        assert "active_drivers" in stats
        assert "orders_by_status" in stats
        
        print(f"PASS: Dashboard stats - users={stats['total_users']}, orders={stats['total_orders']}, pharmacies={stats['total_pharmacies']}")
    
    def test_admin_orders_returns_orders_list(self, admin_token):
        """Test GET /api/admin/orders returns orders list with total count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders?limit=10", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        print(f"PASS: Admin orders returned {len(data['orders'])} orders, total={data['total']}")
    
    def test_admin_drivers_returns_drivers_list(self, admin_token):
        """Test GET /api/admin/drivers returns drivers list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/drivers", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data
        assert isinstance(data["drivers"], list)
        print(f"PASS: Admin drivers returned {len(data['drivers'])} drivers")
    
    def test_admin_users_returns_users_list(self, admin_token):
        """Test GET /api/admin/users returns users list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        print(f"PASS: Admin users returned {len(data['users'])} users, total={data['total']}")


class TestCircuitRouting:
    """Circuit routing endpoint tests"""
    
    def test_route_plans_returns_plans_list(self, admin_token):
        """Test GET /api/circuit/route-plans returns plans list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/circuit/route-plans", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert "count" in data
        assert isinstance(data["plans"], list)
        print(f"PASS: Circuit route-plans returned {data['count']} plans")
    
    def test_circuit_drivers_returns_drivers_list(self, admin_token):
        """Test GET /api/circuit/drivers returns circuit drivers list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/circuit/drivers", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data
        assert "count" in data
        assert isinstance(data["drivers"], list)
        print(f"PASS: Circuit drivers returned {data['count']} drivers")
    
    def test_pending_orders_returns_orders(self, admin_token):
        """Test GET /api/circuit/pending-orders returns pending orders"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/circuit/pending-orders", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "count" in data
        assert isinstance(data["orders"], list)
        print(f"PASS: Circuit pending-orders returned {data['count']} orders")


class TestPricing:
    """Pricing endpoint tests (public - no auth required)"""
    
    def test_active_pricing_no_auth_required(self):
        """Test GET /api/pricing/active returns active pricing list without auth"""
        response = requests.get(f"{BASE_URL}/api/pricing/active")
        assert response.status_code == 200
        
        data = response.json()
        assert "pricing" in data
        assert "count" in data
        assert isinstance(data["pricing"], list)
        
        # Check grouped field exists (from .NET implementation)
        if "grouped" in data:
            assert "next_day" in data["grouped"] or "same_day" in data["grouped"]
        
        print(f"PASS: Active pricing returned {data['count']} pricing options")


class TestAPIStructure:
    """Tests to verify API response structure matches expected .NET output"""
    
    def test_snake_case_response_keys(self, admin_token):
        """Verify that .NET backend uses snake_case for JSON keys (configured in Program.cs)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Check snake_case keys exist
        assert "total_users" in stats  # not totalUsers
        assert "total_orders" in stats  # not totalOrders
        assert "total_pharmacies" in stats  # not totalPharmacies
        assert "orders_by_status" in stats  # not ordersByStatus
        
        print("PASS: API responses use snake_case as expected")
    
    def test_token_structure_jwt(self):
        """Verify JWT token structure from .NET backend"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        
        data = response.json()
        token = data["access_token"]
        
        # JWT has 3 parts separated by dots
        parts = token.split(".")
        assert len(parts) == 3
        
        # Verify token_type is bearer
        assert data["token_type"] == "bearer"
        
        print("PASS: JWT token has correct structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
