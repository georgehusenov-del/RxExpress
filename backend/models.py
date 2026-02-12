from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# Enums
class UserRole(str, Enum):
    PATIENT = "patient"
    PHARMACY = "pharmacy"
    DRIVER = "driver"
    ADMIN = "admin"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DriverStatus(str, Enum):
    AVAILABLE = "available"
    ON_ROUTE = "on_route"
    ON_BREAK = "on_break"
    OFFLINE = "offline"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    INITIATED = "initiated"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


# Base Models
class LocationPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Address(BaseModel):
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "USA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# User Models
class UserBase(BaseModel):
    email: EmailStr
    phone: str
    first_name: str
    last_name: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserResponse(BaseModel):
    id: str
    email: str
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Pharmacy Models
class PharmacyBase(BaseModel):
    name: str
    license_number: str
    address: Address
    phone: str
    email: EmailStr
    operating_hours: Optional[Dict[str, str]] = None


class PharmacyCreate(PharmacyBase):
    pass  # user_id will be taken from the authenticated user


class Pharmacy(PharmacyBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_active: bool = True
    rating: float = 0.0
    total_deliveries: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Driver Models
class DriverProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_type: str
    vehicle_number: str
    license_number: str
    status: DriverStatus = DriverStatus.OFFLINE
    current_location: Optional[LocationPoint] = None
    rating: float = 0.0
    total_deliveries: int = 0
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverCreate(BaseModel):
    user_id: str
    vehicle_type: str
    vehicle_number: str
    license_number: str


class DriverLocationUpdate(BaseModel):
    driver_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class DriverStatusUpdate(BaseModel):
    driver_id: str
    status: DriverStatus


# Prescription/Order Models
class PrescriptionItem(BaseModel):
    medication_name: str
    quantity: int
    dosage: str
    instructions: Optional[str] = None
    requires_refrigeration: bool = False
    controlled_substance: bool = False


class OrderCreate(BaseModel):
    pharmacy_id: str
    patient_id: str
    delivery_address: Address
    prescriptions: List[PrescriptionItem]
    delivery_notes: Optional[str] = None
    scheduled_delivery_time: Optional[datetime] = None
    requires_signature: bool = True
    requires_photo_proof: bool = True


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"RX-{uuid.uuid4().hex[:8].upper()}")
    pharmacy_id: str
    patient_id: str
    driver_id: Optional[str] = None
    delivery_address: Address
    pickup_address: Optional[Address] = None
    prescriptions: List[PrescriptionItem]
    status: OrderStatus = OrderStatus.PENDING
    delivery_notes: Optional[str] = None
    scheduled_delivery_time: Optional[datetime] = None
    actual_pickup_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    requires_signature: bool = True
    requires_photo_proof: bool = True
    signature_data: Optional[str] = None  # Base64 encoded signature
    delivery_photo_url: Optional[str] = None
    delivery_fee: float = 0.0
    total_amount: float = 0.0
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_session_id: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None
    distance_miles: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    driver_id: Optional[str] = None
    delivery_notes: Optional[str] = None
    scheduled_delivery_time: Optional[datetime] = None


class OrderStatusUpdate(BaseModel):
    order_id: str
    status: OrderStatus
    notes: Optional[str] = None


# Delivery Proof Models
class DeliveryProof(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    driver_id: str
    signature_data: Optional[str] = None  # Base64 encoded
    photo_url: Optional[str] = None
    recipient_name: str
    delivery_notes: Optional[str] = None
    location: LocationPoint
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeliveryProofCreate(BaseModel):
    order_id: str
    signature_data: Optional[str] = None
    photo_base64: Optional[str] = None
    recipient_name: str
    delivery_notes: Optional[str] = None
    latitude: float
    longitude: float


# Payment Models
class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    user_id: str
    amount: float
    currency: str = "usd"
    session_id: str
    payment_status: PaymentStatus = PaymentStatus.INITIATED
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateCheckoutRequest(BaseModel):
    order_id: str
    origin_url: str


# Location Tracking Models
class LocationHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    order_id: Optional[str] = None
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Route Models
class RouteOptimizationRequest(BaseModel):
    driver_id: str
    waypoints: List[Dict[str, float]]  # [{"latitude": float, "longitude": float}]


class RouteOptimizationResponse(BaseModel):
    optimized_waypoints: List[Dict[str, Any]]
    total_distance: str
    total_duration: str
    polyline: str
    waypoint_order: List[int]


# Notification Models
class NotificationRequest(BaseModel):
    user_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notification_type: str  # sms, email, push
    subject: Optional[str] = None
    message: str
    data: Optional[Dict[str, Any]] = None


# Distance Matrix Models
class DistanceMatrixRequest(BaseModel):
    origins: List[Dict[str, float]]
    destinations: List[Dict[str, float]]
    mode: str = "driving"


# Geocoding Models
class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None
