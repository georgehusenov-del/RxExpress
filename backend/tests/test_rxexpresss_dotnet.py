"""
RxExpresss .NET Backend API Tests
Tests for the complete rewrite with ASP.NET Core + SQLite + Identity
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "http://localhost:8001"

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "Admin@123"
PHARMACY_EMAIL = "pharmacy@test.com"
PHARMACY_PASSWORD = "Pharmacy@123"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Driver@123"


class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Admin login returns token with role=Admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": ADMIN_EMAIL, "Password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "Admin"
        assert data["user"]["isActive"] == True
        
    def test_pharmacy_login_success(self):
        """Pharmacy login returns token with role=Pharmacy"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": PHARMACY_EMAIL, "Password": PHARMACY_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "Pharmacy"
        
    def test_driver_login_success(self):
        """Driver login returns token with role=Driver"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": DRIVER_EMAIL, "Password": DRIVER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "Driver"
        
    def test_login_invalid_credentials(self):
        """Wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": ADMIN_EMAIL, "Password": "WrongPassword"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data or "error" in data
        
    def test_auth_me_returns_user_info(self):
        """GET /api/auth/me returns current user with valid token"""
        # First login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": ADMIN_EMAIL, "Password": ADMIN_PASSWORD}
        )
        token = login_resp.json()["token"]
        
        # Then get me
        me_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "Admin"


class TestAdminDashboard:
    """Admin dashboard endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": ADMIN_EMAIL, "Password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": DRIVER_EMAIL, "Password": DRIVER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_admin_dashboard_returns_stats(self, admin_token):
        """GET /api/admin/dashboard returns stats with correct counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert stats["total_users"] == 3
        assert stats["total_pharmacies"] == 1
        assert stats["total_drivers"] == 1
        
    def test_admin_dashboard_forbidden_for_driver(self, driver_token):
        """GET /api/admin/dashboard returns 403 for driver role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
        
    def test_admin_orders_returns_list(self, admin_token):
        """GET /api/admin/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        
    def test_admin_drivers_returns_list(self, admin_token):
        """GET /api/admin/drivers returns drivers list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
        assert "count" in data
        assert data["count"] == 1
        
    def test_admin_users_returns_list(self, admin_token):
        """GET /api/admin/users returns users list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["total"] == 3


class TestPricing:
    """Pricing endpoint tests"""
    
    def test_pricing_active_no_auth_required(self):
        """GET /api/pricing/active returns pricing without authentication"""
        response = requests.get(f"{BASE_URL}/api/pricing/active")
        assert response.status_code == 200
        data = response.json()
        assert "pricing" in data
        assert "count" in data
        assert data["count"] == 3
        # Check pricing items
        pricing = data["pricing"]
        delivery_types = [p["deliveryType"] for p in pricing]
        assert "next_day" in delivery_types
        assert "same_day" in delivery_types
        assert "priority" in delivery_types


class TestPharmacy:
    """Pharmacy endpoint tests"""
    
    @pytest.fixture
    def pharmacy_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": PHARMACY_EMAIL, "Password": PHARMACY_PASSWORD}
        )
        return response.json()["token"]
    
    def test_pharmacy_my_returns_info(self, pharmacy_token):
        """GET /api/pharmacies/my returns pharmacy info"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacies/my",
            headers={"Authorization": f"Bearer {pharmacy_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "HealthFirst Pharmacy"
        assert data["email"] == PHARMACY_EMAIL
        assert data["isVerified"] == True


class TestOrders:
    """Order creation and management tests"""
    
    @pytest.fixture
    def pharmacy_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": PHARMACY_EMAIL, "Password": PHARMACY_PASSWORD}
        )
        return response.json()["token"]
    
    def test_create_order_with_qr_code(self, pharmacy_token):
        """POST /api/orders creates order with QR code"""
        order_data = {
            "PharmacyId": 1,
            "DeliveryType": "same_day",
            "TimeWindow": "afternoon",
            "ScheduledDate": "2026-02-18",
            "RecipientName": "TEST_Jane Smith",
            "RecipientPhone": "555-5678",
            "RecipientEmail": "jane@example.com",
            "Street": "789 Oak Ave",
            "City": "New York",
            "State": "NY",
            "PostalCode": "10003",
            "DeliveryNotes": "Ring doorbell",
            "CopayAmount": 25.50
        }
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {pharmacy_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Order created"
        assert "order_id" in data
        assert "order_number" in data
        assert "qr_code" in data
        # QR code should be generated
        assert len(data["qr_code"]) > 0


class TestDriverPortal:
    """Driver portal endpoint tests"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"Email": DRIVER_EMAIL, "Password": DRIVER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_driver_deliveries_returns_list(self, driver_token):
        """GET /api/driver-portal/deliveries returns deliveries"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        assert "count" in data
        assert isinstance(data["deliveries"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
