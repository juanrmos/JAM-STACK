import { apiBaseUrl, adminApiBaseUrl, adminApiUsesPagesProxy } from '../../config/env';

export function apiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}${endpoint}`, options);
}

export function adminApiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = adminApiUsesPagesProxy
    ? `/admin/api${endpoint.replace(/^\/api(?=\/|$)/, '')}`
    : `${adminApiBaseUrl}${endpoint}`;
  return fetch(url, options);
}

export async function apiJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest(endpoint, options);
  if (!response.ok) throw new Error(`API ${response.status}: ${endpoint}`);
  return response.json();
}
