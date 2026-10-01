import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
