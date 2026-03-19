"""
Backend API Tests for Druglift-style Gig Management
Tests per-order unassign and split gig functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://driver-pod-camera.preview.emergentagent.com')

class TestGigManagementDruglift:
    """Test Druglift-style gig management workflow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rxexpresss.com", "password": "Admin@123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # Per-order unassign tests
    def test_per_order_unassign_endpoint_exists(self, auth_headers):
        """Verify per-order unassign endpoint is accessible"""
        # Test with non-existent gig ID to check route exists
        response = requests.post(
            f"{BASE_URL}/api/routes/99999/orders/1/unassign",
            headers=auth_headers
        )
        # Should return 404 (not found) not 405 (method not allowed) or 500
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
    
    def test_per_order_unassign_works(self, auth_headers):
        """Test that per-order unassign changes order status but keeps it in gig"""
        # First, find a gig with assigned orders
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        assert response.status_code == 200
        gigs = response.json().get("plans", [])
        
        # Find a gig with orders we can test on
        test_gig_id = None
        test_order_id = None
        
        for gig in gigs:
            gig_detail = requests.get(
                f"{BASE_URL}/api/routes/{gig['id']}", 
                headers=auth_headers
            ).json()
            orders = gig_detail.get("orders", [])
            # Find an order that's currently assigned
            for order in orders:
                if order.get("status") == "assigned" and order.get("driverName"):
                    test_gig_id = gig['id']
                    test_order_id = order['id']
                    break
            if test_gig_id:
                break
        
        if not test_gig_id:
            pytest.skip("No assigned orders found to test unassign")
        
        # Perform unassign
        response = requests.post(
            f"{BASE_URL}/api/routes/{test_gig_id}/orders/{test_order_id}/unassign",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Unassign failed: {response.text}"
        
        # Verify response
        data = response.json()
        assert "message" in data
        assert "Driver unassigned" in data["message"]
        
        # Verify order is still in gig but now has status "new"
        gig_detail = requests.get(
            f"{BASE_URL}/api/routes/{test_gig_id}",
            headers=auth_headers
        ).json()
        
        order_in_gig = next(
            (o for o in gig_detail.get("orders", []) if o["id"] == test_order_id), 
            None
        )
        assert order_in_gig is not None, "Order should still be in gig after unassign"
        assert order_in_gig["status"] == "new", f"Order status should be 'new' but is {order_in_gig['status']}"
    
    def test_unassign_non_assigned_order_fails(self, auth_headers):
        """Test that unassigning an already unassigned order fails"""
        # Find an order with status "new" (not assigned)
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        gigs = response.json().get("plans", [])
        
        for gig in gigs:
            gig_detail = requests.get(
                f"{BASE_URL}/api/routes/{gig['id']}", 
                headers=auth_headers
            ).json()
            orders = gig_detail.get("orders", [])
            for order in orders:
                if order.get("status") == "new":
                    # Try to unassign - should fail
                    response = requests.post(
                        f"{BASE_URL}/api/routes/{gig['id']}/orders/{order['id']}/unassign",
                        headers=auth_headers
                    )
                    assert response.status_code == 400, "Should not be able to unassign non-assigned order"
                    return
        
        pytest.skip("No unassigned orders found to test")
    
    # Split gig tests
    def test_split_gig_preserves_driver(self, auth_headers):
        """Test that split gig keeps assigned driver with moved orders"""
        # Find a gig with multiple assigned orders
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        gigs = response.json().get("plans", [])
        
        test_gig_id = None
        test_order_ids = []
        expected_driver = None
        
        for gig in gigs:
            if gig.get("orderCount", 0) >= 2:
                gig_detail = requests.get(
                    f"{BASE_URL}/api/routes/{gig['id']}", 
                    headers=auth_headers
                ).json()
                orders = gig_detail.get("orders", [])
                assigned_orders = [o for o in orders if o.get("status") == "assigned" and o.get("driverName")]
                if len(assigned_orders) >= 2:
                    test_gig_id = gig['id']
                    test_order_ids = [assigned_orders[0]['id']]  # Move just one order
                    expected_driver = assigned_orders[0].get('driverName')
                    break
        
        if not test_gig_id:
            pytest.skip("No gig with 2+ assigned orders found")
        
        # Perform split
        response = requests.post(
            f"{BASE_URL}/api/routes/{test_gig_id}/split",
            headers=auth_headers,
            json={
                "newTitle": "TEST_Split_Driver_Preserved",
                "orderIds": test_order_ids
            }
        )
        assert response.status_code == 200, f"Split failed: {response.text}"
        
        new_gig_id = response.json().get("newPlanId")
        assert new_gig_id is not None
        
        # Verify new gig has the driver preserved
        new_gig = requests.get(
            f"{BASE_URL}/api/routes/{new_gig_id}",
            headers=auth_headers
        ).json()
        
        orders = new_gig.get("orders", [])
        assert len(orders) == 1, "New gig should have 1 order"
        assert orders[0]["driverName"] == expected_driver, "Driver should be preserved after split"
        assert orders[0]["status"] == "assigned", "Order should remain assigned after split"
        
        # Verify new gig has driver in drivers list
        drivers = new_gig.get("drivers", [])
        driver_names = [d.get("name") for d in drivers]
        assert expected_driver in driver_names, "Driver should be in new gig's driver list"
        
        # Cleanup - delete test gig
        requests.delete(f"{BASE_URL}/api/routes/{new_gig_id}", headers=auth_headers)
    
    def test_split_gig_updates_order_route_plan_id(self, auth_headers):
        """Test that split gig updates order's RoutePlanId to new gig"""
        # Find a gig with at least 2 orders
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        gigs = response.json().get("plans", [])
        
        for gig in gigs:
            if gig.get("orderCount", 0) >= 2:
                gig_detail = requests.get(
                    f"{BASE_URL}/api/routes/{gig['id']}", 
                    headers=auth_headers
                ).json()
                orders = gig_detail.get("orders", [])
                if len(orders) >= 2:
                    test_gig_id = gig['id']
                    test_order_id = orders[0]['id']
                    
                    # Split gig
                    response = requests.post(
                        f"{BASE_URL}/api/routes/{test_gig_id}/split",
                        headers=auth_headers,
                        json={
                            "newTitle": "TEST_Split_RoutePlanId",
                            "orderIds": [test_order_id]
                        }
                    )
                    assert response.status_code == 200
                    
                    new_gig_id = response.json().get("newPlanId")
                    
                    # Verify order is in new gig
                    new_gig = requests.get(
                        f"{BASE_URL}/api/routes/{new_gig_id}",
                        headers=auth_headers
                    ).json()
                    
                    order_ids_in_new = [o["id"] for o in new_gig.get("orders", [])]
                    assert test_order_id in order_ids_in_new, "Order should be in new gig"
                    
                    # Verify order is not in original gig
                    original_gig = requests.get(
                        f"{BASE_URL}/api/routes/{test_gig_id}",
                        headers=auth_headers
                    ).json()
                    
                    order_ids_in_original = [o["id"] for o in original_gig.get("orders", [])]
                    assert test_order_id not in order_ids_in_original, "Order should not be in original gig"
                    
                    # Cleanup
                    requests.delete(f"{BASE_URL}/api/routes/{new_gig_id}", headers=auth_headers)
                    return
        
        pytest.skip("No gig with 2+ orders found")


class TestQRCodeDisplay:
    """Test QR code display functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rxexpresss.com", "password": "Admin@123"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_orders_have_qr_codes(self, auth_headers):
        """Test that orders have QR code field"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        assert len(orders) > 0, "Should have some orders"
        
        # Check that orders have qrCode field
        for order in orders[:5]:  # Check first 5
            assert "qrCode" in order, "Order should have qrCode field"
    
    def test_qrserver_api_accessible(self):
        """Test that qrserver.com API is accessible"""
        test_code = "TEST123"
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={test_code}"
        
        response = requests.get(qr_url)
        assert response.status_code == 200, "QR server should be accessible"
        assert "image/png" in response.headers.get("content-type", ""), "Should return PNG image"


class TestGigListAndDetail:
    """Test gig list and detail API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rxexpresss.com", "password": "Admin@123"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_all_gigs(self, auth_headers):
        """Test listing all gigs"""
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert "count" in data
        assert len(data["plans"]) == data["count"]
    
    def test_get_gig_detail_includes_orders(self, auth_headers):
        """Test gig detail includes orders with driver info"""
        response = requests.get(f"{BASE_URL}/api/routes", headers=auth_headers)
        gigs = response.json().get("plans", [])
        
        if not gigs:
            pytest.skip("No gigs available")
        
        gig_id = gigs[0]["id"]
        response = requests.get(f"{BASE_URL}/api/routes/{gig_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "orders" in data
        assert "drivers" in data
        assert "stats" in data
        
        # Check order structure
        for order in data["orders"]:
            assert "id" in order
            assert "orderNumber" in order
            assert "qrCode" in order
            assert "status" in order
            assert "city" in order


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
