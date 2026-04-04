import { HttpParams } from '@angular/common/http';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  buildQueryParams
 * ─────────────────────────────────────────────────────────────────────────────
 *  Convierte un objeto de filtros en `HttpParams` de Angular, ignorando
 *  valores nulos, undefined y strings vacíos. Convierte `Date` a ISO string.
 *
 *  Uso:
 *    const params = buildQueryParams({ busqueda: 'Juan', activo: true, page: 0 });
 *    this.http.get('/api/pacientes', { params });
 */
export function buildQueryParams(filters: Record<string, unknown>): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (value instanceof Date) {
      params = params.set(key, value.toISOString());
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      params = params.set(key, String(value));
    } else if (typeof value === 'string') {
      params = params.set(key, value);
    }
  }

  return params;
}
