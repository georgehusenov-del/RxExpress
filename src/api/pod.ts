import { apiClient } from './client';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function stripDataUri(value?: string) {
  if (!value) return value;
  const commaIndex = value.indexOf(',');
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

export async function submitDeliveryPod(id: number, payload: {
  photoHomeBase64: string;
  photoAddressBase64: string;
  photoPackageBase64: string;
  signatureBase64?: string;
  recipientName?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}) {
  const requestBody = { ...payload, photoBase64: payload.photoPackageBase64 };
  const json = JSON.stringify(requestBody);
  if (isDev) {
    console.log(`[POD] delivery ${id}, body ${Math.round(json.length / 1024)} KB`);
  }

  try {
    return await apiClient.request<{ success: boolean; message: string }>(`/driver-portal/deliveries/${id}/pod`, { method: 'POST', body: json });
  } catch (error: any) {
    if (!String(error?.message || '').toLowerCase().includes('failed to save photos')) throw error;

    const fallbackBody = {
      ...payload,
      photoBase64: stripDataUri(payload.photoPackageBase64),
      photoHomeBase64: stripDataUri(payload.photoHomeBase64)!,
      photoAddressBase64: stripDataUri(payload.photoAddressBase64)!,
      photoPackageBase64: stripDataUri(payload.photoPackageBase64)!,
      signatureBase64: stripDataUri(payload.signatureBase64),
    };
    const fallbackJson = JSON.stringify(fallbackBody);
    if (isDev) {
      console.log(`[POD] delivery ${id}, retrying with raw base64 (${Math.round(fallbackJson.length / 1024)} KB)`);
    }
    return apiClient.request<{ success: boolean; message: string }>(`/driver-portal/deliveries/${id}/pod`, { method: 'POST', body: fallbackJson });
  }
}
