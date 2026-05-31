import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─── Axios instance ────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor: inject JWT ──────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error reading token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 ─────────────────────────────────────────
let _logoutCallback = null;
export const setLogoutCallback = (cb) => { _logoutCallback = cb; };

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      if (_logoutCallback) _logoutCallback();
    }
    return Promise.reject(error);
  }
);

// ─── Helper: extract error message ────────────────────────────────────────────
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail)  return error.response.data.detail;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data) {
    const firstKey = Object.keys(error.response.data)[0];
    if (firstKey) {
      const val = error.response.data[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  }
  if (error.message) return error.message;
  return 'Something went wrong. Please try again.';
};

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login:           (credentials) => apiClient.post('/auth/login/', credentials),
  register:        (data)        => apiClient.post('/auth/register/', data),
  logout:          ()            => apiClient.post('/auth/logout/'),
  getProfile:      ()            => apiClient.get('/auth/profile/'),
  updateProfile:   (data)        => apiClient.patch('/auth/profile/', data),
  changePassword:  (data)        => apiClient.post('/auth/change-password/', data),
  refreshToken:    (refresh)     => apiClient.post('/auth/token/refresh/', { refresh }),
};

// ─── Cases API ────────────────────────────────────────────────────────────────
export const casesAPI = {
  getCases:      (params)     => apiClient.get('/cases/', { params }),
  getCase:       (id)         => apiClient.get(`/cases/${id}/`),
  createCase:    (data)       => apiClient.post('/cases/', data),
  updateCase:    (id, data)   => apiClient.patch(`/cases/${id}/`, data),
  deleteCase:    (id)         => apiClient.delete(`/cases/${id}/`),
  // Vital signs — sends full JSONField dict { systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature, spo2 }
  addVitalSigns: (id, data)   => apiClient.post(`/cases/${id}/vital-signs/`, data),
  // Triage note — sends { note: string }
  addNote:       (id, data)   => apiClient.post(`/cases/${id}/notes/`, data),
};

// ─── Referrals API ────────────────────────────────────────────────────────────
export const referralsAPI = {
  getReferrals:    (params)        => apiClient.get('/referrals/', { params }),
  getReferral:     (id)            => apiClient.get(`/referrals/${id}/`),
  createReferral:  (data)          => apiClient.post('/referrals/create/', data),
  // AI engine — returns { recommended_facility, alternatives, engine_version }
  suggest:         (caseId)        => apiClient.post('/referrals/suggest/', { emergency_case_id: caseId }),
  updateReferral:  (id, data)      => apiClient.patch(`/referrals/${id}/`, data),
  updateStatus:    (id, status, note) =>
    apiClient.patch(`/referrals/${id}/status/`, { status, ...(note && { note }) }),
  acceptReferral:  (id)            => apiClient.post(`/referrals/${id}/accept/`),
  rejectReferral:  (id, data)      => apiClient.post(`/referrals/${id}/reject/`, data),
  completeReferral:(id)            => apiClient.post(`/referrals/${id}/complete/`),
};

// ─── Consultations API ────────────────────────────────────────────────────────
export const consultationsAPI = {
  getConsultations:   (params)    => apiClient.get('/consultations/', { params }),
  getConsultation:    (id)        => apiClient.get(`/consultations/${id}/`),
  createConsultation: (data)      => apiClient.post('/consultations/', data),
  updateConsultation: (id, data)  => apiClient.patch(`/consultations/${id}/`, data),
  addNote:            (id, data)  => apiClient.post(`/consultations/${id}/notes/`, data),
};

// ─── Facilities API ───────────────────────────────────────────────────────────
export const facilitiesAPI = {
  getFacilities:    (params)    => apiClient.get('/facilities/', { params }),
  getFacility:      (id)        => apiClient.get(`/facilities/${id}/`),
  createFacility:   (data)      => apiClient.post('/facilities/', data),
  updateFacility:   (id, data)  => apiClient.patch(`/facilities/${id}/`, data),
  deleteFacility:   (id)        => apiClient.delete(`/facilities/${id}/`),
  getMyFacility:    ()          => apiClient.get('/facilities/my-facility/'),
  updateMyFacility: (data)      => apiClient.patch('/facilities/my-facility/', data),
};

// ─── Transport API ────────────────────────────────────────────────────────────
export const transportAPI = {
  // Transport requests
  getTransports:         (params)    => apiClient.get('/transport/', { params }),
  getTransport:          (id)        => apiClient.get(`/transport/${id}/`),
  updateTransportStatus: (id, data)  => apiClient.patch(`/transport/${id}/`, data),
  acceptTransport:       (id)        => apiClient.post(`/transport/${id}/accept/`),
  startTransport:        (id)        => apiClient.post(`/transport/${id}/start/`),
  completeTransport:     (id)        => apiClient.post(`/transport/${id}/complete/`),
  // Vehicles
  getAvailableVehicles:  ()          => apiClient.get('/transport/vehicles/', { params: { available: true } }),
  // Transport requests (for referral assignment)
  createTransportRequest:(data)      => apiClient.post('/transport/requests/', data),
};

// ─── Users API (superadmin) ───────────────────────────────────────────────────
export const usersAPI = {
  getUsers:        (params)    => apiClient.get('/users/', { params }),
  getUser:         (id)        => apiClient.get(`/users/${id}/`),
  createUser:      (data)      => apiClient.post('/users/', data),
  updateUser:      (id, data)  => apiClient.patch(`/users/${id}/`, data),
  deleteUser:      (id)        => apiClient.delete(`/users/${id}/`),
  toggleUserActive:(id)        => apiClient.post(`/users/${id}/toggle-active/`),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats:         () => apiClient.get('/dashboard/stats/'),
  getRecentActivity:() => apiClient.get('/dashboard/activity/'),
};

export default apiClient;
