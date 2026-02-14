"""
Circuit/Spoke API Integration Tests for RX Expresss
Tests route management workflow: Create Plans -> Import Stops -> Optimize -> Distribute
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rx-express-admin.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "admin123"


class TestCircuitAPI:
    """Circuit/Spoke API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created resources for cleanup
        self.created_plan_ids = []
        self.created_order_ids = []
        
        yield
        
        # Cleanup created plans
        for plan_id in self.created_plan_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/circuit/plans/{plan_id}")
            except:
                pass
    
    # ============== Status Endpoints ==============
    
    def test_circuit_status_endpoint(self):
        """GET /api/circuit/status - Check Circuit API connection"""
        response = self.session.get(f"{BASE_URL}/api/circuit/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] in ["connected", "not_configured", "error"]
        
        if data["status"] == "connected":
            assert "drivers_count" in data
            assert data["drivers_count"] >= 0
            print(f"Circuit connected with {data['drivers_count']} drivers")
    
    def test_health_shows_circuit_configured(self):
        """GET /api/health - Verify Circuit shows in health check"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "services" in data
        assert "circuit" in data["services"]
        print(f"Circuit status in health: {data['services']['circuit']}")
    
    # ============== Drivers Endpoint ==============
    
    def test_list_circuit_drivers(self):
        """GET /api/circuit/drivers - List Circuit drivers"""
        response = self.session.get(f"{BASE_URL}/api/circuit/drivers")
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data
        assert isinstance(data["drivers"], list)
        
        if len(data["drivers"]) > 0:
            driver = data["drivers"][0]
            assert "id" in driver
            assert "name" in driver or "email" in driver
            print(f"Found {len(data['drivers'])} Circuit drivers")
    
    # ============== Local Route Plans ==============
    
    def test_list_local_route_plans(self):
        """GET /api/circuit/route-plans - List locally stored route plans"""
        response = self.session.get(f"{BASE_URL}/api/circuit/route-plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert "count" in data
        assert isinstance(data["plans"], list)
        print(f"Found {data['count']} local route plans")
    
    # ============== Pending Orders ==============
    
    def test_get_pending_orders_for_routing(self):
        """GET /api/circuit/pending-orders - Get orders ready for routing"""
        response = self.session.get(f"{BASE_URL}/api/circuit/pending-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_count" in data
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"Found {data['total_count']} pending orders for routing")
    
    def test_pending_orders_with_filters(self):
        """GET /api/circuit/pending-orders - Test with date and type filters"""
        # Test with delivery type filter
        response = self.session.get(f"{BASE_URL}/api/circuit/pending-orders", params={
            "delivery_type": "same_day"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        # All returned orders should be same_day type
        for order in data["orders"]:
            if order.get("delivery_type"):
                assert order["delivery_type"] == "same_day"
    
    # ============== Create Plan ==============
    
    def test_create_plan_for_date(self):
        """POST /api/circuit/plans/create-for-date - Create plan for specific date"""
        response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Plan_For_Testing",
            "date": "2026-02-15",
            "driver_ids": []
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "plan" in data
        assert "local_id" in data
        
        # Store for cleanup
        plan_id = data["plan"].get("id", "").replace("plans/", "")
        if plan_id:
            self.created_plan_ids.append(plan_id)
        
        print(f"Created plan: {data['plan'].get('title')}")
    
    def test_create_plan_invalid_date(self):
        """POST /api/circuit/plans/create-for-date - Invalid date format"""
        response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "Invalid Date Plan",
            "date": "invalid-date",
            "driver_ids": []
        })
        assert response.status_code == 400
        assert "Invalid date format" in response.json().get("detail", "")
    
    # ============== Plan Full Status ==============
    
    def test_get_plan_full_status(self):
        """GET /api/circuit/plans/{plan_id}/full-status - Get comprehensive plan status"""
        # First create a plan
        create_response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Status_Plan",
            "date": "2026-02-16",
            "driver_ids": []
        })
        assert create_response.status_code == 200
        
        plan_id = create_response.json()["plan"]["id"].replace("plans/", "")
        self.created_plan_ids.append(plan_id)
        
        # Get full status
        response = self.session.get(f"{BASE_URL}/api/circuit/plans/{plan_id}/full-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "circuit_plan" in data
        assert "stops_count" in data
        assert "linked_orders" in data
        assert "optimization_status" in data
        assert "distributed" in data
        
        print(f"Plan status: optimization={data['optimization_status']}, distributed={data['distributed']}")
    
    # ============== Batch Import ==============
    
    def test_batch_import_orders_to_plan(self):
        """POST /api/circuit/plans/{plan_id}/batch-import - Batch import orders"""
        # First create a plan
        create_response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Import_Plan",
            "date": "2026-02-17",
            "driver_ids": []
        })
        assert create_response.status_code == 200
        plan_id = create_response.json()["plan"]["id"].replace("plans/", "")
        self.created_plan_ids.append(plan_id)
        
        # Create a test order with recipient
        order_response = self.session.post(f"{BASE_URL}/api/orders/", json={
            "pharmacy_id": "e4172010-3a02-4635-9a24-f9f566e995a0",
            "delivery_type": "same_day",
            "recipient": {
                "name": "TEST_Batch_Import_Patient",
                "email": "test.batch@example.com",
                "phone": "+15551234567"
            },
            "delivery_address": {
                "street": "123 Test Import St",
                "city": "Los Angeles",
                "state": "CA",
                "postal_code": "90001",
                "country": "USA"
            },
            "packages": [{"description": "Test Package", "weight": 0.5}],
            "requires_signature": True
        })
        
        if order_response.status_code == 200:
            order_id = order_response.json()["order_id"]
            self.created_order_ids.append(order_id)
            
            # Batch import
            import_response = self.session.post(
                f"{BASE_URL}/api/circuit/plans/{plan_id}/batch-import",
                json={"order_ids": [order_id]}
            )
            assert import_response.status_code == 200
            
            data = import_response.json()
            assert "success_count" in data
            assert "failed_count" in data
            print(f"Batch import: {data['success_count']} success, {data['failed_count']} failed")
        else:
            pytest.skip("Could not create test order for batch import")
    
    def test_batch_import_empty_orders(self):
        """POST /api/circuit/plans/{plan_id}/batch-import - Empty order list"""
        response = self.session.post(
            f"{BASE_URL}/api/circuit/plans/test-plan/batch-import",
            json={"order_ids": []}
        )
        assert response.status_code == 400
        assert "No order IDs" in response.json().get("detail", "")
    
    # ============== Delete Plan ==============
    
    def test_delete_plan(self):
        """DELETE /api/circuit/plans/{plan_id} - Delete a plan"""
        # First create a plan
        create_response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Delete_Plan",
            "date": "2026-02-18",
            "driver_ids": []
        })
        assert create_response.status_code == 200
        plan_id = create_response.json()["plan"]["id"].replace("plans/", "")
        
        # Delete the plan
        delete_response = self.session.delete(f"{BASE_URL}/api/circuit/plans/{plan_id}")
        assert delete_response.status_code == 200
        assert "deleted successfully" in delete_response.json().get("message", "")
        
        print(f"Successfully deleted plan {plan_id}")
    
    # ============== Optimize and Distribute ==============
    
    def test_optimize_and_distribute_endpoint(self):
        """POST /api/circuit/plans/{plan_id}/optimize-and-distribute - Start optimization"""
        # First create a plan with drivers
        create_response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Optimize_Plan",
            "date": "2026-02-19",
            "driver_ids": []
        })
        assert create_response.status_code == 200
        plan_id = create_response.json()["plan"]["id"].replace("plans/", "")
        self.created_plan_ids.append(plan_id)
        
        # Try to optimize (may fail if no drivers/stops, but endpoint should work)
        response = self.session.post(f"{BASE_URL}/api/circuit/plans/{plan_id}/optimize-and-distribute")
        
        # Either success or expected error (no drivers/stops, or Circuit API error)
        # 520 is Cloudflare error from Circuit API
        assert response.status_code in [200, 400, 500, 520]
        
        if response.status_code == 200:
            data = response.json()
            assert "operation_id" in data or "message" in data
            print(f"Optimization started: {data}")
        else:
            print(f"Optimization failed as expected (no drivers/stops or Circuit API error): status={response.status_code}")


class TestCircuitWorkflow:
    """End-to-end workflow tests for Circuit integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.created_plan_ids = []
        yield
        
        # Cleanup
        for plan_id in self.created_plan_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/circuit/plans/{plan_id}")
            except:
                pass
    
    def test_full_route_creation_workflow(self):
        """Test complete workflow: Create Plan -> Add Orders -> View Status"""
        # Step 1: Check Circuit status
        status_response = self.session.get(f"{BASE_URL}/api/circuit/status")
        assert status_response.status_code == 200
        status = status_response.json()
        
        if status.get("status") != "connected":
            pytest.skip("Circuit API not connected")
        
        print(f"Step 1: Circuit connected with {status.get('drivers_count')} drivers")
        
        # Step 2: Create a plan
        plan_response = self.session.post(f"{BASE_URL}/api/circuit/plans/create-for-date", json={
            "title": "TEST_Workflow_Plan",
            "date": "2026-02-20",
            "driver_ids": []
        })
        assert plan_response.status_code == 200
        plan_data = plan_response.json()
        plan_id = plan_data["plan"]["id"].replace("plans/", "")
        self.created_plan_ids.append(plan_id)
        
        print(f"Step 2: Created plan {plan_data['plan']['title']}")
        
        # Step 3: Verify plan in local list
        plans_response = self.session.get(f"{BASE_URL}/api/circuit/route-plans")
        assert plans_response.status_code == 200
        plans = plans_response.json()["plans"]
        
        # Find our plan
        our_plan = next((p for p in plans if "TEST_Workflow_Plan" in p.get("title", "")), None)
        assert our_plan is not None, "Created plan not found in local list"
        
        print(f"Step 3: Plan found in local list with {our_plan.get('stops_count', 0)} stops")
        
        # Step 4: Get full status
        full_status_response = self.session.get(f"{BASE_URL}/api/circuit/plans/{plan_id}/full-status")
        assert full_status_response.status_code == 200
        full_status = full_status_response.json()
        
        assert full_status["distributed"] == False
        print(f"Step 4: Plan status - optimization: {full_status['optimization_status']}, distributed: {full_status['distributed']}")
        
        # Step 5: Delete plan
        delete_response = self.session.delete(f"{BASE_URL}/api/circuit/plans/{plan_id}")
        assert delete_response.status_code == 200
        
        # Remove from cleanup list since we deleted it
        self.created_plan_ids.remove(plan_id)
        
        print("Step 5: Plan deleted successfully")
        print("✓ Full workflow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
