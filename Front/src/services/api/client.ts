import { apiBaseUrl, adminApiBaseUrl } from '../../config/env';

export function apiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}${endpoint}`, options);
}

export function adminApiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(`${adminApiBaseUrl}${endpoint}`, options);
}

export async function apiJson<T>(endpoint: string): Promise<T> {
  const response = await apiRequest(endpoint);
  if (!response.ok) throw new Error(`API ${response.status}: ${endpoint}`);
  return response.json();
}
