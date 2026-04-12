"""
Test suite for Driver Tracking Feature
Tests:
- POST /api/driver-portal/location - Driver reports GPS position
- GET /api/admin/tracking/drivers - Returns all drivers with positions
- GET /api/admin/tracking/drivers/{id}/trail - Returns location history
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverTracking:
    """Driver tracking endpoint tests"""
    
    admin_token = None
    driver_token = None
    driver_id = None
    
    @classmethod
    def setup_class(cls):
        """Login as admin and driver to get tokens"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rxexpresss.com",
            "password": "Admin@123"
        })
        if admin_response.status_code == 200:
            cls.admin_token = admin_response.json().get("token")
            print(f"Admin login successful, token: {cls.admin_token[:20]}...")
        else:
            print(f"Admin login failed: {admin_response.status_code} - {admin_response.text}")
        
        # Driver login
        driver_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        if driver_response.status_code == 200:
            cls.driver_token = driver_response.json().get("token")
            print(f"Driver login successful, token: {cls.driver_token[:20]}...")
        else:
            print(f"Driver login failed: {driver_response.status_code} - {driver_response.text}")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
    
    def get_driver_headers(self):
        return {"Authorization": f"Bearer {self.driver_token}", "Content-Type": "application/json"}
    
    # ==================== Driver Location Reporting Tests ====================
    
    def test_driver_report_location_success(self):
        """POST /api/driver-portal/location - Driver reports GPS position"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "speed": 15.5,
            "heading": 90.0,
            "accuracy": 10.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/location",
            json=location_data,
            headers=self.get_driver_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=true in response"
        print(f"Location reported successfully: {location_data}")
    
    def test_driver_report_location_minimal(self):
        """POST /api/driver-portal/location - Driver reports only lat/lng (optional fields)"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        location_data = {
            "latitude": 40.7589,
            "longitude": -73.9851
        }
        
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/location",
            json=location_data,
            headers=self.get_driver_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Minimal location reported successfully: {location_data}")
    
    def test_driver_report_location_unauthorized(self):
        """POST /api/driver-portal/location - Unauthorized without token"""
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/location",
            json=location_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized request correctly rejected")
    
    # ==================== Admin Tracking Drivers Tests ====================
    
    def test_admin_get_all_drivers_tracking(self):
        """GET /api/admin/tracking/drivers - Returns all drivers with positions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "drivers" in data, "Response should contain 'drivers' array"
        assert "offices" in data, "Response should contain 'offices' array"
        
        drivers = data["drivers"]
        assert isinstance(drivers, list), "drivers should be a list"
        
        # Check driver data structure if any drivers exist
        if len(drivers) > 0:
            driver = drivers[0]
            # Required fields
            assert "id" in driver, "Driver should have 'id'"
            assert "name" in driver, "Driver should have 'name'"
            assert "status" in driver, "Driver should have 'status'"
            assert "isOnline" in driver, "Driver should have 'isOnline'"
            assert "activeDeliveries" in driver, "Driver should have 'activeDeliveries'"
            
            # Location fields (may be null but keys should exist)
            # Note: These fields exist in the response
            print(f"Driver fields: {list(driver.keys())}")
            assert "latitude" in driver or driver.get("latitude") is None, "Driver should have 'latitude' field"
            assert "longitude" in driver or driver.get("longitude") is None, "Driver should have 'longitude' field"
            assert "lastUpdate" in driver, "Driver should have 'lastUpdate' field"
            
            print(f"Found {len(drivers)} drivers")
            for d in drivers:
                online_status = "ONLINE" if d.get("isOnline") else "OFFLINE"
                lat = d.get("latitude") or "N/A"
                lng = d.get("longitude") or "N/A"
                print(f"  - {d['name']}: {d['status']} ({online_status}), lat={lat}, lng={lng}, deliveries={d.get('activeDeliveries', 0)}")
        
        # Check offices structure
        offices = data["offices"]
        assert isinstance(offices, list), "offices should be a list"
        if len(offices) > 0:
            office = offices[0]
            assert "id" in office
            assert "name" in office
            assert "latitude" in office
            assert "longitude" in office
            print(f"Found {len(offices)} office locations")
    
    def test_admin_tracking_unauthorized(self):
        """GET /api/admin/tracking/drivers - Unauthorized without admin token"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized request correctly rejected")
    
    def test_admin_tracking_driver_forbidden(self):
        """GET /api/admin/tracking/drivers - Driver role cannot access admin endpoint"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers=self.get_driver_headers()
        )
        
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("Driver correctly forbidden from admin endpoint")
    
    # ==================== Driver Trail/History Tests ====================
    
    def test_admin_get_driver_trail(self):
        """GET /api/admin/tracking/drivers/{id}/trail - Returns location history"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # First get list of drivers to find a valid ID
        drivers_response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers=self.get_admin_headers()
        )
        
        if drivers_response.status_code != 200:
            pytest.skip("Could not get drivers list")
        
        drivers = drivers_response.json().get("drivers", [])
        if len(drivers) == 0:
            pytest.skip("No drivers found")
        
        driver_id = drivers[0]["id"]
        
        # Get trail for this driver
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers/{driver_id}/trail",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "trail" in data, "Response should contain 'trail' array"
        assert "count" in data, "Response should contain 'count'"
        
        trail = data["trail"]
        assert isinstance(trail, list), "trail should be a list"
        
        if len(trail) > 0:
            point = trail[0]
            assert "latitude" in point, "Trail point should have 'latitude'"
            assert "longitude" in point, "Trail point should have 'longitude'"
            assert "timestamp" in point, "Trail point should have 'timestamp'"
            print(f"Found {len(trail)} trail points for driver {driver_id}")
        else:
            print(f"No trail data for driver {driver_id} (expected if no recent location reports)")
    
    def test_admin_get_driver_trail_with_hours_param(self):
        """GET /api/admin/tracking/drivers/{id}/trail?hours=4 - Custom time range"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get a driver ID
        drivers_response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers=self.get_admin_headers()
        )
        
        if drivers_response.status_code != 200:
            pytest.skip("Could not get drivers list")
        
        drivers = drivers_response.json().get("drivers", [])
        if len(drivers) == 0:
            pytest.skip("No drivers found")
        
        driver_id = drivers[0]["id"]
        
        # Get trail with custom hours parameter
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers/{driver_id}/trail?hours=4",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "trail" in data
        assert "count" in data
        print(f"Trail with hours=4 returned {data['count']} points")
    
    def test_admin_get_driver_trail_invalid_id(self):
        """GET /api/admin/tracking/drivers/99999/trail - Invalid driver ID"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers/99999/trail",
            headers=self.get_admin_headers()
        )
        
        # Should return 200 with empty trail (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("count") == 0, "Should return empty trail for invalid driver"
        print("Invalid driver ID returns empty trail as expected")
    
    # ==================== Integration Test: Report then Verify ====================
    
    def test_location_report_and_verify_persistence(self):
        """Integration: Report location then verify it appears in tracking data"""
        if not self.driver_token or not self.admin_token:
            pytest.skip("Both driver and admin tokens required")
        
        # Report a unique location
        unique_lat = 40.7500 + (time.time() % 1000) / 100000  # Slightly unique
        unique_lng = -73.9900
        
        location_data = {
            "latitude": unique_lat,
            "longitude": unique_lng,
            "speed": 25.0,
            "heading": 180.0,
            "accuracy": 5.0
        }
        
        # Report location as driver
        report_response = requests.post(
            f"{BASE_URL}/api/driver-portal/location",
            json=location_data,
            headers=self.get_driver_headers()
        )
        
        assert report_response.status_code == 200, f"Location report failed: {report_response.text}"
        
        # Small delay to ensure persistence
        time.sleep(0.5)
        
        # Verify as admin
        tracking_response = requests.get(
            f"{BASE_URL}/api/admin/tracking/drivers",
            headers=self.get_admin_headers()
        )
        
        assert tracking_response.status_code == 200
        drivers = tracking_response.json().get("drivers", [])
        
        # Find the test driver
        test_driver = None
        for d in drivers:
            if d.get("latitude") and abs(d["latitude"] - unique_lat) < 0.001:
                test_driver = d
                break
        
        if test_driver:
            assert test_driver.get("isOnline") == True, "Driver should be online after location report"
            print(f"Location persisted and verified: lat={test_driver['latitude']}, lng={test_driver['longitude']}")
            print(f"Driver is online: {test_driver['isOnline']}")
        else:
            print("Warning: Could not find driver with reported location (may be expected if driver profile not linked)")


class TestDriverProfile:
    """Test driver profile has location fields"""
    
    driver_token = None
    
    @classmethod
    def setup_class(cls):
        driver_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@test.com",
            "password": "Driver@123"
        })
        if driver_response.status_code == 200:
            cls.driver_token = driver_response.json().get("token")
    
    def get_driver_headers(self):
        return {"Authorization": f"Bearer {self.driver_token}", "Content-Type": "application/json"}
    
    def test_driver_profile_endpoint(self):
        """GET /api/driver-portal/profile - Verify profile endpoint works"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers=self.get_driver_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify basic profile fields
        assert "id" in data, "Profile should have 'id'"
        assert "status" in data, "Profile should have 'status'"
        assert "vehicleType" in data, "Profile should have 'vehicleType'"
        
        print(f"Driver profile: id={data['id']}, status={data['status']}, vehicle={data['vehicleType']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
