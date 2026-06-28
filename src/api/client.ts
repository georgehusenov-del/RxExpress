import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) || 'https://backend.rxexpresss.com/api';
const TOKEN_KEY = 'rxex_driver_jwt';
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export async function saveToken(token: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearToken() { await SecureStore.deleteItemAsync(TOKEN_KEY); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    if (isDev) {
      console.log(`[API] ${options.method || 'GET'} ${path} → ${response.status} | ${text.slice(0, 300)}`);
    }
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      const message = data?.detail || data?.message || data?.error || `HTTP ${response.status}: ${text.slice(0, 300)}`;
      throw new Error(message);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = { request, BASE_URL };
