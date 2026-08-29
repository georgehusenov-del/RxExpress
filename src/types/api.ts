export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'Driver' | string;
  isActive: boolean;
  permissions?: string[];
};

export type LoginResponse = { token: string; user: User };

export type DriverProfile = {
  id: number;
  userId: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  status: 'on_duty' | 'offline' | 'on_break' | string;
  rating: number;
  totalDeliveries: number;
  isVerified: boolean;
};

export type OfficeLocation = {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isDefault: boolean;
};

export type DeliveryStatus =
  | 'new'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivering_now'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'completed';

export type DriverActionType =
  | 'call_patient'
  | 'send_eta'
  | 'navigate'
  | 'start_navigation'
  | 'en_route'
  | 'arrived'
  | 'failed';

export type DriverActionPayload = {
  action: DriverActionType;
  notes?: string;
  failureReason?: string;
  failedPhotoBase64?: string | null;
  latitude?: number;
  longitude?: number;
};

export type DriverActionResponse = {
  message: string;
  orderId?: number;
  status?: string;
};

export type DeliveryDetailResponse = {
  order: Delivery;
  packages: DeliveryPackage[];
  events: any[];
  files: any[];
};

export type ScanType =
  | 'pickup' | 'picked_up' | 'pickup_scan'
  | 'intransit' | 'in_transit' | 'office' | 'office_scan'
  | 'outfordelivery' | 'out_for_delivery'
  | 'delivering' | 'delivering_now' | 'enroute' | 'en_route'
  | 'verify';

export type Delivery = {
  id: number;
  orderNumber: string;
  trackingNumber?: string;
  qrCode: string;
  pharmacyName: string;
  deliveryType: 'same_day' | 'next_day' | 'pickup' | 'delivery' | string;
  timeWindow: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  aptUnit?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  status: DeliveryStatus | string;
  copayAmount: number;
  copayCollected: boolean;
  deliveryNotes?: string | null;
  deliveryInstructions?: string | null;
  requiresSignature: boolean;
  isRefrigerated: boolean;
  // Sequential stop position within the route (1-based)
  stopNumber?: number;
  // For pickup deliveries: number of packages expected at this pharmacy
  expectedPackageCount?: number;
  // Gig/route identifier this stop belongs to
  gigNumber?: string;
  optimizedSequence?: number;
  optimizedDistanceText?: string;
  optimizedDurationText?: string;
  requiresPhotoProof?: boolean;
  packages?: DeliveryPackage[];
  packageCodes?: string[];
  createdAt?: string;
  actualDeliveryTime?: string;
  photoUrl?: string;
  signatureUrl?: string;
  recipientNameSigned?: string;
  updatedAt?: string;
};

export type ScanPackage = {
  verified: boolean;
  message?: string;
  detail?: string;
  package?: {
    id: number;
    orderNumber: string;
    qrCode: string;
    pharmacyName: string;
    recipientName: string;
    address: string;
    status: string;
    copayAmount: number;
    copayCollected: boolean;
    driverName?: string;
  };
};

export type MyRouteResponse = {
  deliveries: Delivery[];
  count?: number;
  // Route-level metadata (present when backend provides them)
  gigNumber?: string;
  routeId?: number;
  routeStatus?: string;
};

export type ApiError = { detail?: string; message?: string };

export type DeliveryPackage = {
  id: number;
  orderId: number;
  packageCode: string;
  packageIndex?: number;
  status: 'pending' | 'scanned' | string;
};

export type ScanCodeResponse = {
  message: string;
  orderStatus?: string;
  allScanned: boolean;
  scannedCode?: string;
  missingCodes?: string[];
  package?: DeliveryPackage;
  expectedCodes?: string[];
  requiresPackagePartScan?: boolean;
  detail?: string;
};
