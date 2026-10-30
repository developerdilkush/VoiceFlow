import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api/v1',
  withCredentials: true,
  timeout: 30000,
  headers: { 'X-Requested-With': 'voiceflow' },
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 401 && code !== 'INVALID_CREDENTIALS' && !error.config.url.includes('/auth/me')) onUnauthorized?.();
    return Promise.reject(error);
  }
);

/** Human-friendly message from any API/network error. */
export function errorMessage(e) {
  if (e.response?.data?.error?.message) return e.response.data.error.message;
  if (e.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!e.response) return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export const unwrap = (p) => p.then((r) => r.data);
