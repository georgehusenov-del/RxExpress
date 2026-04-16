"""
Test suite for RX Expresss Role Hierarchy & Order Duplication Features
- Role hierarchy: Admin > Manager > Operator > Pharmacy > Driver
- Per-user permissions management
- Admin order creation with pharmacy dropdown
- Order duplication for failed orders (2+ attempts)
- Attempt history tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "Admin@123"
MANAGER_EMAIL = "manager@rxexpresss.com"
MANAGER_PASSWORD = "Manager@123"
OPERATOR_EMAIL = "operator@rxexpresss.com"
OPERATOR_PASSWORD = "Operator@123"
PHARMACY_EMAIL = "pharmacy@test.com"
PHARMACY_PASSWORD = "Pharmacy@123"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Driver@123"


class TestAuthLogin:
    """Test login returns permissions for all roles"""
    
    def test_admin_login_returns_all_permissions(self):
        """Admin should get all 28 permissions"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "Admin", f"Expected Admin role, got {data['user']['role']}"
        assert "permissions" in data["user"], "No permissions in user response"
        
        perms = data["user"]["permissions"]
        assert isinstance(perms, list), "Permissions should be a list"
        assert len(perms) == 28, f"Admin should have 28 permissions, got {len(perms)}"
        
        # Verify some key permissions exist
        assert "orders.view" in perms
        assert "orders.create" in perms
        assert "orders.duplicate" in perms
        assert "users.view" in perms
        print(f"PASS: Admin login returns {len(perms)} permissions")
    
    def test_manager_login_returns_permissions(self):
        """Manager should get assigned permissions"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        
        assert data["user"]["role"] == "Manager", f"Expected Manager role, got {data['user']['role']}"
        assert "permissions" in data["user"], "No permissions in user response"
        
        perms = data["user"]["permissions"]
        assert isinstance(perms, list), "Permissions should be a list"
        # Manager should have permissions (seeded with all 28)
        print(f"PASS: Manager login returns {len(perms)} permissions")
    
    def test_operator_login_returns_permissions(self):
        """Operator should get limited permissions"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200, f"Operator login failed: {response.text}"
        data = response.json()
        
        assert data["user"]["role"] == "Operator", f"Expected Operator role, got {data['user']['role']}"
        assert "permissions" in data["user"], "No permissions in user response"
        
        perms = data["user"]["permissions"]
        assert isinstance(perms, list), "Permissions should be a list"
        # Operator should have limited permissions (seeded with 8)
        print(f"PASS: Operator login returns {len(perms)} permissions")
    
    def test_pharmacy_login(self):
        """Pharmacy user should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PHARMACY_EMAIL,
            "password": PHARMACY_PASSWORD
        })
        assert response.status_code == 200, f"Pharmacy login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "Pharmacy"
        print("PASS: Pharmacy login successful")
    
    def test_driver_login(self):
        """Driver user should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "Driver"
        print("PASS: Driver login successful")


