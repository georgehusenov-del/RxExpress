"""
Test Copay Tracking Feature
- Pharmacy creates order with copay amount
- Admin dashboard displays copay stats
- Driver marks copay as collected
- Dashboard stats update after copay collection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@rxexpresss.com", "password": "admin123"}
PHARMACY_CREDS = {"email": "pharmacy@test.com", "password": "pharmacy123"}
DRIVER_CREDS = {"email": "driver@test.com", "password": "driver123"}

# Known IDs from the system
PHARMACY_ID = "e4172010-3a02-4635-9a24-f9f566e995a0"
DRIVER_ENTITY_ID = "1733ff07-97ba-45a4-a8a1-7f8d1dfa4a1e"


class TestCopayTracking:
    """Test copay tracking feature end-to-end"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def pharmacy_token(self):
        """Get pharmacy authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Pharmacy login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Driver login failed: {response.status_code} - {response.text}")
    
    def test_01_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")
    
    def test_02_pharmacy_login(self):
        """Test pharmacy can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
        assert response.status_code == 200, f"Pharmacy login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "pharmacy"
        print(f"✓ Pharmacy login successful")
    
    def test_03_driver_login(self):
        """Test driver can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "driver"
        print(f"✓ Driver login successful")
    
    def test_04_get_initial_dashboard_stats(self, admin_token):
        """Get initial dashboard stats before creating order with copay"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Verify copay fields exist in response
        assert "copay_to_collect" in stats, "copay_to_collect field missing from dashboard"
        assert "copay_collected" in stats, "copay_collected field missing from dashboard"
        
        print(f"✓ Initial dashboard stats:")
        print(f"  - Copay to collect: ${stats.get('copay_to_collect', 0)}")
        print(f"  - Copay collected: ${stats.get('copay_collected', 0)}")
        print(f"  - Orders with copay pending: {stats.get('orders_copay_pending', 0)}")
        print(f"  - Orders with copay collected: {stats.get('orders_copay_collected', 0)}")
        
        return stats
    
    def test_05_create_order_with_copay(self, pharmacy_token):
        """Create an order with copay amount"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        # Generate unique test data
        test_id = uuid.uuid4().hex[:6].upper()
        copay_amount = 25.50
        
        order_data = {
            "pharmacy_id": PHARMACY_ID,
            "delivery_type": "next_day",
            "time_window": "8am-1pm",
            "recipient": {
                "name": f"TEST_Copay_Patient_{test_id}",
                "phone": "+1-555-123-4567",
                "email": f"test_copay_{test_id}@example.com"
            },
            "delivery_address": {
                "street": "123 Test Street",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001"
            },
            "packages": [{
                "prescriptions": [{
                    "medication_name": f"TEST_Medication_{test_id}",
                    "rx_number": f"RX{test_id}",
                    "quantity": 1,
                    "dosage": "100mg"
                }]
            }],
            "requires_signature": True,
            "requires_photo_proof": True,
            "copay_amount": copay_amount
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/", json=order_data, headers=headers)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert "order_id" in data, "order_id missing from response"
        
        # Store order_id for later tests
        TestCopayTracking.created_order_id = data["order_id"]
        TestCopayTracking.copay_amount = copay_amount
        
        print(f"✓ Order created with copay:")
        print(f"  - Order ID: {data['order_id']}")
        print(f"  - Order Number: {data.get('order_number')}")
        print(f"  - Copay Amount: ${copay_amount}")
        
        return data
    
    def test_06_verify_order_has_copay(self, pharmacy_token):
        """Verify the created order has copay amount set"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        order_id = getattr(TestCopayTracking, 'created_order_id', None)
        
        if not order_id:
            pytest.skip("No order created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=headers)
        assert response.status_code == 200, f"Get order failed: {response.text}"
        
        order = response.json()
        assert order.get("copay_amount") == TestCopayTracking.copay_amount, \
            f"Copay amount mismatch: expected {TestCopayTracking.copay_amount}, got {order.get('copay_amount')}"
        assert order.get("copay_collected") == False, "Copay should not be collected yet"
        
        print(f"✓ Order copay verified:")
        print(f"  - Copay Amount: ${order.get('copay_amount')}")
        print(f"  - Copay Collected: {order.get('copay_collected')}")
    
    def test_07_dashboard_shows_copay_to_collect(self, admin_token):
        """Verify dashboard shows updated copay to collect"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        stats = data.get("stats", {})
        
        copay_to_collect = stats.get("copay_to_collect", 0)
        assert copay_to_collect > 0, f"Copay to collect should be > 0, got {copay_to_collect}"
        
        print(f"✓ Dashboard copay stats after order creation:")
        print(f"  - Copay to collect: ${copay_to_collect}")
        print(f"  - Orders with copay pending: {stats.get('orders_copay_pending', 0)}")
    
    def test_08_assign_driver_to_order(self, admin_token):
        """Assign driver to the order so driver can collect copay"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        order_id = getattr(TestCopayTracking, 'created_order_id', None)
        
        if not order_id:
            pytest.skip("No order created in previous test")
        
        # Assign driver to order
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/assign?driver_id={DRIVER_ENTITY_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Driver assignment failed: {response.text}"
        
        print(f"✓ Driver assigned to order {order_id}")
    
    def test_09_driver_collect_copay(self, driver_token):
        """Driver marks copay as collected"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        order_id = getattr(TestCopayTracking, 'created_order_id', None)
        copay_amount = getattr(TestCopayTracking, 'copay_amount', 25.50)
        
        if not order_id:
            pytest.skip("No order created in previous test")
        
        # Collect copay
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/collect-copay",
            params={"amount": copay_amount, "collection_method": "cash"},
            headers=headers
        )
        assert response.status_code == 200, f"Copay collection failed: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Copay collected successfully"
        assert data.get("amount") == copay_amount
        assert data.get("method") == "cash"
        
        print(f"✓ Copay collected by driver:")
        print(f"  - Amount: ${data.get('amount')}")
        print(f"  - Method: {data.get('method')}")
    
    def test_10_verify_order_copay_collected(self, pharmacy_token):
        """Verify order shows copay as collected"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        order_id = getattr(TestCopayTracking, 'created_order_id', None)
        
        if not order_id:
            pytest.skip("No order created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=headers)
        assert response.status_code == 200, f"Get order failed: {response.text}"
        
        order = response.json()
        assert order.get("copay_collected") == True, "Copay should be marked as collected"
        assert order.get("copay_collected_at") is not None, "copay_collected_at should be set"
        assert order.get("copay_collection_method") == "cash", "Collection method should be cash"
        
        print(f"✓ Order copay collection verified:")
        print(f"  - Copay Collected: {order.get('copay_collected')}")
        print(f"  - Collected At: {order.get('copay_collected_at')}")
        print(f"  - Collection Method: {order.get('copay_collection_method')}")
    
    def test_11_dashboard_shows_copay_collected(self, admin_token):
        """Verify dashboard shows updated copay collected stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        stats = data.get("stats", {})
        
        copay_collected = stats.get("copay_collected", 0)
        assert copay_collected > 0, f"Copay collected should be > 0, got {copay_collected}"
        
        print(f"✓ Dashboard copay stats after collection:")
        print(f"  - Copay to collect: ${stats.get('copay_to_collect', 0)}")
        print(f"  - Copay collected: ${copay_collected}")
        print(f"  - Orders with copay collected: {stats.get('orders_copay_collected', 0)}")
    
    def test_12_cannot_collect_copay_twice(self, driver_token):
        """Verify driver cannot collect copay twice"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        order_id = getattr(TestCopayTracking, 'created_order_id', None)
        copay_amount = getattr(TestCopayTracking, 'copay_amount', 25.50)
        
        if not order_id:
            pytest.skip("No order created in previous test")
        
        # Try to collect copay again
        response = requests.post(
            f"{BASE_URL}/api/driver-portal/deliveries/{order_id}/collect-copay",
            params={"amount": copay_amount, "collection_method": "card"},
            headers=headers
        )
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        
        data = response.json()
        assert "already collected" in data.get("detail", "").lower(), \
            f"Expected 'already collected' error, got: {data.get('detail')}"
        
        print(f"✓ Double collection prevented: {data.get('detail')}")


class TestCopayEdgeCases:
    """Test edge cases for copay tracking"""
    
    @pytest.fixture(scope="class")
    def pharmacy_token(self):
        """Get pharmacy authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PHARMACY_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Pharmacy login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_create_order_without_copay(self, pharmacy_token):
        """Create order without copay amount (should default to 0)"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        test_id = uuid.uuid4().hex[:6].upper()
        
        order_data = {
            "pharmacy_id": PHARMACY_ID,
            "delivery_type": "same_day",
            "recipient": {
                "name": f"TEST_NoCopay_Patient_{test_id}",
                "phone": "+1-555-999-8888",
                "email": f"test_nocopay_{test_id}@example.com"
            },
            "delivery_address": {
                "street": "456 No Copay Street",
                "city": "Brooklyn",
                "state": "NY",
                "postal_code": "11201"
            },
            "packages": [{
                "prescriptions": [{
                    "medication_name": f"TEST_NoCopay_Med_{test_id}",
                    "rx_number": f"RXNC{test_id}",
                    "quantity": 1,
                    "dosage": "50mg"
                }]
            }],
            "requires_signature": True
            # No copay_amount specified
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/", json=order_data, headers=headers)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        order_id = data["order_id"]
        
        # Verify order has copay_amount = 0
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=headers)
        assert response.status_code == 200
        
        order = response.json()
        assert order.get("copay_amount", 0) == 0, "Copay should default to 0"
        assert order.get("copay_collected") == False, "Copay collected should be False"
        
        print(f"✓ Order created without copay - defaults to $0")
    
    def test_create_order_with_zero_copay(self, pharmacy_token):
        """Create order with explicit zero copay"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        test_id = uuid.uuid4().hex[:6].upper()
        
        order_data = {
            "pharmacy_id": PHARMACY_ID,
            "delivery_type": "next_day",
            "time_window": "1pm-6pm",
            "recipient": {
                "name": f"TEST_ZeroCopay_Patient_{test_id}",
                "phone": "+1-555-000-0000",
                "email": f"test_zerocopay_{test_id}@example.com"
            },
            "delivery_address": {
                "street": "789 Zero Copay Ave",
                "city": "Queens",
                "state": "NY",
                "postal_code": "11375"
            },
            "packages": [{
                "prescriptions": [{
                    "medication_name": f"TEST_ZeroCopay_Med_{test_id}",
                    "rx_number": f"RXZC{test_id}",
                    "quantity": 1,
                    "dosage": "25mg"
                }]
            }],
            "requires_signature": True,
            "copay_amount": 0  # Explicit zero
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/", json=order_data, headers=headers)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        order_id = data["order_id"]
        
        # Verify order has copay_amount = 0
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=headers)
        assert response.status_code == 200
        
        order = response.json()
        assert order.get("copay_amount") == 0, "Copay should be 0"
        
        print(f"✓ Order created with explicit $0 copay")
    
    def test_dashboard_copay_aggregation(self, admin_token):
        """Test dashboard correctly aggregates copay stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Verify all copay fields are present and are numbers
        assert isinstance(stats.get("copay_to_collect"), (int, float)), "copay_to_collect should be a number"
        assert isinstance(stats.get("copay_collected"), (int, float)), "copay_collected should be a number"
        assert isinstance(stats.get("orders_copay_pending", 0), int), "orders_copay_pending should be an integer"
        assert isinstance(stats.get("orders_copay_collected", 0), int), "orders_copay_collected should be an integer"
        
        # Verify non-negative values
        assert stats.get("copay_to_collect", 0) >= 0, "copay_to_collect should be >= 0"
        assert stats.get("copay_collected", 0) >= 0, "copay_collected should be >= 0"
        
        print(f"✓ Dashboard copay aggregation verified:")
        print(f"  - Copay to collect: ${stats.get('copay_to_collect', 0)}")
        print(f"  - Copay collected: ${stats.get('copay_collected', 0)}")
        print(f"  - Orders copay pending: {stats.get('orders_copay_pending', 0)}")
        print(f"  - Orders copay collected: {stats.get('orders_copay_collected', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
