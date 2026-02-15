"""
PWA and Capacitor Setup Tests
Tests for Progressive Web App assets, manifest, service worker, icons, and meta tags.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPWAAssets:
    """Test PWA static assets are accessible"""

    def test_manifest_json_accessible(self):
        """manifest.json should be accessible at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"manifest.json not accessible: {response.status_code}"
        
        # Validate manifest content
        manifest = response.json()
        assert manifest.get("name") == "RX Expresss - Pharmacy Delivery", "Incorrect app name in manifest"
        assert manifest.get("display") == "standalone", "Display mode should be 'standalone'"
        assert manifest.get("theme_color") == "#0d9488", "Theme color should be #0d9488"
        assert len(manifest.get("icons", [])) >= 2, "Should have at least 2 icons defined"
        print(f"✅ manifest.json valid: name='{manifest.get('name')}', display='{manifest.get('display')}'")

    def test_service_worker_accessible(self):
        """service-worker.js should be accessible at /service-worker.js"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200, f"service-worker.js not accessible: {response.status_code}"
        
        content = response.text
        assert "CACHE_NAME" in content, "Service worker should define CACHE_NAME"
        assert "install" in content.lower(), "Service worker should have install event"
        assert "fetch" in content.lower(), "Service worker should have fetch event"
        print("✅ service-worker.js accessible and contains required event handlers")

    def test_offline_html_accessible(self):
        """offline.html should be accessible at /offline.html"""
        response = requests.get(f"{BASE_URL}/offline.html")
        assert response.status_code == 200, f"offline.html not accessible: {response.status_code}"
        
        content = response.text
        assert "Offline" in content, "offline.html should indicate offline status"
        assert "RX Expresss" in content, "offline.html should include app branding"
        print("✅ offline.html accessible with correct content")


class TestPWAIcons:
    """Test PWA icons are accessible"""

    def test_icon_192x192_accessible(self):
        """icon-192x192.png should be accessible"""
        response = requests.get(f"{BASE_URL}/icon-192x192.png")
        assert response.status_code == 200, f"icon-192x192.png not accessible: {response.status_code}"
        assert 'image' in response.headers.get('content-type', ''), "Should return an image"
        print(f"✅ icon-192x192.png accessible ({len(response.content)} bytes)")

    def test_icon_512x512_accessible(self):
        """icon-512x512.png should be accessible"""
        response = requests.get(f"{BASE_URL}/icon-512x512.png")
        assert response.status_code == 200, f"icon-512x512.png not accessible: {response.status_code}"
        assert 'image' in response.headers.get('content-type', ''), "Should return an image"
        print(f"✅ icon-512x512.png accessible ({len(response.content)} bytes)")

    def test_apple_touch_icon_accessible(self):
        """apple-touch-icon.png should be accessible"""
        response = requests.get(f"{BASE_URL}/apple-touch-icon.png")
        assert response.status_code == 200, f"apple-touch-icon.png not accessible: {response.status_code}"
        assert 'image' in response.headers.get('content-type', ''), "Should return an image"
        print(f"✅ apple-touch-icon.png accessible ({len(response.content)} bytes)")

    def test_favicon_accessible(self):
        """favicon.ico should be accessible"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"favicon.ico not accessible: {response.status_code}"
        print(f"✅ favicon.ico accessible ({len(response.content)} bytes)")

    def test_maskable_icons_accessible(self):
        """Maskable icons should be accessible"""
        for size in ["192x192", "512x512"]:
            response = requests.get(f"{BASE_URL}/maskable-icon-{size}.png")
            assert response.status_code == 200, f"maskable-icon-{size}.png not accessible: {response.status_code}"
        print("✅ Maskable icons (192x192, 512x512) accessible")


class TestAPIHealth:
    """Test API health endpoint"""

    def test_api_health_endpoint(self):
        """API health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "healthy", "API should report healthy status"
        print(f"✅ API health endpoint returns 200 with status: {data.get('status')}")


class TestAuthFlow:
    """Test authentication flow works correctly"""

    def test_admin_login_success(self):
        """Admin login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@rxexpresss.com",
                "password": "admin123"
            }
        )
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Login response should include access_token"
        assert data.get("user", {}).get("role") == "admin", "User should have admin role"
        print(f"✅ Admin login successful - role: {data.get('user', {}).get('role')}")
        return data.get("access_token")

    def test_pharmacy_login_success(self):
        """Pharmacy login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "pharmacy@test.com",
                "password": "pharmacy123"
            }
        )
        assert response.status_code == 200, f"Pharmacy login failed: {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Login response should include access_token"
        assert data.get("user", {}).get("role") == "pharmacy", "User should have pharmacy role"
        print(f"✅ Pharmacy login successful - role: {data.get('user', {}).get('role')}")

    def test_driver_login_success(self):
        """Driver login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "driver@test.com",
                "password": "driver123"
            }
        )
        assert response.status_code == 200, f"Driver login failed: {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Login response should include access_token"
        assert data.get("user", {}).get("role") == "driver", "User should have driver role"
        print(f"✅ Driver login successful - role: {data.get('user', {}).get('role')}")

    def test_login_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@test.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code in [400, 401], f"Expected 400 or 401, got: {response.status_code}"
        print(f"✅ Invalid login correctly rejected with status {response.status_code}")


class TestHTMLMetaTags:
    """Test HTML contains required PWA meta tags"""

    def test_homepage_contains_pwa_meta_tags(self):
        """Homepage HTML should contain PWA meta tags"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Homepage not accessible: {response.status_code}"
        
        html = response.text
        
        # Check for PWA meta tags
        meta_tags = {
            "manifest link": "manifest.json" in html,
            "apple-mobile-web-app-capable": "apple-mobile-web-app-capable" in html,
            "theme-color": "theme-color" in html,
            "apple-touch-icon": "apple-touch-icon" in html,
            "viewport fit cover": "viewport-fit=cover" in html or "viewport-fit: cover" in html.lower()
        }
        
        for tag, found in meta_tags.items():
            assert found, f"Missing PWA meta tag: {tag}"
            print(f"✅ Found PWA meta tag: {tag}")
        
        # Check for app branding
        assert "RX Expresss" in html, "Homepage should include app branding"
        print("✅ All PWA meta tags present in homepage HTML")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
