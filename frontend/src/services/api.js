import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Auto-attach JWT token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('medibook_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('medibook_token');
            localStorage.removeItem('medibook_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ===== AUTH =====
export const authAPI = {
    registerPatient: (data) => api.post('/auth/register/patient', data),
    registerDoctor: (data) => api.post('/auth/register/doctor', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me')
};

// ===== DOCTORS =====
export const doctorsAPI = {
    getAll: () => api.get('/doctors'),
    search: (query) => api.get(`/doctors/search?query=${encodeURIComponent(query)}`),
    getById: (id) => api.get(`/doctors/${id}`),
    getSchedule: (id) => api.get(`/doctors/${id}/schedule`),
    getAvailableSlots: (id, date) => api.get(`/doctors/${id}/available-slots?date=${date}`),
    updateSchedule: (data) => api.post('/doctors/schedule', data),
    updateProfile: (data) => api.put('/doctors/profile', data)
};

// ===== APPOINTMENTS =====
export const appointmentsAPI = {
    book: (data) => api.post('/appointments', data),
    getMyAppointments: () => api.get('/appointments/my-appointments'),
    getDoctorAppointments: (date) => api.get(`/appointments/doctor/${date}`),
    getById: (id) => api.get(`/appointments/${id}`),
    cancel: (id, reason) => api.put(`/appointments/${id}/cancel`, { reason }),
    complete: (id, data) => api.put(`/appointments/${id}/complete`, data)
};

// ===== PATIENTS =====
export const patientsAPI = {
    getProfile: () => api.get('/patients/profile'),
    updateProfile: (data) => api.put('/patients/profile', data),
    getHistory: () => api.get('/patients/history')
};

export default api;
