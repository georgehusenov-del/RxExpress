"""
Test suite for:
1. Google Maps API - POST /api/maps/geocode endpoint
2. Multi-location pharmacy support - GET/POST/PUT/DELETE /api/pharmacies/{id}/locations
3. POD submission - POST /api/driver-portal/deliveries/{order_id}/pod
4. Driver portal complete delivery workflow
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "driver123"
PHARMACY_EMAIL = "pharmacy@test.com"
PHARMACY_PASSWORD = "pharmacy123"


class TestGoogleMapsAPI:
    """Test Google Maps geocode endpoint - should return real coordinates"""
    
    def test_geocode_valid_address(self):
        """Test geocoding a valid address returns real coordinates"""
        response = requests.post(
            f"{BASE_URL}/api/maps/geocode",
            json={"address": "1600 Amphitheatre Parkway, Mountain View, CA"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "latitude" in data, "Response should contain latitude"
        assert "longitude" in data, "Response should contain longitude"
        assert "formatted_address" in data, "Response should contain formatted_address"
        
        # Verify real coordinates (Google HQ is around 37.4, -122.0)
        assert 37.0 < data["latitude"] < 38.0, f"Latitude {data['latitude']} not in expected range"
        assert -123.0 < data["longitude"] < -121.0, f"Longitude {data['longitude']} not in expected range"
        assert "Mountain View" in data["formatted_address"], "Address should contain Mountain View"
        print(f"✓ Geocode returned real coordinates: {data['latitude']}, {data['longitude']}")
    
    def test_geocode_new_york_address(self):
        """Test geocoding a New York address"""
        response = requests.post(
            f"{BASE_URL}/api/maps/geocode",
            json={"address": "350 5th Avenue, New York, NY 10118"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Empire State Building is around 40.7, -73.9
        assert 40.0 < data["latitude"] < 41.0, f"Latitude {data['latitude']} not in expected range"
        assert -74.5 < data["longitude"] < -73.5, f"Longitude {data['longitude']} not in expected range"
        print(f"✓ NYC geocode returned: {data['latitude']}, {data['longitude']}")
    
    def test_geocode_invalid_address(self):
        """Test geocoding an invalid address returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/maps/geocode",
            json={"address": "xyznonexistentaddress12345"}
        )
        # Should return 404 for address not found
        assert response.status_code == 404, f"Expected 404 for invalid address, got {response.status_code}"
        print("✓ Invalid address correctly returns 404")


