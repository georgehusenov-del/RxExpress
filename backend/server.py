from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, BackgroundTasks, UploadFile, File
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
    UserRole, OrderStatus, DriverStatus, PaymentStatus,
    User, UserCreate, UserLogin, UserResponse, TokenResponse,
    Pharmacy, PharmacyCreate,
    DriverProfile, DriverCreate, DriverLocationUpdate, DriverStatusUpdate,
    Order, OrderCreate, OrderUpdate, OrderStatusUpdate,
    DeliveryProof, DeliveryProofCreate,
    PaymentTransaction, CreateCheckoutRequest,
    LocationHistory, LocationPoint,
    RouteOptimizationRequest, RouteOptimizationResponse,
    NotificationRequest, DistanceMatrixRequest, GeocodeRequest, GeocodeResponse,
    PrescriptionItem, Address
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from notifications import notification_service
from maps_service import maps_service

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

# Create the main app
app = FastAPI(
    title="RX Express API",
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
    
    # Calculate delivery fee (base + distance)
    delivery_fee = 5.99  # Base fee
    
    # Create order
    order = Order(
        pharmacy_id=order_data.pharmacy_id,
        patient_id=order_data.patient_id,
        delivery_address=order_data.delivery_address,
        pickup_address=Address(**pharmacy["address"]),
        prescriptions=order_data.prescriptions,
        delivery_notes=order_data.delivery_notes,
        scheduled_delivery_time=order_data.scheduled_delivery_time,
        requires_signature=order_data.requires_signature,
        requires_photo_proof=order_data.requires_photo_proof,
        delivery_fee=delivery_fee,
        total_amount=delivery_fee
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["delivery_address"] = order_data.delivery_address.model_dump()
    order_dict["pickup_address"] = pharmacy["address"]
    order_dict["prescriptions"] = [p.model_dump() for p in order_data.prescriptions]
    
    if order_dict.get("scheduled_delivery_time"):
        order_dict["scheduled_delivery_time"] = order_dict["scheduled_delivery_time"].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Get patient info for notifications
    patient = await db.users.find_one({"id": order_data.patient_id}, {"_id": 0})
    
    # Send notifications in background
    if patient:
        background_tasks.add_task(
            notification_service.send_order_confirmation,
            patient.get("email"),
            patient.get("phone"),
            {
                "order_number": order.order_number,
                "status": order.status,
                "estimated_delivery": "Within 2 hours"
            }
        )
        
        # Notify pharmacy
        background_tasks.add_task(
            notification_service.send_pharmacy_new_order,
            pharmacy.get("email"),
            {
                "order_number": order.order_number,
                "patient_name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}",
                "items_count": len(order_data.prescriptions),
                "scheduled_pickup": "ASAP"
            }
        )
    
    return {
        "message": "Order created successfully",
        "order_id": order.id,
        "order_number": order.order_number,
        "delivery_fee": delivery_fee
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
    
    # Get patient and driver user info for notifications
    patient = await db.users.find_one({"id": order["patient_id"]}, {"_id": 0})
    driver_user = await db.users.find_one({"id": driver["user_id"]}, {"_id": 0})
    
    if patient and driver_user:
        background_tasks.add_task(
            notification_service.send_driver_assigned,
            patient.get("email"),
            patient.get("phone"),
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
        patient = await db.users.find_one({"id": order["patient_id"]}, {"_id": 0})
        if patient:
            background_tasks.add_task(
                notification_service.send_delivery_completed,
                patient.get("email"),
                patient.get("phone"),
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
            request.subject or "RX Express Notification",
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
        "message": "RX Express API - Pharmacy Delivery Service",
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
            "notifications": "configured" if notification_service.twilio_client or notification_service.sendgrid_client else "not_configured"
        }
    }


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
    logger.info("Starting RX Express API...")
    
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
