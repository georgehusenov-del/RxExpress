from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, BackgroundTasks, UploadFile, File, Query, Body
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Set, Dict, Any
import uuid
import base64
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models
from models import (
    UserRole, OrderStatus, DriverStatus, PaymentStatus, DeliveryType, TimeWindow,
    User, UserCreate, UserLogin, UserResponse, TokenResponse,
    Pharmacy, PharmacyCreate, PharmacyLocation, PharmacyLocationCreate,
    DriverProfile, DriverCreate, DriverLocationUpdate, DriverStatusUpdate,
    Order, OrderCreate, OrderUpdate, OrderStatusUpdate,
    DeliveryProof, DeliveryProofCreate, DeliveryRecipient, DriverPodSubmit,
    PaymentTransaction, CreateCheckoutRequest,
    LocationPoint, Package, TrackingEvent, PublicTrackingInfo,
    RouteOptimizationRequest, RouteOptimizationResponse,
    NotificationRequest, DistanceMatrixRequest, GeocodeRequest, GeocodeResponse,
    PrescriptionItem, Address,
    ServiceZone, ServiceZoneCreate, QRCodeScan, QRCodeResponse,
    DeliveryPricing, DeliveryPricingCreate, DeliveryPricingUpdate
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from notifications import notification_service
from maps_service import maps_service
from circuit_service import circuit_service
from pydantic import BaseModel as PydanticBaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'rxexpress_db')]

# ============== Route Management Request Models ==============
class CreatePlanRequest(PydanticBaseModel):
    title: Optional[str] = None
    date: str  # YYYY-MM-DD format
    driver_ids: List[str] = []  # List of Circuit driver IDs

class BatchImportOrdersRequest(PydanticBaseModel):
    order_ids: List[str]

class AutoAssignByBoroughRequest(PydanticBaseModel):
    status: str = "out_for_delivery"  # Default status to auto-assign

class AssignDriverToGigRequest(PydanticBaseModel):
    driver_id: str

# Create the main app
app = FastAPI(
    title="RX Expresss API",
    description="Pharmacy Delivery Service Backend API - Similar to DrugLift",
    version="1.0.0"
)

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
pharmacies_router = APIRouter(prefix="/pharmacies", tags=["Pharmacies"])
drivers_router = APIRouter(prefix="/drivers", tags=["Drivers"])
orders_router = APIRouter(prefix="/orders", tags=["Orders"])
delivery_router = APIRouter(prefix="/delivery", tags=["Delivery"])
payments_router = APIRouter(prefix="/payments", tags=["Payments"])
tracking_router = APIRouter(prefix="/tracking", tags=["Tracking"])
maps_router = APIRouter(prefix="/maps", tags=["Maps & Routing"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
circuit_router = APIRouter(prefix="/circuit", tags=["Circuit/Spoke Integration"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])
zones_router = APIRouter(prefix="/zones", tags=["Service Zones"])
public_router = APIRouter(prefix="/track", tags=["Public Tracking"])


# ============== WebSocket Manager for Real-Time Tracking ==============
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # order_id -> connections
        self.driver_connections: Dict[str, WebSocket] = {}  # driver_id -> connection
    
    async def connect_order(self, websocket: WebSocket, order_id: str):
        await websocket.accept()
        if order_id not in self.active_connections:
            self.active_connections[order_id] = set()
        self.active_connections[order_id].add(websocket)
        logger.info(f"Client connected to order {order_id}")
    
    async def connect_driver(self, websocket: WebSocket, driver_id: str):
        await websocket.accept()
        self.driver_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected")
    
    def disconnect_order(self, websocket: WebSocket, order_id: str):
        if order_id in self.active_connections:
            self.active_connections[order_id].discard(websocket)
    
    def disconnect_driver(self, driver_id: str):
        if driver_id in self.driver_connections:
            del self.driver_connections[driver_id]
    
    async def broadcast_to_order(self, order_id: str, message: dict):
        if order_id in self.active_connections:
            for connection in self.active_connections[order_id].copy():
                try:
                    await connection.send_json(message)
                except Exception:
                    self.active_connections[order_id].discard(connection)
    
    async def send_to_driver(self, driver_id: str, message: dict):
        if driver_id in self.driver_connections:
            try:
                await self.driver_connections[driver_id].send_json(message)
            except Exception:
                self.disconnect_driver(driver_id)

manager = ConnectionManager()


# ============== Authentication Routes ==============
@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user (patient, pharmacy, or driver)"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    user_dict["updated_at"] = user_dict["updated_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            phone=user.phone,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )


@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            phone=user["phone"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=UserRole(user["role"]),
            is_active=user.get("is_active", True),
            created_at=created_at
        )
    )


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        phone=user["phone"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        role=UserRole(user["role"]),
        is_active=user.get("is_active", True),
        created_at=created_at
    )


# ============== Pharmacy Routes ==============
@pharmacies_router.post("/register")
async def register_pharmacy(pharmacy_data: PharmacyCreate, current_user: dict = Depends(get_current_user)):
    """Register a new pharmacy"""
    if current_user["role"] not in [UserRole.PHARMACY, UserRole.ADMIN, "pharmacy", "admin"]:
        raise HTTPException(status_code=403, detail="Only pharmacy accounts can register pharmacies")
    
    pharmacy = Pharmacy(
        name=pharmacy_data.name,
        license_number=pharmacy_data.license_number,
        address=pharmacy_data.address,
        phone=pharmacy_data.phone,
        email=pharmacy_data.email,
        operating_hours=pharmacy_data.operating_hours,
        user_id=current_user["sub"]
    )
    
    pharmacy_dict = pharmacy.model_dump()
    pharmacy_dict["created_at"] = pharmacy_dict["created_at"].isoformat()
    pharmacy_dict["address"] = pharmacy_data.address.model_dump()
    
    await db.pharmacies.insert_one(pharmacy_dict)
    
    return {"message": "Pharmacy registered successfully", "pharmacy_id": pharmacy.id}


