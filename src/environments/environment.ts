// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { normalizeApiBaseUrl } from './api-url';

/**
 * apiUrl: raíz del API con prefijo `/api` del backend, sin barra final.
 * Ej.: `http://localhost:8080/api` → servicios: `${apiUrl}/citas` = `/api/citas`.
 */
export const environment = {
  production: false,
  apiUrl: normalizeApiBaseUrl('http://localhost:8080/api'),
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
