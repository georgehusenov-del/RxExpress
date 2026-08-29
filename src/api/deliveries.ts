import { apiClient } from './client';
import type {
  Delivery,
  DeliveryDetailResponse,
  DeliveryPackage,
  DriverActionPayload,
  DriverActionResponse,
  MyRouteResponse,
  OfficeLocation,
  ScanCodeResponse,
  ScanType,
} from '@/types/api';

export function fetchDeliveries() {
  return apiClient.request<{ deliveries: Delivery[]; count: number }>('/driver-portal/deliveries');
}

export function fetchMyRoute() {
  return apiClient.request<MyRouteResponse>('/driver-portal/my-route');
}

export function fetchHistory() {
  return apiClient.request<{ deliveries: Delivery[]; count: number }>('/driver-portal/history');
}

export function fetchDeliveryDetail(orderId: number) {
  return apiClient.request<DeliveryDetailResponse>(`/driver-portal/deliveries/${orderId}/detail`);
}

export function fetchOfficeLocations() {
  return apiClient.request<{ offices: OfficeLocation[] }>('/driver-portal/office-locations');
}

export function updateDeliveryStatusRequest(id: number, status: string) {
  return apiClient.request<{ message: string }>(
    `/driver-portal/deliveries/${id}/status?status=${encodeURIComponent(status)}`,
    { method: 'PUT' }
  );
}

export function collectCopayRequest(id: number) {
  return apiClient.request<{ success: boolean; message: string }>(
    `/driver-portal/deliveries/${id}/collect-copay`,
    { method: 'POST' }
  );
}

export function driverActionRequest(id: number, payload: DriverActionPayload) {
  return apiClient.request<DriverActionResponse>(`/driver-portal/deliveries/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchDeliveryPackages(orderId: number) {
  return apiClient.request<{ packages: DeliveryPackage[] }>(`/driver-portal/deliveries/${orderId}/packages`);
}

export function scanDeliveryCode(orderId: number, payload: {
  scanType: ScanType;
  scannedCode: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}) {
  return apiClient.request<ScanCodeResponse>(`/driver-portal/deliveries/${orderId}/scan-code`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function globalScanCode(payload: {
  scanType: ScanType;
  scannedCode: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}) {
  return apiClient.request<ScanCodeResponse>('/driver-portal/scan-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
