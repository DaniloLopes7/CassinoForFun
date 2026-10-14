import axios from 'axios';

export const TOKEN_KEY = 'dbet.token';

// Em producao (Vercel), VITE_API_URL aponta direto para o backend
// (ex: https://dbet-backend.onrender.com). Em dev local usa o proxy
// /api do vite (docker compose ou localhost).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export const api = axios.create({ baseURL: API_URL || '/api', timeout: 20000 });

/** URL base do socket (mesma origem em dev; backend remoto em producao) */
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.replace(/\/$/, '') || API_URL || '/';

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
