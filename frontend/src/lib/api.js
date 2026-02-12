import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Orders APIs
export const ordersAPI = {
  list: (params = {}) => api.get('/orders/', { params }),
  get: (orderId) => api.get(`/orders/${orderId}`),
  create: (orderData) => api.post('/orders/', orderData),
  assignDriver: (orderId, driverId) => api.put(`/orders/${orderId}/assign?driver_id=${driverId}`),
  updateStatus: (orderId, status, notes = '') => api.put(`/orders/${orderId}/status`, { order_id: orderId, status, notes }),
};

// Drivers APIs
export const driversAPI = {
  list: (status = null) => api.get('/drivers/', { params: status ? { status } : {} }),
  get: (driverId) => api.get(`/drivers/${driverId}`),
  updateLocation: (driverId, latitude, longitude) => api.put('/drivers/location', { driver_id: driverId, latitude, longitude }),
  updateStatus: (driverId, status) => api.put('/drivers/status', { driver_id: driverId, status }),
};

// Pharmacies APIs
export const pharmaciesAPI = {
  list: () => api.get('/pharmacies/'),
  get: (pharmacyId) => api.get(`/pharmacies/${pharmacyId}`),
  // Multi-location support
  getLocations: (pharmacyId) => api.get(`/pharmacies/${pharmacyId}/locations`),
  addLocation: (pharmacyId, locationData) => api.post(`/pharmacies/${pharmacyId}/locations`, locationData),
  updateLocation: (pharmacyId, locationId, locationData) => api.put(`/pharmacies/${pharmacyId}/locations/${locationId}`, locationData),
  deleteLocation: (pharmacyId, locationId) => api.delete(`/pharmacies/${pharmacyId}/locations/${locationId}`),
};

// Tracking APIs
export const trackingAPI = {
  getOrder: (orderId) => api.get(`/tracking/order/${orderId}`),
  getDriverHistory: (driverId, hours = 24) => api.get(`/tracking/driver/${driverId}/history`, { params: { hours } }),
};

// Maps APIs
export const mapsAPI = {
  geocode: (address) => api.post('/maps/geocode', { address }),
  distanceMatrix: (origins, destinations) => api.post('/maps/distance-matrix', { origins, destinations }),
  optimizeRoute: (driverId, waypoints) => api.post('/maps/optimize-route', { driver_id: driverId, waypoints }),
  estimateDelivery: (orderId) => api.get(`/maps/estimate/${orderId}`),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  activateUser: (userId) => api.put(`/admin/users/${userId}/activate`),
  deactivateUser: (userId) => api.put(`/admin/users/${userId}/deactivate`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getPharmacies: (params = {}) => api.get('/admin/pharmacies', { params }),
  verifyPharmacy: (pharmacyId) => api.put(`/admin/pharmacies/${pharmacyId}/verify`),
  // Driver management
  getDrivers: (params = {}) => api.get('/admin/drivers', { params }),
  createDriver: (driverData) => api.post('/admin/drivers', null, { params: driverData }),
  updateDriver: (driverId, driverData) => api.put(`/admin/drivers/${driverId}`, null, { params: driverData }),
  verifyDriver: (driverId) => api.put(`/admin/drivers/${driverId}/verify`),
  updateDriverStatus: (driverId, status) => api.put(`/admin/drivers/${driverId}/status?status=${status}`),
  activateDriver: (driverId) => api.put(`/admin/drivers/${driverId}/activate`),
  deactivateDriver: (driverId) => api.put(`/admin/drivers/${driverId}/deactivate`),
  deleteDriver: (driverId) => api.delete(`/admin/drivers/${driverId}`),
  // Orders
  getOrders: (params = {}) => api.get('/admin/orders', { params }),
  cancelOrder: (orderId, reason = 'Cancelled by admin') => api.put(`/admin/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`),
  updateOrderStatus: (orderId, status, notes = null) => api.put(`/admin/orders/${orderId}/status?status=${status}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
  getDailyReport: (date = null) => api.get('/admin/reports/daily', { params: date ? { date } : {} }),
  // Scan tracking APIs
  getScans: (params = {}) => api.get('/admin/scans', { params }),
  getScanStats: () => api.get('/admin/scans/stats'),
  getPackages: (params = {}) => api.get('/admin/packages', { params }),
  verifyPackage: (qrCode) => api.post(`/admin/packages/verify/${qrCode}`),
  // POD APIs
  getPods: (params = {}) => api.get('/admin/pod', { params }),
  getPod: (podId) => api.get(`/admin/pod/${podId}`),
  getOrderPod: (orderId) => api.get(`/admin/orders/${orderId}/pod`),
  // Pricing APIs
  getPricing: (includeInactive = false) => api.get('/admin/pricing', { params: { include_inactive: includeInactive } }),
  getPricingById: (pricingId) => api.get(`/admin/pricing/${pricingId}`),
  createPricing: (pricingData) => api.post('/admin/pricing', pricingData),
  updatePricing: (pricingId, pricingData) => api.put(`/admin/pricing/${pricingId}`, pricingData),
  deletePricing: (pricingId) => api.delete(`/admin/pricing/${pricingId}`),
  togglePricing: (pricingId) => api.put(`/admin/pricing/${pricingId}/toggle`),
};

// QR Scanning APIs
export const scanAPI = {
  scanPackage: (qrCode, scannedBy, action, location = null) => api.post('/orders/scan', {
    qr_code: qrCode,
    scanned_by: scannedBy,
    scanned_at: new Date().toISOString(),
    action: action,
    location: location
  }),
};

// Driver Portal APIs
export const driverPortalAPI = {
  getProfile: () => api.get('/driver-portal/profile'),
  getDeliveries: (status = null) => api.get('/driver-portal/deliveries', { params: status ? { status } : {} }),
  getDeliveryDetails: (orderId) => api.get(`/driver-portal/deliveries/${orderId}`),
  updateDeliveryStatus: (orderId, status, notes = null) => api.put(`/driver-portal/deliveries/${orderId}/status?status=${status}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
  scanPackage: (orderId, qrCode, action, latitude = null, longitude = null) => api.post(`/driver-portal/deliveries/${orderId}/scan?qr_code=${qrCode}&action=${action}${latitude ? `&latitude=${latitude}&longitude=${longitude}` : ''}`),
  updateLocation: (latitude, longitude) => api.put(`/driver-portal/location?latitude=${latitude}&longitude=${longitude}`),
  updateStatus: (status) => api.put(`/driver-portal/status?status=${status}`),
  // POD APIs
  submitPod: (orderId, podData) => api.post(`/driver-portal/deliveries/${orderId}/pod`, null, { params: podData }),
  getPod: (orderId) => api.get(`/driver-portal/deliveries/${orderId}/pod`),
};

// Service Zones APIs
export const zonesAPI = {
  list: () => api.get('/zones/'),
  get: (zoneId) => api.get(`/zones/${zoneId}`),
  create: (zoneData) => api.post('/zones/', zoneData),
  update: (zoneId, zoneData) => api.put(`/zones/${zoneId}`, zoneData),
  delete: (zoneId) => api.delete(`/zones/${zoneId}`),
  checkAvailability: (zipCode) => api.get(`/zones/check/${zipCode}`),
};

// Public Tracking API (no auth required)
export const publicTrackingAPI = {
  track: (trackingNumber) => api.get(`/track/${trackingNumber}`),
};

export default api;
