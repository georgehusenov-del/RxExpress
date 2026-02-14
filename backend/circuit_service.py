"""
Circuit/Spoke API Integration Service for RX Expresss
Handles route optimization, stop management, and delivery proof via Circuit Spoke API
"""

import os
import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Circuit/Spoke API Configuration
CIRCUIT_API_BASE = "https://api.getcircuit.com/public/v0.2b"
CIRCUIT_API_KEY = os.environ.get("CIRCUIT_API_KEY")


class CircuitAddress(BaseModel):
    addressLineOne: str
    addressLineTwo: Optional[str] = None
    city: str
    state: str
    zip: str
    country: str = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CircuitRecipient(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    externalId: Optional[str] = None


class CircuitStop(BaseModel):
    address: CircuitAddress
    recipient: Optional[CircuitRecipient] = None
    notes: Optional[str] = None
    packageCount: Optional[int] = 1
    activity: str = "delivery"


class CircuitService:
    """Service for interacting with Circuit/Spoke API"""
    
    def __init__(self):
        self.api_key = CIRCUIT_API_KEY
        self.base_url = CIRCUIT_API_BASE
        self.client = None
        
        if not self.api_key:
            logger.warning("Circuit API key not configured")
        else:
            logger.info("Circuit API service initialized")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for Circuit API"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def is_configured(self) -> bool:
        """Check if Circuit API is configured"""
        return self.api_key is not None
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Make HTTP request to Circuit API"""
        if not self.is_configured():
            logger.error("Circuit API key not configured")
            return None
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # For POST/PUT/PATCH without data, send empty object to satisfy API requirements
                request_data = data if data is not None else ({} if method.upper() in ["POST", "PUT", "PATCH"] else None)
                
                # Only include json parameter and Content-Type if we have data to send
                headers = {"Authorization": f"Bearer {self.api_key}"}
                if request_data is not None:
                    headers["Content-Type"] = "application/json"
                
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=request_data,
                    params=params
                )
                
                if response.status_code == 429:
                    logger.warning("Circuit API rate limited")
                    return {"error": "rate_limited", "message": "Too many requests"}
                
                response.raise_for_status()
                return response.json() if response.content else {}
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Circuit API HTTP error: {e.response.status_code} - {e.response.text}")
            return {"error": "http_error", "status_code": e.response.status_code, "message": str(e)}
        except Exception as e:
            logger.error(f"Circuit API error: {e}")
            return {"error": "request_failed", "message": str(e)}
    
    # ============== Plans (Routes) ==============
    
    async def create_plan(self, title: str, starts: Dict[str, int], driver_ids: List[str] = None) -> Optional[Dict]:
        """
        Create a new delivery plan/route
        
        Args:
            title: Plan title (e.g., "RX Deliveries 2024-02-12")
            starts: Date dict with day, month, year
            driver_ids: List of driver IDs in format "drivers/<id>"
        """
        data = {
            "title": title,
            "starts": starts,
            "drivers": driver_ids or []
        }
        
        result = await self._make_request("POST", "/plans", data=data)
        if result and "id" in result:
            logger.info(f"Created Circuit plan: {result['id']}")
        return result
    
    async def get_plan(self, plan_id: str) -> Optional[Dict]:
        """Get a specific plan by ID"""
        return await self._make_request("GET", f"/plans/{plan_id}")
    
    async def list_plans(self, starts_gte: str = None, max_page_size: int = 20) -> Optional[Dict]:
        """List all plans with optional date filter"""
        params = {"maxPageSize": max_page_size}
        if starts_gte:
            params["filter.startsGte"] = starts_gte
        return await self._make_request("GET", "/plans", params=params)
    
    async def optimize_plan(self, plan_id: str) -> Optional[Dict]:
        """Optimize a plan's route"""
        result = await self._make_request("POST", f"/plans/{plan_id}:optimize")
        if result and "id" in result:
            logger.info(f"Started optimization for plan {plan_id}, operation: {result['id']}")
        return result
    
    async def distribute_plan(self, plan_id: str) -> Optional[Dict]:
        """Distribute a plan to its drivers"""
        result = await self._make_request("POST", f"/plans/{plan_id}:distribute")
        if result:
            logger.info(f"Distributed plan {plan_id} to drivers")
        return result
    
    async def delete_plan(self, plan_id: str) -> bool:
        """Delete a plan"""
        result = await self._make_request("DELETE", f"/plans/{plan_id}")
        return result is not None and "error" not in result
    
    # ============== Stops (Deliveries) ==============
    
    async def create_stop(self, plan_id: str, stop_data: Dict) -> Optional[Dict]:
        """
        Create a new stop (delivery) in a plan
        
        Args:
            plan_id: The plan ID to add the stop to
            stop_data: Stop data including address, recipient, notes, etc.
        """
        result = await self._make_request("POST", f"/plans/{plan_id}/stops", data=stop_data)
        if result and "id" in result:
            logger.info(f"Created Circuit stop: {result['id']}")
        return result
    
    async def batch_import_stops(self, plan_id: str, stops: List[Dict]) -> Optional[Dict]:
        """
        Batch import multiple stops to a plan (up to 100 stops)
        
        Args:
            plan_id: The plan ID
            stops: List of stop data dictionaries
        """
        result = await self._make_request("POST", f"/plans/{plan_id}/stops:import", data=stops)
        if result:
            success_count = len(result.get("success", []))
            failed_count = len(result.get("failed", []))
            logger.info(f"Batch imported stops: {success_count} success, {failed_count} failed")
        return result
    
    async def get_stop(self, plan_id: str, stop_id: str) -> Optional[Dict]:
        """Get a specific stop"""
        return await self._make_request("GET", f"/plans/{plan_id}/stops/{stop_id}")
    
    async def list_stops(self, plan_id: str, max_page_size: int = 10) -> Optional[Dict]:
        """List all stops in a plan"""
        params = {"maxPageSize": max_page_size}
        return await self._make_request("GET", f"/plans/{plan_id}/stops", params=params)
    
    async def update_stop(self, plan_id: str, stop_id: str, update_data: Dict) -> Optional[Dict]:
        """Update an existing stop"""
        return await self._make_request("PATCH", f"/plans/{plan_id}/stops/{stop_id}", data=update_data)
    
    async def delete_stop(self, plan_id: str, stop_id: str) -> bool:
        """Delete a stop"""
        result = await self._make_request("DELETE", f"/plans/{plan_id}/stops/{stop_id}")
        return result is not None and "error" not in result
    
    # ============== Live Plans (In-Progress Routes) ==============
    
    async def create_live_stop(self, plan_id: str, stop_data: Dict) -> Optional[Dict]:
        """Create a stop on a live (distributed) plan"""
        return await self._make_request("POST", f"/plans/{plan_id}/stops:liveCreate", data=stop_data)
    
    async def import_live_stops(self, plan_id: str, stops: List[Dict]) -> Optional[Dict]:
        """Batch import stops to a live plan"""
        return await self._make_request("POST", f"/plans/{plan_id}/stops:liveImport", data=stops)
    
    async def reoptimize_plan(self, plan_id: str) -> Optional[Dict]:
        """Re-optimize a live plan"""
        return await self._make_request("POST", f"/plans/{plan_id}:reoptimize")
    
    # ============== Drivers ==============
    
    async def list_drivers(self, active_only: bool = True) -> Optional[Dict]:
        """List all drivers"""
        params = {}
        if active_only:
            params["filter.active"] = "true"
        return await self._make_request("GET", "/drivers", params=params)
    
    async def get_driver(self, driver_id: str) -> Optional[Dict]:
        """Get a specific driver"""
        return await self._make_request("GET", f"/drivers/{driver_id}")
    
    async def create_driver(self, name: str, email: str = None, phone: str = None) -> Optional[Dict]:
        """Create a new driver"""
        data = {"name": name}
        if email:
            data["email"] = email
        if phone:
            data["phone"] = phone
        return await self._make_request("POST", "/drivers", data=data)
    
    async def update_driver(self, driver_id: str, update_data: Dict) -> Optional[Dict]:
        """Update a driver"""
        return await self._make_request("PATCH", f"/drivers/{driver_id}", data=update_data)
    
    # ============== Depots ==============
    
    async def list_depots(self) -> Optional[Dict]:
        """List all depots"""
        return await self._make_request("GET", "/depots")
    
    async def get_depot(self, depot_id: str) -> Optional[Dict]:
        """Get a specific depot"""
        return await self._make_request("GET", f"/depots/{depot_id}")
    
    # ============== Routes ==============
    
    async def get_route(self, route_id: str) -> Optional[Dict]:
        """Get a specific route"""
        return await self._make_request("GET", f"/routes/{route_id}")
    
    # ============== Operations ==============
    
    async def get_operation(self, operation_id: str) -> Optional[Dict]:
        """Get operation status (e.g., optimization progress)"""
        return await self._make_request("GET", f"/operations/{operation_id}")
    
    async def cancel_operation(self, operation_id: str) -> Optional[Dict]:
        """Cancel a running operation"""
        return await self._make_request("POST", f"/operations/{operation_id}:cancel")
    
    async def list_operations(self, plan_id: str = None) -> Optional[Dict]:
        """List operations, optionally filtered by plan"""
        params = {}
        if plan_id:
            params["filter.targetPlanId"] = plan_id
        return await self._make_request("GET", "/operations", params=params)
    
    # ============== Helper Methods for RX Expresss ==============
    
    async def create_rx_delivery_plan(self, date: datetime = None) -> Optional[Dict]:
        """
        Create a delivery plan for RX Expresss for a specific date
        
        Args:
            date: The delivery date (defaults to today)
        """
        if date is None:
            date = datetime.now(timezone.utc)
        
        title = f"RX Expresss Deliveries - {date.strftime('%Y-%m-%d')}"
        starts = {
            "day": date.day,
            "month": date.month,
            "year": date.year
        }
        
        return await self.create_plan(title, starts)
    
    async def add_order_to_circuit(
        self,
        plan_id: str,
        order: Dict,
        patient: Dict,
        pharmacy: Dict
    ) -> Optional[Dict]:
        """
        Add an RX Expresss order as a stop in Circuit
        
        Args:
            plan_id: Circuit plan ID
            order: RX Expresss order data
            patient: Patient data
            pharmacy: Pharmacy data
        """
        delivery_address = order.get("delivery_address", {})
        
        stop_data = {
            "address": {
                "addressLineOne": delivery_address.get("street", ""),
                "city": delivery_address.get("city", ""),
                "state": delivery_address.get("state", ""),
                "zip": delivery_address.get("postal_code", ""),
                "country": delivery_address.get("country", "US"),
            },
            "recipient": {
                "name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
                "email": patient.get("email"),
                "phone": patient.get("phone"),
                "externalId": order.get("id")  # Link back to RX Expresss order
            },
            "orderInfo": {
                "sellerOrderId": order.get("order_number"),
                "sellerName": pharmacy.get("name", "RX Expresss"),
                "products": [rx.get("medication_name", "") for rx in order.get("prescriptions", [])]
            },
            "notes": order.get("delivery_notes", ""),
            "packageCount": len(order.get("prescriptions", [])) or 1,
            "activity": "delivery",
            "proofOfAttemptRequirements": {
                "enabled": order.get("requires_signature", True) or order.get("requires_photo_proof", True)
            }
        }
        
        # Add coordinates if available
        if delivery_address.get("latitude") and delivery_address.get("longitude"):
            stop_data["address"]["latitude"] = delivery_address["latitude"]
            stop_data["address"]["longitude"] = delivery_address["longitude"]
        
        return await self.create_stop(plan_id, stop_data)
    
    async def get_delivery_proof(self, plan_id: str, stop_id: str) -> Optional[Dict]:
        """
        Get delivery proof (signature, photos) for a stop
        
        Returns deliveryInfo from the stop which includes:
        - photoUrls: List of photo URLs
        - signatureUrl: Signature image URL
        - signeeName: Name of person who signed
        - attemptedAt: Timestamp of delivery attempt
        - succeeded: Whether delivery was successful
        - state: Delivery state (delivered_to_recipient, etc.)
        """
        stop = await self.get_stop(plan_id, stop_id)
        if stop and "deliveryInfo" in stop:
            return stop["deliveryInfo"]
        return None
    
    async def sync_delivery_status(self, plan_id: str, stop_id: str) -> Optional[Dict]:
        """
        Get current delivery status and tracking info for a stop
        
        Returns:
            Dict with tracking info, ETA, delivery status
        """
        stop = await self.get_stop(plan_id, stop_id)
        if not stop:
            return None
        
        return {
            "stop_id": stop.get("id"),
            "tracking_link": stop.get("trackingLink"),
            "web_app_link": stop.get("webAppLink"),
            "eta": stop.get("eta"),
            "delivery_info": stop.get("deliveryInfo"),
            "stop_position": stop.get("stopPosition"),
            "route": stop.get("route")
        }


# Singleton instance
circuit_service = CircuitService()
