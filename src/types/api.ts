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

export type Delivery = {
  id: number;
  orderNumber: string;
  trackingNumber?: string;
  qrCode: string;
  pharmacyName: string;
  deliveryType: string;
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
  status: string;
  copayAmount: number;
  copayCollected: boolean;
  deliveryNotes?: string | null;
  deliveryInstructions?: string | null;
  requiresSignature: boolean;
  isRefrigerated: boolean;
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

export type ApiError = { detail?: string; message?: string };
