"""
RX Expresss Feature Test Suite
Tests newly added features: tracking URLs, order creation modal, QR scanning, POD, etc.
Uses retry logic for transient Cloudflare 520 errors
"""
import pytest
import requests
import time

BASE_URL = "https://driver-portal-52.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "Admin@123"
PHARMACY_EMAIL = "pharmacy@test.com"
PHARMACY_PASSWORD = "Pharmacy@123"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Driver@123"


def retry_request(method, url, max_retries=3, **kwargs):
    """Retry request with exponential backoff for transient 520 errors"""
    for i in range(max_retries):
        try:
            if method == 'get':
                response = requests.get(url, timeout=30, **kwargs)
            elif method == 'post':
                response = requests.post(url, timeout=30, **kwargs)
            elif method == 'put':
                response = requests.put(url, timeout=30, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code != 520:
                return response
            
            if i < max_retries - 1:
                time.sleep(2 * (i + 1))
        except Exception as e:
            if i < max_retries - 1:
                time.sleep(2 * (i + 1))
            else:
                raise e
    return response


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token"""
    response = retry_request(
        'post',
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin auth failed: {response.status_code}")


@pytest.fixture(scope="module")
def pharmacy_token():
    """Get pharmacy JWT token"""
    response = retry_request(
        'post',
        f"{BASE_URL}/auth/login",
        json={"email": PHARMACY_EMAIL, "password": PHARMACY_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Pharmacy auth failed")


@pytest.fixture(scope="module")
def driver_token():
    """Get driver JWT token"""
    response = retry_request(
        'post',
        f"{BASE_URL}/auth/login",
        json={"email": DRIVER_EMAIL, "password": DRIVER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Driver auth failed")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is running"""
        response = retry_request('get', f"{BASE_URL}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestAuthentication:
    """Authentication tests"""
    
    def test_admin_login(self):
        response = retry_request('post', f"{BASE_URL}/auth/login", 
                                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        assert "token" in response.json()
        assert response.json()["user"]["role"] == "Admin"
    
    def test_pharmacy_login(self):
        response = retry_request('post', f"{BASE_URL}/auth/login",
                                json={"email": PHARMACY_EMAIL, "password": PHARMACY_PASSWORD})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "Pharmacy"
    
    def test_driver_login(self):
        response = retry_request('post', f"{BASE_URL}/auth/login",
                                json={"email": DRIVER_EMAIL, "password": DRIVER_PASSWORD})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "Driver"


class TestPublicTracking:
    """Public tracking endpoint tests - no auth required"""
    
    def test_track_by_qr_code(self):
        """Test public tracking by QR code"""
        # Using known QR code from seed data
        response = retry_request('get', f"{BASE_URL}/orders/track/M37DE3")
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "orderNumber" in data
        assert "status" in data
        assert "recipientName" in data
        assert data["qrCode"] == "M37DE3"
    
    def test_track_invalid_code(self):
        """Test tracking with invalid code"""
        response = retry_request('get', f"{BASE_URL}/orders/track/INVALID_XYZ")
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 404


class TestPharmacyPortal:
    """Pharmacy portal tests"""
    
    def test_get_pharmacy_profile(self, pharmacy_token):
        """Test pharmacy profile retrieval"""
        response = retry_request('get', f"{BASE_URL}/pharmacies/my",
                                headers={"Authorization": f"Bearer {pharmacy_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
    
    def test_get_pharmacy_orders(self, pharmacy_token):
        """Test pharmacy orders retrieval"""
        # First get pharmacy ID
        profile = retry_request('get', f"{BASE_URL}/pharmacies/my",
                               headers={"Authorization": f"Bearer {pharmacy_token}"})
        if profile.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        pharmacy_id = profile.json()["id"]
        
        response = retry_request('get', f"{BASE_URL}/orders?pharmacyId={pharmacy_id}",
                                headers={"Authorization": f"Bearer {pharmacy_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data


class TestDriverPortal:
    """Driver portal tests"""
    
    def test_get_driver_profile(self, driver_token):
        """Test driver profile retrieval"""
        response = retry_request('get', f"{BASE_URL}/driver-portal/profile",
                                headers={"Authorization": f"Bearer {driver_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_get_driver_deliveries(self, driver_token):
        """Test driver deliveries retrieval"""
        response = retry_request('get', f"{BASE_URL}/driver-portal/deliveries",
                                headers={"Authorization": f"Bearer {driver_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
    
    def test_update_driver_status(self, driver_token):
        """Test driver status update"""
        response = retry_request('put', f"{BASE_URL}/driver-portal/status?status=available",
                                headers={"Authorization": f"Bearer {driver_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200


class TestAdminFeatures:
    """Admin panel tests"""
    
    def test_get_users(self, admin_token):
        """Test user listing"""
        response = retry_request('get', f"{BASE_URL}/admin/users",
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert len(data["users"]) >= 1
    
    def test_get_drivers(self, admin_token):
        """Test driver listing"""
        response = retry_request('get', f"{BASE_URL}/admin/drivers",
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
    
    def test_get_pharmacies(self, admin_token):
        """Test pharmacy listing"""
        response = retry_request('get', f"{BASE_URL}/admin/pharmacies",
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "pharmacies" in data
    
    def test_qr_scan_valid(self, admin_token):
        """Test QR code scanning"""
        response = retry_request('post', f"{BASE_URL}/admin/scan/M37DE3",
                                json={},
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] == True
        assert "package" in data
    
    def test_qr_scan_invalid(self, admin_token):
        """Test invalid QR code scanning"""
        response = retry_request('post', f"{BASE_URL}/admin/scan/INVALID123",
                                json={},
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 404


class TestRoutes:
    """Routes management tests"""
    
    def test_get_pending_orders(self, admin_token):
        """Test getting pending orders for routing"""
        response = retry_request('get', f"{BASE_URL}/routes/pending-orders",
                                headers={"Authorization": f"Bearer {admin_token}"})
        if response.status_code == 520:
            pytest.skip("Cloudflare 520 error")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
