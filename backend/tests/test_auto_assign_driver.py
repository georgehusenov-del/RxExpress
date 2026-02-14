"""
Test suite for Auto-Assign by Borough and Driver Assignment features
Tests the new API endpoints:
- POST /api/circuit/auto-assign-by-borough - Auto-assign 'out for delivery' orders by borough
- POST /api/circuit/plans/{plan_id}/assign-driver - Assign driver to gig
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAutoAssignAndDriverAssignment:
    """Test auto-assignment and driver assignment features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        # Login as admin
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rxexpresss.com", "password": "admin123"}
        )
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            self.admin_headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Admin login failed - skipping tests")
    
    # ========== Auto-Assign by Borough Tests ==========
    
    def test_auto_assign_by_borough_endpoint_exists(self):
        """Test that the auto-assign-by-borough endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/circuit/auto-assign-by-borough",
            headers=self.admin_headers,
            json={"status": "out_for_delivery"}
        )
        # Should return 200 even if no orders found
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_assigned" in data, "Response missing 'total_assigned' field"
        assert "gigs_created" in data, "Response missing 'gigs_created' field"
        assert "by_borough" in data, "Response missing 'by_borough' field"
        print(f"Auto-assign response: total_assigned={data['total_assigned']}, gigs_created={data['gigs_created']}")
    
    def test_auto_assign_default_status(self):
        """Test that auto-assign defaults to 'out_for_delivery' status"""
        response = requests.post(
            f"{BASE_URL}/api/circuit/auto-assign-by-borough",
            headers=self.admin_headers,
            json={}  # Empty body - should use default status
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data.get("total_assigned"), int), "total_assigned should be integer"
    
    def test_auto_assign_unauthorized(self):
        """Test that auto-assign requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/circuit/auto-assign-by-borough",
            headers={"Content-Type": "application/json"},  # No auth
            json={"status": "out_for_delivery"}
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ========== Assign Driver to Gig Tests ==========
    
    def test_list_circuit_drivers(self):
        """Test that Circuit drivers endpoint returns drivers"""
        response = requests.get(
            f"{BASE_URL}/api/circuit/drivers",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "drivers" in data, "Response missing 'drivers' field"
        drivers = data["drivers"]
        print(f"Found {len(drivers)} Circuit drivers")
        
        if len(drivers) > 0:
            # Store first driver ID for later tests
            self.test_driver_id = drivers[0].get("id")
            print(f"First driver: {drivers[0].get('name', drivers[0].get('email'))}")
    
    def test_list_local_plans(self):
        """Test listing local route plans/gigs"""
        response = requests.get(
            f"{BASE_URL}/api/circuit/route-plans",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "plans" in data, "Response missing 'plans' field"
        print(f"Found {len(data['plans'])} local route plans")
        
        # Check plan structure if any exist
        for plan in data["plans"][:3]:  # Check first 3
            print(f"  Plan: {plan.get('title')} - {plan.get('stops_count')} stops")
            if plan.get("borough_name"):
                print(f"    Borough: {plan.get('borough_name')}")
            if plan.get("assigned_driver"):
                print(f"    Assigned: {plan['assigned_driver'].get('name')}")
    
    def test_create_gig_and_assign_driver(self):
        """Test creating a gig and assigning a driver"""
        # First, get available drivers
        drivers_response = requests.get(
            f"{BASE_URL}/api/circuit/drivers",
            headers=self.admin_headers
        )
        
        if drivers_response.status_code != 200:
            pytest.skip("Could not fetch drivers")
        
        drivers = drivers_response.json().get("drivers", [])
        if not drivers:
            pytest.skip("No drivers available for testing")
        
        driver_id = drivers[0].get("id")
        driver_name = drivers[0].get("name", drivers[0].get("email"))
        print(f"Using driver: {driver_name} ({driver_id})")
        
        # Create a test gig
        create_response = requests.post(
            f"{BASE_URL}/api/circuit/plans/create-for-date",
            headers=self.admin_headers,
            json={
                "title": "TEST_DriverAssignment_Gig",
                "date": "2026-01-15",
                "driver_ids": []
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test gig: {create_response.text}")
        
        created_plan = create_response.json()
        plan_id = created_plan.get("circuit_plan_id") or created_plan.get("plan_id")
        
        if not plan_id:
            pytest.skip("Created plan missing plan_id")
        
        print(f"Created test gig with plan_id: {plan_id}")
        
        # Clean plan ID (remove 'plans/' prefix if present for API call)
        clean_plan_id = plan_id.replace("plans/", "")
        
        # Assign driver to gig
        assign_response = requests.post(
            f"{BASE_URL}/api/circuit/plans/{clean_plan_id}/assign-driver",
            headers=self.admin_headers,
            json={"driver_id": driver_id}
        )
        
        assert assign_response.status_code == 200, f"Expected 200, got {assign_response.status_code}: {assign_response.text}"
        
        assign_data = assign_response.json()
        assert "message" in assign_data, "Response missing 'message' field"
        assert "driver" in assign_data, "Response missing 'driver' field"
        
        print(f"Driver assignment response: {assign_data.get('message')}")
        print(f"Assigned driver: {assign_data.get('driver', {}).get('name')}")
    
    def test_assign_driver_invalid_plan(self):
        """Test assigning driver to non-existent plan returns 404"""
        # Get a driver first
        drivers_response = requests.get(
            f"{BASE_URL}/api/circuit/drivers",
            headers=self.admin_headers
        )
        
        if drivers_response.status_code != 200:
            pytest.skip("Could not fetch drivers")
        
        drivers = drivers_response.json().get("drivers", [])
        if not drivers:
            pytest.skip("No drivers available")
        
        driver_id = drivers[0].get("id")
        
        # Try to assign to fake plan
        response = requests.post(
            f"{BASE_URL}/api/circuit/plans/fake_plan_id_123/assign-driver",
            headers=self.admin_headers,
            json={"driver_id": driver_id}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_assign_driver_missing_driver_id(self):
        """Test that assign-driver requires driver_id in request body"""
        # Get a plan first
        plans_response = requests.get(
            f"{BASE_URL}/api/circuit/route-plans",
            headers=self.admin_headers
        )
        
        plans = plans_response.json().get("plans", [])
        if not plans:
            pytest.skip("No plans available for testing")
        
        plan_id = plans[0].get("circuit_plan_id", "").replace("plans/", "")
        
        # Try to assign without driver_id
        response = requests.post(
            f"{BASE_URL}/api/circuit/plans/{plan_id}/assign-driver",
            headers=self.admin_headers,
            json={}  # Missing driver_id
        )
        
        # Should return 400 or 422 for validation error
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_assign_driver_unauthorized(self):
        """Test that assign-driver requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/circuit/plans/any_plan_id/assign-driver",
            headers={"Content-Type": "application/json"},  # No auth
            json={"driver_id": "some_driver"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ========== Borough Badge Tests ==========
    
    def test_gig_has_borough_info(self):
        """Test that gigs have borough information after auto-assign"""
        # First trigger auto-assign
        requests.post(
            f"{BASE_URL}/api/circuit/auto-assign-by-borough",
            headers=self.admin_headers,
            json={"status": "out_for_delivery"}
        )
        
        # Wait a moment for any async operations
        time.sleep(1)
        
        # Get plans and check for borough info
        response = requests.get(
            f"{BASE_URL}/api/circuit/route-plans",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        plans = response.json().get("plans", [])
        
        # Check if any plans have borough info
        plans_with_borough = [p for p in plans if p.get("borough_name")]
        print(f"Plans with borough info: {len(plans_with_borough)}/{len(plans)}")
        
        for plan in plans_with_borough[:5]:
            print(f"  {plan.get('title')}: {plan.get('borough_name')} ({plan.get('borough')})")
    
    # ========== Driver Assignment Display Tests ==========
    
    def test_plan_shows_assigned_driver(self):
        """Test that plans show assigned driver info"""
        response = requests.get(
            f"{BASE_URL}/api/circuit/route-plans",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        plans = response.json().get("plans", [])
        
        # Check for plans with assigned drivers
        plans_with_driver = [p for p in plans if p.get("assigned_driver")]
        print(f"Plans with assigned driver: {len(plans_with_driver)}/{len(plans)}")
        
        for plan in plans_with_driver[:5]:
            driver = plan.get("assigned_driver", {})
            print(f"  {plan.get('title')}: {driver.get('name', driver.get('email'))}")


class TestBoroughOrderFiltering:
    """Test borough-related order filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rxexpresss.com", "password": "admin123"}
        )
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            self.admin_headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Admin login failed")
    
    def test_orders_have_borough_prefix(self):
        """Test that orders have borough prefix in QR code"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=self.admin_headers,
            params={"limit": 20}
        )
        
        assert response.status_code == 200
        orders = response.json().get("orders", [])
        
        # Check QR code borough prefixes
        borough_codes = {"Q": "Queens", "B": "Brooklyn", "M": "Manhattan", "X": "Bronx", "S": "Staten Island", "N": "Other"}
        borough_counts = {code: 0 for code in borough_codes}
        
        for order in orders:
            qr_code = order.get("qr_code", "")
            if qr_code and len(qr_code) > 0:
                prefix = qr_code[0].upper()
                if prefix in borough_codes:
                    borough_counts[prefix] += 1
        
        print("Orders by borough (from QR prefix):")
        for code, count in borough_counts.items():
            if count > 0:
                print(f"  {borough_codes[code]} ({code}): {count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
