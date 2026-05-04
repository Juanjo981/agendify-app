import { normalizeApiBaseUrl } from './api-url';

/** Ver `environment.ts`: misma convención de `apiUrl`. */
export const environment = {
  production: true,
  apiUrl: normalizeApiBaseUrl('https://api.agendify.com/api'),
};
