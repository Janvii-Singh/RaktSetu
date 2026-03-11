import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Users
export const updateProfile = (data) => api.put('/users/profile', data);
export const getDonors = (params) => api.get('/users/donors', { params });

// Requests
export const createRequest = (data) => api.post('/requests', data);
export const getRequests = (params) => api.get('/requests', { params });
export const getRequestById = (id) => api.get(`/requests/${id}`);
export const updateRequest = (id, data) => api.put(`/requests/${id}`, data);
export const respondToRequest = (id, data) => api.post(`/requests/${id}/respond`, data);
export const fulfillRequest = (id, data) => api.put(`/requests/${id}/fulfill`, data);

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationsRead = (data) => api.put('/notifications/read', data);

export default api;
