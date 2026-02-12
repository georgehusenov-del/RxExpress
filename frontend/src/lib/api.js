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

// Circuit/Spoke Route Management APIs
// Helper to extract plan ID from full path (e.g., "plans/abc123" -> "abc123")
const extractPlanId = (planId) => planId?.replace(/^plans\//, '') || planId;

export const circuitAPI = {
  // Status and info
  getStatus: () => api.get('/circuit/status'),
  getDrivers: () => api.get('/circuit/drivers'),
  getDepots: () => api.get('/circuit/depots'),
  
  // Plans
  listPlans: (startsGte) => api.get('/circuit/plans', { params: startsGte ? { starts_gte: startsGte } : {} }),
  createPlan: () => api.post('/circuit/plans'),
  createPlanForDate: (data) => api.post('/circuit/plans/create-for-date', data),
  getPlan: (planId) => api.get(`/circuit/plans/${extractPlanId(planId)}`),
  getPlanFullStatus: (planId) => api.get(`/circuit/plans/${extractPlanId(planId)}/full-status`),
  deletePlan: (planId) => api.delete(`/circuit/plans/${extractPlanId(planId)}`),
  
  // Stops
  listStops: (planId) => api.get(`/circuit/plans/${extractPlanId(planId)}/stops`),
  addOrderToPlan: (planId, orderId) => api.post(`/circuit/plans/${extractPlanId(planId)}/stops`, null, { params: { order_id: orderId } }),
  batchImportOrders: (planId, orderIds) => api.post(`/circuit/plans/${extractPlanId(planId)}/batch-import`, { order_ids: orderIds }),
  
  // Optimization & Distribution
  optimizePlan: (planId) => api.post(`/circuit/plans/${extractPlanId(planId)}/optimize`),
  distributePlan: (planId) => api.post(`/circuit/plans/${extractPlanId(planId)}/distribute`),
  optimizeAndDistribute: (planId) => api.post(`/circuit/plans/${extractPlanId(planId)}/optimize-and-distribute`),
  
  // Operations
  getOperation: (operationId) => api.get(`/circuit/operations/${operationId}`),
  
  // Local route plans
  listLocalPlans: (params) => api.get('/circuit/route-plans', { params }),
  getPendingOrders: (params) => api.get('/circuit/pending-orders', { params }),
  
  // Sync
  syncOrder: (orderId) => api.post(`/circuit/sync-order/${orderId}`),
  getDeliveryProof: (planId, stopId) => api.get(`/circuit/plans/${extractPlanId(planId)}/stops/${stopId}/proof`),
  getTracking: (planId, stopId) => api.get(`/circuit/plans/${extractPlanId(planId)}/stops/${stopId}/tracking`),
};

// Public APIs (no auth required)
export const publicAPI = {
  getActivePricing: () => api.get('/pricing/active'),
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
  reassignOrder: (orderId, timeWindow = null, driverId = null) => {
    const params = new URLSearchParams();
    if (timeWindow) params.append('time_window', timeWindow);
    if (driverId) params.append('driver_id', driverId);
    return api.put(`/admin/orders/${orderId}/reassign?${params.toString()}`);
  },
  optimizeRoutePreview: (orderIds = [], borough = null, timeWindow = null, depotAddress = null) => {
    const params = new URLSearchParams();
    if (borough) params.append('borough', borough);
    if (timeWindow) params.append('time_window', timeWindow);
    if (depotAddress) params.append('depot_address', depotAddress);
    return api.post(`/admin/orders/optimize-route?${params.toString()}`, { order_ids: orderIds });
  },
  // Driver tracking
  getDriverLocations: (activeOnly = true, borough = null) => {
    const params = new URLSearchParams();
    params.append('active_only', activeOnly);
    if (borough) params.append('borough', borough);
    return api.get(`/admin/drivers/locations?${params.toString()}`);
  },
  simulateDriverLocation: (driverId, lat, lng, heading = 0, speed = 0) => {
    return api.post(`/admin/drivers/${driverId}/simulate-location?latitude=${lat}&longitude=${lng}&heading=${heading}&speed=${speed}`);
  },
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
  submitPod: (orderId, podData) => api.post(`/driver-portal/deliveries/${orderId}/pod`, podData),
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
