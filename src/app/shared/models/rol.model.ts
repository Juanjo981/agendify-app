/**
 * Roles de usuario en Agendify.
 * Los valores numéricos coinciden con los idRol usados en el backend.
 */
export enum RolUsuario {
  PROFESIONAL   = 3,
  RECEPCIONISTA = 4,
}

/** Etiqueta legible por rol */
export const ROL_LABEL: Record<RolUsuario, string> = {
  [RolUsuario.PROFESIONAL]:   'Profesional',
  [RolUsuario.RECEPCIONISTA]: 'Recepcionista',
};
