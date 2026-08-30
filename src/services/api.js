import axios from 'axios';

// Get the base URL from environment variables, defaulting to the local server
const baseEnvURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  // Automatically appends /api if it isn't explicitly included in the environment variable string
  baseURL: baseEnvURL.endsWith('/api') ? baseEnvURL : `${baseEnvURL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor – attach auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('whatsapp_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – global error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
