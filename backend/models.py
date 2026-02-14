"""
Enhanced Models for RX Expresss - DrugLift-like functionality
"""

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, time
from enum import Enum
import uuid


# ============== Enums ==============
class UserRole(str, Enum):
    PATIENT = "patient"
    PHARMACY = "pharmacy"
    DRIVER = "driver"
    ADMIN = "admin"


class DeliveryType(str, Enum):
    SAME_DAY = "same_day"           # Cutoff 2pm, deliver same day
    NEXT_DAY = "next_day"           # Pickup today, deliver tomorrow with 2-3hr ETA window
    PRIORITY = "priority"            # First deliveries of the day
    TIME_WINDOW = "time_window"      # Specific time windows
    SCHEDULED = "scheduled"          # Scheduled bulk delivery - $9 flat, 8am-10pm, min 15 packages


class TimeWindow(str, Enum):
    MORNING = "8am-1pm"
    AFTERNOON = "1pm-4pm"
    EVENING = "4pm-10pm"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    READY_FOR_PICKUP = "ready_for_pickup"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED = "failed"
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


# ============== Location & Address Models ==============
class LocationPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Address(BaseModel):
    street: str
    apt_unit: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "USA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    delivery_instructions: Optional[str] = None


# ============== Service Zone Models ==============
class ServiceZone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "NYC", "Long Island", "New Jersey"
    code: str  # e.g., "NYC", "LI", "NJ"
    is_active: bool = True
    zip_codes: List[str] = []  # Covered zip codes
    cities: List[str] = []  # Covered cities
    states: List[str] = []  # Covered states
    delivery_fee: float = 5.99
    same_day_cutoff: str = "14:00"  # 2pm cutoff
    priority_surcharge: float = 5.00
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceZoneCreate(BaseModel):
    name: str
    code: str
    zip_codes: List[str] = []
    cities: List[str] = []
    states: List[str] = []
    delivery_fee: float = 5.99
    same_day_cutoff: str = "14:00"
    priority_surcharge: float = 5.00


# ============== User Models ==============
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
    is_verified: bool = False
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


# ============== Pharmacy Models ==============
class PharmacyLocation(BaseModel):
    """Individual pharmacy location for multi-location support"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Main Street Branch"
    address: Address
    phone: str
    is_primary: bool = False
    is_active: bool = True
    operating_hours: Optional[Dict[str, str]] = None
    pickup_instructions: Optional[str] = None


class PharmacyBase(BaseModel):
    name: str
    license_number: str
    npi_number: Optional[str] = None  # National Provider Identifier
    phone: str
    email: EmailStr
    website: Optional[str] = None


class PharmacyCreate(PharmacyBase):
    address: Address  # Primary location address


class Pharmacy(PharmacyBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    locations: List[PharmacyLocation] = []
    service_zones: List[str] = []  # Zone IDs pharmacy serves
    is_active: bool = True
    is_verified: bool = False
    rating: float = 0.0
    total_deliveries: int = 0
    api_key: Optional[str] = None  # For pharmacy software integration
    webhook_url: Optional[str] = None  # For delivery status callbacks
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PharmacyLocationCreate(BaseModel):
    name: str
    address: Address
    phone: str
    is_primary: bool = False
    operating_hours: Optional[Dict[str, str]] = None
    pickup_instructions: Optional[str] = None


# ============== Driver Models ==============
class DriverProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_type: str
    vehicle_number: str
    license_number: str
    insurance_info: Optional[str] = None
    status: DriverStatus = DriverStatus.OFFLINE
    current_location: Optional[LocationPoint] = None
    service_zones: List[str] = []  # Zone IDs driver serves
    rating: float = 0.0
    total_deliveries: int = 0
    is_verified: bool = False
    circuit_driver_id: Optional[str] = None  # Link to Circuit driver
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverCreate(BaseModel):
    vehicle_type: str
    vehicle_number: str
    license_number: str
    insurance_info: Optional[str] = None
    service_zones: List[str] = []


class DriverLocationUpdate(BaseModel):
    driver_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class DriverStatusUpdate(BaseModel):
    driver_id: str
    status: DriverStatus


# ============== Package/Prescription Models ==============
class PrescriptionItem(BaseModel):
    medication_name: str
    rx_number: Optional[str] = None
    quantity: int
    dosage: str
    instructions: Optional[str] = None
    requires_refrigeration: bool = False
    controlled_substance: bool = False
    requires_id_verification: bool = False


class Package(BaseModel):
    """Individual package in a delivery"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qr_code: str = Field(default_factory=lambda: f"RX-PKG-{uuid.uuid4().hex[:8].upper()}")
    barcode: Optional[str] = None
    prescriptions: List[PrescriptionItem] = []
    weight_lbs: Optional[float] = None
    requires_refrigeration: bool = False
    requires_signature: bool = True
    requires_id_verification: bool = False
    special_instructions: Optional[str] = None
    scanned_at: Optional[datetime] = None


