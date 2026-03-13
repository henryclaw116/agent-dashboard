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

export const agentsApi = {
  getAll: () => api.get('/agents'),
  getById: (id: number) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: number, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: number) => api.delete(`/agents/${id}`),
  addGoal: (id: number, data: any) => api.post(`/agents/${id}/goals`, data),
  logActivity: (id: number, data: any) => api.post(`/agents/${id}/activity`, data),
  addAgenda: (id: number, data: any) => api.post(`/agents/${id}/agenda`, data),
  getCosts: (id: number, params?: any) => api.get(`/agents/${id}/costs`, { params }),
  logCost: (id: number, data: any) => api.post(`/agents/${id}/costs`, data),
};

export const consolesApi = {
  getAll: () => api.get('/consoles'),
  getById: (id: number) => api.get(`/consoles/${id}`),
  create: (data: any) => api.post('/consoles', data),
  update: (id: number, data: any) => api.put(`/consoles/${id}`, data),
  delete: (id: number) => api.delete(`/consoles/${id}`),
  heartbeat: (id: number, data: any) => api.post(`/consoles/${id}/heartbeat`, data),
};

export const workflowsApi = {
  getForAgent: (agentId: number) => api.get(`/workflows/agent/${agentId}`),
  getById: (id: number) => api.get(`/workflows/${id}`),
  create: (data: any) => api.post('/workflows', data),
  update: (id: number, data: any) => api.put(`/workflows/${id}`, data),
  delete: (id: number) => api.delete(`/workflows/${id}`),
  createStep: (workflowId: number, data: any) => api.post(`/workflows/${workflowId}/steps`, data),
  updateStep: (stepId: number, data: any) => api.put(`/workflows/steps/${stepId}`, data),
  deleteStep: (stepId: number) => api.delete(`/workflows/steps/${stepId}`),
  reorderSteps: (workflowId: number, stepOrders: Array<{ id: number; step_order: number }>) => 
    api.put(`/workflows/${workflowId}/steps/reorder`, { stepOrders }),
};

export const orchestrationApi = {
  restartAgent: (agentId: number) => api.post('/orchestration/agents/' + agentId + '/control', { action: 'restart' }),
};