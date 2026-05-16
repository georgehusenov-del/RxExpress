import { apiClient, clearToken, saveToken } from './client';
import type { DriverProfile, LoginResponse, User } from '@/types/api';

export async function loginRequest(email: string, password: string) {
  const result = await apiClient.request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveToken(result.token);
  return result;
}

export function fetchMe() {
  return apiClient.request<User>('/auth/me');
}

export function fetchDriverProfile() {
  return apiClient.request<DriverProfile>('/driver-portal/profile');
}

export function logoutRequest() {
  return clearToken();
}
