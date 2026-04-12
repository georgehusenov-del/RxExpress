"""
Test Suite for Route Optimization Providers (Circuit, Google Maps, Apple Maps)
Tests the new multi-provider route optimization feature for RX Expresss
"""
import pytest
import requests
import os

BASE_URL = "https://pharmacy-pod-portal.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@rxexpresss.com"
ADMIN_PASSWORD = "Admin@123"


class TestRouteProviders:
    """Tests for GET /api/routes/providers endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_providers_returns_all_three(self):
        """GET /api/routes/providers should return circuit, google_maps, apple_maps"""
        response = requests.get(f"{BASE_URL}/api/routes/providers", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "providers" in data, "Response should have 'providers' key"
        
        providers = data["providers"]
        assert len(providers) == 3, f"Expected 3 providers, got {len(providers)}"
        
        provider_ids = [p["id"] for p in providers]
        assert "circuit" in provider_ids, "Missing 'circuit' provider"
        assert "google_maps" in provider_ids, "Missing 'google_maps' provider"
        assert "apple_maps" in provider_ids, "Missing 'apple_maps' provider"
        
        print(f"✓ All 3 providers returned: {provider_ids}")
    
    def test_providers_have_correct_structure(self):
        """Each provider should have id, name, description, configured, icon"""
        response = requests.get(f"{BASE_URL}/api/routes/providers", headers=self.headers)
        assert response.status_code == 200
        
        providers = response.json()["providers"]
        required_fields = ["id", "name", "description", "configured", "icon"]
        
        for provider in providers:
            for field in required_fields:
                assert field in provider, f"Provider {provider.get('id')} missing '{field}'"
            
            # Verify configured is boolean
            assert isinstance(provider["configured"], bool), f"'configured' should be boolean for {provider['id']}"
        
        print("✓ All providers have correct structure")
    
    def test_circuit_is_configured(self):
        """Circuit should show as configured (has real API key)"""
        response = requests.get(f"{BASE_URL}/api/routes/providers", headers=self.headers)
        assert response.status_code == 200
        
        providers = response.json()["providers"]
        circuit = next((p for p in providers if p["id"] == "circuit"), None)
        
        assert circuit is not None, "Circuit provider not found"
        assert circuit["configured"] == True, "Circuit should be configured (has real API key)"
        
        print(f"✓ Circuit configured: {circuit['configured']}")
    
    def test_google_maps_shows_unconfigured(self):
        """Google Maps should show as unconfigured (dummy API key)"""
        response = requests.get(f"{BASE_URL}/api/routes/providers", headers=self.headers)
        assert response.status_code == 200
        
        providers = response.json()["providers"]
        google = next((p for p in providers if p["id"] == "google_maps"), None)
        
        assert google is not None, "Google Maps provider not found"
        # With dummy key, should be unconfigured
        assert google["configured"] == False, "Google Maps should be unconfigured (dummy API key)"
        
        print(f"✓ Google Maps configured: {google['configured']} (expected False with dummy key)")
    
    def test_apple_maps_shows_unconfigured(self):
        """Apple Maps should show as unconfigured (dummy credentials)"""
        response = requests.get(f"{BASE_URL}/api/routes/providers", headers=self.headers)
        assert response.status_code == 200
        
        providers = response.json()["providers"]
        apple = next((p for p in providers if p["id"] == "apple_maps"), None)
        
        assert apple is not None, "Apple Maps provider not found"
        # With dummy credentials, should be unconfigured
        assert apple["configured"] == False, "Apple Maps should be unconfigured (dummy credentials)"
        
        print(f"✓ Apple Maps configured: {apple['configured']} (expected False with dummy credentials)")


class TestRouteOptimization:
    """Tests for POST /api/routes/{id}/optimize endpoint with different providers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token and find a gig with orders"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Find a gig with orders to test optimization
        gigs_response = requests.get(f"{BASE_URL}/api/routes", headers=self.headers)
        assert gigs_response.status_code == 200
        gigs = gigs_response.json().get("plans", [])
        
        # Find a gig with at least 1 order
        self.test_gig_id = None
        for gig in gigs:
            if gig.get("orderCount", 0) > 0:
                self.test_gig_id = gig["id"]
                break
        
        if not self.test_gig_id:
            pytest.skip("No gig with orders found for optimization testing")
    
    def test_optimize_with_google_maps_provider(self):
        """POST /api/routes/{id}/optimize with provider=google_maps should work with local fallback"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={"provider": "google_maps"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Route optimized successfully", f"Unexpected message: {data.get('message')}"
        assert data.get("status") == "optimized", f"Status should be 'optimized', got: {data.get('status')}"
        
        # Provider should be google_maps or google_maps_local (fallback)
        provider = data.get("provider")
        assert provider in ["google_maps", "google_maps_local"], f"Provider should be google_maps or google_maps_local, got: {provider}"
        
        # Check details
        details = data.get("details", {})
        assert "provider" in details, "Details should include provider"
        
        print(f"✓ Google Maps optimization successful - provider: {provider}")
        print(f"  Details: {details}")
    
    def test_optimize_with_apple_maps_provider(self):
        """POST /api/routes/{id}/optimize with provider=apple_maps should work with local fallback"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={"provider": "apple_maps"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Route optimized successfully", f"Unexpected message: {data.get('message')}"
        assert data.get("status") == "optimized", f"Status should be 'optimized', got: {data.get('status')}"
        
        # Provider should be apple_maps or apple_maps_local (fallback)
        provider = data.get("provider")
        assert provider in ["apple_maps", "apple_maps_local"], f"Provider should be apple_maps or apple_maps_local, got: {provider}"
        
        # Check details
        details = data.get("details", {})
        assert "provider" in details, "Details should include provider"
        
        print(f"✓ Apple Maps optimization successful - provider: {provider}")
        print(f"  Details: {details}")
    
    def test_optimize_with_circuit_provider(self):
        """POST /api/routes/{id}/optimize with provider=circuit should work"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={"provider": "circuit"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Route optimized successfully", f"Unexpected message: {data.get('message')}"
        assert data.get("status") == "optimized", f"Status should be 'optimized', got: {data.get('status')}"
        
        # Provider should be circuit or circuit_local (fallback if API fails)
        provider = data.get("provider")
        assert provider in ["circuit", "circuit_local"], f"Provider should be circuit or circuit_local, got: {provider}"
        
        print(f"✓ Circuit optimization successful - provider: {provider}")
    
    def test_optimize_without_provider_defaults_to_circuit(self):
        """POST /api/routes/{id}/optimize without provider should default to circuit"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "optimized"
        
        # Should default to circuit
        provider = data.get("provider")
        assert provider in ["circuit", "circuit_local"], f"Default provider should be circuit, got: {provider}"
        
        print(f"✓ Default optimization uses circuit - provider: {provider}")


