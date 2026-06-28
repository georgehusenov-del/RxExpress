import { apiClient } from './client';
import type { Delivery, MyRouteResponse, ScanPackage } from '@/types/api';

export function fetchDeliveries() {
  return apiClient.request<{ deliveries: Delivery[]; count: number }>('/driver-portal/deliveries');
}

export function fetchMyRoute() {
  return apiClient.request<MyRouteResponse>('/driver-portal/my-route');
}

export function fetchHistory() {
  return apiClient.request<{ deliveries: Delivery[]; count: number }>('/driver-portal/history');
}

export function scanPackageQr(qrCode: string) {
  return apiClient.request<ScanPackage>(`/admin/scan/${encodeURIComponent(qrCode)}`, { method: 'POST' });
}

export function updateDeliveryStatusRequest(id: number, status: string) {
  return apiClient.request<{ message: string }>(`/driver-portal/deliveries/${id}/status?status=${encodeURIComponent(status)}`, { method: 'PUT' });
}

export function collectCopayRequest(id: number) {
  return apiClient.request<{ success: boolean; message: string }>(`/driver-portal/deliveries/${id}/collect-copay`, { method: 'POST' });
}

export function logAttemptRequest(id: number, payload: { status: 'failed' | 'delivered'; driverName?: string; failureReason?: string; notes?: string }) {
  return apiClient.request<{ message: string; failedAttempts?: number; canDuplicate?: boolean; duplicateMessage?: string }>(`/admin/orders/${id}/log-attempt`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
