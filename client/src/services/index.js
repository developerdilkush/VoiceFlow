import { api, unwrap } from './api.js';

const idem = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } });

export const authApi = {
  login: (b) => unwrap(api.post('/auth/login', b)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  changePassword: (b) => unwrap(api.post('/auth/change-password', b)),
  revokeSessions: () => unwrap(api.post('/auth/revoke-sessions')),
  activity: () => unwrap(api.get('/auth/activity')),
};
export const dashboardApi = {
  stats: (params) => unwrap(api.get('/dashboard/stats', { params })),
  recent: () => unwrap(api.get('/dashboard/recent-calls')),
};
export const callsApi = {
  create: (b, key) => unwrap(api.post('/calls', b, { headers: { 'Idempotency-Key': key || crypto.randomUUID() } })),
  list: (params) => unwrap(api.get('/calls', { params })),
  get: (id) => unwrap(api.get(`/calls/${id}`)),
  cancel: (id) => unwrap(api.post(`/calls/${id}/cancel`)),
  exportUrl: (params) => api.getUri({ url: '/calls/export', params }),
};
export const bulkApi = {
  importFile: (file, mapping) => {
    const fd = new FormData();
    fd.append('file', file);
    if (mapping) fd.append('mapping', JSON.stringify(mapping));
    return unwrap(api.post('/bulk/import', fd));
  },
  importRows: (rows) => unwrap(api.post('/bulk/import', { rows })),
  createJob: (b, key) => unwrap(api.post('/bulk/jobs', b, { headers: { 'Idempotency-Key': key || crypto.randomUUID() } })),
  listJobs: (params) => unwrap(api.get('/bulk/jobs', { params })),
  getJob: (id) => unwrap(api.get(`/bulk/jobs/${id}`)),
  action: (id, a) => unwrap(api.post(`/bulk/jobs/${id}/${a}`)),
  exportUrl: (id) => api.getUri({ url: `/bulk/jobs/${id}/export` }),
};
export const contactsApi = {
  list: (params) => unwrap(api.get('/contacts', { params })),
  create: (b) => unwrap(api.post('/contacts', b)),
  update: (id, b) => unwrap(api.patch(`/contacts/${id}`, b)),
  remove: (id) => unwrap(api.delete(`/contacts/${id}`)),
  optOut: (id) => unwrap(api.post(`/contacts/${id}/opt-out`)),
  importFile: (file) => { const fd = new FormData(); fd.append('file', file); return unwrap(api.post('/contacts/import', fd)); },
  exportUrl: () => api.getUri({ url: '/contacts/export' }),
};
export const voicesApi = {
  list: () => unwrap(api.get('/voices')),
  upload: (file, name) => { const fd = new FormData(); fd.append('file', file); if (name) fd.append('name', name); return unwrap(api.post('/voices/upload', fd)); },
  rename: (id, name) => unwrap(api.patch(`/voices/${id}`, { name })),
  remove: (id) => unwrap(api.delete(`/voices/${id}`)),
  audioUrl: (id) => api.getUri({ url: `/voices/${id}/audio` }),
};
export const reportsApi = {
  calls: (params) => unwrap(api.get('/reports/calls', { params })),
  usage: (params) => unwrap(api.get('/reports/usage', { params })),
  csvUrl: (params) => api.getUri({ url: '/reports/calls', params: { ...params, format: 'csv' } }),
};
export const suppressionApi = {
  list: (params) => unwrap(api.get('/suppression', { params })),
  create: (b) => unwrap(api.post('/suppression', b)),
  remove: (id) => unwrap(api.delete(`/suppression/${id}`)),
};
export const settingsApi = {
  get: () => unwrap(api.get('/settings')),
  update: (b) => unwrap(api.put('/settings', b)),
  updateProfile: (b) => unwrap(api.patch('/settings/profile', b)),
  provider: () => unwrap(api.get('/settings/provider')),
};
export { idem };
