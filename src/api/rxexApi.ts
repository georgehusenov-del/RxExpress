import { loginRequest, fetchMe, fetchDriverProfile, logoutRequest } from './auth';
import { collectCopayRequest, fetchDeliveries, fetchHistory, logAttemptRequest, scanPackageQr, updateDeliveryStatusRequest } from './deliveries';
import { sendDriverLocation, updateDriverStatus } from './location';
import { submitDeliveryPod } from './pod';

export const rxexApi = {
  async login(email: string, password: string) {
    return loginRequest(email, password);
  },
  async me() { return fetchMe(); },
  async logout() { await logoutRequest(); },
  async profile() { return fetchDriverProfile(); },
  async setStatus(status: 'on_duty' | 'offline' | 'on_break') {
    return updateDriverStatus(status);
  },
  async deliveries() { return fetchDeliveries(); },
  async history() { return fetchHistory(); },
  async scanQr(qrCode: string) { return scanPackageQr(qrCode); },
  async location(payload: { latitude: number; longitude: number; speed?: number | null; heading?: number | null; accuracy?: number | null }) {
    return sendDriverLocation(payload);
  },
  async updateDeliveryStatus(id: number, status: string) {
    return updateDeliveryStatusRequest(id, status);
  },
  async submitPod(id: number, payload: {
    photoHomeBase64: string;
    photoAddressBase64: string;
    photoPackageBase64: string;
    signatureBase64?: string;
    recipientName?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return submitDeliveryPod(id, payload);
  },
  async collectCopay(id: number) {
    return collectCopayRequest(id);
  },
  async logAttempt(id: number, payload: { status: 'failed' | 'delivered'; driverName?: string; failureReason?: string; notes?: string }) {
    return logAttemptRequest(id, payload);
  },
};