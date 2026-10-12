import { validarApiBase } from './validateEnv';
export const apiBaseUrl = validarApiBase(import.meta.env.PUBLIC_API_BASE_URL, import.meta.env.MODE);
