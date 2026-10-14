import { validarApiBase } from './validateEnv';
export const apiBaseUrl = validarApiBase(import.meta.env.PUBLIC_API_BASE_URL, import.meta.env.MODE);
const adminValue = import.meta.env.PUBLIC_ADMIN_API_BASE_URL ||
  (import.meta.env.MODE === 'development' ? import.meta.env.PUBLIC_API_BASE_URL : undefined);
export const adminApiBaseUrl = validarApiBase(adminValue, import.meta.env.MODE);
if (import.meta.env.MODE === 'production' && adminApiBaseUrl === apiBaseUrl) {
  throw new Error('La API administrativa debe usar un Worker distinto del público.');
}
