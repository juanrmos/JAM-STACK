import { validarApiBase } from './validateEnv';
export const apiBaseUrl = validarApiBase(import.meta.env.PUBLIC_API_BASE_URL, import.meta.env.MODE);
export const adminApiUsesPagesProxy = import.meta.env.MODE === 'production';
const adminValue = import.meta.env.PUBLIC_ADMIN_API_BASE_URL || import.meta.env.PUBLIC_API_BASE_URL;
export const adminApiBaseUrl = adminApiUsesPagesProxy ? '' : validarApiBase(adminValue, import.meta.env.MODE);
if (!adminApiUsesPagesProxy && import.meta.env.MODE === 'production' && adminApiBaseUrl === apiBaseUrl) {
  throw new Error('La API administrativa debe usar un Worker distinto del público.');
}
