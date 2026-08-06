import api from './api';

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

// ─── Agent Management ──────────────────────────────────────────
export const createAgent = (data) => api.post('/auth/agents', data);
export const getAgents = () => api.get('/auth/agents');
export const updateAgent = (id, data) => api.put(`/auth/agents/${id}`, data);
export const deleteAgent = (id) => api.delete(`/auth/agents/${id}`);