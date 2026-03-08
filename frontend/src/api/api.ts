import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  getDailyRecap: (date?: string) => api.get(`/dashboard/daily-recap${date ? `/${date}` : ''}`),
  getStats: () => api.get('/dashboard/stats'),
};

export const projectsApi = {
  getAll: (status?: string) => api.get('/projects', { params: { status } }),
  getById: (id: number) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
};

export const tasksApi = {
  getAll: (filters?: any) => api.get('/tasks', { params: filters }),
  create: (data: any) => api.post('/tasks', data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
};

export const blockersApi = {
  getAll: (filters?: any) => api.get('/blockers', { params: filters }),
  create: (data: any) => api.post('/blockers', data),
  resolve: (id: number) => api.put(`/blockers/${id}/resolve`),
  delete: (id: number) => api.delete(`/blockers/${id}`),
};

export const activityApi = {
  getAll: (filters?: any) => api.get('/activity', { params: filters }),
  log: (data: any) => api.post('/activity', data),
};

export const waitingApi = {
  getAll: () => api.get('/waiting'),
  add: (data: any) => api.post('/waiting', data),
  complete: (id: number) => api.put(`/waiting/${id}/complete`),
};
