import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import googlemaps
from datetime import datetime

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")


class MapsService:
    def __init__(self):
        self.client = None
        if GOOGLE_MAPS_API_KEY:
            try:
                self.client = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
                logger.info("Google Maps client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Google Maps client: {e}")
        else:
            logger.warning("Google Maps API key not configured")

    def is_configured(self) -> bool:
        return self.client is not None

    async def geocode_address(self, address: str) -> Optional[Dict[str, Any]]:
        """Convert address to latitude/longitude coordinates"""
        if not self.client:
            logger.warning("Google Maps client not configured")
            return None
        
        try:
            results = self.client.geocode(address)
            if results:
                result = results[0]
                location = result["geometry"]["location"]
                return {
                    "formatted_address": result.get("formatted_address"),
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                    "place_id": result.get("place_id"),
                    "types": result.get("types", [])
                }
            return None
        except Exception as e:
            logger.error(f"Geocoding error for '{address}': {e}")
            return None

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[str]:
        """Convert coordinates to address"""
        if not self.client:
            return None
        
        try:
            results = self.client.reverse_geocode((latitude, longitude))
            if results:
                return results[0].get("formatted_address")
            return None
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            return None

    async def calculate_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]],
        mode: str = "driving"
    ) -> Optional[Dict[str, Any]]:
        """Calculate distances and durations between origins and destinations"""
        if not self.client:
            # Return mock data if not configured
            return self._mock_distance_matrix(origins, destinations)
        
        try:
            # Format coordinates
            origin_coords = [f"{lat},{lng}" for lat, lng in origins]
            dest_coords = [f"{lat},{lng}" for lat, lng in destinations]
            
            result = self.client.distance_matrix(
                origins=origin_coords,
                destinations=dest_coords,
                mode=mode,
                units="imperial"
            )
            
            return {
                "status": result.get("status"),
                "origin_addresses": result.get("origin_addresses", []),
                "destination_addresses": result.get("destination_addresses", []),
                "rows": result.get("rows", [])
            }
        except Exception as e:
            logger.error(f"Distance matrix error: {e}")
            return None

    async def get_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]] = None,
        optimize_waypoints: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get directions between origin and destination with optional waypoints"""
        if not self.client:
            return self._mock_directions(origin, destination, waypoints)
        
        try:
            origin_str = f"{origin[0]},{origin[1]}"
            dest_str = f"{destination[0]},{destination[1]}"
            
            waypoint_strs = None
            if waypoints:
                waypoint_strs = [f"{lat},{lng}" for lat, lng in waypoints]
            
            result = self.client.directions(
                origin=origin_str,
                destination=dest_str,
                waypoints=waypoint_strs,
                optimize_waypoints=optimize_waypoints,
                mode="driving",
                departure_time=datetime.now()
            )
            
            if result:
                route = result[0]
                legs = route.get("legs", [])
                
                total_distance = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
                total_duration = sum(leg.get("duration", {}).get("value", 0) for leg in legs)
                
                return {
                    "total_distance": f"{total_distance / 1609.34:.1f} mi",
                    "total_distance_meters": total_distance,
                    "total_duration": f"{total_duration // 60} min",
                    "total_duration_seconds": total_duration,
                    "polyline": route.get("overview_polyline", {}).get("points", ""),
                    "waypoint_order": route.get("waypoint_order", []),
                    "legs": [{
                        "start_address": leg.get("start_address"),
                        "end_address": leg.get("end_address"),
                        "distance": leg.get("distance", {}).get("text"),
                        "duration": leg.get("duration", {}).get("text")
                    } for leg in legs]
                }
            return None
        except Exception as e:
            logger.error(f"Directions error: {e}")
            return None

    async def optimize_route(
        self,
        driver_location: Tuple[float, float],
        deliveries: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Optimize delivery route for a driver"""
        if not deliveries:
            return None
        
        # Extract waypoints from deliveries
        waypoints = [
            (d.get("latitude"), d.get("longitude"))
            for d in deliveries
            if d.get("latitude") and d.get("longitude")
        ]
        
        if not waypoints:
            return None
        
        # Use first delivery as destination, rest as waypoints
        destination = waypoints[-1]
        intermediate_waypoints = waypoints[:-1] if len(waypoints) > 1 else None
        
        return await self.get_directions(
            origin=driver_location,
            destination=destination,
            waypoints=intermediate_waypoints,
            optimize_waypoints=True
        )

    async def estimate_delivery_time(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float]
    ) -> Optional[Dict[str, Any]]:
        """Estimate delivery time between two points"""
        result = await self.calculate_distance_matrix(
            origins=[origin],
            destinations=[destination]
        )
        
        if result and result.get("rows"):
            element = result["rows"][0].get("elements", [{}])[0]
            if element.get("status") == "OK":
                return {
                    "distance": element.get("distance", {}).get("text"),
                    "distance_meters": element.get("distance", {}).get("value"),
                    "duration": element.get("duration", {}).get("text"),
                    "duration_seconds": element.get("duration", {}).get("value")
                }
        return None

    def _mock_distance_matrix(self, origins: List, destinations: List) -> Dict[str, Any]:
        """Return mock distance matrix when API is not configured"""
        rows = []
        for _ in origins:
            elements = []
            for _ in destinations:
                elements.append({
                    "status": "OK",
                    "distance": {"text": "5.2 mi", "value": 8368},
                    "duration": {"text": "15 mins", "value": 900}
                })
            rows.append({"elements": elements})
        
        return {
            "status": "OK",
            "origin_addresses": ["Mock Origin" for _ in origins],
            "destination_addresses": ["Mock Destination" for _ in destinations],
            "rows": rows
        }

    def _mock_directions(self, origin: Tuple, destination: Tuple, waypoints: Optional[List]) -> Dict[str, Any]:
        """Return mock directions when API is not configured"""
        return {
            "total_distance": "5.2 mi",
            "total_distance_meters": 8368,
            "total_duration": "15 min",
            "total_duration_seconds": 900,
            "polyline": "mock_polyline_data",
            "waypoint_order": list(range(len(waypoints))) if waypoints else [],
            "legs": [{
                "start_address": "Mock Start",
                "end_address": "Mock End",
                "distance": "5.2 mi",
                "duration": "15 mins"
            }]
        }


# Singleton instance
maps_service = MapsService()
