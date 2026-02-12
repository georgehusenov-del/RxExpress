"""
Test QR Scanning Features for RX Expresss
- Admin QR Scanning endpoints: GET /api/admin/scans, GET /api/admin/scans/stats, GET /api/admin/packages, POST /api/admin/packages/verify/{qr_code}
- Package scan endpoint: POST /api/orders/scan
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"
PHARMACY_EMAIL = "pharmacy@test.com"
PHARMACY_PASSWORD = "pharmacy123"


class TestAdminAuthentication:
    """Test admin authentication for QR scanning endpoints"""
    
    def test_admin_login(self, api_client):
        """Test admin login to get token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        print(f"Admin login successful, token received")
        return data["access_token"]


class TestAdminScanEndpoints:
    """Test admin scan management endpoints"""
    
    def test_get_scans_list(self, admin_client):
        """GET /api/admin/scans - List all package scans"""
        response = admin_client.get(f"{BASE_URL}/api/admin/scans")
        assert response.status_code == 200, f"Failed to get scans: {response.text}"
        data = response.json()
        assert "scans" in data, "Response missing 'scans' field"
        assert "total" in data, "Response missing 'total' field"
        print(f"Scans list: {data['total']} total scans")
    
    def test_get_scans_with_action_filter(self, admin_client):
        """GET /api/admin/scans?action=pickup - Filter scans by action"""
        response = admin_client.get(f"{BASE_URL}/api/admin/scans?action=pickup")
        assert response.status_code == 200, f"Failed to filter scans: {response.text}"
        data = response.json()
        assert "scans" in data
        # All scans should have action=pickup if any exist
        for scan in data.get("scans", []):
            assert scan.get("action") == "pickup", f"Scan has wrong action: {scan.get('action')}"
        print(f"Filtered scans by action=pickup: {len(data.get('scans', []))} scans")
    
    def test_get_scans_with_pagination(self, admin_client):
        """GET /api/admin/scans?skip=0&limit=10 - Test pagination"""
        response = admin_client.get(f"{BASE_URL}/api/admin/scans?skip=0&limit=10")
        assert response.status_code == 200, f"Failed to paginate scans: {response.text}"
        data = response.json()
        assert "scans" in data
        assert "skip" in data
        assert "limit" in data
        assert len(data.get("scans", [])) <= 10, "Pagination limit not respected"
        print(f"Pagination test passed: {len(data.get('scans', []))} scans returned")


class TestAdminScanStats:
    """Test admin scan statistics endpoint"""
    
    def test_get_scan_stats(self, admin_client):
        """GET /api/admin/scans/stats - Get scan statistics"""
        response = admin_client.get(f"{BASE_URL}/api/admin/scans/stats")
        assert response.status_code == 200, f"Failed to get scan stats: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_scans" in data, "Response missing 'total_scans'"
        assert "recent_scans_24h" in data, "Response missing 'recent_scans_24h'"
        assert "scans_by_action" in data, "Response missing 'scans_by_action'"
        assert "top_scanners" in data, "Response missing 'top_scanners'"
        
        # Verify data types
        assert isinstance(data["total_scans"], int), "total_scans should be int"
        assert isinstance(data["recent_scans_24h"], int), "recent_scans_24h should be int"
        assert isinstance(data["scans_by_action"], dict), "scans_by_action should be dict"
        assert isinstance(data["top_scanners"], list), "top_scanners should be list"
        
        print(f"Scan stats: total={data['total_scans']}, last_24h={data['recent_scans_24h']}")
        print(f"Scans by action: {data['scans_by_action']}")


