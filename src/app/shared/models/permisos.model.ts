/**
 * Permisos granulares que puede tener un RECEPCIONISTA dentro de Agendify.
 * Cada permiso es booleano: true = acceso permitido.
 */
export interface PermisosRecepcionista {
  agenda:        boolean;
  citas:         boolean;
  pacientes:     boolean;
  sesiones:      boolean;
  estadisticas:  boolean;
  configuracion: boolean;
}

/** Permisos que se asignan por defecto a un recepcionista nuevo */
export const PERMISOS_DEFAULT_RECEPCIONISTA: PermisosRecepcionista = {
  agenda:        true,
  citas:         true,
  pacientes:     true,
  sesiones:      false,
  estadisticas:  false,
  configuracion: false,
};

/** Etiqueta legible para cada permiso (útil en pantallas de administración) */
export const PERMISO_LABEL: Record<keyof PermisosRecepcionista, string> = {
  agenda:        'Agenda',
  citas:         'Citas',
  pacientes:     'Pacientes',
  sesiones:      'Sesiones',
  estadisticas:  'Estadísticas',
  configuracion: 'Configuración',
};
