/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  permission.maps.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  Single source of truth for the relationship between:
 *    • modules     → required permission
 *    • route paths → module
 *    • route segments (router config) → module
 *
 *  Centralizing these maps means adding a new protected module only requires
 *  editing this file — guards, services, and templates pick it up automatically.
 *
 *  REAL PHASE:
 *    These maps can be generated from a backend manifest or ACL table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Modulo, Permiso } from './permission.types';

// ─── Module → Permission ──────────────────────────────────────────────────────

/**
 * Maps each Modulo to the Permiso required to access it.
 * Modules absent from this map are considered public (no restriction).
 */
export const MODULO_PERMISO: Readonly<Partial<Record<Modulo, Permiso>>> = {
  [Modulo.AGENDA]:        Permiso.AGENDA,
  [Modulo.CITAS]:         Permiso.CITAS,
  [Modulo.PACIENTES]:     Permiso.PACIENTES,
  [Modulo.SESIONES]:      Permiso.NOTAS_CLINICAS,
  [Modulo.ESTADISTICAS]:  Permiso.NOTAS_CLINICAS,
  [Modulo.CONFIGURACION]: Permiso.CONFIGURACION,
  // PERFIL and ACCESO_RESTRINGIDO intentionally omitted → public
};

// ─── Route Segment → Module ───────────────────────────────────────────────────

/**
 * Maps Angular router segments (as they appear in route config) to their Modulo.
 * Supports parameterized segments like 'citas/:id'.
 *
 * Used by permisosGuard which only sees the current route's `path` string.
 */
export const SEGMENTO_MODULO: Readonly<Partial<Record<string, Modulo>>> = {
  'agenda':        Modulo.AGENDA,
  'citas':         Modulo.CITAS,
  'citas/:id':     Modulo.CITAS,
  'pacientes':     Modulo.PACIENTES,
  'pacientes/:id': Modulo.PACIENTES,
  'sesiones':      Modulo.SESIONES,
  'sesiones/:id':  Modulo.SESIONES,
  'estadisticas':  Modulo.ESTADISTICAS,
  'configuracion': Modulo.CONFIGURACION,
};

// ─── Full Route Path → Module ─────────────────────────────────────────────────

/**
 * Maps full URL paths (as navigated) to their Modulo.
 * Used by AuthorizationService.canAccessRoute() for programmatic checks
 * from components or services that know full paths.
 */
export const RUTA_MODULO: Readonly<Partial<Record<string, Modulo>>> = {
  '/dashboard/agenda':        Modulo.AGENDA,
  '/dashboard/citas':         Modulo.CITAS,
  '/dashboard/pacientes':     Modulo.PACIENTES,
  '/dashboard/sesiones':      Modulo.SESIONES,
  '/dashboard/estadisticas':  Modulo.ESTADISTICAS,
  '/dashboard/configuracion': Modulo.CONFIGURACION,
};
