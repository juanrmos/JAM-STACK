import { apiRequest } from "../services/api/client";

const TOKEN_KEY = "admin_jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Header requerido por CORS de Cloudflare Access aunque estemos en bypass
  headers.set("Content-Type", "application/json");

  const response = await apiRequest(endpoint, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Si nos devuelve 401 (token expirado o inválido) estando logueados, limpiar y recargar
  if (response.status === 401 && getToken()) {
    removeToken();
    window.location.reload();
  }

  return response;
}
