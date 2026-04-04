/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PageResponse<T>
 * ─────────────────────────────────────────────────────────────────────────────
 *  Tipado que refleja el contrato real de Spring Data `Page<T>` con la
 *  convención Jackson SNAKE_CASE del backend.
 *
 *  Referencia: FRONTEND_API_REFERENCE.md § 2.2 Respuestas paginadas
 */

export interface SortInfo {
  sorted:   boolean;
  unsorted: boolean;
  empty:    boolean;
}

export interface PageableInfo {
  page_number: number;
  page_size:   number;
  sort:        SortInfo;
  offset:      number;
  paged:       boolean;
  unpaged:     boolean;
}

/**
 * Respuesta paginada estándar del backend Spring Data.
 *
 * Campos principales que la UI debería usar:
 *   - `content`        → datos de la página actual
 *   - `total_elements`  → total de registros (para mostrar "N resultados")
 *   - `total_pages`     → total de páginas
 *   - `number`          → página actual (0-indexed)
 *   - `size`            → tamaño de página solicitado
 *   - `first` / `last`  → para habilitar/deshabilitar botones de nav
 *   - `empty`           → true si no hay contenido
 */
export interface PageResponse<T> {
  content:             T[];
  total_elements:      number;
  total_pages:         number;
  number:              number;
  size:                number;
  first:               boolean;
  last:                boolean;
  empty:               boolean;
  number_of_elements:  number;
  pageable?:           PageableInfo;
  sort?:               SortInfo;
}

/**
 * Parámetros estándar de paginación para enviar al backend.
 */
export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
}