class TestPermissionsAPI:
    """Test permissions management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL, "password": MANAGER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def operator_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL, "password": OPERATOR_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_available_permissions(self, admin_token):
        """GET /api/admin/permissions/available returns all permissions grouped by category"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/available",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "permissions" in data
        perms = list(data["permissions"])
        assert len(perms) > 0, "Should have permission categories"
        
        # Check structure
        for group in perms:
            assert "category" in group
            assert "permissions" in group
            for p in group["permissions"]:
                assert "key" in p
                assert "label" in p
        
        # Verify categories exist
        categories = [g["category"] for g in perms]
        assert "Orders" in categories
        assert "Users" in categories
        assert "Drivers" in categories
        print(f"PASS: Available permissions returns {len(perms)} categories")
    
    def test_get_my_permissions_admin(self, admin_token):
        """GET /api/admin/permissions/my returns current user's permissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/my",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "permissions" in data
        assert "role" in data
        assert data["role"] == "Admin"
        assert len(data["permissions"]) == 28, f"Admin should have 28 permissions, got {len(data['permissions'])}"
        print("PASS: Admin /permissions/my returns all 28 permissions")
    
    def test_get_my_permissions_operator(self, operator_token):
        """Operator's /permissions/my returns their assigned permissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/my",
            headers={"Authorization": f"Bearer {operator_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "permissions" in data
        assert "role" in data
        assert data["role"] == "Operator"
        print(f"PASS: Operator /permissions/my returns {len(data['permissions'])} permissions")
    
    def test_get_user_permissions(self, admin_token):
        """GET /api/admin/permissions/user/{userId} returns specific user's permissions"""
        # First get users to find operator
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users?role=Operator",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert users_resp.status_code == 200
        users = users_resp.json()["users"]
        
        if len(users) > 0:
            operator_id = users[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/admin/permissions/user/{operator_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            assert "userId" in data
            assert "name" in data
            assert "role" in data
            assert "permissions" in data
            print(f"PASS: Get user permissions returns {len(data['permissions'])} permissions for {data['name']}")
        else:
            pytest.skip("No Operator users found")
    
    def test_update_user_permissions(self, admin_token):
        """PUT /api/admin/permissions/user/{userId} updates user's permissions"""
        # Get operator user
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users?role=Operator",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_resp.json()["users"]
        
        if len(users) > 0:
            operator_id = users[0]["id"]
            
            # Get current permissions
            current_resp = requests.get(
                f"{BASE_URL}/api/admin/permissions/user/{operator_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            current_perms = current_resp.json()["permissions"]
            
            # Update with new permissions
            new_perms = ["orders.view", "orders.create", "drivers.view"]
            response = requests.put(
                f"{BASE_URL}/api/admin/permissions/user/{operator_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"permissions": new_perms}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert "message" in data
            assert data["count"] == 3
            
            # Verify update
            verify_resp = requests.get(
                f"{BASE_URL}/api/admin/permissions/user/{operator_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            verify_data = verify_resp.json()
            assert set(verify_data["permissions"]) == set(new_perms)
            
            # Restore original permissions
            requests.put(
                f"{BASE_URL}/api/admin/permissions/user/{operator_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"permissions": current_perms}
            )
            
            print("PASS: Update user permissions works correctly")
        else:
            pytest.skip("No Operator users found")


class TestAdminOrderCreation:
    """Test admin order creation with pharmacy dropdown"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_pharmacies_for_dropdown(self, admin_token):
        """GET /api/admin/pharmacies returns pharmacies for dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pharmacies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "pharmacies" in data
        assert len(data["pharmacies"]) > 0, "Should have at least one pharmacy"
        
        # Check pharmacy structure
        pharmacy = data["pharmacies"][0]
        assert "id" in pharmacy
        assert "name" in pharmacy
        print(f"PASS: Get pharmacies returns {len(data['pharmacies'])} pharmacies")
    
    def test_create_order_with_pharmacy(self, admin_token):
        """POST /api/admin/orders/create creates order with pharmacy dropdown"""
        # Get first pharmacy
        pharmacies_resp = requests.get(
            f"{BASE_URL}/api/admin/pharmacies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        pharmacy_id = pharmacies_resp.json()["pharmacies"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pharmacyId": pharmacy_id,
                "recipientName": "TEST_John Doe",
                "recipientPhone": "555-1234",
                "street": "123 Test Street",
                "city": "Brooklyn",
                "state": "NY",
                "postalCode": "11201",
                "deliveryType": "next_day",
                "copayAmount": 15.00,
                "isRefrigerated": False
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "orderId" in data
        assert "orderNumber" in data
        assert "qrCode" in data
        
        # QR code should start with B for Brooklyn
        assert data["qrCode"].startswith("B"), f"Brooklyn QR should start with B, got {data['qrCode']}"
        
        print(f"PASS: Created order {data['orderNumber']} with QR {data['qrCode']}")
        return data["orderId"]


class TestOrderAttemptLogging:
    """Test order attempt logging and duplication"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_order_id(self, admin_token):
        """Create a test order for attempt logging"""
        pharmacies_resp = requests.get(
            f"{BASE_URL}/api/admin/pharmacies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        pharmacy_id = pharmacies_resp.json()["pharmacies"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pharmacyId": pharmacy_id,
                "recipientName": "TEST_Attempt User",
                "recipientPhone": "555-9999",
                "street": "456 Attempt Ave",
                "city": "Queens",
                "state": "NY",
                "postalCode": "11101",
                "deliveryType": "same_day"
            }
        )
        return response.json()["orderId"]
    
    def test_log_attempt_first_fail(self, admin_token, test_order_id):
        """POST /api/admin/orders/{id}/log-attempt logs first failed attempt"""
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/log-attempt",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "status": "failed",
                "failureReason": "Customer not home",
                "notes": "Left notice on door"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["failedAttempts"] == 1
        assert data["canDuplicate"] == False, "Should not be able to duplicate after 1 fail"
        print("PASS: First attempt logged, canDuplicate=False")
    
    def test_log_attempt_second_fail_enables_duplicate(self, admin_token, test_order_id):
        """After 2 failed attempts, canDuplicate should be True"""
        # Log first attempt
        requests.post(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/log-attempt",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "failed", "failureReason": "First fail"}
        )
        
        # Log second attempt
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/log-attempt",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "failed", "failureReason": "Second fail"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["failedAttempts"] == 2
        assert data["canDuplicate"] == True, "Should be able to duplicate after 2 fails"
        assert "duplicateMessage" in data
        print("PASS: Second attempt logged, canDuplicate=True")
    
    def test_duplicate_order_creates_new_qr(self, admin_token, test_order_id):
        """POST /api/admin/orders/{id}/duplicate creates duplicate with new QR code"""
        # First log 2 failed attempts
        for i in range(2):
            requests.post(
                f"{BASE_URL}/api/admin/orders/{test_order_id}/log-attempt",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": "failed", "failureReason": f"Fail {i+1}"}
            )
        
        # Duplicate the order
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/duplicate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"labourCost": 15.00}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "newOrderId" in data
        assert "newOrderNumber" in data
        assert "newQrCode" in data
        assert "attemptNumber" in data
        assert "labourCost" in data
        
        assert data["attemptNumber"] == 2, f"Duplicate should be attempt 2, got {data['attemptNumber']}"
        assert data["labourCost"] == 15.00
        
        print(f"PASS: Duplicated order with new QR {data['newQrCode']}, attempt #{data['attemptNumber']}")
        return data["newOrderId"]
    
    def test_get_order_history(self, admin_token, test_order_id):
        """GET /api/admin/orders/{id}/history returns full attempt chain"""
        # Log attempts and duplicate
        for i in range(2):
            requests.post(
                f"{BASE_URL}/api/admin/orders/{test_order_id}/log-attempt",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": "failed", "failureReason": f"Fail {i+1}"}
            )
        
        dup_resp = requests.post(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/duplicate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"labourCost": 10.00}
        )
        
        # Get history
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/{test_order_id}/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "rootOrderId" in data
        assert "totalAttempts" in data
        assert "totalFailed" in data
        assert "totalLabourCost" in data
        assert "orders" in data
        assert "logs" in data
        
        assert data["totalAttempts"] >= 2, "Should have at least 2 orders in chain"
        assert len(data["orders"]) >= 2
        assert len(data["logs"]) >= 2
        
        # Verify order chain structure
        for order in data["orders"]:
            assert "id" in order
            assert "orderNumber" in order
            assert "qrCode" in order
            assert "attemptNumber" in order
        
        print(f"PASS: Order history shows {data['totalAttempts']} attempts, {len(data['logs'])} logs")


class TestManagerOperatorAccess:
    """Test Manager and Operator can access admin pages"""
    
    def test_manager_can_access_admin_endpoints(self):
        """Manager should be able to access admin endpoints"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL, "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Test dashboard access
        dash_resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dash_resp.status_code == 200, f"Manager cannot access dashboard: {dash_resp.status_code}"
        
        # Test orders access
        orders_resp = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert orders_resp.status_code == 200, f"Manager cannot access orders: {orders_resp.status_code}"
        
        print("PASS: Manager can access admin endpoints")
    
    def test_operator_can_access_admin_endpoints(self):
        """Operator should be able to access admin endpoints"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL, "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Test dashboard access
        dash_resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dash_resp.status_code == 200, f"Operator cannot access dashboard: {dash_resp.status_code}"
        
        # Test orders access
        orders_resp = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert orders_resp.status_code == 200, f"Operator cannot access orders: {orders_resp.status_code}"
        
        print("PASS: Operator can access admin endpoints")
    
    def test_pharmacy_cannot_access_admin_endpoints(self):
        """Pharmacy should NOT be able to access admin endpoints"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PHARMACY_EMAIL, "password": PHARMACY_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Test dashboard access - should be forbidden
        dash_resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dash_resp.status_code == 403, f"Pharmacy should not access dashboard, got {dash_resp.status_code}"
        
        print("PASS: Pharmacy correctly denied access to admin endpoints")


class TestRoleHierarchy:
    """Test role hierarchy is correct"""
    
    def test_roles_exist_in_system(self):
        """Verify all roles exist: Admin, Manager, Operator, Pharmacy, Driver"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = admin_resp.json()["token"]
        
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = users_resp.json()["users"]
        
        roles_found = set(u["role"] for u in users)
        expected_roles = {"Admin", "Manager", "Operator", "Pharmacy", "Driver"}
        
        for role in expected_roles:
            assert role in roles_found, f"Role {role} not found in system"
        
        # Verify Patient role does NOT exist
        assert "Patient" not in roles_found, "Patient role should be removed"
        
        print(f"PASS: All expected roles exist: {roles_found}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
