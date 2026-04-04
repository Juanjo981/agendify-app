/**
 * Roles de usuario en Agendify.
 * Los valores numéricos coinciden con los id_rol del backend (GET /api/roles).
 */
export enum RolUsuario {
  ADMIN         = 1,
  PROFESIONAL   = 2,
  RECEPCIONISTA = 3,
}

/** Etiqueta legible por rol */
export const ROL_LABEL: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]:         'Administrador',
  [RolUsuario.PROFESIONAL]:   'Profesional',
  [RolUsuario.RECEPCIONISTA]: 'Recepcionista',
};
