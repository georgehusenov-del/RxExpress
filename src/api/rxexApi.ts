import { loginRequest, fetchMe, fetchDriverProfile, logoutRequest } from './auth';
import {
  collectCopayRequest,
  driverActionRequest,
  fetchDeliveries,
  fetchDeliveryDetail,
  fetchDeliveryPackages,
  fetchHistory,
  fetchMyRoute,
  fetchOfficeLocations,
  globalScanCode,
  scanDeliveryCode,
  updateDeliveryStatusRequest,
} from './deliveries';
import { sendDriverLocation, updateDriverStatus } from './location';
import { submitDeliveryPod } from './pod';
import type { DriverActionPayload, ScanType } from '@/types/api';

export const rxexApi = {
  async login(email: string, password: string) { return loginRequest(email, password); },
  async me() { return fetchMe(); },
  async logout() { await logoutRequest(); },
  async profile() { return fetchDriverProfile(); },
  async setStatus(status: 'on_duty' | 'offline' | 'on_break') { return updateDriverStatus(status); },

  async deliveries() { return fetchDeliveries(); },
  async myRoute() { return fetchMyRoute(); },
  async history() { return fetchHistory(); },
  async deliveryDetail(id: number) { return fetchDeliveryDetail(id); },
  async officeLocations() { return fetchOfficeLocations(); },

  async location(payload: {
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    routePlanId?: number;
    orderId?: number;
    logType?: string;
  }) { return sendDriverLocation(payload); },

  async updateDeliveryStatus(id: number, status: string) { return updateDeliveryStatusRequest(id, status); },

  async submitPod(id: number, payload: {
    photoHomeBase64: string;
    photoAddressBase64: string;
    photoPackageBase64: string;
    signatureBase64?: string;
    recipientName?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) { return submitDeliveryPod(id, payload); },

  async collectCopay(id: number) { return collectCopayRequest(id); },

  // Replaces old logAttempt (admin endpoint). Uses driver action endpoint.
  async logAttempt(id: number, payload: { failureReason?: string; notes?: string; failedPhotoBase64?: string | null; latitude?: number; longitude?: number }) {
    return driverActionRequest(id, { action: 'failed', ...payload });
  },

  async driverAction(id: number, payload: DriverActionPayload) { return driverActionRequest(id, payload); },

  async getPackages(id: number) { return fetchDeliveryPackages(id); },

  async scanCode(id: number, payload: { scanType: ScanType; scannedCode: string; notes?: string; latitude?: number; longitude?: number }) {
    return scanDeliveryCode(id, payload);
  },

  async globalScan(payload: { scanType: ScanType; scannedCode: string; notes?: string; latitude?: number; longitude?: number }) {
    return globalScanCode(payload);
  },
};
