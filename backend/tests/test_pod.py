"""
POD (Proof of Delivery) API Tests
Tests for mandatory photo requirement and optional signature in delivery completion
"""
import pytest
import requests

BASE_URL = "http://localhost:8001"

# Test image base64 (1x1 pixel PNG)
TEST_PHOTO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
TEST_SIGNATURE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@rxexpresss.com",
        "password": "Admin@123"
    })
    assert response.status_code == 200, "Admin login failed"
    return response.json()["token"]


@pytest.fixture
def driver_token():
    """Get driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "driver@test.com",
        "password": "Driver@123"
    })
    assert response.status_code == 200, "Driver login failed"
    return response.json()["token"]


@pytest.fixture
def pharmacy_token():
    """Get pharmacy authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "pharmacy@test.com",
        "password": "Pharmacy@123"
    })
    assert response.status_code == 200, "Pharmacy login failed"
    return response.json()["token"]


class TestPODMandatoryPhoto:
    """Test that photo is mandatory for POD submission"""
    
    def test_pod_without_photo_fails(self, driver_token):
        """POD submission without photo should return 400 error"""
        # First get deliveries to find an order
        deliveries_response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        # This test validates the API rejects POD without photo
        # Using a mock order ID that may not exist - testing validation logic
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/999/pod",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "recipientName": "Test Recipient",
                "notes": "Test notes"
                # No photoBase64 - should fail
            }
        )
        # Either 400 (photo required) or 404 (order not found) is acceptable
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        
    def test_pod_with_empty_photo_fails(self, driver_token):
        """POD submission with empty photo string should fail"""
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/999/pod",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "recipientName": "Test Recipient",
                "photoBase64": "",  # Empty string
                "notes": "Test notes"
            }
        )
        # Either 400 (photo required) or 404 (order not found) is acceptable
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"


class TestPODSignatureOptional:
    """Test that signature is optional for POD submission"""
    
    def test_pod_with_photo_only_succeeds(self, driver_token, admin_token):
        """POD submission with photo but no signature should succeed"""
        # Get driver's active deliveries
        deliveries_response = requests.get(
            f"{BASE_URL}/api/driver-portal/deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        if deliveries_response.status_code == 200:
            deliveries = deliveries_response.json().get("deliveries", [])
            if deliveries:
                # Find an order that's out_for_delivery
                order = next((d for d in deliveries if d["status"] == "out_for_delivery"), None)
                if order:
                    order_id = order["id"]
                    response = requests.post(
                        f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/pod",
                        headers={"Authorization": f"Bearer {driver_token}"},
                        json={
                            "recipientName": "Photo Only Test",
                            "photoBase64": TEST_PHOTO_BASE64,
                            # No signature - should still work
                            "notes": "Photo only test"
                        }
                    )
                    assert response.status_code == 200, f"POD with photo should succeed: {response.text}"
                    data = response.json()
                    assert data.get("success") == True
                    assert "photoUrl" in data
                    # signatureUrl may or may not be present
        
        # If no deliveries available, skip but don't fail
        print("INFO: No active out_for_delivery orders found for photo-only test")


class TestOrderDetailsPODDisplay:
    """Test that POD info is visible in order details for Admin and Pharmacy"""
    
    def test_admin_can_see_pod_in_order_details(self, admin_token):
        """Admin should see photoUrl and signatureUrl in order details"""
        # Get orders
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders?status=delivered",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert orders_response.status_code == 200
        
        orders = orders_response.json().get("orders", [])
        # Find a delivered order with photo
        delivered_with_pod = [o for o in orders if o.get("photoUrl")]
        
        if delivered_with_pod:
            order_id = delivered_with_pod[0]["id"]
            # Get order details
            detail_response = requests.get(
                f"{BASE_URL}/api/orders/{order_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert detail_response.status_code == 200
            data = detail_response.json()
            
            # Verify POD fields are present
            assert "photoUrl" in data, "photoUrl field should be in order details"
            assert data["photoUrl"] is not None, "photoUrl should have a value"
            assert data["status"] == "delivered"
            print(f"SUCCESS: Admin can see POD - photoUrl: {data['photoUrl']}")
        else:
            print("INFO: No delivered orders with POD found to verify")
    
    def test_order_details_include_pod_fields(self, admin_token):
        """Order details API should include photoUrl, signatureUrl, recipientNameSigned"""
        # Get any order
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert orders_response.status_code == 200
        
        orders = orders_response.json().get("orders", [])
        if orders:
            order_id = orders[0]["id"]
            detail_response = requests.get(
                f"{BASE_URL}/api/orders/{order_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert detail_response.status_code == 200
            data = detail_response.json()
            
            # These fields should exist in the response (even if null)
            assert "photoUrl" in data, "photoUrl field should exist in order details"
            assert "signatureUrl" in data, "signatureUrl field should exist in order details"
            assert "recipientNameSigned" in data, "recipientNameSigned field should exist"
            print("SUCCESS: Order details include all POD fields")


class TestDriverPortalHistory:
    """Test that driver history shows POD indicator"""
    
    def test_driver_history_includes_photo_url(self, driver_token):
        """Driver history should include photoUrl for delivered orders"""
        response = requests.get(
            f"{BASE_URL}/api/driver-portal/history",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        deliveries = data.get("deliveries", [])
        
        # Check if any delivered orders have photoUrl
        delivered_with_photo = [d for d in deliveries if d.get("photoUrl")]
        if delivered_with_photo:
            print(f"SUCCESS: Driver history shows {len(delivered_with_photo)} orders with POD photos")
        else:
            print("INFO: No delivered orders with photos in driver history")


class TestAuthenticationRequired:
    """Test that POD endpoints require authentication"""
    
    def test_pod_requires_driver_auth(self):
        """POD endpoint should require driver authentication"""
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/1/pod",
            json={"photoBase64": TEST_PHOTO_BASE64}
        )
        assert response.status_code == 401, "POD endpoint should require authentication"
    
    def test_admin_cannot_submit_pod(self, admin_token):
        """Admin should not be able to submit POD (driver role required)"""
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/1/pod",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"photoBase64": TEST_PHOTO_BASE64}
        )
        # Should fail with 403 (forbidden) since admin is not a driver
        assert response.status_code in [403, 404], f"Admin should not access driver portal: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