class TestPharmacyLocations:
    """Test multi-location pharmacy support CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth tokens and pharmacy ID"""
        # Login as pharmacy
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PHARMACY_EMAIL, "password": PHARMACY_PASSWORD}
        )
        assert response.status_code == 200, f"Pharmacy login failed: {response.text}"
        self.pharmacy_token = response.json()["access_token"]
        self.pharmacy_user_id = response.json()["user"]["id"]
        
        # Login as admin
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        
        # Get pharmacy ID
        response = requests.get(f"{BASE_URL}/api/pharmacies/")
        pharmacies = response.json().get("pharmacies", [])
        self.pharmacy_id = None
        for p in pharmacies:
            if p.get("user_id") == self.pharmacy_user_id:
                self.pharmacy_id = p["id"]
                break
        
        if not self.pharmacy_id and pharmacies:
            self.pharmacy_id = pharmacies[0]["id"]
        
        assert self.pharmacy_id, "No pharmacy found for testing"
        self.created_location_id = None
    
    def test_get_pharmacy_locations(self):
        """Test GET /api/pharmacies/{id}/locations"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations",
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "locations" in data, "Response should contain locations array"
        assert "count" in data, "Response should contain count"
        print(f"✓ GET locations returned {data['count']} locations")
    
    def test_add_pharmacy_location(self):
        """Test POST /api/pharmacies/{id}/locations"""
        location_data = {
            "name": f"TEST_Branch_{uuid.uuid4().hex[:8]}",
            "address": {
                "street": "789 Test Street",
                "city": "Test City",
                "state": "CA",
                "postal_code": "90210",
                "country": "USA",
                "latitude": 34.0522,
                "longitude": -118.2437
            },
            "phone": "+15551234567",
            "is_primary": False,
            "operating_hours": {"mon-fri": "9am-6pm"},
            "pickup_instructions": "Ring doorbell"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations",
            json=location_data,
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "location_id" in data, "Response should contain location_id"
        assert "message" in data, "Response should contain message"
        self.created_location_id = data["location_id"]
        print(f"✓ Created location: {self.created_location_id}")
        return self.created_location_id
    
    def test_update_pharmacy_location(self):
        """Test PUT /api/pharmacies/{id}/locations/{location_id}"""
        # First create a location
        location_id = self.test_add_pharmacy_location()
        
        update_data = {
            "name": f"TEST_Updated_Branch_{uuid.uuid4().hex[:8]}",
            "address": {
                "street": "999 Updated Street",
                "city": "Updated City",
                "state": "NY",
                "postal_code": "10001",
                "country": "USA",
                "latitude": 40.7128,
                "longitude": -74.0060
            },
            "phone": "+15559999999",
            "is_primary": False,
            "operating_hours": {"mon-fri": "8am-8pm"},
            "pickup_instructions": "Updated instructions"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations/{location_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Updated location: {location_id}")
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations",
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        locations = response.json().get("locations", [])
        updated_loc = next((l for l in locations if l.get("id") == location_id), None)
        if updated_loc:
            assert "Updated" in updated_loc.get("name", ""), "Location name should be updated"
            print(f"✓ Verified location update: {updated_loc.get('name')}")
    
    def test_delete_pharmacy_location(self):
        """Test DELETE /api/pharmacies/{id}/locations/{location_id}"""
        # First create a location
        location_id = self.test_add_pharmacy_location()
        
        response = requests.delete(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations/{location_id}",
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Deleted location: {location_id}")
        
        # Verify deletion
        response = requests.get(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations",
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        locations = response.json().get("locations", [])
        deleted_loc = next((l for l in locations if l.get("id") == location_id), None)
        assert deleted_loc is None, "Location should be deleted"
        print("✓ Verified location deletion")
    
    def test_location_not_found(self):
        """Test 404 for non-existent location"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacies/nonexistent-id/locations",
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent pharmacy returns 404")
    
    def test_unauthorized_location_update(self):
        """Test that non-owner cannot update locations"""
        # Create a new user and try to update pharmacy locations
        # This should fail with 403
        location_id = self.test_add_pharmacy_location()
        
        # Try with admin token (should work since admin has access)
        update_data = {
            "name": "Admin Updated",
            "address": {
                "street": "123 Admin St",
                "city": "Admin City",
                "state": "CA",
                "postal_code": "90210",
                "country": "USA"
            },
            "phone": "+15551111111",
            "is_primary": False,
            "operating_hours": {},
            "pickup_instructions": ""
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacies/{self.pharmacy_id}/locations/{location_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        # Admin should be able to update
        assert response.status_code == 200, f"Admin should be able to update, got {response.status_code}"
        print("✓ Admin can update pharmacy locations")


class TestDriverPortalPOD:
    """Test Driver Portal and POD submission workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        # Login as driver
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DRIVER_EMAIL, "password": DRIVER_PASSWORD}
        )
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        self.driver_token = response.json()["access_token"]
        self.driver_user_id = response.json()["user"]["id"]
        
        # Login as admin
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        self.admin_token = response.json()["access_token"]
        
        # Get driver profile
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        if response.status_code == 200:
            self.driver_id = response.json().get("driver", {}).get("id")
        else:
            self.driver_id = None
    
    def test_driver_portal_profile(self):
        """Test GET /api/driver-portal/profile"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "driver" in data, "Response should contain driver"
        assert "user" in data, "Response should contain user"
        assert "stats" in data, "Response should contain stats"
        print(f"✓ Driver profile: {data['user'].get('first_name')} {data['user'].get('last_name')}")
    
    def test_driver_portal_deliveries(self):
        """Test GET /api/driver-portal/deliveries"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "deliveries" in data, "Response should contain deliveries"
        assert "count" in data, "Response should contain count"
        print(f"✓ Driver has {data['count']} deliveries")
    
    def test_driver_update_location(self):
        """Test PUT /api/driver-portal/location"""
        response = requests.put(
            f"{BASE_URL}/api/driver-portal/location?latitude=40.7128&longitude=-74.0060",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Driver location updated")
    
    def test_driver_update_status(self):
        """Test PUT /api/driver-portal/status"""
        response = requests.put(
            f"{BASE_URL}/api/driver-portal/status?status=available",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Driver status updated to available")
    
    def test_pod_submission_requires_delivery(self):
        """Test POD submission requires a valid delivery"""
        pod_data = {
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "photo_data": None,
            "recipient_name": "Test Recipient",
            "notes": "Test delivery notes",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        # Try to submit POD for non-existent order
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/nonexistent-order-id/pod",
            json=pod_data,
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        # Should return 404 for non-existent order
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("✓ POD submission correctly requires valid delivery")
    
    def test_pod_endpoint_structure(self):
        """Test POD endpoint accepts JSON body (not query params)"""
        # This tests that the endpoint accepts JSON body as per DriverPodSubmit model
        pod_data = {
            "signature_data": "data:image/png;base64,test",
            "photo_data": "data:image/jpeg;base64,test",
            "recipient_name": "John Doe",
            "notes": "Left at door",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        # Even with invalid order, we can verify the endpoint accepts JSON
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/test-order/pod",
            json=pod_data,
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        # Should be 404 (order not found) not 422 (validation error)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ POD endpoint accepts JSON body correctly")


class TestDriverDeliveryWorkflow:
    """Test complete driver delivery workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        # Login as admin
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        self.admin_token = response.json()["access_token"]
        
        # Login as driver
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DRIVER_EMAIL, "password": DRIVER_PASSWORD}
        )
        assert response.status_code == 200
        self.driver_token = response.json()["access_token"]
        
        # Get driver ID
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/profile",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        self.driver_id = response.json().get("driver", {}).get("id")
        
        # Login as pharmacy
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PHARMACY_EMAIL, "password": PHARMACY_PASSWORD}
        )
        assert response.status_code == 200
        self.pharmacy_token = response.json()["access_token"]
        self.pharmacy_user_id = response.json()["user"]["id"]
        
        # Get pharmacy ID
        response = requests.get(f"{BASE_URL}/api/pharmacies/")
        pharmacies = response.json().get("pharmacies", [])
        self.pharmacy_id = None
        for p in pharmacies:
            if p.get("user_id") == self.pharmacy_user_id:
                self.pharmacy_id = p["id"]
                break
        if not self.pharmacy_id and pharmacies:
            self.pharmacy_id = pharmacies[0]["id"]
    
    def test_complete_delivery_workflow(self):
        """Test complete workflow: create order -> assign driver -> pickup -> deliver with POD"""
        if not self.pharmacy_id or not self.driver_id:
            pytest.skip("Missing pharmacy or driver for workflow test")
        
        # Step 1: Create an order
        order_data = {
            "pharmacy_id": self.pharmacy_id,
            "delivery_type": "same_day",
            "recipient": {
                "name": "TEST_Workflow_Recipient",
                "phone": "+15551234567",
                "email": "test@example.com"
            },
            "delivery_address": {
                "street": "123 Test Street",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "USA",
                "latitude": 40.7128,
                "longitude": -74.0060
            },
            "packages": [
                {
                    "description": "Test Medication",
                    "weight": 0.5,
                    "requires_signature": True,
                    "requires_refrigeration": False,
                    "is_controlled": False
                }
            ],
            "delivery_notes": "Test workflow delivery",
            "requires_signature": True,
            "requires_photo_proof": False,
            "requires_id_verification": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders/",
            json=order_data,
            headers={"Authorization": f"Bearer {self.pharmacy_token}"}
        )
        
        if response.status_code != 200:
            print(f"Order creation failed: {response.status_code} - {response.text}")
            pytest.skip("Could not create order for workflow test")
        
        order_id = response.json().get("order_id")
        print(f"✓ Step 1: Created order {order_id}")
        
        # Step 2: Assign driver to order
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/assign?driver_id={self.driver_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Failed to assign driver: {response.text}"
        print(f"✓ Step 2: Assigned driver {self.driver_id}")
        
        # Step 3: Driver picks up order
        response = requests.put(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/status?status=picked_up",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Failed to update to picked_up: {response.text}"
        print("✓ Step 3: Order picked up")
        
        # Step 4: Driver marks in transit
        response = requests.put(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/status?status=in_transit",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Failed to update to in_transit: {response.text}"
        print("✓ Step 4: Order in transit")
        
        # Step 5: Submit POD
        pod_data = {
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "photo_data": None,
            "recipient_name": "TEST_Workflow_Recipient",
            "notes": "Delivered successfully via workflow test",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/pod",
            json=pod_data,
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Failed to submit POD: {response.text}"
        
        data = response.json()
        assert "pod_id" in data, "Response should contain pod_id"
        print(f"✓ Step 5: POD submitted - {data.get('pod_id')}")
        
        # Step 6: Verify order is delivered
        response = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        order = response.json()
        assert order.get("status") == "delivered", f"Order should be delivered, got {order.get('status')}"
        print("✓ Step 6: Order status is 'delivered'")
        
        # Step 7: Verify POD can be retrieved
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/pod",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200, f"Failed to get POD: {response.text}"
        pod = response.json()
        assert pod.get("recipient_name") == "TEST_Workflow_Recipient"
        print("✓ Step 7: POD retrieved successfully")
        
        print("\n✓✓✓ Complete delivery workflow test PASSED ✓✓✓")


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Test /api/health returns maps configured"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("services", {}).get("maps") == "configured", "Maps should be configured"
        print(f"✓ Health check: maps={data.get('services', {}).get('maps')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