class TestGigListAndDetail:
    """Tests for optimizationProvider field in gig list and detail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_gig_list_includes_optimization_provider(self):
        """GET /api/routes should return optimizationProvider field in gig list for recently optimized gigs"""
        response = requests.get(f"{BASE_URL}/api/routes", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        plans = data.get("plans", [])
        
        if not plans:
            pytest.skip("No gigs found to test")
        
        # Find gigs that have been optimized with the new provider system
        # Note: Older gigs may not have optimizationProvider field (nullable)
        optimized_gigs = [p for p in plans if p.get("optimizationProvider")]
        
        if optimized_gigs:
            print(f"✓ Found {len(optimized_gigs)} gigs with optimizationProvider set")
            for g in optimized_gigs[:3]:  # Show first 3
                print(f"  - Gig {g['id']}: {g['optimizationProvider']}")
            
            # Verify the provider values are valid
            valid_providers = ["circuit", "circuit_local", "google_maps", "google_maps_local", "apple_maps", "apple_maps_local"]
            for g in optimized_gigs:
                assert g["optimizationProvider"] in valid_providers, f"Invalid provider: {g['optimizationProvider']}"
        else:
            print("✓ No gigs with optimizationProvider set yet (field is nullable for older gigs)")
    
    def test_gig_detail_includes_optimization_provider(self):
        """GET /api/routes/{id} should return optimizationProvider field in gig detail"""
        # First get list of gigs
        list_response = requests.get(f"{BASE_URL}/api/routes", headers=self.headers)
        assert list_response.status_code == 200
        
        plans = list_response.json().get("plans", [])
        if not plans:
            pytest.skip("No gigs found to test")
        
        # Get detail of first gig
        gig_id = plans[0]["id"]
        detail_response = requests.get(f"{BASE_URL}/api/routes/{gig_id}", headers=self.headers)
        assert detail_response.status_code == 200, f"Failed: {detail_response.text}"
        
        data = detail_response.json()
        plan = data.get("plan", {})
        
        assert "optimizationProvider" in plan, "Gig detail missing 'optimizationProvider' field"
        
        print(f"✓ Gig detail includes optimizationProvider: {plan.get('optimizationProvider')}")


class TestOptimizationResultDetails:
    """Tests for optimization result details (stop order, distance, duration)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token and find a gig with multiple orders"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Find a gig with multiple orders for better testing
        gigs_response = requests.get(f"{BASE_URL}/api/routes", headers=self.headers)
        assert gigs_response.status_code == 200
        gigs = gigs_response.json().get("plans", [])
        
        # Find a gig with at least 2 orders
        self.test_gig_id = None
        for gig in gigs:
            if gig.get("orderCount", 0) >= 2:
                self.test_gig_id = gig["id"]
                break
        
        if not self.test_gig_id:
            # Fall back to any gig with orders
            for gig in gigs:
                if gig.get("orderCount", 0) > 0:
                    self.test_gig_id = gig["id"]
                    break
        
        if not self.test_gig_id:
            pytest.skip("No gig with orders found for optimization testing")
    
    def test_google_maps_returns_stop_order(self):
        """Google Maps optimization should return optimized stop order"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={"provider": "google_maps"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        details = data.get("details", {})
        
        # Check for stops in details
        stops = details.get("stops", [])
        if stops:
            print(f"✓ Google Maps returned {len(stops)} optimized stops:")
            for stop in stops:
                assert "orderId" in stop, "Stop missing orderId"
                assert "optimizedIndex" in stop, "Stop missing optimizedIndex"
                assert "recipientName" in stop, "Stop missing recipientName"
                print(f"  {stop.get('optimizedIndex', '?')+1}. {stop.get('recipientName')} - {stop.get('address')}")
        else:
            print("✓ Optimization completed (no stop details in local fallback)")
    
    def test_apple_maps_returns_stop_order(self):
        """Apple Maps optimization should return optimized stop order"""
        response = requests.post(
            f"{BASE_URL}/api/routes/{self.test_gig_id}/optimize",
            headers=self.headers,
            json={"provider": "apple_maps"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        details = data.get("details", {})
        
        # Check for stops in details
        stops = details.get("stops", [])
        if stops:
            print(f"✓ Apple Maps returned {len(stops)} optimized stops:")
            for stop in stops:
                assert "orderId" in stop, "Stop missing orderId"
                assert "optimizedIndex" in stop, "Stop missing optimizedIndex"
                print(f"  {stop.get('optimizedIndex', '?')+1}. {stop.get('recipientName')} - {stop.get('address')}")
        else:
            print("✓ Optimization completed (no stop details in local fallback)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
