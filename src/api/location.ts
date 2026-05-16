import { apiClient } from './client';

export function sendDriverLocation(payload: { latitude: number; longitude: number; speed?: number | null; heading?: number | null; accuracy?: number | null }) {
  return apiClient.request<{ success?: boolean; message?: string }>('/driver-portal/location', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDriverStatus(status: 'on_duty' | 'offline' | 'on_break') {
  return apiClient.request<{ message: string }>(`/driver-portal/status?status=${encodeURIComponent(status)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