# ============== Order/Delivery Models ==============
class DeliveryRecipient(BaseModel):
    """Recipient info (patient)"""
    name: str
    phone: str
    email: Optional[str] = None
    date_of_birth: Optional[str] = None  # For ID verification
    relationship: str = "self"  # self, spouse, caregiver, etc.


class OrderCreate(BaseModel):
    pharmacy_id: str
    pharmacy_location_id: Optional[str] = None  # For multi-location
    delivery_type: DeliveryType = DeliveryType.NEXT_DAY
    time_window: Optional[TimeWindow] = None  # Required if delivery_type is TIME_WINDOW
    recipient: DeliveryRecipient
    delivery_address: Address
    packages: List[Package] = []
    delivery_notes: Optional[str] = None
    scheduled_date: Optional[str] = None  # YYYY-MM-DD for next-day/scheduled
    requires_signature: bool = True
    requires_photo_proof: bool = True
    requires_id_verification: bool = False
    copay_amount: float = 0.0  # Copay to collect from patient


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"RX-{uuid.uuid4().hex[:8].upper()}")
    tracking_number: str = Field(default_factory=lambda: f"TRK-{uuid.uuid4().hex[:10].upper()}")
    
    # Pharmacy info
    pharmacy_id: str
    pharmacy_location_id: Optional[str] = None
    pharmacy_name: Optional[str] = None
    
    # Delivery type
    delivery_type: DeliveryType = DeliveryType.NEXT_DAY
    time_window: Optional[TimeWindow] = None
    
    # Recipient
    recipient: DeliveryRecipient
    delivery_address: Address
    pickup_address: Optional[Address] = None
    
    # Packages
    packages: List[Package] = []
    total_packages: int = 0
    
    # Driver
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    
    # Status & Timing
    status: OrderStatus = OrderStatus.PENDING
    scheduled_date: Optional[str] = None
    estimated_pickup_time: Optional[datetime] = None
    estimated_delivery_start: Optional[datetime] = None
    estimated_delivery_end: Optional[datetime] = None  # For 2-3hr window
    actual_pickup_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    
    # Delivery requirements
    delivery_notes: Optional[str] = None
    requires_signature: bool = True
    requires_photo_proof: bool = True
    requires_id_verification: bool = False
    
    # Proof of delivery
    signature_url: Optional[str] = None
    photo_urls: List[str] = []
    recipient_name_signed: Optional[str] = None
    id_verified: bool = False
    delivery_location: Optional[LocationPoint] = None
    
    # Circuit integration
    circuit_plan_id: Optional[str] = None
    circuit_stop_id: Optional[str] = None
    circuit_tracking_url: Optional[str] = None
    
    # Pricing
    service_zone_id: Optional[str] = None
    delivery_fee: float = 5.99
    priority_surcharge: float = 0.0
    total_amount: float = 5.99
    
    # Copay collection
    copay_amount: float = 0.0  # Amount pharmacy needs to collect from patient
    copay_collected: bool = False  # Whether copay has been collected by driver
    copay_collected_at: Optional[datetime] = None  # When copay was collected
    copay_collection_method: Optional[str] = None  # cash, card, etc.
    
    # Payment
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_session_id: Optional[str] = None
    
    # Tracking
    tracking_url: Optional[str] = None
    tracking_updates: List[Dict[str, Any]] = []
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    driver_id: Optional[str] = None
    delivery_notes: Optional[str] = None
    time_window: Optional[TimeWindow] = None


class OrderStatusUpdate(BaseModel):
    order_id: str
    status: OrderStatus
    notes: Optional[str] = None
    location: Optional[LocationPoint] = None


