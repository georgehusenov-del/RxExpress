#!/usr/bin/env python3
"""
RX Express Pharmacy Delivery API Test Suite
Tests all backend endpoints for the pharmacy delivery service
"""

import requests
import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class RXExpressAPITester:
    def __init__(self, base_url: str = "https://pharmacy-gig-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different user types
        self.test_data = {}  # Store created test data
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        print(f"🚀 RX Express API Tester initialized")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name}: FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {}, 0
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return success, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    # ============== Authentication Tests ==============
    
    def test_health_check(self):
        """Test health check endpoint"""
        success, data, status = self.make_request('GET', '/health')
        if success and data.get('status') == 'healthy':
            self.log_test("Health Check", True, f"Status: {data.get('status')}")
            return True
        else:
            self.log_test("Health Check", False, f"Status: {status}, Data: {data}")
            return False

    def test_user_registration(self):
        """Test user registration for all roles"""
        timestamp = datetime.now().strftime("%H%M%S")
        
        users_to_create = [
            {
                "role": "patient",
                "email": f"test_patient_{timestamp}@test.com",
                "password": "testpass123",
                "phone": "+15551234567",
                "first_name": "Test",
                "last_name": "Patient"
            },
            {
                "role": "pharmacy", 
                "email": f"test_pharmacy_{timestamp}@test.com",
                "password": "pharmacy123",
                "phone": "+15551234568",
                "first_name": "Test",
                "last_name": "Pharmacy"
            },
            {
                "role": "driver",
                "email": f"test_driver_{timestamp}@test.com", 
                "password": "driver123",
                "phone": "+15551234569",
                "first_name": "Test",
                "last_name": "Driver"
            }
        ]
        
        all_success = True
        for user_data in users_to_create:
            success, data, status = self.make_request('POST', '/auth/register', user_data, expected_status=200)
            
            if success and data.get('access_token'):
                self.tokens[user_data['role']] = data['access_token']
                self.test_data[f"{user_data['role']}_user"] = data.get('user', {})
                self.log_test(f"Register {user_data['role'].title()}", True, f"Token received")
            else:
                self.log_test(f"Register {user_data['role'].title()}", False, f"Status: {status}, Data: {data}")
                all_success = False
        
        return all_success

    def test_existing_user_login(self):
        """Test login with existing test users"""
        existing_users = [
            {"email": "patient@test.com", "password": "testpass123", "role": "patient"},
            {"email": "pharmacy@test.com", "password": "pharmacy123", "role": "pharmacy"}, 
            {"email": "driver@test.com", "password": "driver123", "role": "driver"}
        ]
        
        all_success = True
        for user in existing_users:
            success, data, status = self.make_request('POST', '/auth/login', 
                                                    {"email": user["email"], "password": user["password"]})
            
            if success and data.get('access_token'):
                self.tokens[f"existing_{user['role']}"] = data['access_token']
                self.log_test(f"Login Existing {user['role'].title()}", True, f"Token received")
            else:
                self.log_test(f"Login Existing {user['role'].title()}", False, f"Status: {status}, Data: {data}")
                all_success = False
        
        return all_success

    def test_get_current_user(self):
        """Test getting current user info"""
        all_success = True
        
        for role, token in self.tokens.items():
            if token:
                success, data, status = self.make_request('GET', '/auth/me', token=token)
                
                if success and data.get('id'):
                    self.log_test(f"Get Current User ({role})", True, f"User ID: {data.get('id')}")
                else:
                    self.log_test(f"Get Current User ({role})", False, f"Status: {status}, Data: {data}")
                    all_success = False
        
        return all_success

    # ============== Pharmacy Tests ==============
    
    def test_pharmacy_registration(self):
        """Test pharmacy profile registration"""
        pharmacy_token = self.tokens.get('pharmacy') or self.tokens.get('existing_pharmacy')
        if not pharmacy_token:
            self.log_test("Pharmacy Registration", False, "No pharmacy token available")
            return False
        
        pharmacy_data = {
            "name": "Test Pharmacy Inc",
            "license_number": f"PH{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "address": {
                "street": "123 Main St",
                "city": "Test City", 
                "state": "CA",
                "postal_code": "90210",
                "country": "USA"
            },
            "phone": "+15551234567",
            "email": "testpharmacy@test.com",
            "operating_hours": {
                "monday": "9:00-18:00",
                "tuesday": "9:00-18:00"
            }
        }
        
        success, data, status = self.make_request('POST', '/pharmacies/register', 
                                                pharmacy_data, token=pharmacy_token)
        
        if success and data.get('pharmacy_id'):
            self.test_data['pharmacy_id'] = data['pharmacy_id']
            self.log_test("Pharmacy Registration", True, f"Pharmacy ID: {data['pharmacy_id']}")
            return True
        else:
            self.log_test("Pharmacy Registration", False, f"Status: {status}, Data: {data}")
            return False

    def test_list_pharmacies(self):
        """Test listing all pharmacies"""
        success, data, status = self.make_request('GET', '/pharmacies/')
        
        if success and 'pharmacies' in data:
            count = len(data.get('pharmacies', []))
            self.log_test("List Pharmacies", True, f"Found {count} pharmacies")
            return True
        else:
            self.log_test("List Pharmacies", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Driver Tests ==============
    
    def test_driver_registration(self):
        """Test driver profile registration"""
        driver_token = self.tokens.get('driver') or self.tokens.get('existing_driver')
        if not driver_token:
            self.log_test("Driver Registration", False, "No driver token available")
            return False
        
        driver_data = {
            "vehicle_type": "Car",
            "vehicle_number": f"TEST{datetime.now().strftime('%H%M%S')}",
            "license_number": f"DL{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }
        
        success, data, status = self.make_request('POST', '/drivers/register', 
                                                driver_data, token=driver_token)
        
        if success and data.get('driver_id'):
            self.test_data['driver_id'] = data['driver_id']
            self.log_test("Driver Registration", True, f"Driver ID: {data['driver_id']}")
            return True
        else:
            self.log_test("Driver Registration", False, f"Status: {status}, Data: {data}")
            return False

    def test_update_driver_location(self):
        """Test updating driver location"""
        driver_token = self.tokens.get('driver') or self.tokens.get('existing_driver')
        driver_id = self.test_data.get('driver_id')
        
        if not driver_token or not driver_id:
            self.log_test("Update Driver Location", False, "Missing driver token or ID")
            return False
        
        location_data = {
            "driver_id": driver_id,
            "latitude": 34.0522,
            "longitude": -118.2437
        }
        
        success, data, status = self.make_request('PUT', '/drivers/location', 
                                                location_data, token=driver_token)
        
        if success and data.get('message'):
            self.log_test("Update Driver Location", True, data.get('message'))
            return True
        else:
            self.log_test("Update Driver Location", False, f"Status: {status}, Data: {data}")
            return False

    def test_update_driver_status(self):
        """Test updating driver availability status"""
        driver_token = self.tokens.get('driver') or self.tokens.get('existing_driver')
        driver_id = self.test_data.get('driver_id')
        
        if not driver_token or not driver_id:
            self.log_test("Update Driver Status", False, "Missing driver token or ID")
            return False
        
        status_data = {
            "driver_id": driver_id,
            "status": "available"
        }
        
        success, data, status = self.make_request('PUT', '/drivers/status', 
                                                status_data, token=driver_token)
        
        if success and data.get('message'):
            self.log_test("Update Driver Status", True, data.get('message'))
            return True
        else:
            self.log_test("Update Driver Status", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Order Tests ==============
    
    def test_create_order(self):
        """Test creating a prescription delivery order"""
        patient_token = self.tokens.get('patient') or self.tokens.get('existing_patient')
        pharmacy_id = self.test_data.get('pharmacy_id')
        
        if not patient_token:
            self.log_test("Create Order", False, "No patient token available")
            return False
        
        # Use existing pharmacy if we don't have a new one
        if not pharmacy_id:
            # Try to get existing pharmacy
            success, data, status = self.make_request('GET', '/pharmacies/')
            if success and data.get('pharmacies'):
                pharmacy_id = data['pharmacies'][0].get('id')
        
        if not pharmacy_id:
            self.log_test("Create Order", False, "No pharmacy ID available")
            return False
        
        order_data = {
            "pharmacy_id": pharmacy_id,
            "patient_id": self.test_data.get('patient_user', {}).get('id', 'test-patient-id'),
            "delivery_address": {
                "street": "456 Oak Ave",
                "city": "Test City",
                "state": "CA", 
                "postal_code": "90210",
                "country": "USA"
            },
            "prescriptions": [
                {
                    "medication_name": "Test Medication",
                    "quantity": 30,
                    "dosage": "10mg",
                    "instructions": "Take once daily",
                    "requires_refrigeration": False,
                    "controlled_substance": False
                }
            ],
            "delivery_notes": "Test delivery",
            "requires_signature": True,
            "requires_photo_proof": True
        }
        
        success, data, status = self.make_request('POST', '/orders/', 
                                                order_data, token=patient_token)
        
        if success and data.get('order_id'):
            self.test_data['order_id'] = data['order_id']
            self.test_data['order_number'] = data.get('order_number')
            self.log_test("Create Order", True, f"Order ID: {data['order_id']}")
            return True
        else:
            self.log_test("Create Order", False, f"Status: {status}, Data: {data}")
            return False

    def test_list_orders(self):
        """Test listing orders with filters"""
        patient_token = self.tokens.get('patient') or self.tokens.get('existing_patient')
        if not patient_token:
            self.log_test("List Orders", False, "No patient token available")
            return False
        
        success, data, status = self.make_request('GET', '/orders/', token=patient_token)
        
        if success and 'orders' in data:
            count = len(data.get('orders', []))
            self.log_test("List Orders", True, f"Found {count} orders")
            return True
        else:
            self.log_test("List Orders", False, f"Status: {status}, Data: {data}")
            return False

    def test_get_order_details(self):
        """Test getting order details"""
        patient_token = self.tokens.get('patient') or self.tokens.get('existing_patient')
        order_id = self.test_data.get('order_id')
        
        if not patient_token or not order_id:
            self.log_test("Get Order Details", False, "Missing patient token or order ID")
            return False
        
        success, data, status = self.make_request('GET', f'/orders/{order_id}', token=patient_token)
        
        if success and data.get('id') == order_id:
            self.log_test("Get Order Details", True, f"Order status: {data.get('status')}")
            return True
        else:
            self.log_test("Get Order Details", False, f"Status: {status}, Data: {data}")
            return False

    def test_assign_driver_to_order(self):
        """Test assigning driver to order"""
        admin_token = self.tokens.get('existing_pharmacy')  # Use pharmacy token as admin
        order_id = self.test_data.get('order_id')
        driver_id = self.test_data.get('driver_id')
        
        if not admin_token or not order_id or not driver_id:
            self.log_test("Assign Driver", False, "Missing required data")
            return False
        
        # Note: This endpoint expects driver_id as query param, not in body
        success, data, status = self.make_request('PUT', f'/orders/{order_id}/assign?driver_id={driver_id}', 
                                                token=admin_token)
        
        if success and data.get('message'):
            self.log_test("Assign Driver", True, data.get('message'))
            return True
        else:
            self.log_test("Assign Driver", False, f"Status: {status}, Data: {data}")
            return False

    def test_update_order_status(self):
        """Test updating order status"""
        driver_token = self.tokens.get('driver') or self.tokens.get('existing_driver')
        order_id = self.test_data.get('order_id')
        
        if not driver_token or not order_id:
            self.log_test("Update Order Status", False, "Missing driver token or order ID")
            return False
        
        status_data = {
            "order_id": order_id,
            "status": "picked_up",
            "notes": "Package picked up from pharmacy"
        }
        
        success, data, status = self.make_request('PUT', f'/orders/{order_id}/status', 
                                                status_data, token=driver_token)
        
        if success and data.get('message'):
            self.log_test("Update Order Status", True, data.get('message'))
            return True
        else:
            self.log_test("Update Order Status", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Delivery Proof Tests ==============
    
    def test_submit_delivery_proof(self):
        """Test submitting delivery proof"""
        driver_token = self.tokens.get('driver') or self.tokens.get('existing_driver')
        order_id = self.test_data.get('order_id')
        
        if not driver_token or not order_id:
            self.log_test("Submit Delivery Proof", False, "Missing driver token or order ID")
            return False
        
        proof_data = {
            "order_id": order_id,
            "signature_data": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIj48dGV4dCB4PSIxMCIgeT0iMzAiPkpvaG4gRG9lPC90ZXh0Pjwvc3ZnPg==",
            "photo_base64": "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==",
            "recipient_name": "Test Recipient",
            "delivery_notes": "Delivered successfully",
            "latitude": 34.0522,
            "longitude": -118.2437
        }
        
        success, data, status = self.make_request('POST', '/delivery/proof', 
                                                proof_data, token=driver_token)
        
        if success and data.get('proof_id'):
            self.test_data['proof_id'] = data['proof_id']
            self.log_test("Submit Delivery Proof", True, f"Proof ID: {data['proof_id']}")
            return True
        else:
            self.log_test("Submit Delivery Proof", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Payment Tests ==============
    
    def test_create_checkout_session(self):
        """Test creating Stripe checkout session"""
        patient_token = self.tokens.get('patient') or self.tokens.get('existing_patient')
        order_id = self.test_data.get('order_id')
        
        if not patient_token or not order_id:
            self.log_test("Create Checkout Session", False, "Missing patient token or order ID")
            return False
        
        checkout_data = {
            "order_id": order_id,
            "origin_url": self.base_url
        }
        
        success, data, status = self.make_request('POST', '/payments/checkout/create', 
                                                checkout_data, token=patient_token)
        
        if success and data.get('session_id'):
            self.test_data['session_id'] = data['session_id']
            self.log_test("Create Checkout Session", True, f"Session ID: {data['session_id']}")
            return True
        else:
            self.log_test("Create Checkout Session", False, f"Status: {status}, Data: {data}")
            return False

    def test_get_checkout_status(self):
        """Test getting payment status"""
        patient_token = self.tokens.get('patient') or self.tokens.get('existing_patient')
        session_id = self.test_data.get('session_id')
        
        if not patient_token or not session_id:
            self.log_test("Get Checkout Status", False, "Missing patient token or session ID")
            return False
        
        success, data, status = self.make_request('GET', f'/payments/checkout/status/{session_id}', 
                                                token=patient_token)
        
        if success and 'status' in data:
            self.log_test("Get Checkout Status", True, f"Payment status: {data.get('payment_status')}")
            return True
        else:
            self.log_test("Get Checkout Status", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Tracking Tests ==============
    
    def test_get_order_tracking(self):
        """Test getting real-time tracking info"""
        order_id = self.test_data.get('order_id')
        
        if not order_id:
            self.log_test("Get Order Tracking", False, "No order ID available")
            return False
        
        success, data, status = self.make_request('GET', f'/tracking/order/{order_id}')
        
        if success and data.get('order_id') == order_id:
            self.log_test("Get Order Tracking", True, f"Status: {data.get('status')}")
            return True
        else:
            self.log_test("Get Order Tracking", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Maps Tests ==============
    
    def test_geocode_address(self):
        """Test geocoding address to coordinates"""
        geocode_data = {
            "address": "1600 Amphitheatre Parkway, Mountain View, CA"
        }
        
        success, data, status = self.make_request('POST', '/maps/geocode', geocode_data)
        
        if success and 'latitude' in data and 'longitude' in data:
            self.log_test("Geocode Address", True, f"Lat: {data.get('latitude')}, Lng: {data.get('longitude')}")
            return True
        else:
            self.log_test("Geocode Address", False, f"Status: {status}, Data: {data}")
            return False

    def test_distance_matrix(self):
        """Test calculating distance matrix"""
        matrix_data = {
            "origins": [{"latitude": 34.0522, "longitude": -118.2437}],
            "destinations": [{"latitude": 37.7749, "longitude": -122.4194}],
            "mode": "driving"
        }
        
        success, data, status = self.make_request('POST', '/maps/distance-matrix', matrix_data)
        
        if success and 'rows' in data:
            self.log_test("Distance Matrix", True, f"Status: {data.get('status')}")
            return True
        else:
            self.log_test("Distance Matrix", False, f"Status: {status}, Data: {data}")
            return False

    # ============== Main Test Runner ==============
    
    def run_all_tests(self):
        """Run all API tests"""
        print("\n" + "="*60)
        print("🧪 Starting RX Express API Test Suite")
        print("="*60)
        
        # Health check first
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication tests
        print("\n🔐 Authentication Tests")
        self.test_user_registration()
        self.test_existing_user_login()
        self.test_get_current_user()
        
        # Pharmacy tests
        print("\n🏥 Pharmacy Tests")
        self.test_pharmacy_registration()
        self.test_list_pharmacies()
        
        # Driver tests
        print("\n🚗 Driver Tests")
        self.test_driver_registration()
        self.test_update_driver_location()
        self.test_update_driver_status()
        
        # Order tests
        print("\n📦 Order Tests")
        self.test_create_order()
        self.test_list_orders()
        self.test_get_order_details()
        self.test_assign_driver_to_order()
        self.test_update_order_status()
        
        # Delivery tests
        print("\n📋 Delivery Tests")
        self.test_submit_delivery_proof()
        
        # Payment tests
        print("\n💳 Payment Tests")
        self.test_create_checkout_session()
        self.test_get_checkout_status()
        
        # Tracking tests
        print("\n📍 Tracking Tests")
        self.test_get_order_tracking()
        
        # Maps tests
        print("\n🗺️ Maps Tests")
        self.test_geocode_address()
        self.test_distance_matrix()
        
        # Print summary
        self.print_summary()
        
        return self.tests_passed == self.tests_run

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        print(f"📈 Total Tests: {self.tests_run}")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        print("\n🔍 Test Data Created:")
        for key, value in self.test_data.items():
            if isinstance(value, str):
                print(f"  • {key}: {value}")
        
        print("="*60)


def main():
    """Main test runner"""
    tester = RXExpressAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())