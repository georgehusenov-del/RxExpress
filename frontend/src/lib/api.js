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

export default api;
