/**
 * Normaliza la base del API: sin barra final.
 * `environment.apiUrl` debe ser la raíz del API **incluyendo** el segmento `/api`
 * del backend (p. ej. `http://localhost:8080/api`). Los servicios concatenan
 * rutas con `${apiUrl}/citas`, **no** `${apiUrl}/api/citas`.
 */
export function normalizeApiBaseUrl(url: string): string {
  return String(url || '').replace(/\/+$/, '');
}
