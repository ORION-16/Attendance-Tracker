import axios from 'axios';

let accessToken = null;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

export function setAccessToken(token) {
  accessToken = token;
}

export function messageFrom(error) {
  return error.response?.data?.message || 'Could not complete that request. Please try again.';
}