# ============== Delivery Proof Models ==============
class DeliveryProof(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    driver_id: str
    
    # Proof data
    signature_url: Optional[str] = None
    photo_urls: List[str] = []
    recipient_name: str
    relationship_to_patient: str = "self"
    
    # Verification
    id_verified: bool = False
    id_type: Optional[str] = None  # Driver's license, State ID, etc.
    
    # Location & time
    delivery_location: LocationPoint
    delivered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Notes
    delivery_notes: Optional[str] = None
    delivery_attempts: int = 1


class DeliveryProofCreate(BaseModel):
    order_id: str
    signature_data: Optional[str] = None  # Base64 encoded
    photo_base64: Optional[str] = None  # Base64 encoded
    recipient_name: str
    relationship_to_patient: str = "self"
    id_verified: bool = False
    id_type: Optional[str] = None
    delivery_notes: Optional[str] = None
    latitude: float
    longitude: float


class DriverPodSubmit(BaseModel):
    """POD submission from driver portal"""
    signature_data: Optional[str] = None  # Base64 encoded signature image
    photo_data: Optional[str] = None  # Base64 encoded photo
    recipient_name: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ============== Tracking Models ==============
class TrackingEvent(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: OrderStatus
    message: str
    location: Optional[LocationPoint] = None
    driver_name: Optional[str] = None


class PublicTrackingInfo(BaseModel):
    """Public tracking info for patients"""
    tracking_number: str
    order_number: str
    status: OrderStatus
    status_message: str
    pharmacy_name: str
    delivery_type: DeliveryType
    time_window: Optional[TimeWindow] = None
    estimated_delivery_start: Optional[datetime] = None
    estimated_delivery_end: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    driver_name: Optional[str] = None
    driver_location: Optional[LocationPoint] = None
    tracking_events: List[TrackingEvent] = []
    proof_of_delivery: Optional[Dict[str, Any]] = None


# ============== Payment Models ==============
class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    pharmacy_id: str
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


# ============== Reporting Models ==============
class DailyReport(BaseModel):
    date: str
    total_deliveries: int
    completed_deliveries: int
    failed_deliveries: int
    on_time_percentage: float
    average_delivery_time_minutes: float
    total_revenue: float
    deliveries_by_type: Dict[str, int]
    deliveries_by_zone: Dict[str, int]


class PharmacyReport(BaseModel):
    pharmacy_id: str
    pharmacy_name: str
    period: str  # daily, weekly, monthly
    total_deliveries: int
    completed_deliveries: int
    failed_deliveries: int
    average_rating: float
    total_spent: float
    deliveries_by_type: Dict[str, int]


# ============== API Integration Models ==============
class WebhookEvent(BaseModel):
    event_type: str  # order.created, order.picked_up, order.delivered, etc.
    order_id: str
    tracking_number: str
    status: OrderStatus
    timestamp: datetime
    data: Dict[str, Any]


class PharmacyAPIKey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pharmacy_id: str
    api_key: str = Field(default_factory=lambda: f"rx_live_{uuid.uuid4().hex}")
    name: str  # e.g., "PioneerRx Integration"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: Optional[datetime] = None


# ============== Notification Models ==============
class NotificationPreferences(BaseModel):
    sms_enabled: bool = True
    email_enabled: bool = True
    push_enabled: bool = False
    notify_on_pickup: bool = True
    notify_on_out_for_delivery: bool = True
    notify_on_delivered: bool = True
    notify_on_failed: bool = True


class NotificationRequest(BaseModel):
    user_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notification_type: str  # sms, email, push
    template: str  # order_confirmation, out_for_delivery, delivered, etc.
    data: Dict[str, Any] = {}


# ============== Maps & Routing Models ==============
class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None


class DistanceMatrixRequest(BaseModel):
    origins: List[Dict[str, float]]
    destinations: List[Dict[str, float]]
    mode: str = "driving"


class RouteOptimizationRequest(BaseModel):
    driver_id: str
    waypoints: List[Dict[str, float]]


class RouteOptimizationResponse(BaseModel):
    optimized_waypoints: List[Dict[str, Any]]
    total_distance: str
    total_duration: str
    polyline: str
    waypoint_order: List[int]


# ============== QR Code Models ==============
class QRCodeScan(BaseModel):
    qr_code: str
    scanned_by: str  # user_id
    scanned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location: Optional[LocationPoint] = None
    action: str  # pickup, delivery, verify


class QRCodeResponse(BaseModel):
    package_id: str
    order_id: str
    order_number: str
    recipient_name: str
    delivery_address: str
    status: OrderStatus
    prescriptions: List[PrescriptionItem]



# ============== Delivery Pricing Models ==============
class DeliveryPricing(BaseModel):
    """Admin-controlled delivery pricing configuration"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delivery_type: DeliveryType
    name: str  # Display name, e.g., "Next-Day Delivery"
    description: Optional[str] = None
    base_price: float = 0.0
    is_active: bool = True
    # For time windows (Next-Day)
    time_window_start: Optional[str] = None  # e.g., "08:00"
    time_window_end: Optional[str] = None  # e.g., "12:00"
    # For Same-Day
    cutoff_time: Optional[str] = None  # e.g., "14:00" (2pm)
    # Add-on pricing
    is_addon: bool = False  # For refrigerated fee, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeliveryPricingCreate(BaseModel):
    delivery_type: DeliveryType
    name: str
    description: Optional[str] = None
    base_price: float
    is_active: bool = True
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    cutoff_time: Optional[str] = None
    is_addon: bool = False


class DeliveryPricingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    cutoff_time: Optional[str] = None
