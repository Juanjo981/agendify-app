/**
 * Normaliza la base del API: sin barra final.
 * `environment.apiUrl` debe ser la raíz del API **incluyendo** el segmento `/api`
 * del backend (p. ej. `http://localhost:8080/api`). Los servicios concatenan
 * rutas con `${apiUrl}/citas`, **no** `${apiUrl}/api/citas`.
 */
export function normalizeApiBaseUrl(url: string): string {
  return String(url || '').replace(/\/+$/, '');
}

/**
 * Deriva la base pública de la app (sin sufijo /api), usada por endpoints
 * públicos que no cuelgan del namespace autenticado.
 */
export function publicAppBaseUrl(apiUrl: string): string {
  return normalizeApiBaseUrl(apiUrl).replace(/\/api$/, '');
}
