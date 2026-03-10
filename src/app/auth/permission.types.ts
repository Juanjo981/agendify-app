/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  permission.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  Enums and type aliases for the authorization layer.
 *  Import these across the app instead of using raw strings for permissions
 *  and module identifiers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Every discrete permission that can be toggled for a RECEPCIONISTA.
 * Values match the keys of PermisosRecepcionista so they can be used
 * interchangeably as index types.
 */
export enum Permiso {
  AGENDA         = 'agenda',
  CITAS          = 'citas',
  PACIENTES      = 'pacientes',
  NOTAS_CLINICAS = 'notasClinicas',
  CONFIGURACION  = 'configuracion',
}

/**
 * Every navigable module (tab / page) in Agendify.
 * Values match the route segments used in the Angular router so they can
 * be passed directly to canAccessModule() from nav templates.
 */
export enum Modulo {
  AGENDA             = 'agenda',
  CITAS              = 'citas',
  PACIENTES          = 'pacientes',
  SESIONES           = 'sesiones',
  ESTADISTICAS       = 'estadisticas',
  CONFIGURACION      = 'configuracion',
  PERFIL             = 'perfil',
  ACCESO_RESTRINGIDO = 'acceso-restringido',
}

/** Union of string literals that identify a module (for template ergonomics). */
export type ModuloId = `${Modulo}`;