@pharmacies_router.get("/")
async def list_pharmacies(skip: int = 0, limit: int = 20):
    """List all active pharmacies"""
    pharmacies = await db.pharmacies.find(
        {"is_active": True},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    return {"pharmacies": pharmacies, "count": len(pharmacies)}


@pharmacies_router.get("/{pharmacy_id}")
async def get_pharmacy(pharmacy_id: str):
    """Get pharmacy details"""
    pharmacy = await db.pharmacies.find_one({"id": pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    return pharmacy


@pharmacies_router.get("/{pharmacy_id}/locations")
async def get_pharmacy_locations(pharmacy_id: str, current_user: dict = Depends(get_current_user)):
    """Get all locations for a pharmacy"""
    pharmacy = await db.pharmacies.find_one({"id": pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    locations = pharmacy.get("locations", [])
    return {"locations": locations, "count": len(locations)}


@pharmacies_router.post("/{pharmacy_id}/locations")
async def add_pharmacy_location(
    pharmacy_id: str,
    location_data: PharmacyLocationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new location to a pharmacy"""
    pharmacy = await db.pharmacies.find_one({"id": pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    # Check ownership or admin
    if pharmacy.get("user_id") != current_user["sub"] and current_user.get("role") not in ["admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this pharmacy")
    
    # Create location
    location = PharmacyLocation(
        name=location_data.name,
        address=location_data.address,
        phone=location_data.phone,
        is_primary=location_data.is_primary,
        operating_hours=location_data.operating_hours,
        pickup_instructions=location_data.pickup_instructions
    )
    
    location_dict = location.model_dump()
    location_dict["address"] = location_data.address.model_dump()
    
    # If this is primary, unset other primaries
    if location_data.is_primary:
        existing_locations = pharmacy.get("locations", [])
        for loc in existing_locations:
            loc["is_primary"] = False
    
    # Add location to pharmacy
    await db.pharmacies.update_one(
        {"id": pharmacy_id},
        {"$push": {"locations": location_dict}}
    )
    
    return {
        "message": "Location added successfully",
        "location_id": location.id,
        "location": location_dict
    }


@pharmacies_router.put("/{pharmacy_id}/locations/{location_id}")
async def update_pharmacy_location(
    pharmacy_id: str,
    location_id: str,
    location_data: PharmacyLocationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a pharmacy location"""
    pharmacy = await db.pharmacies.find_one({"id": pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    # Check ownership or admin
    if pharmacy.get("user_id") != current_user["sub"] and current_user.get("role") not in ["admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this pharmacy")
    
    # Find and update location
    locations = pharmacy.get("locations", [])
    location_found = False
    
    for i, loc in enumerate(locations):
        if loc.get("id") == location_id:
            locations[i] = {
                **loc,
                "name": location_data.name,
                "address": location_data.address.model_dump(),
                "phone": location_data.phone,
                "is_primary": location_data.is_primary,
                "operating_hours": location_data.operating_hours,
                "pickup_instructions": location_data.pickup_instructions
            }
            location_found = True
            break
    
    if not location_found:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # If this is primary, unset other primaries
    if location_data.is_primary:
        for loc in locations:
            if loc.get("id") != location_id:
                loc["is_primary"] = False
    
    await db.pharmacies.update_one(
        {"id": pharmacy_id},
        {"$set": {"locations": locations}}
    )
    
    return {"message": "Location updated successfully"}


@pharmacies_router.delete("/{pharmacy_id}/locations/{location_id}")
async def delete_pharmacy_location(
    pharmacy_id: str,
    location_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a pharmacy location"""
    pharmacy = await db.pharmacies.find_one({"id": pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    # Check ownership or admin
    if pharmacy.get("user_id") != current_user["sub"] and current_user.get("role") not in ["admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this pharmacy")
    
    # Remove location
    locations = pharmacy.get("locations", [])
    new_locations = [loc for loc in locations if loc.get("id") != location_id]
    
    if len(new_locations) == len(locations):
        raise HTTPException(status_code=404, detail="Location not found")
    
    await db.pharmacies.update_one(
        {"id": pharmacy_id},
        {"$set": {"locations": new_locations}}
    )
    
    return {"message": "Location deleted successfully"}


# ============== Driver Routes ==============
@drivers_router.post("/register")
async def register_driver(driver_data: DriverCreate, current_user: dict = Depends(get_current_user)):
    """Register as a delivery driver"""
    if current_user["role"] not in [UserRole.DRIVER, UserRole.ADMIN, "driver", "admin"]:
        raise HTTPException(status_code=403, detail="Only driver accounts can register as drivers")
    
    # Check if driver profile already exists
    existing = await db.drivers.find_one({"user_id": current_user["sub"]})
    if existing:
        raise HTTPException(status_code=400, detail="Driver profile already exists")
    
    driver = DriverProfile(
        user_id=current_user["sub"],
        vehicle_type=driver_data.vehicle_type,
        vehicle_number=driver_data.vehicle_number,
        license_number=driver_data.license_number
    )
    
    driver_dict = driver.model_dump()
    driver_dict["created_at"] = driver_dict["created_at"].isoformat()
    if driver_dict.get("current_location"):
        driver_dict["current_location"]["timestamp"] = driver_dict["current_location"]["timestamp"].isoformat()
    
    await db.drivers.insert_one(driver_dict)
    
    return {"message": "Driver registered successfully", "driver_id": driver.id}


@drivers_router.get("/")
async def list_available_drivers(status: Optional[str] = None):
    """List drivers, optionally filtered by status"""
    query = {}
    if status:
        query["status"] = status
    
    drivers = await db.drivers.find(query, {"_id": 0}).to_list(100)
    return {"drivers": drivers, "count": len(drivers)}


@drivers_router.get("/me")
async def get_driver_profile(current_user: dict = Depends(get_current_user)):
    """Get current driver's profile"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return driver


@drivers_router.put("/location")
async def update_driver_location(location_data: DriverLocationUpdate, current_user: dict = Depends(get_current_user)):
    """Update driver's current location"""
    timestamp = datetime.now(timezone.utc)
    
    # Update driver's current location
    result = await db.drivers.update_one(
        {"id": location_data.driver_id},
        {"$set": {
            "current_location": {
                "latitude": location_data.latitude,
                "longitude": location_data.longitude,
                "timestamp": timestamp.isoformat()
            }
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Save to location history
    history = LocationHistory(
        driver_id=location_data.driver_id,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        timestamp=timestamp
    )
    history_dict = history.model_dump()
    history_dict["timestamp"] = history_dict["timestamp"].isoformat()
    await db.location_history.insert_one(history_dict)
    
    # Get driver's active orders and broadcast location to tracking clients
    driver = await db.drivers.find_one({"id": location_data.driver_id}, {"_id": 0})
    if driver:
        active_orders = await db.orders.find({
            "driver_id": location_data.driver_id,
            "status": {"$in": ["assigned", "picked_up", "in_transit"]}
        }, {"_id": 0}).to_list(100)
        
        for order in active_orders:
            await manager.broadcast_to_order(order["id"], {
                "type": "location_update",
                "driver_id": location_data.driver_id,
                "latitude": location_data.latitude,
                "longitude": location_data.longitude,
                "timestamp": timestamp.isoformat()
            })
    
    return {"message": "Location updated", "timestamp": timestamp.isoformat()}


@drivers_router.put("/status")
async def update_driver_status(status_data: DriverStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update driver's availability status"""
    result = await db.drivers.update_one(
        {"id": status_data.driver_id},
        {"$set": {"status": status_data.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": f"Status updated to {status_data.status}"}


# ============== Order Routes ==============
@orders_router.post("/", response_model=dict)
async def create_order(order_data: OrderCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Create a new prescription delivery order"""
    # Get pharmacy details
    pharmacy = await db.pharmacies.find_one({"id": order_data.pharmacy_id}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    # Check service zone availability
    delivery_zip = order_data.delivery_address.postal_code
    service_zone = await db.service_zones.find_one(
        {"zip_codes": delivery_zip, "is_active": True},
        {"_id": 0}
    )
    
    # Calculate delivery fee
    base_fee = service_zone.get("delivery_fee", 5.99) if service_zone else 5.99
    priority_surcharge = 0.0
    
    if order_data.delivery_type == DeliveryType.PRIORITY:
        priority_surcharge = service_zone.get("priority_surcharge", 5.00) if service_zone else 5.00
    
    total_amount = base_fee + priority_surcharge
    
    # Get pharmacy location
    pickup_address = None
    pharmacy_location_id = order_data.pharmacy_location_id
    if pharmacy_location_id and pharmacy.get("locations"):
        for loc in pharmacy["locations"]:
            if loc.get("id") == pharmacy_location_id:
                pickup_address = loc.get("address")
                break
    if not pickup_address:
        pickup_address = pharmacy.get("address") or pharmacy.get("locations", [{}])[0].get("address")
    
    # Calculate ETA based on delivery type
    now = datetime.now(timezone.utc)
    estimated_delivery_start = None
    estimated_delivery_end = None
    
    if order_data.delivery_type == DeliveryType.SAME_DAY:
        # Same day - 2-4 hours from now
        estimated_delivery_start = now + timedelta(hours=2)
        estimated_delivery_end = now + timedelta(hours=4)
    elif order_data.delivery_type == DeliveryType.NEXT_DAY:
        # Next day - morning window by default
        tomorrow = now + timedelta(days=1)
        estimated_delivery_start = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
        estimated_delivery_end = tomorrow.replace(hour=12, minute=0, second=0, microsecond=0)
    elif order_data.delivery_type == DeliveryType.PRIORITY:
        # Priority - first delivery of the day (8-10 AM)
        tomorrow = now + timedelta(days=1)
        estimated_delivery_start = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
        estimated_delivery_end = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    elif order_data.delivery_type == DeliveryType.TIME_WINDOW and order_data.time_window:
        # Specific time window
        tomorrow = now + timedelta(days=1)
        if order_data.time_window == TimeWindow.MORNING:
            estimated_delivery_start = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
            estimated_delivery_end = tomorrow.replace(hour=13, minute=0, second=0, microsecond=0)
        elif order_data.time_window == TimeWindow.AFTERNOON:
            estimated_delivery_start = tomorrow.replace(hour=13, minute=0, second=0, microsecond=0)
            estimated_delivery_end = tomorrow.replace(hour=18, minute=0, second=0, microsecond=0)
        elif order_data.time_window == TimeWindow.EVENING:
            estimated_delivery_start = tomorrow.replace(hour=16, minute=0, second=0, microsecond=0)
            estimated_delivery_end = tomorrow.replace(hour=21, minute=0, second=0, microsecond=0)
    
    # Create order with new model
    order = Order(
        pharmacy_id=order_data.pharmacy_id,
        pharmacy_location_id=order_data.pharmacy_location_id,
        pharmacy_name=pharmacy.get("name"),
        delivery_type=order_data.delivery_type,
        time_window=order_data.time_window,
        recipient=order_data.recipient,
        delivery_address=order_data.delivery_address,
        pickup_address=Address(**pickup_address) if isinstance(pickup_address, dict) else pickup_address,
        packages=order_data.packages,
        total_packages=len(order_data.packages),
        scheduled_date=order_data.scheduled_date,
        estimated_delivery_start=estimated_delivery_start,
        estimated_delivery_end=estimated_delivery_end,
        delivery_notes=order_data.delivery_notes,
        requires_signature=order_data.requires_signature,
        requires_photo_proof=order_data.requires_photo_proof,
        requires_id_verification=order_data.requires_id_verification,
        service_zone_id=service_zone.get("id") if service_zone else None,
        delivery_fee=base_fee,
        priority_surcharge=priority_surcharge,
        total_amount=total_amount,
        copay_amount=order_data.copay_amount,
        copay_collected=False
    )
    
    # Add initial tracking event
    order.tracking_updates = [{
        "timestamp": now.isoformat(),
        "status": "pending",
        "message": "Order received and being processed"
    }]
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["delivery_address"] = order_data.delivery_address.model_dump()
    order_dict["pickup_address"] = pickup_address if isinstance(pickup_address, dict) else pickup_address.model_dump() if pickup_address else None
    order_dict["recipient"] = order_data.recipient.model_dump()
    order_dict["packages"] = [p.model_dump() for p in order_data.packages]
    
    # Determine NYC borough from delivery address for QR code prefix
    def get_borough_prefix(postal_code: str, city: str = "") -> str:
        """Get borough prefix based on NYC ZIP code or city name"""
        zip_code = postal_code.strip()[:5] if postal_code else ""
        city_lower = city.lower().strip() if city else ""
        
        # Check city name first
        if "manhattan" in city_lower or "new york" in city_lower:
            return "M"
        elif "brooklyn" in city_lower:
            return "B"
        elif "queens" in city_lower:
            return "Q"
        elif "bronx" in city_lower:
            return "X"
        elif "staten island" in city_lower:
            return "S"
        
        # Check ZIP code ranges
        try:
            zip_int = int(zip_code)
            # Manhattan: 10001-10282
            if 10001 <= zip_int <= 10282:
                return "M"
            # Bronx: 10451-10475
            elif 10451 <= zip_int <= 10475:
                return "X"
            # Brooklyn: 11201-11256
            elif 11201 <= zip_int <= 11256:
                return "B"
            # Queens: 11004-11109, 11351-11697
            elif (11004 <= zip_int <= 11109) or (11351 <= zip_int <= 11697):
                return "Q"
            # Staten Island: 10301-10314
            elif 10301 <= zip_int <= 10314:
                return "S"
        except (ValueError, TypeError):
            pass
        
        # Default to 'N' for non-NYC or unknown
        return "N"
    
    # Get borough prefix for this order
    delivery_zip = order_data.delivery_address.postal_code
    delivery_city = order_data.delivery_address.city
    borough_prefix = get_borough_prefix(delivery_zip, delivery_city)
    
    # Generate unique order number suffix (4 digits)
    order_suffix = uuid.uuid4().hex[:4].upper()
    
    # Generate QR codes for each package with borough prefix
    for i, pkg in enumerate(order_dict["packages"]):
        qr_code = f"{borough_prefix}{order_suffix}-PKG{i+1}"
        order_dict["packages"][i]["qr_code"] = qr_code
        order_dict["packages"][i]["package_number"] = i + 1
    
    # Generate main order QR code with borough prefix
    order_qr_code = f"{borough_prefix}{order_suffix}"
    order_dict["qr_code"] = order_qr_code
    order_dict["borough"] = borough_prefix  # Store borough for reference
    
    if estimated_delivery_start:
        order_dict["estimated_delivery_start"] = estimated_delivery_start.isoformat()
    if estimated_delivery_end:
        order_dict["estimated_delivery_end"] = estimated_delivery_end.isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Generate tracking URL
    tracking_url = f"/track/{order.tracking_number}"
    await db.orders.update_one(
        {"id": order.id},
        {"$set": {"tracking_url": tracking_url}}
    )
    
    # Send notifications in background
    background_tasks.add_task(
        notification_service.send_order_confirmation,
        order_data.recipient.email,
        order_data.recipient.phone,
        {
            "order_number": order.order_number,
            "tracking_number": order.tracking_number,
            "status": order.status,
            "delivery_type": order.delivery_type,
            "estimated_delivery": f"{estimated_delivery_start.strftime('%I:%M %p') if estimated_delivery_start else 'TBD'} - {estimated_delivery_end.strftime('%I:%M %p') if estimated_delivery_end else 'TBD'}",
            "tracking_url": tracking_url
        }
    )
    
    # Notify pharmacy
    background_tasks.add_task(
        notification_service.send_pharmacy_new_order,
        pharmacy.get("email"),
        {
            "order_number": order.order_number,
            "patient_name": order_data.recipient.name,
            "items_count": len(order_data.packages),
            "delivery_type": order_data.delivery_type,
            "scheduled_pickup": "ASAP" if order_data.delivery_type == DeliveryType.SAME_DAY else "Tomorrow"
        }
    )
    
    return {
        "message": "Order created successfully",
        "order_id": order.id,
        "order_number": order.order_number,
        "tracking_number": order.tracking_number,
        "tracking_url": tracking_url,
        "qr_code": order_qr_code,
        "package_qr_codes": [pkg["qr_code"] for pkg in order_dict["packages"]],
        "delivery_type": order.delivery_type,
        "time_window": order.time_window,
        "estimated_delivery_start": estimated_delivery_start.isoformat() if estimated_delivery_start else None,
        "estimated_delivery_end": estimated_delivery_end.isoformat() if estimated_delivery_end else None,
        "delivery_fee": base_fee,
        "priority_surcharge": priority_surcharge,
        "total_amount": total_amount
    }


@orders_router.get("/")
async def list_orders(
    status: Optional[str] = None,
    pharmacy_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List orders with optional filters"""
    query = {}
    
    if status:
        query["status"] = status
    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id
    if patient_id:
        query["patient_id"] = patient_id
    if driver_id:
        query["driver_id"] = driver_id
    
    # Role-based filtering
    user_role = current_user.get("role")
    user_id = current_user.get("sub")
    
    if user_role == "patient":
        query["patient_id"] = user_id
    elif user_role == "driver":
        driver = await db.drivers.find_one({"user_id": user_id}, {"_id": 0})
        if driver:
            query["driver_id"] = driver["id"]
    elif user_role == "pharmacy":
        pharmacy = await db.pharmacies.find_one({"user_id": user_id}, {"_id": 0})
        if pharmacy:
            query["pharmacy_id"] = pharmacy["id"]
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "skip": skip, "limit": limit}


@orders_router.get("/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@orders_router.put("/{order_id}/assign")
async def assign_driver(order_id: str, driver_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Assign a driver to an order"""
    # Get order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get driver
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Update order
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "driver_id": driver_id,
            "status": OrderStatus.ASSIGNED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"status": DriverStatus.ON_ROUTE}}
    )
    
    # Get recipient info from order and driver user info for notifications
    recipient = order.get("recipient", {})
    driver_user = await db.users.find_one({"id": driver["user_id"]}, {"_id": 0})
    
    if recipient and driver_user:
        background_tasks.add_task(
            notification_service.send_driver_assigned,
            recipient.get("email"),
            recipient.get("phone"),
            {
                "order_number": order.get("order_number"),
                "eta": "30-45 minutes"
            },
            {
                "name": f"{driver_user.get('first_name', '')} {driver_user.get('last_name', '')}",
                "vehicle": f"{driver.get('vehicle_type', '')} - {driver.get('vehicle_number', '')}"
            }
        )
        
        # Notify driver
        background_tasks.add_task(
            notification_service.send_driver_new_assignment,
            driver_user.get("phone"),
            {
                "order_number": order.get("order_number"),
                "pickup_address": order.get("pickup_address", {}).get("street", ""),
                "delivery_address": order.get("delivery_address", {}).get("street", "")
            }
        )
    
    return {"message": "Driver assigned successfully"}


@orders_router.put("/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Update order status"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.status == OrderStatus.PICKED_UP:
        update_data["actual_pickup_time"] = datetime.now(timezone.utc).isoformat()
    elif status_update.status == OrderStatus.DELIVERED:
        update_data["actual_delivery_time"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Broadcast status update
    await manager.broadcast_to_order(order_id, {
        "type": "status_update",
        "order_id": order_id,
        "status": status_update.status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Send delivery completion notification
    if status_update.status == OrderStatus.DELIVERED:
        recipient = order.get("recipient", {})
        if recipient:
            background_tasks.add_task(
                notification_service.send_delivery_completed,
                recipient.get("email"),
                recipient.get("phone"),
                {
                    "order_number": order.get("order_number"),
                    "delivered_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
                    "received_by": status_update.notes or "Customer"
                }
            )
        
        # Update driver status back to available
        if order.get("driver_id"):
            await db.drivers.update_one(
                {"id": order["driver_id"]},
                {"$set": {"status": DriverStatus.AVAILABLE}, "$inc": {"total_deliveries": 1}}
            )
    
    return {"message": f"Order status updated to {status_update.status}"}


# ============== Delivery Proof Routes ==============
@delivery_router.post("/proof")
async def submit_delivery_proof(proof_data: DeliveryProofCreate, current_user: dict = Depends(get_current_user)):
    """Submit delivery proof (signature and/or photo)"""
    order = await db.orders.find_one({"id": proof_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Save photo if provided
    photo_url = None
    if proof_data.photo_base64:
        # In production, upload to cloud storage (S3, etc.)
        # For now, store the base64 reference
        photo_url = f"data:image/jpeg;base64,{proof_data.photo_base64[:100]}..."  # Truncated for storage
    
    proof = DeliveryProof(
        order_id=proof_data.order_id,
        driver_id=order.get("driver_id", ""),
        signature_data=proof_data.signature_data,
        photo_url=photo_url,
        recipient_name=proof_data.recipient_name,
        delivery_notes=proof_data.delivery_notes,
        location=LocationPoint(
            latitude=proof_data.latitude,
            longitude=proof_data.longitude
        )
    )
    
    proof_dict = proof.model_dump()
    proof_dict["created_at"] = proof_dict["created_at"].isoformat()
    proof_dict["location"]["timestamp"] = proof_dict["location"]["timestamp"].isoformat()
    
    await db.delivery_proofs.insert_one(proof_dict)
    
    # Update order with proof
    await db.orders.update_one(
        {"id": proof_data.order_id},
        {"$set": {
            "signature_data": proof_data.signature_data,
            "delivery_photo_url": photo_url,
            "status": OrderStatus.DELIVERED,
            "actual_delivery_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Delivery proof submitted", "proof_id": proof.id}


@delivery_router.get("/proof/{order_id}")
async def get_delivery_proof(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get delivery proof for an order"""
    proof = await db.delivery_proofs.find_one({"order_id": order_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="Delivery proof not found")
    return proof


# ============== Payment Routes (Stripe Integration) ==============
@payments_router.post("/checkout/create")
async def create_checkout_session(checkout_request: CreateCheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create a Stripe checkout session for order payment"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse
    )
    
    # Get order
    order = await db.orders.find_one({"id": checkout_request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get amount from order (server-side, not from frontend)
    amount = float(order.get("total_amount", order.get("delivery_fee", 5.99)))
    
    # Initialize Stripe checkout
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{checkout_request.origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Build success and cancel URLs
    success_url = f"{checkout_request.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_request.origin_url}/payment/cancel"
    
    # Create checkout session
    session_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": checkout_request.order_id,
            "user_id": current_user["sub"],
            "order_number": order.get("order_number", "")
        }
    )
    
    session = await stripe_checkout.create_checkout_session(session_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        order_id=checkout_request.order_id,
        user_id=current_user["sub"],
        amount=amount,
        session_id=session.session_id,
        payment_status=PaymentStatus.INITIATED,
        metadata=session_request.metadata
    )
    
    transaction_dict = transaction.model_dump()
    transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
    transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
    
    await db.payment_transactions.insert_one(transaction_dict)
    
    # Update order with payment session
    await db.orders.update_one(
        {"id": checkout_request.order_id},
        {"$set": {
            "payment_session_id": session.session_id,
            "payment_status": PaymentStatus.INITIATED
        }}
    )
    
    return {"url": session.url, "session_id": session.session_id}


@payments_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get payment status for a checkout session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and order if payment is complete
    if status.payment_status == "paid":
        # Check if already processed
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": PaymentStatus.PAID,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            await db.orders.update_one(
                {"payment_session_id": session_id},
                {"$set": {
                    "payment_status": PaymentStatus.PAID,
                    "status": OrderStatus.CONFIRMED
                }}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }


# ============== Tracking Routes ==============
@tracking_router.get("/order/{order_id}")
async def get_order_tracking(order_id: str):
    """Get real-time tracking info for an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    tracking_info = {
        "order_id": order_id,
        "order_number": order.get("order_number"),
        "status": order.get("status"),
        "driver_id": order.get("driver_id"),
        "driver_location": None,
        "estimated_delivery": order.get("estimated_delivery_time"),
        "pickup_address": order.get("pickup_address"),
        "delivery_address": order.get("delivery_address")
    }
    
    # Get driver's current location
    if order.get("driver_id"):
        driver = await db.drivers.find_one({"id": order["driver_id"]}, {"_id": 0})
        if driver and driver.get("current_location"):
            tracking_info["driver_location"] = driver["current_location"]
            
            # Get driver user info
            driver_user = await db.users.find_one({"id": driver["user_id"]}, {"_id": 0})
            if driver_user:
                tracking_info["driver_name"] = f"{driver_user.get('first_name', '')} {driver_user.get('last_name', '')}"
                tracking_info["driver_phone"] = driver_user.get("phone")
    
    return tracking_info


@tracking_router.get("/driver/{driver_id}/history")
async def get_driver_location_history(driver_id: str, hours: int = 24, current_user: dict = Depends(get_current_user)):
    """Get driver's location history"""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    history = await db.location_history.find({
        "driver_id": driver_id,
        "timestamp": {"$gte": since.isoformat()}
    }, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    return {"driver_id": driver_id, "history": history, "count": len(history)}


# ============== Maps & Routing Routes ==============
@maps_router.post("/geocode")
async def geocode_address(request: GeocodeRequest):
    """Convert address to coordinates"""
    result = await maps_service.geocode_address(request.address)
    if not result:
        raise HTTPException(status_code=404, detail="Address not found")
    return result


@maps_router.post("/distance-matrix")
async def calculate_distance_matrix(request: DistanceMatrixRequest):
    """Calculate distances between multiple origins and destinations"""
    origins = [(p["latitude"], p["longitude"]) for p in request.origins]
    destinations = [(p["latitude"], p["longitude"]) for p in request.destinations]
    
    result = await maps_service.calculate_distance_matrix(origins, destinations, request.mode)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to calculate distance matrix")
    return result


@maps_router.post("/optimize-route")
async def optimize_delivery_route(request: RouteOptimizationRequest, current_user: dict = Depends(get_current_user)):
    """Optimize route for multiple deliveries"""
    driver = await db.drivers.find_one({"id": request.driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver_location = driver.get("current_location", {})
    if not driver_location:
        raise HTTPException(status_code=400, detail="Driver location not available")
    
    result = await maps_service.optimize_route(
        (driver_location["latitude"], driver_location["longitude"]),
        request.waypoints
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to optimize route")
    
    return result


@maps_router.get("/estimate/{order_id}")
async def estimate_delivery_time(order_id: str):
    """Estimate delivery time for an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    pickup = order.get("pickup_address", {})
    delivery = order.get("delivery_address", {})
    
    if not pickup.get("latitude") or not delivery.get("latitude"):
        # Try to geocode addresses
        if pickup.get("street"):
            pickup_geo = await maps_service.geocode_address(
                f"{pickup.get('street')}, {pickup.get('city')}, {pickup.get('state')} {pickup.get('postal_code')}"
            )
            if pickup_geo:
                pickup["latitude"] = pickup_geo["latitude"]
                pickup["longitude"] = pickup_geo["longitude"]
        
        if delivery.get("street"):
            delivery_geo = await maps_service.geocode_address(
                f"{delivery.get('street')}, {delivery.get('city')}, {delivery.get('state')} {delivery.get('postal_code')}"
            )
            if delivery_geo:
                delivery["latitude"] = delivery_geo["latitude"]
                delivery["longitude"] = delivery_geo["longitude"]
    
    if pickup.get("latitude") and delivery.get("latitude"):
        estimate = await maps_service.estimate_delivery_time(
            (pickup["latitude"], pickup["longitude"]),
            (delivery["latitude"], delivery["longitude"])
        )
        return estimate
    
    return {"distance": "Unknown", "duration": "30-45 min", "distance_meters": 0, "duration_seconds": 2100}


# ============== Notifications Routes ==============
@notifications_router.post("/send")
async def send_notification(request: NotificationRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Send a notification (SMS or Email)"""
    results = {}
    
    if request.notification_type == "sms" and request.phone:
        results["sms"] = await notification_service.send_sms(request.phone, request.message)
    elif request.notification_type == "email" and request.email:
        results["email"] = await notification_service.send_email(
            request.email,
            request.subject or "RX Expresss Notification",
            request.message
        )
    
    return results


# ============== WebSocket Endpoints ==============
@api_router.websocket("/ws/track/{order_id}")
async def websocket_track_order(websocket: WebSocket, order_id: str):
    """WebSocket endpoint for real-time order tracking"""
    await manager.connect_order(websocket, order_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect_order(websocket, order_id)


@api_router.websocket("/ws/driver/{driver_id}")
async def websocket_driver_connection(websocket: WebSocket, driver_id: str):
    """WebSocket endpoint for driver location updates"""
    await manager.connect_driver(websocket, driver_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "location_update":
                # Update driver location
                await db.drivers.update_one(
                    {"id": driver_id},
                    {"$set": {
                        "current_location": {
                            "latitude": message["latitude"],
                            "longitude": message["longitude"],
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    }}
                )
                
                # Broadcast to tracking clients
                active_orders = await db.orders.find({
                    "driver_id": driver_id,
                    "status": {"$in": ["assigned", "picked_up", "in_transit"]}
                }, {"_id": 0}).to_list(100)
                
                for order in active_orders:
                    await manager.broadcast_to_order(order["id"], {
                        "type": "location_update",
                        "driver_id": driver_id,
                        "latitude": message["latitude"],
                        "longitude": message["longitude"],
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
    except WebSocketDisconnect:
        manager.disconnect_driver(driver_id)


# ============== Webhook Routes ==============
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    stripe_signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        if webhook_response.payment_status == "paid":
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": PaymentStatus.PAID,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update order
            await db.orders.update_one(
                {"payment_session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": PaymentStatus.PAID,
                    "status": OrderStatus.CONFIRMED
                }}
            )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})


# ============== Health & Status Routes ==============
@api_router.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "RX Expresss API - Pharmacy Delivery Service",
        "version": "1.0.0",
        "documentation": "/docs"
    }


@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": "connected",
            "maps": "configured" if maps_service.is_configured() else "not_configured",
            "notifications": "configured" if notification_service.twilio_client or notification_service.sendgrid_client else "not_configured",
            "circuit": "configured" if circuit_service.is_configured() else "not_configured"
        }
    }


# ============== Admin Helper ==============
async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user.get("role") not in ["admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============== Admin Routes ==============
@admin_router.get("/dashboard")
async def admin_dashboard(current_user: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    # Count all entities
    users_count = await db.users.count_documents({})
    pharmacies_count = await db.pharmacies.count_documents({})
    drivers_count = await db.drivers.count_documents({})
    orders_count = await db.orders.count_documents({})
    
    # Orders by status
    orders_by_status = {}
    for status in ["pending", "confirmed", "ready_for_pickup", "assigned", "picked_up", "in_transit", "delivered", "cancelled"]:
        orders_by_status[status] = await db.orders.count_documents({"status": status})
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Active drivers
    active_drivers = await db.drivers.count_documents({"status": {"$ne": "offline"}})
    
    # Copay statistics
    copay_pipeline = [
        {"$match": {"copay_amount": {"$gt": 0}}},
        {"$group": {
            "_id": None,
            "total_copay_to_collect": {"$sum": {"$cond": [{"$eq": ["$copay_collected", False]}, "$copay_amount", 0]}},
            "total_copay_collected": {"$sum": {"$cond": [{"$eq": ["$copay_collected", True]}, "$copay_amount", 0]}},
            "orders_with_copay": {"$sum": 1},
            "orders_copay_pending": {"$sum": {"$cond": [{"$eq": ["$copay_collected", False]}, 1, 0]}},
            "orders_copay_collected": {"$sum": {"$cond": [{"$eq": ["$copay_collected", True]}, 1, 0]}}
        }}
    ]
    copay_result = await db.orders.aggregate(copay_pipeline).to_list(1)
    copay_stats = copay_result[0] if copay_result else {
        "total_copay_to_collect": 0,
        "total_copay_collected": 0,
        "orders_with_copay": 0,
        "orders_copay_pending": 0,
        "orders_copay_collected": 0
    }
    
    # Borough statistics
    borough_pipeline = [
        {"$match": {"status": {"$nin": ["delivered", "cancelled"]}}},
        {"$group": {
            "_id": {"$substr": ["$qr_code", 0, 1]},
            "count": {"$sum": 1}
        }}
    ]
    borough_result = await db.orders.aggregate(borough_pipeline).to_list(10)
    borough_stats = {item["_id"]: item["count"] for item in borough_result if item["_id"]}
    
    return {
        "stats": {
            "total_users": users_count,
            "total_pharmacies": pharmacies_count,
            "total_drivers": drivers_count,
            "active_drivers": active_drivers,
            "total_orders": orders_count,
            "orders_by_status": orders_by_status,
            "copay_to_collect": copay_stats.get("total_copay_to_collect", 0),
            "copay_collected": copay_stats.get("total_copay_collected", 0),
            "orders_copay_pending": copay_stats.get("orders_copay_pending", 0),
            "orders_copay_collected": copay_stats.get("orders_copay_collected", 0),
            "borough_stats": borough_stats
        },
        "recent_orders": recent_orders
    }


@admin_router.get("/users")
async def admin_list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """List all users (admin only)"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@admin_router.get("/users/{user_id}")
async def admin_get_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Get user details (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@admin_router.put("/users/{user_id}/activate")
async def admin_activate_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Activate a user account"""
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated"}


@admin_router.put("/users/{user_id}/deactivate")
async def admin_deactivate_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Deactivate a user account"""
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated"}


@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    # Don't allow deleting yourself
    if user_id == current_user.get("sub"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete related profiles
    await db.drivers.delete_one({"user_id": user_id})
    await db.pharmacies.delete_one({"user_id": user_id})
    
    return {"message": "User deleted"}


@admin_router.get("/pharmacies")
async def admin_list_pharmacies(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """List all pharmacies (admin only)"""
    pharmacies = await db.pharmacies.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.pharmacies.count_documents({})
    return {"pharmacies": pharmacies, "total": total}


@admin_router.put("/pharmacies/{pharmacy_id}/verify")
async def admin_verify_pharmacy(pharmacy_id: str, current_user: dict = Depends(require_admin)):
    """Verify a pharmacy"""
    result = await db.pharmacies.update_one({"id": pharmacy_id}, {"$set": {"is_verified": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    return {"message": "Pharmacy verified"}


@admin_router.get("/drivers")
async def admin_list_drivers(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """List all drivers with details (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    drivers = await db.drivers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.drivers.count_documents(query)
    
    # Enrich with user info
    for driver in drivers:
        user = await db.users.find_one({"id": driver.get("user_id")}, {"_id": 0, "password_hash": 0})
        if user:
            driver["user"] = user
    
    return {"drivers": drivers, "total": total}


@admin_router.put("/drivers/{driver_id}/verify")
async def admin_verify_driver(driver_id: str, current_user: dict = Depends(require_admin)):
    """Verify a driver"""
    result = await db.drivers.update_one({"id": driver_id}, {"$set": {"is_verified": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver verified"}


@admin_router.post("/drivers")
async def admin_create_driver(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    phone: str,
    vehicle_type: str,
    vehicle_number: str,
    license_number: str,
    current_user: dict = Depends(require_admin)
):
    """Create a new driver account (admin only)"""
    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pwd = get_password_hash(password)
    
    user = {
        "id": user_id,
        "email": email,
        "password_hash": hashed_pwd,
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "role": "driver",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create driver profile
    driver_id = str(uuid.uuid4())
    driver = {
        "id": driver_id,
        "user_id": user_id,
        "vehicle_type": vehicle_type,
        "vehicle_number": vehicle_number,
        "license_number": license_number,
        "status": "offline",
        "current_location": None,
        "rating": 5.0,
        "total_deliveries": 0,
        "is_verified": True,  # Admin created drivers are auto-verified
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.drivers.insert_one(driver)
    
    return {
        "message": "Driver created successfully",
        "driver_id": driver_id,
        "user_id": user_id
    }


@admin_router.put("/drivers/{driver_id}")
async def admin_update_driver(
    driver_id: str,
    vehicle_type: Optional[str] = None,
    vehicle_number: Optional[str] = None,
    license_number: Optional[str] = None,
    is_verified: Optional[bool] = None,
    current_user: dict = Depends(require_admin)
):
    """Update driver details (admin only)"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if vehicle_type is not None:
        update_data["vehicle_type"] = vehicle_type
    if vehicle_number is not None:
        update_data["vehicle_number"] = vehicle_number
    if license_number is not None:
        update_data["license_number"] = license_number
    if is_verified is not None:
        update_data["is_verified"] = is_verified
    
    await db.drivers.update_one({"id": driver_id}, {"$set": update_data})
    return {"message": "Driver updated successfully"}


@admin_router.put("/drivers/{driver_id}/status")
async def admin_update_driver_status(
    driver_id: str,
    status: str,
    current_user: dict = Depends(require_admin)
):
    """Update driver status (admin only)"""
    valid_statuses = [s.value for s in DriverStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")
    
    result = await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": f"Driver status updated to {status}"}


@admin_router.delete("/drivers/{driver_id}")
async def admin_delete_driver(driver_id: str, current_user: dict = Depends(require_admin)):
    """Delete a driver (admin only)"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Check for active deliveries
    active_orders = await db.orders.count_documents({
        "driver_id": driver_id,
        "status": {"$in": ["assigned", "picked_up", "in_transit", "out_for_delivery"]}
    })
    if active_orders > 0:
        raise HTTPException(status_code=400, detail="Cannot delete driver with active deliveries")
    
    # Delete driver profile
    await db.drivers.delete_one({"id": driver_id})
    
    # Deactivate user account (don't delete for audit trail)
    await db.users.update_one(
        {"id": driver["user_id"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Driver deleted successfully"}


@admin_router.put("/drivers/{driver_id}/activate")
async def admin_activate_driver(driver_id: str, current_user: dict = Depends(require_admin)):
    """Activate a driver account (admin only)"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    await db.users.update_one(
        {"id": driver["user_id"]},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Driver activated"}


@admin_router.put("/drivers/{driver_id}/deactivate")
async def admin_deactivate_driver(driver_id: str, current_user: dict = Depends(require_admin)):
    """Deactivate a driver account (admin only)"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Set driver to offline
    await db.drivers.update_one({"id": driver_id}, {"$set": {"status": "offline"}})
    
    await db.users.update_one(
        {"id": driver["user_id"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Driver deactivated"}


@admin_router.get("/orders")
async def admin_list_all_orders(
    status: Optional[str] = None,
    pharmacy_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """List all orders with full access (admin only)"""
    query = {}
    if status:
        query["status"] = status
    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id
    if driver_id:
        query["driver_id"] = driver_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "skip": skip, "limit": limit}


@admin_router.put("/orders/{order_id}/cancel")
async def admin_cancel_order(order_id: str, reason: str = "Cancelled by admin", current_user: dict = Depends(require_admin)):
    """Cancel an order (admin only)"""
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": OrderStatus.CANCELLED,
            "cancellation_reason": reason,
            "cancelled_by": current_user.get("sub"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Release driver if assigned
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order and order.get("driver_id"):
        await db.drivers.update_one(
            {"id": order["driver_id"]},
            {"$set": {"status": DriverStatus.AVAILABLE}}
        )
    
    return {"message": "Order cancelled"}


@admin_router.put("/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str, notes: Optional[str] = None, current_user: dict = Depends(require_admin)):
    """Update order status (admin only) - Full control over delivery status"""
    # Validate status
    valid_statuses = [s.value for s in OrderStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid statuses: {valid_statuses}")
    
    # Get current order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_status = order.get("status")
    
    # Update order status
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add status-specific fields
    if status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "picked_up":
        update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "cancelled":
        update_data["cancellation_reason"] = notes or "Status changed by admin"
        update_data["cancelled_by"] = current_user.get("sub")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data}
    )
    
    # Log the status change
    status_log = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status,
        "changed_by": current_user.get("sub"),
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
        "changed_by_role": "admin"
    }
    await db.status_logs.insert_one(status_log)
    
    # Handle driver status based on order status change
    if order.get("driver_id"):
        if status in ["delivered", "cancelled", "failed"]:
            # Release driver
            await db.drivers.update_one(
                {"id": order["driver_id"]},
                {"$set": {"status": DriverStatus.AVAILABLE}}
            )
        elif status in ["assigned", "picked_up", "in_transit", "out_for_delivery"]:
            # Mark driver as on route
            await db.drivers.update_one(
                {"id": order["driver_id"]},
                {"$set": {"status": DriverStatus.ON_ROUTE}}
            )
    
    return {
        "message": f"Order status updated from {old_status} to {status}",
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status
    }


@admin_router.put("/orders/{order_id}/reassign")
async def admin_reassign_order(
    order_id: str,
    time_window: Optional[str] = None,
    driver_id: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Reassign order to different time window and/or driver (for Smart Organizer drag-drop)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    changes = []
    
    # Update time window if provided
    if time_window:
        valid_windows = ["8am-1pm", "1pm-4pm", "4pm-10pm"]
        if time_window not in valid_windows:
            raise HTTPException(status_code=400, detail=f"Invalid time window. Valid options: {valid_windows}")
        
        old_window = order.get("time_window")
        update_data["time_window"] = time_window
        changes.append(f"time window: {old_window} → {time_window}")
    
    # Update driver assignment if provided
    if driver_id:
        if driver_id == "unassign":
            # Remove driver assignment
            update_data["driver_id"] = None
            update_data["status"] = "pending"
            changes.append("driver unassigned")
        else:
            # Verify driver exists
            driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
            if not driver:
                raise HTTPException(status_code=404, detail="Driver not found")
            
            old_driver_id = order.get("driver_id")
            update_data["driver_id"] = driver_id
            
            # Update status to assigned if not already in transit
            if order.get("status") in ["pending", "confirmed", "ready_for_pickup"]:
                update_data["status"] = "assigned"
            
            driver_name = f"{driver.get('first_name', '')} {driver.get('last_name', '')}".strip() or driver.get('email', 'Unknown')
            changes.append(f"assigned to driver: {driver_name}")
    
    if not changes:
        return {"message": "No changes specified", "order_id": order_id}
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Log the change
    log_entry = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "action": "reassignment",
        "changes": changes,
        "changed_by": current_user.get("sub"),
        "changed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.status_logs.insert_one(log_entry)
    
    return {
        "message": f"Order reassigned successfully: {', '.join(changes)}",
        "order_id": order_id,
        "changes": changes
    }


@admin_router.post("/orders/optimize-route")
async def admin_optimize_route_preview(
    borough: Optional[str] = Query(None),
    time_window: Optional[str] = Query(None),
    depot_address: str = Query("123 Main St, New York, NY 10001"),
    start_hour: Optional[int] = Query(8, description="Start hour in 24h format (e.g., 8 for 8am)"),
    request_body: dict = Body(default={}),
    current_user: dict = Depends(require_admin)
):
    """
    Preview optimized route for a set of orders.
    Optimizes purely by geographic location using nearest neighbor algorithm.
    """
    import math
    from collections import defaultdict
    
    order_ids = request_body.get("order_ids", [])
    
    # Build query to fetch orders
    query = {"status": {"$nin": ["delivered", "cancelled", "failed"]}}
    
    if order_ids:
        query["id"] = {"$in": order_ids}
    else:
        # Filter by borough (from QR code prefix)
        if borough:
            query["qr_code"] = {"$regex": f"^{borough}", "$options": "i"}
        # Filter by time window
        if time_window:
            query["time_window"] = time_window
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(100)
    
    if not orders:
        return {"optimized_route": [], "total_distance": 0, "total_duration": 0, "message": "No orders found"}
    
    # Time window definitions with priority (earlier windows have higher priority)
    time_windows_config = {
        "8am-1pm": {"start": 8, "end": 13, "priority": 1, "label": "Morning"},
        "1pm-4pm": {"start": 13, "end": 16, "priority": 2, "label": "Afternoon"},
        "4pm-10pm": {"start": 16, "end": 22, "priority": 3, "label": "Evening"},
    }
    
    # Borough coordinates for clustering
    borough_centers = {
        "Q": {"lat": 40.7282, "lng": -73.7949, "name": "Queens"},
        "B": {"lat": 40.6782, "lng": -73.9442, "name": "Brooklyn"},
        "M": {"lat": 40.7831, "lng": -73.9712, "name": "Manhattan"},
        "S": {"lat": 40.5795, "lng": -74.1502, "name": "Staten Island"},
        "X": {"lat": 40.8448, "lng": -73.8648, "name": "Bronx"},
    }
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points in miles"""
        lat1, lon1 = math.radians(lat1), math.radians(lon1)
        lat2, lon2 = math.radians(lat2), math.radians(lon2)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return 3956 * c  # Miles
    
    def get_time_window_info(order):
        """Extract time window info from order"""
        tw = order.get("time_window") or ""
        delivery_type = order.get("delivery_type", "")
        
        # Try to match time window
        for tw_key, tw_config in time_windows_config.items():
            if tw_key in tw or tw_key.replace("-", " ") in tw.lower():
                return tw_key, tw_config
        
        # Default based on delivery type
        if delivery_type == "priority" or delivery_type == "same_day":
            return "8am-1pm", time_windows_config["8am-1pm"]
        elif delivery_type == "next_day":
            return "1pm-4pm", time_windows_config["1pm-4pm"]
        
        return "8am-1pm", time_windows_config["8am-1pm"]
    
    def get_borough_from_qr(qr_code):
        """Extract borough from QR code"""
        if qr_code and len(qr_code) > 0:
            first_char = qr_code[0].upper()
            if first_char in borough_centers:
                return first_char
        return None
    
    # Extract coordinates and enrich stop data
    stops = []
    for order in orders:
        addr = order.get("delivery_address", {})
        full_address = f"{addr.get('street', '')}, {addr.get('city', '')}, {addr.get('state', '')} {addr.get('postal_code', '')}"
        
        lat = addr.get("latitude") or addr.get("lat")
        lng = addr.get("longitude") or addr.get("lng")
        
        if not lat or not lng:
            try:
                geo_result = await maps_service.geocode_address(full_address)
                if geo_result.get("success") and geo_result.get("location"):
                    lat = geo_result["location"].get("lat")
                    lng = geo_result["location"].get("lng")
            except:
                pass
        
        tw_key, tw_config = get_time_window_info(order)
        order_borough = get_borough_from_qr(order.get("qr_code"))
        
        stops.append({
            "order_id": order.get("id"),
            "order_number": order.get("order_number"),
            "qr_code": order.get("qr_code"),
            "recipient_name": order.get("recipient", {}).get("name", "Unknown"),
            "address": full_address,
            "city": addr.get("city", ""),
            "latitude": lat,
            "longitude": lng,
            "copay_amount": order.get("copay_amount", 0),
            "copay_collected": order.get("copay_collected", False),
            "status": order.get("status"),
            "packages_count": len(order.get("packages", [])),
            "borough": order_borough,
            "borough_name": borough_centers.get(order_borough, {}).get("name", "Unknown"),
        })
    
    # Depot coordinates
    depot_lat, depot_lng = 40.7128, -74.0060
    try:
        depot_geo = await maps_service.geocode_address(depot_address)
        if depot_geo.get("success") and depot_geo.get("location"):
            depot_lat = depot_geo["location"].get("lat", depot_lat)
            depot_lng = depot_geo["location"].get("lng", depot_lng)
    except:
        pass
    
    # Pure location-based nearest neighbor optimization
    optimized_stops = []
    remaining = stops.copy()
    current_lat, current_lng = depot_lat, depot_lng
    
    while remaining:
        nearest = min(
            remaining,
            key=lambda s: haversine_distance(current_lat, current_lng, s.get("latitude") or depot_lat, s.get("longitude") or depot_lng)
        )
        remaining.remove(nearest)
        optimized_stops.append(nearest)
        if nearest.get("latitude") and nearest.get("longitude"):
            current_lat, current_lng = nearest["latitude"], nearest["longitude"]
    
    # Calculate distances, times, and ETAs
    total_distance = 0
    total_duration = 0
    current_lat, current_lng = depot_lat, depot_lng
    route_start_hour = start_hour or 8
    current_time_mins = route_start_hour * 60
    
    for i, stop in enumerate(optimized_stops):
        stop_lat = stop.get("latitude") or depot_lat
        stop_lng = stop.get("longitude") or depot_lng
        
        distance = haversine_distance(current_lat, current_lng, stop_lat, stop_lng)
        drive_time = (distance / 18) * 60  # 18 mph average in NYC
        stop_time = 5 + (stop.get("packages_count", 1) * 1)  # Base 5 min + 1 min per package
        
        total_distance += distance
        total_duration += drive_time + stop_time
        current_time_mins += drive_time + stop_time
        
        # Calculate ETA
        eta_hour = int(current_time_mins // 60)
        eta_min = int(current_time_mins % 60)
        period = "AM" if eta_hour < 12 else "PM"
        display_hour = eta_hour if eta_hour <= 12 else eta_hour - 12
        if display_hour == 0:
            display_hour = 12
        
        stop["sequence"] = i + 1
        stop["distance_from_previous"] = round(distance, 2)
        stop["estimated_drive_time"] = round(drive_time, 1)
        stop["stop_duration"] = round(stop_time, 1)
        stop["cumulative_time"] = round(total_duration, 1)
        stop["cumulative_distance"] = round(total_distance, 2)
        stop["estimated_arrival"] = f"{int(display_hour)}:{eta_min:02d} {period}"
        
        current_lat, current_lng = stop_lat, stop_lng
    
    # Group by borough for summary
    by_borough_summary = defaultdict(lambda: {"count": 0, "distance": 0})
    for stop in optimized_stops:
        b = stop.get("borough_name", "Unknown")
        by_borough_summary[b]["count"] += 1
        by_borough_summary[b]["distance"] += stop.get("distance_from_previous", 0)
    
    # Calculate route end time
    end_time_mins = route_start_hour * 60 + total_duration
    end_hour = int(end_time_mins // 60)
    end_min = int(end_time_mins % 60)
    end_period = "AM" if end_hour < 12 else "PM"
    end_display_hour = end_hour if end_hour <= 12 else end_hour - 12
    if end_display_hour == 0:
        end_display_hour = 12
    
    return {
        "optimized_route": optimized_stops,
        "total_stops": len(optimized_stops),
        "total_distance_miles": round(total_distance, 2),
        "total_duration_minutes": round(total_duration, 1),
        "total_duration_hours": round(total_duration / 60, 2),
        "depot_address": depot_address,
        "time_window": time_window,
        "borough": borough,
        "route_start_time": f"{route_start_hour}:00 {'AM' if route_start_hour < 12 else 'PM'}",
        "route_end_time": f"{int(end_display_hour)}:{end_min:02d} {end_period}",
        "by_borough": dict(by_borough_summary),
    }


@admin_router.get("/drivers/locations")
async def admin_get_driver_locations(
    active_only: bool = Query(True),
    borough: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin)
):
    """Get real-time locations of all drivers for map tracking"""
    query = {}
    
    if active_only:
        query["status"] = {"$in": ["available", "on_delivery", "busy"]}
    
    drivers = await db.drivers.find(query, {"_id": 0}).to_list(100)
    
    driver_locations = []
    for driver in drivers:
        location = driver.get("current_location")
        if location and location.get("latitude") and location.get("longitude"):
            # Check if location is recent (within last 30 minutes)
            location_time = location.get("timestamp")
            is_recent = True
            if location_time:
                try:
                    if isinstance(location_time, str):
                        loc_dt = datetime.fromisoformat(location_time.replace('Z', '+00:00'))
                    else:
                        loc_dt = location_time
                    age_minutes = (datetime.now(timezone.utc) - loc_dt).total_seconds() / 60
                    is_recent = age_minutes < 30
                except:
                    pass
            
            # Get driver's current assigned orders
            assigned_orders = await db.orders.find(
                {"driver_id": driver["id"], "status": {"$in": ["assigned", "picked_up", "in_transit", "out_for_delivery"]}},
                {"_id": 0, "id": 1, "order_number": 1, "status": 1}
            ).to_list(10)
            
            driver_locations.append({
                "driver_id": driver["id"],
                "name": f"{driver.get('first_name', '')} {driver.get('last_name', '')}".strip() or driver.get("email", "Unknown"),
                "phone": driver.get("phone"),
                "status": driver.get("status", "unknown"),
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "heading": location.get("heading"),
                "speed": location.get("speed"),
                "last_updated": location.get("timestamp"),
                "is_recent": is_recent,
                "assigned_orders_count": len(assigned_orders),
                "assigned_orders": assigned_orders[:3],  # Limit to 3 for preview
            })
    
    # Filter by borough if specified (based on assigned orders' QR codes)
    if borough:
        filtered_locations = []
        for loc in driver_locations:
            for order in loc.get("assigned_orders", []):
                order_detail = await db.orders.find_one({"id": order["id"]}, {"_id": 0, "qr_code": 1})
                if order_detail and order_detail.get("qr_code", "").startswith(borough):
                    filtered_locations.append(loc)
                    break
        driver_locations = filtered_locations
    
    return {
        "driver_locations": driver_locations,
        "total": len(driver_locations),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@admin_router.post("/drivers/{driver_id}/simulate-location")
async def admin_simulate_driver_location(
    driver_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    heading: float = Query(0),
    speed: float = Query(0),
    current_user: dict = Depends(require_admin)
):
    """Simulate driver location for testing (admin only)"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    location_data = {
        "latitude": latitude,
        "longitude": longitude,
        "heading": heading,
        "speed": speed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"current_location": location_data}}
    )
    
    return {
        "message": "Driver location updated",
        "driver_id": driver_id,
        "location": location_data
    }


@admin_router.get("/scans")
async def admin_list_scans(
    skip: int = 0,
    limit: int = 50,
    order_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """List all package scans (admin only)"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if action:
        query["action"] = action
    
    scans = await db.scan_logs.find(query, {"_id": 0}).sort("scanned_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.scan_logs.count_documents(query)
    
    # Enrich with user info
    for scan in scans:
        user = await db.users.find_one({"id": scan.get("scanned_by")}, {"_id": 0, "first_name": 1, "last_name": 1, "role": 1})
        if user:
            scan["scanned_by_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}"
            scan["scanned_by_role"] = user.get("role")
    
    return {"scans": scans, "total": total, "skip": skip, "limit": limit}


@admin_router.get("/pod")
async def admin_list_pods(
    skip: int = 0,
    limit: int = 50,
    order_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """List all Proof of Delivery records (admin only)"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if driver_id:
        query["driver_id"] = driver_id
    
    pods = await db.proof_of_delivery.find(query, {"_id": 0}).sort("submitted_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.proof_of_delivery.count_documents(query)
    
    # Enrich with order and driver info
    for pod in pods:
        order = await db.orders.find_one({"id": pod.get("order_id")}, {"_id": 0, "order_number": 1, "recipient": 1})
        if order:
            pod["order_number"] = order.get("order_number")
            pod["recipient"] = order.get("recipient")
        
        driver = await db.drivers.find_one({"id": pod.get("driver_id")}, {"_id": 0, "user_id": 1})
        if driver:
            user = await db.users.find_one({"id": driver.get("user_id")}, {"_id": 0, "first_name": 1, "last_name": 1})
            if user:
                pod["driver_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}"
    
    return {"pods": pods, "total": total, "skip": skip, "limit": limit}


@admin_router.get("/pod/{pod_id}")
async def admin_get_pod(pod_id: str, current_user: dict = Depends(require_admin)):
    """Get a specific POD (admin only)"""
    pod = await db.proof_of_delivery.find_one({"id": pod_id}, {"_id": 0})
    if not pod:
        raise HTTPException(status_code=404, detail="POD not found")
    
    # Enrich with order info
    order = await db.orders.find_one({"id": pod.get("order_id")}, {"_id": 0})
    if order:
        pod["order"] = order
    
    return pod


@admin_router.get("/orders/{order_id}/pod")
async def admin_get_order_pod(order_id: str, current_user: dict = Depends(require_admin)):
    """Get POD for a specific order (admin only)"""
    pod = await db.proof_of_delivery.find_one({"order_id": order_id}, {"_id": 0})
    if not pod:
        raise HTTPException(status_code=404, detail="POD not found for this order")
    
    return pod


@admin_router.get("/scans/stats")
async def admin_scan_stats(current_user: dict = Depends(require_admin)):
    """Get scan statistics (admin only)"""
    # Total scans
    total_scans = await db.scan_logs.count_documents({})
    
    # Scans by action
    pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]
    action_stats = await db.scan_logs.aggregate(pipeline).to_list(10)
    
    # Recent scans (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_count = await db.scan_logs.count_documents({"scanned_at": {"$gte": yesterday}})
    
    # Scans by user
    user_pipeline = [
        {"$group": {"_id": "$scanned_by", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    user_stats = await db.scan_logs.aggregate(user_pipeline).to_list(10)
    
    # Enrich with user names
    for stat in user_stats:
        user = await db.users.find_one({"id": stat["_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        if user:
            stat["name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}"
    
    return {
        "total_scans": total_scans,
        "recent_scans_24h": recent_count,
        "scans_by_action": {s["_id"]: s["count"] for s in action_stats},
        "top_scanners": user_stats
    }


@admin_router.get("/packages")
async def admin_list_packages(
    skip: int = 0,
    limit: int = 50,
    scanned: Optional[bool] = None,
    current_user: dict = Depends(require_admin)
):
    """List all packages across orders (admin only)"""
    # Get orders with packages
    orders = await db.orders.find(
        {"packages": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "order_number": 1, "status": 1, "packages": 1, "recipient": 1, "pharmacy_name": 1}
    ).skip(skip).limit(limit).to_list(limit)
    
    packages = []
    for order in orders:
        for pkg in order.get("packages", []):
            pkg_data = {
                **pkg,
                "order_id": order["id"],
                "order_number": order["order_number"],
                "order_status": order["status"],
                "recipient_name": order.get("recipient", {}).get("name"),
                "pharmacy_name": order.get("pharmacy_name")
            }
            # Filter by scanned status if specified
            if scanned is not None:
                is_scanned = pkg.get("scanned_at") is not None
                if is_scanned == scanned:
                    packages.append(pkg_data)
            else:
                packages.append(pkg_data)
    
    return {"packages": packages, "count": len(packages)}


@admin_router.post("/packages/verify/{qr_code}")
async def admin_verify_package(qr_code: str, current_user: dict = Depends(require_admin)):
    """Manually verify a package by QR code (admin only)"""
    # Find the package
    order = await db.orders.find_one(
        {"packages.qr_code": qr_code},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Find the specific package
    package = None
    for pkg in order.get("packages", []):
        if pkg.get("qr_code") == qr_code:
            package = pkg
            break
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Mark as verified by admin
    now = datetime.now(timezone.utc)
    await db.orders.update_one(
        {"id": order["id"], "packages.qr_code": qr_code},
        {"$set": {
            "packages.$.admin_verified": True,
            "packages.$.admin_verified_at": now.isoformat(),
            "packages.$.admin_verified_by": current_user["sub"]
        }}
    )
    
    # Log the verification
    scan_log = {
        "id": str(uuid.uuid4()),
        "qr_code": qr_code,
        "order_id": order["id"],
        "scanned_by": current_user["sub"],
        "scanned_at": now.isoformat(),
        "action": "admin_verify",
        "location": None
    }
    await db.scan_logs.insert_one(scan_log)
    
    return {
        "message": "Package verified by admin",
        "package_id": package.get("id"),
        "qr_code": qr_code,
        "order_id": order["id"],
        "order_number": order.get("order_number"),
        "verified_at": now.isoformat()
    }


@admin_router.get("/reports/daily")
async def admin_daily_report(date: str = None, current_user: dict = Depends(require_admin)):
    """Get daily delivery report"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count orders for the day
    start_of_day = f"{date}T00:00:00"
    end_of_day = f"{date}T23:59:59"
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_fees": {"$sum": "$delivery_fee"}
        }}
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(100)
    
    report = {
        "date": date,
        "summary": {status["_id"]: {"count": status["count"], "fees": status["total_fees"]} for status in results},
        "total_orders": sum(s["count"] for s in results),
        "total_revenue": sum(s["total_fees"] for s in results)
    }
    
    return report


# ============== Admin Delivery Pricing Routes ==============
@admin_router.get("/pricing")
async def admin_list_pricing(
    include_inactive: bool = False,
    current_user: dict = Depends(require_admin)
):
    """List all delivery pricing configurations (admin only)"""
    query = {} if include_inactive else {"is_active": True}
    pricing_list = await db.delivery_pricing.find(query, {"_id": 0}).to_list(100)
    return {"pricing": pricing_list, "count": len(pricing_list)}


@admin_router.get("/pricing/{pricing_id}")
async def admin_get_pricing(pricing_id: str, current_user: dict = Depends(require_admin)):
    """Get specific pricing configuration (admin only)"""
    pricing = await db.delivery_pricing.find_one({"id": pricing_id}, {"_id": 0})
    if not pricing:
        raise HTTPException(status_code=404, detail="Pricing configuration not found")
    return pricing


@admin_router.post("/pricing")
async def admin_create_pricing(
    pricing_data: DeliveryPricingCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new delivery pricing configuration (admin only)"""
    pricing = DeliveryPricing(
        delivery_type=pricing_data.delivery_type,
        name=pricing_data.name,
        description=pricing_data.description,
        base_price=pricing_data.base_price,
        is_active=pricing_data.is_active,
        time_window_start=pricing_data.time_window_start,
        time_window_end=pricing_data.time_window_end,
        cutoff_time=pricing_data.cutoff_time,
        is_addon=pricing_data.is_addon
    )
    
    pricing_dict = pricing.model_dump()
    pricing_dict["created_at"] = pricing_dict["created_at"].isoformat()
    pricing_dict["updated_at"] = pricing_dict["updated_at"].isoformat()
    
    await db.delivery_pricing.insert_one(pricing_dict)
    
    # Remove MongoDB _id before returning
    pricing_dict.pop("_id", None)
    
    return {
        "message": "Pricing configuration created successfully",
        "pricing_id": pricing.id,
        "pricing": pricing_dict
    }


@admin_router.put("/pricing/{pricing_id}")
async def admin_update_pricing(
    pricing_id: str,
    pricing_data: DeliveryPricingUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a delivery pricing configuration (admin only)"""
    existing = await db.delivery_pricing.find_one({"id": pricing_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing configuration not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if pricing_data.name is not None:
        update_data["name"] = pricing_data.name
    if pricing_data.description is not None:
        update_data["description"] = pricing_data.description
    if pricing_data.base_price is not None:
        update_data["base_price"] = pricing_data.base_price
    if pricing_data.is_active is not None:
        update_data["is_active"] = pricing_data.is_active
    if pricing_data.time_window_start is not None:
        update_data["time_window_start"] = pricing_data.time_window_start
    if pricing_data.time_window_end is not None:
        update_data["time_window_end"] = pricing_data.time_window_end
    if pricing_data.cutoff_time is not None:
        update_data["cutoff_time"] = pricing_data.cutoff_time
    
    await db.delivery_pricing.update_one({"id": pricing_id}, {"$set": update_data})
    
    updated = await db.delivery_pricing.find_one({"id": pricing_id}, {"_id": 0})
    return {"message": "Pricing updated successfully", "pricing": updated}


@admin_router.delete("/pricing/{pricing_id}")
async def admin_delete_pricing(pricing_id: str, current_user: dict = Depends(require_admin)):
    """Delete a delivery pricing configuration (admin only)"""
    result = await db.delivery_pricing.delete_one({"id": pricing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing configuration not found")
    return {"message": "Pricing configuration deleted successfully"}


@admin_router.put("/pricing/{pricing_id}/toggle")
async def admin_toggle_pricing(pricing_id: str, current_user: dict = Depends(require_admin)):
    """Toggle a pricing configuration active/inactive (admin only)"""
    existing = await db.delivery_pricing.find_one({"id": pricing_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing configuration not found")
    
    new_status = not existing.get("is_active", True)
    await db.delivery_pricing.update_one(
        {"id": pricing_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Pricing {'activated' if new_status else 'deactivated'}", "is_active": new_status}


# ============== Service Zones Routes ==============
@zones_router.get("/")
async def list_service_zones(active_only: bool = True):
    """List all service zones"""
    query = {"is_active": True} if active_only else {}
    zones = await db.service_zones.find(query, {"_id": 0}).to_list(100)
    return {"zones": zones, "count": len(zones)}


@zones_router.get("/{zone_id}")
async def get_service_zone(zone_id: str):
    """Get service zone details"""
    zone = await db.service_zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Service zone not found")
    return zone


@zones_router.post("/")
async def create_service_zone(zone_data: ServiceZoneCreate, current_user: dict = Depends(require_admin)):
    """Create a new service zone (admin only)"""
    zone = ServiceZone(
        name=zone_data.name,
        code=zone_data.code,
        zip_codes=zone_data.zip_codes,
        cities=zone_data.cities,
        states=zone_data.states,
        delivery_fee=zone_data.delivery_fee,
        same_day_cutoff=zone_data.same_day_cutoff,
        priority_surcharge=zone_data.priority_surcharge
    )
    
    zone_dict = zone.model_dump()
    zone_dict["created_at"] = zone_dict["created_at"].isoformat()
    
    await db.service_zones.insert_one(zone_dict)
    
    return {"message": "Service zone created", "zone_id": zone.id}


@zones_router.put("/{zone_id}")
async def update_service_zone(zone_id: str, zone_data: ServiceZoneCreate, current_user: dict = Depends(require_admin)):
    """Update a service zone (admin only)"""
    result = await db.service_zones.update_one(
        {"id": zone_id},
        {"$set": {
            "name": zone_data.name,
            "code": zone_data.code,
            "zip_codes": zone_data.zip_codes,
            "cities": zone_data.cities,
            "states": zone_data.states,
            "delivery_fee": zone_data.delivery_fee,
            "same_day_cutoff": zone_data.same_day_cutoff,
            "priority_surcharge": zone_data.priority_surcharge
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service zone not found")
    
    return {"message": "Service zone updated"}


@zones_router.delete("/{zone_id}")
async def delete_service_zone(zone_id: str, current_user: dict = Depends(require_admin)):
    """Deactivate a service zone (admin only)"""
    result = await db.service_zones.update_one(
        {"id": zone_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service zone not found")
    
    return {"message": "Service zone deactivated"}


@zones_router.get("/check/{zip_code}")
async def check_service_availability(zip_code: str):
    """Check if a zip code is in a service zone"""
    zone = await db.service_zones.find_one(
        {"zip_codes": zip_code, "is_active": True},
        {"_id": 0}
    )
    
    if zone:
        return {
            "available": True,
            "zone_id": zone["id"],
            "zone_name": zone["name"],
            "delivery_fee": zone["delivery_fee"],
            "same_day_cutoff": zone["same_day_cutoff"]
        }
    
    return {"available": False, "message": "Service not available in this area"}


# ============== Driver Portal Routes ==============
driver_portal_router = APIRouter(prefix="/driver-portal", tags=["Driver Portal"])


async def require_driver(current_user: dict = Depends(get_current_user)):
    """Dependency to require driver role"""
    if current_user.get("role") not in ["driver", "admin"]:
        raise HTTPException(status_code=403, detail="Driver access required")
    return current_user


@driver_portal_router.get("/profile")
async def get_driver_profile(current_user: dict = Depends(require_driver)):
    """Get driver's profile and stats"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "hashed_password": 0})
    
    # Get driver stats
    total_deliveries = await db.orders.count_documents({"driver_id": driver["id"], "status": "delivered"})
    active_deliveries = await db.orders.count_documents({
        "driver_id": driver["id"],
        "status": {"$in": ["assigned", "picked_up", "in_transit", "out_for_delivery"]}
    })
    
    return {
        "driver": driver,
        "user": user,
        "stats": {
            "total_deliveries": total_deliveries,
            "active_deliveries": active_deliveries,
            "rating": driver.get("rating", 5.0)
        }
    }


@driver_portal_router.get("/deliveries")
async def get_driver_deliveries(
    status: Optional[str] = None,
    current_user: dict = Depends(require_driver)
):
    """Get deliveries assigned to the driver"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    query = {"driver_id": driver["id"]}
    if status:
        query["status"] = status
    else:
        # By default, get active deliveries
        query["status"] = {"$in": ["assigned", "picked_up", "in_transit", "out_for_delivery"]}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Enrich with pharmacy info
    for order in orders:
        pharmacy = await db.pharmacies.find_one({"id": order.get("pharmacy_id")}, {"_id": 0, "name": 1, "phone": 1, "address": 1})
        if pharmacy:
            order["pharmacy"] = pharmacy
    
    return {"deliveries": orders, "count": len(orders)}


@driver_portal_router.get("/deliveries/{order_id}")
async def get_driver_delivery_details(order_id: str, current_user: dict = Depends(require_driver)):
    """Get delivery details for a specific order"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    order = await db.orders.find_one({"id": order_id, "driver_id": driver["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Delivery not found or not assigned to you")
    
    # Get pharmacy info
    pharmacy = await db.pharmacies.find_one({"id": order.get("pharmacy_id")}, {"_id": 0})
    
    return {
        "order": order,
        "pharmacy": pharmacy
    }


@driver_portal_router.put("/deliveries/{order_id}/status")
async def update_delivery_status(
    order_id: str,
    status: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_driver)
):
    """Update delivery status (driver)"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    # Verify order is assigned to this driver
    order = await db.orders.find_one({"id": order_id, "driver_id": driver["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Delivery not found or not assigned to you")
    
    # Validate status transitions for driver
    allowed_statuses = ["picked_up", "in_transit", "out_for_delivery", "delivered", "failed"]
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed_statuses}")
    
    old_status = order.get("status")
    
    # Update order status
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "picked_up":
        update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "failed":
        update_data["failure_reason"] = notes or "Delivery failed"
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Log status change
    status_log = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status,
        "changed_by": current_user.get("sub"),
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
        "changed_by_role": "driver"
    }
    await db.status_logs.insert_one(status_log)
    
    # Update driver status
    if status in ["delivered", "failed"]:
        await db.drivers.update_one(
            {"id": driver["id"]},
            {"$set": {"status": DriverStatus.AVAILABLE}}
        )
    
    return {"message": f"Delivery status updated to {status}", "old_status": old_status, "new_status": status}


@driver_portal_router.post("/deliveries/{order_id}/scan")
async def driver_scan_package(
    order_id: str,
    qr_code: str,
    action: str,  # pickup or delivery
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    current_user: dict = Depends(require_driver)
):
    """Scan package during pickup or delivery"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    # Verify order is assigned to this driver
    order = await db.orders.find_one({"id": order_id, "driver_id": driver["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Delivery not found or not assigned to you")
    
    # Verify QR code belongs to this order
    package_found = False
    for pkg in order.get("packages", []):
        if pkg.get("qr_code") == qr_code:
            package_found = True
            break
    
    if not package_found:
        raise HTTPException(status_code=400, detail="QR code does not match this delivery")
    
    # Update package scan
    now = datetime.now(timezone.utc)
    scan_field = "pickup_scanned_at" if action == "pickup" else "delivery_scanned_at"
    
    await db.orders.update_one(
        {"id": order_id, "packages.qr_code": qr_code},
        {"$set": {
            f"packages.$.{scan_field}": now.isoformat(),
            f"packages.$.{scan_field}_by": current_user["sub"]
        }}
    )
    
    # Log the scan
    scan_log = {
        "id": str(uuid.uuid4()),
        "qr_code": qr_code,
        "order_id": order_id,
        "scanned_by": current_user["sub"],
        "scanned_at": now.isoformat(),
        "action": action,
        "location": {"latitude": latitude, "longitude": longitude} if latitude and longitude else None
    }
    await db.scan_logs.insert_one(scan_log)
    
    return {
        "message": f"Package scanned for {action}",
        "qr_code": qr_code,
        "order_id": order_id,
        "scanned_at": now.isoformat()
    }


@driver_portal_router.post("/deliveries/{order_id}/pod")
async def submit_proof_of_delivery(
    order_id: str,
    pod_data: DriverPodSubmit,
    current_user: dict = Depends(require_driver)
):
    """Submit Proof of Delivery (POD) with signature and/or photo"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    # Verify order is assigned to this driver
    order = await db.orders.find_one({"id": order_id, "driver_id": driver["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Delivery not found or not assigned to you")
    
    # Check if signature is required but not provided
    requires_signature = any(pkg.get("requires_signature") for pkg in order.get("packages", []))
    if requires_signature and not pod_data.signature_data:
        raise HTTPException(status_code=400, detail="Signature is required for this delivery")
    
    now = datetime.now(timezone.utc)
    
    # Create POD record
    pod_id = str(uuid.uuid4())
    
    # Save signature and photo to file storage (cloud storage simulation)
    signature_url = None
    photo_url = None
    
    if pod_data.signature_data:
        try:
            # Extract base64 data from data URL
            if pod_data.signature_data.startswith('data:'):
                base64_data = pod_data.signature_data.split(',')[1]
            else:
                base64_data = pod_data.signature_data
            
            # Decode and save to file
            import base64
            signature_bytes = base64.b64decode(base64_data)
            signature_filename = f"{pod_id}_signature.png"
            signature_path = f"/app/backend/uploads/signatures/{signature_filename}"
            
            with open(signature_path, 'wb') as f:
                f.write(signature_bytes)
            
            signature_url = f"/api/uploads/signatures/{signature_filename}"
            logger.info(f"Signature saved to: {signature_path}")
        except Exception as e:
            logger.error(f"Failed to save signature: {e}")
            signature_url = None  # Fall back to storing base64 in DB
    
    if pod_data.photo_data:
        try:
            # Extract base64 data from data URL
            if pod_data.photo_data.startswith('data:'):
                base64_data = pod_data.photo_data.split(',')[1]
            else:
                base64_data = pod_data.photo_data
            
            # Decode and save to file
            import base64
            photo_bytes = base64.b64decode(base64_data)
            photo_filename = f"{pod_id}_photo.jpg"
            photo_path = f"/app/backend/uploads/photos/{photo_filename}"
            
            with open(photo_path, 'wb') as f:
                f.write(photo_bytes)
            
            photo_url = f"/api/uploads/photos/{photo_filename}"
            logger.info(f"Photo saved to: {photo_path}")
        except Exception as e:
            logger.error(f"Failed to save photo: {e}")
            photo_url = None  # Fall back to storing base64 in DB
    
    pod = {
        "id": pod_id,
        "order_id": order_id,
        "driver_id": driver["id"],
        "signature_data": pod_data.signature_data if not signature_url else None,  # Only store base64 if file save failed
        "signature_url": signature_url,
        "photo_data": pod_data.photo_data if not photo_url else None,  # Only store base64 if file save failed
        "photo_url": photo_url,
        "recipient_name": pod_data.recipient_name or order.get("recipient", {}).get("name"),
        "notes": pod_data.notes,
        "location": {"latitude": pod_data.latitude, "longitude": pod_data.longitude} if pod_data.latitude and pod_data.longitude else None,
        "submitted_at": now.isoformat(),
        "submitted_by": current_user["sub"]
    }
    await db.proof_of_delivery.insert_one(pod)
    
    # Update order with POD reference and mark as delivered
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "delivered",
            "delivered_at": now.isoformat(),
            "pod_id": pod_id,
            "pod_submitted_at": now.isoformat(),
            "signature_url": signature_url,
            "photo_url": photo_url,
            "updated_at": now.isoformat()
        }}
    )
    
    # Update driver stats
    await db.drivers.update_one(
        {"id": driver["id"]},
        {
            "$inc": {"total_deliveries": 1},
            "$set": {"status": "available"}
        }
    )
    
    # Log status change
    status_log = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "old_status": order.get("status"),
        "new_status": "delivered",
        "changed_by": current_user.get("sub"),
        "changed_at": now.isoformat(),
        "notes": f"POD submitted: {pod_id}",
        "changed_by_role": "driver"
    }
    await db.status_logs.insert_one(status_log)
    
    return {
        "message": "Proof of Delivery submitted successfully",
        "pod_id": pod_id,
        "order_id": order_id,
        "status": "delivered"
    }


@driver_portal_router.get("/deliveries/{order_id}/pod")
async def get_proof_of_delivery(order_id: str, current_user: dict = Depends(require_driver)):
    """Get POD for a delivery"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    pod = await db.proof_of_delivery.find_one({"order_id": order_id}, {"_id": 0})
    if not pod:
        raise HTTPException(status_code=404, detail="POD not found")
    
    return pod


@driver_portal_router.put("/location")
async def update_driver_location(
    latitude: float,
    longitude: float,
    current_user: dict = Depends(require_driver)
):
    """Update driver's current location"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    await db.drivers.update_one(
        {"id": driver["id"]},
        {"$set": {
            "current_location": {"latitude": latitude, "longitude": longitude},
            "location_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Location updated"}


@driver_portal_router.put("/status")
async def update_driver_status(status: str, current_user: dict = Depends(require_driver)):
    """Update driver's availability status"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    valid_statuses = [s.value for s in DriverStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")
    
    await db.drivers.update_one(
        {"id": driver["id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Status updated to {status}"}


@driver_portal_router.post("/deliveries/{order_id}/collect-copay")
async def collect_copay(
    order_id: str,
    amount: float,
    collection_method: str = "cash",
    current_user: dict = Depends(require_driver)
):
    """Mark copay as collected by driver"""
    driver = await db.drivers.find_one({"user_id": current_user["sub"]}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    order = await db.orders.find_one({"id": order_id, "driver_id": driver["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")
    
    if order.get("copay_collected"):
        raise HTTPException(status_code=400, detail="Copay already collected")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "copay_collected": True,
            "copay_collected_at": datetime.now(timezone.utc).isoformat(),
            "copay_collection_method": collection_method,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Copay collected successfully",
        "amount": amount,
        "method": collection_method
    }


# ============== Public Pricing Endpoint (For Pharmacy Portal) ==============
@api_router.get("/pricing/active", tags=["Public"])
async def get_active_pricing():
    """Get active delivery pricing options - for pharmacy portal"""
    pricing_list = await db.delivery_pricing.find({"is_active": True}, {"_id": 0}).to_list(50)
    
    # Group by delivery type
    grouped = {
        "next_day": [],
        "same_day": [],
        "priority": [],
        "addons": []
    }
    
    for p in pricing_list:
        if p.get("is_addon"):
            grouped["addons"].append(p)
        elif p.get("delivery_type") in grouped:
            grouped[p["delivery_type"]].append(p)
    
    return {
        "pricing": pricing_list,
        "grouped": grouped,
        "count": len(pricing_list)
    }


# ============== Public Tracking Routes (No Auth Required) ==============
@public_router.get("/{tracking_number}")
async def public_track_order(tracking_number: str):
    """Public tracking page for patients - no authentication required"""
    # Find order by tracking number or order number
    order = await db.orders.find_one(
        {"$or": [{"tracking_number": tracking_number}, {"order_number": tracking_number}]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get pharmacy name
    pharmacy = await db.pharmacies.find_one({"id": order.get("pharmacy_id")}, {"_id": 0})
    pharmacy_name = pharmacy.get("name", "RX Expresss Pharmacy") if pharmacy else "RX Expresss Pharmacy"
    
    # Get driver location if in transit
    driver_location = None
    driver_name = None
    if order.get("driver_id") and order.get("status") in ["assigned", "picked_up", "in_transit", "out_for_delivery"]:
        driver = await db.drivers.find_one({"id": order["driver_id"]}, {"_id": 0})
        if driver:
            driver_location = driver.get("current_location")
            driver_user = await db.users.find_one({"id": driver.get("user_id")}, {"_id": 0})
            if driver_user:
                driver_name = f"{driver_user.get('first_name', '')} {driver_user.get('last_name', '')[:1]}."
    
    # Build tracking events
    tracking_events = order.get("tracking_updates", [])
    
    # Build status message
    status_messages = {
        "pending": "Order received and being processed",
        "confirmed": "Order confirmed by pharmacy",
        "ready_for_pickup": "Order ready for driver pickup",
        "assigned": "Driver assigned to your delivery",
        "picked_up": "Order picked up from pharmacy",
        "in_transit": "Your order is on the way",
        "out_for_delivery": "Driver is approaching your location",
        "delivered": "Order delivered successfully",
        "failed": "Delivery attempt failed",
        "cancelled": "Order has been cancelled"
    }
    
    # Get proof of delivery if delivered
    proof_of_delivery = None
    if order.get("status") == "delivered":
        proof = await db.delivery_proofs.find_one({"order_id": order["id"]}, {"_id": 0})
        if proof:
            proof_of_delivery = {
                "delivered_at": order.get("actual_delivery_time"),
                "recipient_name": proof.get("recipient_name"),
                "signature_url": proof.get("signature_url"),
                "photo_urls": proof.get("photo_urls", [])
            }
    
    return {
        "tracking_number": order.get("tracking_number"),
        "order_number": order.get("order_number"),
        "status": order.get("status"),
        "status_message": status_messages.get(order.get("status"), "Processing"),
        "pharmacy_name": pharmacy_name,
        "delivery_type": order.get("delivery_type"),
        "time_window": order.get("time_window"),
        "estimated_delivery_start": order.get("estimated_delivery_start"),
        "estimated_delivery_end": order.get("estimated_delivery_end"),
        "actual_delivery_time": order.get("actual_delivery_time"),
        "driver_name": driver_name,
        "driver_location": driver_location,
        "delivery_address": {
            "street": order.get("delivery_address", {}).get("street"),
            "city": order.get("delivery_address", {}).get("city"),
            "state": order.get("delivery_address", {}).get("state")
        },
        "tracking_events": tracking_events,
        "proof_of_delivery": proof_of_delivery,
        "circuit_tracking_url": order.get("circuit_tracking_url")
    }


# ============== QR Code Scanning Routes ==============
@orders_router.post("/scan")
async def scan_package_qr(scan_data: QRCodeScan, current_user: dict = Depends(get_current_user)):
    """Scan a package QR code"""
    # Find package by QR code
    order = await db.orders.find_one(
        {"packages.qr_code": scan_data.qr_code},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Find the specific package
    package = None
    for pkg in order.get("packages", []):
        if pkg.get("qr_code") == scan_data.qr_code:
            package = pkg
            break
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Update package scan time
    await db.orders.update_one(
        {"id": order["id"], "packages.qr_code": scan_data.qr_code},
        {"$set": {"packages.$.scanned_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log the scan
    scan_log = {
        "id": str(uuid.uuid4()),
        "qr_code": scan_data.qr_code,
        "order_id": order["id"],
        "scanned_by": scan_data.scanned_by,
        "scanned_at": scan_data.scanned_at.isoformat(),
        "action": scan_data.action,
        "location": scan_data.location.model_dump() if scan_data.location else None
    }
    await db.scan_logs.insert_one(scan_log)
    
    return {
        "package_id": package.get("id"),
        "order_id": order["id"],
        "order_number": order.get("order_number"),
        "recipient_name": order.get("recipient", {}).get("name"),
        "delivery_address": f"{order.get('delivery_address', {}).get('street')}, {order.get('delivery_address', {}).get('city')}",
        "status": order.get("status"),
        "prescriptions": package.get("prescriptions", []),
        "requires_signature": package.get("requires_signature", True),
        "requires_refrigeration": package.get("requires_refrigeration", False)
    }


# ============== Circuit/Spoke Integration Routes ==============
@circuit_router.get("/status")
async def circuit_status():
    """Check Circuit API connection status"""
    if not circuit_service.is_configured():
        return {"status": "not_configured", "message": "Circuit API key not set"}
    
    # Test connection by listing drivers
    result = await circuit_service.list_drivers()
    if result and "error" not in result:
        return {
            "status": "connected",
            "drivers_count": len(result.get("drivers", [])),
            "message": "Circuit API connected successfully"
        }
    return {"status": "error", "message": result.get("message", "Connection failed")}


@circuit_router.get("/drivers")
async def list_circuit_drivers(current_user: dict = Depends(get_current_user)):
    """List all drivers from Circuit"""
    result = await circuit_service.list_drivers()
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to fetch drivers"))
    return result


@circuit_router.get("/depots")
async def list_circuit_depots(current_user: dict = Depends(get_current_user)):
    """List all depots from Circuit"""
    result = await circuit_service.list_depots()
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to fetch depots"))
    return result


@circuit_router.get("/plans")
async def list_circuit_plans(starts_gte: str = None, current_user: dict = Depends(get_current_user)):
    """List delivery plans from Circuit"""
    result = await circuit_service.list_plans(starts_gte=starts_gte)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to fetch plans"))
    return result


@circuit_router.post("/plans")
async def create_circuit_plan(current_user: dict = Depends(get_current_user)):
    """Create a new delivery plan in Circuit for today"""
    result = await circuit_service.create_rx_delivery_plan()
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to create plan"))
    return result


@circuit_router.get("/plans/{plan_id}")
async def get_circuit_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific plan from Circuit"""
    result = await circuit_service.get_plan(plan_id)
    if not result or "error" in result:
        raise HTTPException(status_code=404, detail="Plan not found")
    return result


@circuit_router.post("/plans/{plan_id}/optimize")
async def optimize_circuit_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Optimize a delivery plan's route"""
    result = await circuit_service.optimize_plan(plan_id)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to optimize plan"))
    return result


@circuit_router.post("/plans/{plan_id}/distribute")
async def distribute_circuit_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Distribute a plan to drivers (send to Circuit Spoke app)"""
    result = await circuit_service.distribute_plan(plan_id)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to distribute plan"))
    return result


@circuit_router.get("/plans/{plan_id}/stops")
async def list_circuit_stops(plan_id: str, current_user: dict = Depends(get_current_user)):
    """List all stops in a Circuit plan"""
    result = await circuit_service.list_stops(plan_id)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to fetch stops"))
    return result


@circuit_router.post("/plans/{plan_id}/stops")
async def add_order_to_circuit(plan_id: str, order_id: str, current_user: dict = Depends(get_current_user)):
    """Add an RX Expresss order as a stop in Circuit"""
    # Get order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get recipient from order (handle both old and new order formats)
    recipient = order.get("recipient", {})
    if not recipient:
        # Try to get patient info for backward compatibility
        patient_id = order.get("patient_id")
        if patient_id:
            patient = await db.users.find_one({"id": patient_id}, {"_id": 0})
            if patient:
                recipient = {
                    "name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
                    "email": patient.get("email"),
                    "phone": patient.get("phone")
                }
    
    if not recipient or not recipient.get("name"):
        raise HTTPException(status_code=400, detail="Order has no recipient information")
    
    # Get pharmacy
    pharmacy = await db.pharmacies.find_one({"id": order["pharmacy_id"]}, {"_id": 0})
    if not pharmacy:
        pharmacy = {"name": "RX Expresss Pharmacy"}
    
    # Add to Circuit - pass recipient info instead of patient
    result = await circuit_service.add_order_to_circuit(plan_id, order, recipient, pharmacy)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to add order to Circuit"))
    
    # Update order with Circuit stop ID
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "circuit_plan_id": plan_id,
            "circuit_stop_id": result.get("id"),
            "tracking_url": result.get("trackingLink")
        }}
    )
    
    return {
        "message": "Order added to Circuit",
        "stop_id": result.get("id"),
        "tracking_link": result.get("trackingLink")
    }


@circuit_router.get("/plans/{plan_id}/stops/{stop_id}/proof")
async def get_circuit_delivery_proof(plan_id: str, stop_id: str, current_user: dict = Depends(get_current_user)):
    """Get delivery proof (signature, photos) from Circuit"""
    result = await circuit_service.get_delivery_proof(plan_id, stop_id)
    if not result:
        raise HTTPException(status_code=404, detail="Delivery proof not found")
    return result


@circuit_router.get("/plans/{plan_id}/stops/{stop_id}/tracking")
async def get_circuit_tracking(plan_id: str, stop_id: str):
    """Get tracking info for a stop (public endpoint)"""
    result = await circuit_service.sync_delivery_status(plan_id, stop_id)
    if not result:
        raise HTTPException(status_code=404, detail="Stop not found")
    return result


@circuit_router.get("/operations/{operation_id}")
async def get_circuit_operation(operation_id: str, current_user: dict = Depends(get_current_user)):
    """Get operation status (e.g., optimization progress)"""
    result = await circuit_service.get_operation(operation_id)
    if not result or "error" in result:
        raise HTTPException(status_code=404, detail="Operation not found")
    return result


@circuit_router.post("/sync-order/{order_id}")
async def sync_order_from_circuit(order_id: str, current_user: dict = Depends(get_current_user)):
    """Sync delivery status from Circuit back to RX Expresss"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    circuit_plan_id = order.get("circuit_plan_id")
    circuit_stop_id = order.get("circuit_stop_id")
    
    if not circuit_plan_id or not circuit_stop_id:
        raise HTTPException(status_code=400, detail="Order not linked to Circuit")
    
    # Extract just the stop ID from the full path (e.g., "plans/xxx/stops/yyy" -> "yyy")
    stop_id_parts = circuit_stop_id.split("/")
    stop_id = stop_id_parts[-1] if stop_id_parts else circuit_stop_id
    
    # Get delivery info from Circuit
    delivery_info = await circuit_service.get_delivery_proof(circuit_plan_id, stop_id)
    tracking_info = await circuit_service.sync_delivery_status(circuit_plan_id, stop_id)
    
    update_data = {}
    
    if delivery_info:
        if delivery_info.get("succeeded"):
            update_data["status"] = OrderStatus.DELIVERED
            update_data["actual_delivery_time"] = datetime.fromtimestamp(
                delivery_info.get("attemptedAt", 0) / 1000, tz=timezone.utc
            ).isoformat() if delivery_info.get("attemptedAt") else datetime.now(timezone.utc).isoformat()
        
        if delivery_info.get("signatureUrl"):
            update_data["signature_data"] = delivery_info["signatureUrl"]
        
        if delivery_info.get("photoUrls"):
            update_data["delivery_photo_url"] = delivery_info["photoUrls"][0]
    
    if tracking_info:
        if tracking_info.get("tracking_link"):
            update_data["tracking_url"] = tracking_info["tracking_link"]
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    return {
        "message": "Order synced from Circuit",
        "delivery_info": delivery_info,
        "tracking_info": tracking_info,
        "updates_applied": list(update_data.keys())
    }


# ============== Advanced Route Management Endpoints ==============

@circuit_router.post("/plans/create-for-date")
async def create_plan_for_date(
    request: CreatePlanRequest,
    current_user: dict = Depends(require_admin)
):
    """Create a delivery plan for a specific date with optional drivers"""
    try:
        date_parts = request.date.split("-")
        year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    title = request.title or f"RX Expresss Deliveries - {request.date}"
    starts = {"day": day, "month": month, "year": year}
    
    result = await circuit_service.create_plan(title, starts, request.driver_ids)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to create plan"))
    
    # Store plan in local DB for tracking
    plan_record = {
        "id": str(uuid.uuid4()),
        "circuit_plan_id": result.get("id"),
        "title": title,
        "date": request.date,
        "driver_ids": request.driver_ids,
        "status": "created",
        "optimization_status": result.get("optimization", "pending"),
        "distributed": result.get("distributed", False),
        "stops_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    await db.route_plans.insert_one(plan_record)
    
    return {
        "message": "Plan created successfully",
        "plan": result,
        "local_id": plan_record["id"]
    }


@circuit_router.post("/plans/{plan_id}/batch-import")
async def batch_import_orders_to_plan(
    plan_id: str,
    request: BatchImportOrdersRequest,
    current_user: dict = Depends(require_admin)
):
    """Batch import multiple orders to a Circuit plan"""
    if not request.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    
    # Get all orders
    orders = await db.orders.find(
        {"id": {"$in": request.order_ids}},
        {"_id": 0}
    ).to_list(100)
    
    if not orders:
        raise HTTPException(status_code=404, detail="No orders found")
    
    # Prepare stops for batch import
    stops = []
    for order in orders:
        delivery_address = order.get("delivery_address", {})
        recipient = order.get("recipient", {})
        
        # Handle backward compatibility for orders without recipient
        if not recipient or not recipient.get("name"):
            patient_id = order.get("patient_id")
            if patient_id:
                patient = await db.users.find_one({"id": patient_id}, {"_id": 0})
                if patient:
                    recipient = {
                        "name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
                        "email": patient.get("email"),
                        "phone": patient.get("phone")
                    }
        
        stop_data = {
            "address": {
                "addressLineOne": delivery_address.get("street", ""),
                "city": delivery_address.get("city", ""),
                "state": delivery_address.get("state", ""),
                "zip": delivery_address.get("postal_code", ""),
                "country": delivery_address.get("country", "US"),
            },
            "recipient": {
                "name": recipient.get("name", "Customer"),
                "email": recipient.get("email"),
                "phone": recipient.get("phone"),
                "externalId": order.get("id")
            },
            "orderInfo": {
                "sellerOrderId": order.get("order_number"),
                "products": [rx.get("medication_name", "") for rx in order.get("prescriptions", [])]
            },
            "notes": order.get("delivery_notes", ""),
            "packageCount": len(order.get("packages", [])) or 1,
            "activity": "delivery"
        }
        
        # Add coordinates if available
        if delivery_address.get("latitude") and delivery_address.get("longitude"):
            stop_data["address"]["latitude"] = delivery_address["latitude"]
            stop_data["address"]["longitude"] = delivery_address["longitude"]
        
        stops.append(stop_data)
    
    # Batch import to Circuit
    result = await circuit_service.batch_import_stops(plan_id, stops)
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to import stops"))
    
    # Update orders with Circuit stop IDs
    success_stops = result.get("success", [])
    for i, stop_id in enumerate(success_stops):
        if i < len(orders):
            await db.orders.update_one(
                {"id": orders[i]["id"]},
                {"$set": {
                    "circuit_plan_id": plan_id,
                    "circuit_stop_id": stop_id,
                    "status": OrderStatus.CONFIRMED
                }}
            )
    
    # Update local plan record
    await db.route_plans.update_one(
        {"circuit_plan_id": plan_id},
        {"$inc": {"stops_count": len(success_stops)}}
    )
    
    return {
        "message": f"Imported {len(success_stops)} orders to plan",
        "success_count": len(success_stops),
        "failed_count": len(result.get("failed", [])),
        "success": success_stops,
        "failed": result.get("failed", [])
    }


@circuit_router.post("/plans/{plan_id}/optimize-and-distribute")
async def optimize_and_distribute_plan(
    plan_id: str,
    current_user: dict = Depends(require_admin)
):
    """Optimize a plan and then distribute to drivers"""
    # Start optimization
    optimize_result = await circuit_service.optimize_plan(plan_id)
    if not optimize_result or "error" in optimize_result:
        raise HTTPException(status_code=500, detail=optimize_result.get("message", "Failed to start optimization"))
    
    operation_id = optimize_result.get("id")
    
    # Update local plan record
    await db.route_plans.update_one(
        {"circuit_plan_id": plan_id},
        {"$set": {
            "status": "optimizing",
            "optimization_operation_id": operation_id
        }}
    )
    
    return {
        "message": "Optimization started",
        "operation_id": operation_id,
        "status": "optimizing",
        "next_step": f"Poll GET /api/circuit/operations/{operation_id} until done=true, then call POST /api/circuit/plans/{plan_id}/distribute"
    }


@circuit_router.get("/plans/{plan_id}/full-status")
async def get_plan_full_status(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive plan status including local and Circuit data"""
    # Get Circuit plan
    circuit_plan = await circuit_service.get_plan(plan_id)
    if not circuit_plan:
        raise HTTPException(status_code=404, detail="Plan not found in Circuit")
    
    # Get local plan record
    local_plan = await db.route_plans.find_one({"circuit_plan_id": plan_id}, {"_id": 0})
    
    # Get stops
    stops_result = await circuit_service.list_stops(plan_id, max_page_size=100)
    stops = stops_result.get("stops", []) if stops_result else []
    
    # Get linked orders from DB
    linked_orders = await db.orders.find(
        {"circuit_plan_id": plan_id},
        {"_id": 0, "id": 1, "order_number": 1, "status": 1, "circuit_stop_id": 1}
    ).to_list(100)
    
    return {
        "circuit_plan": circuit_plan,
        "local_plan": local_plan,
        "stops_count": len(stops),
        "stops": stops,
        "linked_orders": linked_orders,
        "optimization_status": circuit_plan.get("optimization"),
        "distributed": circuit_plan.get("distributed", False),
        "drivers": circuit_plan.get("drivers", []),
        "routes": circuit_plan.get("routes", [])
    }


@circuit_router.get("/route-plans")
async def list_local_route_plans(
    status: str = None,
    date: str = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List locally stored route plans"""
    query = {}
    if status:
        query["status"] = status
    if date:
        query["date"] = date
    
    plans = await db.route_plans.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"plans": plans, "count": len(plans)}


@circuit_router.post("/auto-assign-by-borough")
async def auto_assign_orders_by_borough(
    request: AutoAssignByBoroughRequest = Body(default=AutoAssignByBoroughRequest()),
    current_user: dict = Depends(require_admin)
):
    """
    Automatically assign orders with specified status to gigs grouped by borough.
    Creates new gigs for each borough if needed, then assigns orders to them.
    
    Borough codes: Q=Queens, B=Brooklyn, M=Manhattan, X=Bronx, S=Staten Island
    """
    # Borough mapping for display names
    borough_names = {
        "Q": "Queens",
        "B": "Brooklyn", 
        "M": "Manhattan",
        "X": "Bronx",
        "S": "Staten Island",
        "N": "Other"
    }
    
    # Get orders with specified status that are not yet assigned to a gig
    query = {
        "status": request.status,
        "$or": [
            {"circuit_plan_id": {"$exists": False}},
            {"circuit_plan_id": None},
            {"circuit_plan_id": ""}
        ]
    }
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(500)
    
    if not orders:
        return {
            "message": f"No orders with status '{request.status}' found for auto-assignment",
            "total_assigned": 0,
            "gigs_created": 0,
            "by_borough": {}
        }
    
    # Group orders by borough (extract from QR code first character)
    orders_by_borough = {}
    for order in orders:
        qr_code = order.get("qr_code", "")
        borough = order.get("borough") or (qr_code[0].upper() if qr_code else "N")
        if borough not in orders_by_borough:
            orders_by_borough[borough] = []
        orders_by_borough[borough].append(order)
    
    # Get existing gigs/plans
    existing_plans = await db.route_plans.find({}, {"_id": 0}).to_list(100)
    
    # Helper to get next gig number
    def get_next_gig_number():
        gig_numbers = []
        for p in existing_plans:
            title = p.get("title", "")
            import re
            match = re.match(r"Gig (\d+)", title)
            if match:
                gig_numbers.append(int(match.group(1)))
        return max(gig_numbers, default=0) + 1
    
    results = {
        "total_assigned": 0,
        "gigs_created": 0,
        "by_borough": {}
    }
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # For each borough, create a gig if needed and assign orders
    for borough_code, borough_orders in orders_by_borough.items():
        borough_name = borough_names.get(borough_code, "Other")
        
        # Check if there's an existing gig for today that we can use
        # We'll create new gigs for each borough to keep them organized
        gig_number = get_next_gig_number()
        gig_title = f"Gig {gig_number}"
        
        # Create a new plan/gig
        try:
            date_parts = today.split("-")
            year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
            starts = {"day": day, "month": month, "year": year}
            
            # Create plan in Circuit
            circuit_result = await circuit_service.create_plan(gig_title, starts, [])
            
            if circuit_result and "error" not in circuit_result:
                # Store in local DB
                plan_record = {
                    "id": str(uuid.uuid4()),
                    "circuit_plan_id": circuit_result.get("id"),
                    "title": gig_title,
                    "date": today,
                    "driver_ids": [],
                    "status": "created",
                    "optimization_status": "pending",
                    "distributed": False,
                    "stops_count": 0,
                    "borough": borough_code,
                    "borough_name": borough_name,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user["sub"]
                }
                await db.route_plans.insert_one(plan_record)
                existing_plans.append(plan_record)
                results["gigs_created"] += 1
                
                # Batch import to Circuit
                stops = []
                for order in borough_orders:
                    delivery_address = order.get("delivery_address", {})
                    recipient = order.get("recipient", {})
                    
                    stop_data = {
                        "address": {
                            "addressLineOne": delivery_address.get("street", ""),
                            "city": delivery_address.get("city", ""),
                            "state": delivery_address.get("state", ""),
                            "country": "US",
                            "zipCode": delivery_address.get("postal_code", "")
                        },
                        "recipient": {
                            "name": recipient.get("name", "Customer"),
                            "phone": recipient.get("phone", ""),
                            "email": recipient.get("email", "")
                        },
                        "orderInfo": {
                            "sellerOrderId": order.get("order_number", order["id"]),
                            "products": [f"Package {i+1}" for i in range(order.get("total_packages", 1))]
                        },
                        "notes": order.get("delivery_notes", "")
                    }
                    stops.append(stop_data)
                
                # Import stops to Circuit
                plan_id = circuit_result.get("id", "").replace("plans/", "")
                await circuit_service.batch_import_stops(plan_id, stops)
                
                # Update orders with plan reference
                for order in borough_orders:
                    await db.orders.update_one(
                        {"id": order["id"]},
                        {"$set": {
                            "circuit_plan_id": circuit_result.get("id"),
                            "gig_title": gig_title,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                
                # Update plan stops count
                await db.route_plans.update_one(
                    {"id": plan_record["id"]},
                    {"$set": {"stops_count": len(borough_orders)}}
                )
                
                results["total_assigned"] += len(borough_orders)
                results["by_borough"][borough_name] = {
                    "gig": gig_title,
                    "orders_count": len(borough_orders),
                    "order_numbers": [o.get("order_number") for o in borough_orders]
                }
        except Exception as e:
            logger.error(f"Error creating gig for borough {borough_name}: {e}")
            results["by_borough"][borough_name] = {
                "error": str(e),
                "orders_count": len(borough_orders)
            }
    
    return {
        "message": f"Auto-assigned {results['total_assigned']} orders to {results['gigs_created']} new gigs",
        **results
    }


@circuit_router.post("/plans/{plan_id}/assign-driver")
async def assign_driver_to_gig(
    plan_id: str,
    request: AssignDriverToGigRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Assign a driver to a gig/plan. This updates both Circuit and local records.
    """
    if not request.driver_id:
        raise HTTPException(status_code=400, detail="Driver ID is required")
    
    # Get the plan
    full_plan_id = plan_id if plan_id.startswith("plans/") else f"plans/{plan_id}"
    local_plan = await db.route_plans.find_one(
        {"$or": [
            {"circuit_plan_id": plan_id},
            {"circuit_plan_id": full_plan_id}
        ]},
        {"_id": 0}
    )
    
    if not local_plan:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Get driver info from Circuit
    drivers_response = await circuit_service.list_drivers()
    circuit_drivers = drivers_response.get("drivers", []) if drivers_response else []
    
    driver_info = None
    for d in circuit_drivers:
        if d.get("id") == request.driver_id or d.get("id") == f"drivers/{request.driver_id}":
            driver_info = d
            break
    
    if not driver_info:
        raise HTTPException(status_code=404, detail="Driver not found in Circuit")
    
    # Update local plan record with driver assignment
    update_data = {
        "driver_ids": [request.driver_id],
        "assigned_driver": {
            "id": driver_info.get("id"),
            "name": driver_info.get("name", driver_info.get("email", "Driver")),
            "email": driver_info.get("email"),
            "assigned_at": datetime.now(timezone.utc).isoformat()
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.route_plans.update_one(
        {"$or": [
            {"circuit_plan_id": plan_id},
            {"circuit_plan_id": full_plan_id}
        ]},
        {"$set": update_data}
    )
    
    # Update all orders in this plan with driver info
    await db.orders.update_many(
        {"circuit_plan_id": {"$in": [plan_id, full_plan_id]}},
        {"$set": {
            "assigned_driver_name": driver_info.get("name", driver_info.get("email")),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"Driver {driver_info.get('name', driver_info.get('email'))} assigned to {local_plan.get('title', 'Gig')}",
        "plan_id": plan_id,
        "driver": {
            "id": driver_info.get("id"),
            "name": driver_info.get("name"),
            "email": driver_info.get("email")
        }
    }


@circuit_router.get("/pending-orders")
async def get_pending_orders_for_routing(
    date: str = None,
    delivery_type: str = None,
    current_user: dict = Depends(require_admin)
):
    """Get orders that are ready to be added to a route plan"""
    query = {
        "status": {"$in": [OrderStatus.PENDING, OrderStatus.CONFIRMED]},
        "circuit_plan_id": {"$exists": False}
    }
    
    if date:
        # Filter by scheduled delivery date
        query["scheduled_delivery_date"] = {"$regex": f"^{date}"}
    
    if delivery_type:
        query["delivery_type"] = delivery_type
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(100)
    
    # Group by delivery type
    grouped = {}
    for order in orders:
        dt = order.get("delivery_type", "standard")
        if dt not in grouped:
            grouped[dt] = []
        grouped[dt].append(order)
    
    return {
        "total_count": len(orders),
        "orders": orders,
        "grouped_by_type": grouped
    }


@circuit_router.delete("/plans/{plan_id}")
async def delete_circuit_plan(plan_id: str, current_user: dict = Depends(require_admin)):
    """Delete a Circuit plan and clean up local records"""
    # Delete from Circuit
    result = await circuit_service.delete_plan(plan_id)
    
    # Build full plan ID for local queries (handle both formats)
    full_plan_id = plan_id if plan_id.startswith("plans/") else f"plans/{plan_id}"
    
    # Remove circuit references from orders
    await db.orders.update_many(
        {"circuit_plan_id": {"$in": [plan_id, full_plan_id]}},
        {"$unset": {"circuit_plan_id": "", "circuit_stop_id": "", "tracking_url": ""}}
    )
    
    # Delete local plan record (try both formats)
    await db.route_plans.delete_one({"circuit_plan_id": {"$in": [plan_id, full_plan_id]}})
    
    return {"message": "Plan deleted successfully"}


# ============== Circuit Spoke Webhook Endpoint ==============
webhooks_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@webhooks_router.post("/circuit")
async def circuit_webhook(request: Request):
    """
    Handle Circuit Spoke webhook events.
    Events include: stop.completed, stop.failed, plan.optimized, driver.location, etc.
    
    Webhook URL to configure in Circuit: https://backend.rxexpresss.com/api/webhooks/circuit
    """
    try:
        payload = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    event_type = payload.get("type") or payload.get("event")
    event_data = payload.get("data") or payload
    
    logger.info(f"[Circuit Webhook] Received event: {event_type}")
    logger.info(f"[Circuit Webhook] Payload: {json.dumps(payload)[:500]}")
    
    try:
        if event_type in ["stop.completed", "stop.succeeded"]:
            # Delivery was successfully completed
            stop_id = event_data.get("stopId") or event_data.get("stop_id")
            plan_id = event_data.get("planId") or event_data.get("plan_id")
            
            # Find the order by circuit_stop_id
            order = await db.orders.find_one({
                "$or": [
                    {"circuit_stop_id": stop_id},
                    {"circuit_stop_id": {"$regex": f"/{stop_id}$"}}
                ]
            }, {"_id": 0})
            
            if order:
                update_data = {
                    "status": OrderStatus.DELIVERED,
                    "actual_delivery_time": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Extract POD data if available
                if event_data.get("signatureUrl"):
                    update_data["signature_data"] = event_data["signatureUrl"]
                if event_data.get("photoUrls"):
                    update_data["delivery_photo_url"] = event_data["photoUrls"][0]
                if event_data.get("recipientName"):
                    update_data["recipient_confirmed_name"] = event_data["recipientName"]
                
                await db.orders.update_one({"id": order["id"]}, {"$set": update_data})
                logger.info(f"[Circuit Webhook] Order {order['order_number']} marked as delivered")
                
                # Send notification to customer (async)
                try:
                    await notification_service.send_order_notification(
                        order["id"], "delivered", 
                        "Your prescription has been delivered successfully!"
                    )
                except Exception as e:
                    logger.error(f"[Circuit Webhook] Notification error: {e}")
        
        elif event_type in ["stop.failed", "stop.attempted"]:
            # Delivery attempt failed
            stop_id = event_data.get("stopId") or event_data.get("stop_id")
            reason = event_data.get("failReason") or event_data.get("reason") or "Delivery attempt failed"
            
            order = await db.orders.find_one({
                "$or": [
                    {"circuit_stop_id": stop_id},
                    {"circuit_stop_id": {"$regex": f"/{stop_id}$"}}
                ]
            }, {"_id": 0})
            
            if order:
                update_data = {
                    "status": OrderStatus.FAILED,
                    "delivery_notes": reason,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.orders.update_one({"id": order["id"]}, {"$set": update_data})
                logger.info(f"[Circuit Webhook] Order {order['order_number']} marked as failed: {reason}")
        
        elif event_type == "stop.out_for_delivery":
            # Driver has started delivery for this stop
            stop_id = event_data.get("stopId") or event_data.get("stop_id")
            
            order = await db.orders.find_one({
                "$or": [
                    {"circuit_stop_id": stop_id},
                    {"circuit_stop_id": {"$regex": f"/{stop_id}$"}}
                ]
            }, {"_id": 0})
            
            if order:
                await db.orders.update_one(
                    {"id": order["id"]}, 
                    {"$set": {
                        "status": OrderStatus.OUT_FOR_DELIVERY,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"[Circuit Webhook] Order {order['order_number']} is out for delivery")
        
        elif event_type == "plan.optimized":
            # Route optimization completed
            plan_id = event_data.get("planId") or event_data.get("plan_id")
            
            await db.route_plans.update_one(
                {"circuit_plan_id": {"$regex": plan_id}},
                {"$set": {
                    "optimization_status": "completed",
                    "status": "optimized",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[Circuit Webhook] Plan {plan_id} optimization completed")
        
        elif event_type == "plan.distributed":
            # Plan was distributed to drivers
            plan_id = event_data.get("planId") or event_data.get("plan_id")
            
            await db.route_plans.update_one(
                {"circuit_plan_id": {"$regex": plan_id}},
                {"$set": {
                    "distributed": True,
                    "status": "distributed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[Circuit Webhook] Plan {plan_id} distributed to drivers")
        
        elif event_type == "driver.location":
            # Driver location update
            driver_id = event_data.get("driverId") or event_data.get("driver_id")
            lat = event_data.get("latitude") or event_data.get("lat")
            lng = event_data.get("longitude") or event_data.get("lng")
            
            if driver_id and lat and lng:
                # Update driver location in DB
                await db.drivers.update_one(
                    {"circuit_driver_id": driver_id},
                    {"$set": {
                        "current_location": {"latitude": lat, "longitude": lng},
                        "last_location_update": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Store in location history
                await db.location_history.insert_one({
                    "driver_id": driver_id,
                    "latitude": lat,
                    "longitude": lng,
                    "timestamp": datetime.now(timezone.utc),
                    "source": "circuit_webhook"
                })
        
        # Log webhook for audit
        await db.webhook_logs.insert_one({
            "source": "circuit",
            "event_type": event_type,
            "payload": payload,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "status": "processed"
        })
        
        return {"status": "ok", "event": event_type, "message": "Webhook processed"}
    
    except Exception as e:
        logger.error(f"[Circuit Webhook] Error processing webhook: {e}")
        # Log failed webhook
        await db.webhook_logs.insert_one({
            "source": "circuit",
            "event_type": event_type,
            "payload": payload,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "status": "error",
            "error": str(e)
        })
        return {"status": "error", "message": str(e)}


@webhooks_router.get("/circuit/logs")
async def get_webhook_logs(
    limit: int = 50,
    status: str = None,
    current_user: dict = Depends(require_admin)
):
    """Get recent webhook logs for debugging"""
    query = {"source": "circuit"}
    if status:
        query["status"] = status
    
    logs = await db.webhook_logs.find(query, {"_id": 0}).sort("processed_at", -1).to_list(limit)
    return {"logs": logs, "count": len(logs)}


# Include all routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(pharmacies_router)
api_router.include_router(drivers_router)
api_router.include_router(orders_router)
api_router.include_router(delivery_router)
api_router.include_router(payments_router)
api_router.include_router(tracking_router)
api_router.include_router(maps_router)
api_router.include_router(notifications_router)
api_router.include_router(circuit_router)
api_router.include_router(admin_router)
api_router.include_router(zones_router)
api_router.include_router(driver_portal_router)
api_router.include_router(public_router)
api_router.include_router(webhooks_router)

app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database indexes on startup"""
    logger.info("Starting RX Expresss API...")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.pharmacies.create_index("id", unique=True)
    await db.drivers.create_index("id", unique=True)
    await db.drivers.create_index("user_id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("order_number", unique=True)
    await db.orders.create_index([("status", 1), ("created_at", -1)])
    await db.location_history.create_index([("driver_id", 1), ("timestamp", -1)])
    await db.payment_transactions.create_index("session_id", unique=True)
    
    logger.info("Database indexes created")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    client.close()
    logger.info("Database connection closed")