class TestAdminPackages:
    """Test admin packages endpoint"""
    
    def test_get_packages_list(self, admin_client):
        """GET /api/admin/packages - List all packages"""
        response = admin_client.get(f"{BASE_URL}/api/admin/packages")
        assert response.status_code == 200, f"Failed to get packages: {response.text}"
        data = response.json()
        
        assert "packages" in data, "Response missing 'packages'"
        assert "count" in data, "Response missing 'count'"
        
        print(f"Packages list: {data['count']} packages")
        
        # Verify package structure if any exist
        if data.get("packages"):
            pkg = data["packages"][0]
            # Check expected fields
            expected_fields = ["order_id", "order_number", "order_status"]
            for field in expected_fields:
                assert field in pkg, f"Package missing '{field}' field"
            print(f"Sample package: order_number={pkg.get('order_number')}, status={pkg.get('order_status')}")
    
    def test_get_packages_scanned_filter(self, admin_client):
        """GET /api/admin/packages?scanned=true - Filter by scanned status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/packages?scanned=true")
        assert response.status_code == 200, f"Failed to filter packages: {response.text}"
        data = response.json()
        assert "packages" in data
        print(f"Scanned packages: {data['count']}")
    
    def test_get_packages_not_scanned_filter(self, admin_client):
        """GET /api/admin/packages?scanned=false - Filter by not scanned"""
        response = admin_client.get(f"{BASE_URL}/api/admin/packages?scanned=false")
        assert response.status_code == 200, f"Failed to filter packages: {response.text}"
        data = response.json()
        assert "packages" in data
        print(f"Not scanned packages: {data['count']}")


class TestAdminVerifyPackage:
    """Test admin package verification endpoint"""
    
    def test_verify_package_not_found(self, admin_client):
        """POST /api/admin/packages/verify/{qr_code} - Test with non-existent QR code"""
        fake_qr = "RX-PKG-NONEXISTENT"
        response = admin_client.post(f"{BASE_URL}/api/admin/packages/verify/{fake_qr}")
        assert response.status_code == 404, f"Expected 404 for non-existent package: {response.text}"
        print("Verify non-existent package returns 404 as expected")
    
    def test_verify_package_with_existing_qr(self, admin_client):
        """POST /api/admin/packages/verify/{qr_code} - Test with existing QR code if available"""
        # First get list of packages to find a valid QR code
        packages_response = admin_client.get(f"{BASE_URL}/api/admin/packages")
        if packages_response.status_code == 200:
            packages = packages_response.json().get("packages", [])
            if packages:
                qr_code = packages[0].get("qr_code")
                if qr_code:
                    response = admin_client.post(f"{BASE_URL}/api/admin/packages/verify/{qr_code}")
                    # Should be 200 if package exists and not already verified
                    assert response.status_code in [200, 404], f"Unexpected status: {response.text}"
                    if response.status_code == 200:
                        data = response.json()
                        assert "message" in data
                        print(f"Package verified: {qr_code}")
                    else:
                        print(f"Package not found or already verified: {qr_code}")
                else:
                    print("No QR code found in packages")
            else:
                print("No packages available to test verification")
        else:
            print("Could not fetch packages to test verification")


class TestPackageScanEndpoint:
    """Test package scan endpoint POST /api/orders/scan"""
    
    def test_scan_package_not_found(self, admin_client):
        """POST /api/orders/scan - Test with non-existent QR code"""
        scan_data = {
            "qr_code": "RX-PKG-NONEXISTENT",
            "scanned_by": "test-user-id",
            "action": "verify",
            "scanned_at": datetime.utcnow().isoformat()
        }
        response = admin_client.post(f"{BASE_URL}/api/orders/scan", json=scan_data)
        assert response.status_code == 404, f"Expected 404 for non-existent package: {response.text}"
        print("Scan non-existent package returns 404 as expected")
    
    def test_scan_package_with_location(self, admin_client):
        """POST /api/orders/scan - Test scan with location data"""
        # First get a valid QR code
        packages_response = admin_client.get(f"{BASE_URL}/api/admin/packages")
        if packages_response.status_code == 200:
            packages = packages_response.json().get("packages", [])
            if packages:
                qr_code = packages[0].get("qr_code")
                if qr_code:
                    scan_data = {
                        "qr_code": qr_code,
                        "scanned_by": "test-user-id",
                        "action": "pickup",
                        "scanned_at": datetime.utcnow().isoformat(),
                        "location": {
                            "latitude": 40.7128,
                            "longitude": -74.0060
                        }
                    }
                    response = admin_client.post(f"{BASE_URL}/api/orders/scan", json=scan_data)
                    # Should succeed if package exists
                    if response.status_code == 200:
                        data = response.json()
                        assert "order_number" in data or "message" in data
                        print(f"Package scanned successfully: {qr_code}")
                    else:
                        print(f"Scan response: {response.status_code} - {response.text}")
                else:
                    print("No QR code found in packages")
            else:
                print("No packages available to test scanning")
        else:
            print("Could not fetch packages to test scanning")


class TestAccessControl:
    """Test access control for admin endpoints"""
    
    def test_scans_requires_admin(self, api_client):
        """GET /api/admin/scans - Should require admin authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/scans")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth: {response.text}"
        print("Admin scans endpoint requires authentication")
    
    def test_scan_stats_requires_admin(self, api_client):
        """GET /api/admin/scans/stats - Should require admin authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/scans/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth: {response.text}"
        print("Admin scan stats endpoint requires authentication")
    
    def test_packages_requires_admin(self, api_client):
        """GET /api/admin/packages - Should require admin authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/packages")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth: {response.text}"
        print("Admin packages endpoint requires authentication")
    
    def test_verify_requires_admin(self, api_client):
        """POST /api/admin/packages/verify/{qr_code} - Should require admin authentication"""
        response = api_client.post(f"{BASE_URL}/api/admin/packages/verify/test-qr")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth: {response.text}"
        print("Admin verify endpoint requires authentication")


# ============== Fixtures ==============
@pytest.fixture
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture
def pharmacy_token(api_client):
    """Get pharmacy authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": PHARMACY_EMAIL,
        "password": PHARMACY_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


@pytest.fixture
def pharmacy_client(api_client, pharmacy_token):
    """Session with pharmacy auth header"""
    if pharmacy_token:
        api_client.headers.update({"Authorization": f"Bearer {pharmacy_token}"})
    return api_client
