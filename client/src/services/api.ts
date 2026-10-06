import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ||
        (error.code === 'ECONNABORTED'
          ? 'The request timed out. Please try again.'
          : 'Unable to reach PeakPickle. Check that the API is running.')
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
}

let csrfRequest: Promise<string> | null = null;
api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method || 'get')) {
    csrfRequest ||= api
      .get('/auth/csrf')
      .then((response) => response.data.csrfToken)
      .finally(() => {
        csrfRequest = null;
      });
    config.headers.set('X-CSRF-Token', await csrfRequest);
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !['/auth/login', '/auth/signup', '/auth/me'].includes(error.config?.url)
    )
      window.dispatchEvent(new Event('session-expired'));
    return Promise.reject(error);
  },
);
