import { PermisosRecepcionista } from './permisos.model';

/**
 * Descriptor de un permiso individual para renderizar en el modal de edición.
 * El array de detalles vive en un catálogo compartido reutilizable por UI/API.
 */
export interface PermisoDetalle {
  /** Clave tipada del permiso, coincide con keyof PermisosRecepcionista */
  key: keyof PermisosRecepcionista;
  /** Etiqueta legible para mostrar al usuario */
  label: string;
  /** Descripción breve de qué permite hacer este acceso */
  descripcion: string;
  /** Nombre del icono de Ionicons a usar en la fila del modal */
  icono: string;
}

export interface RecepcionistaDto {
  id: number;
  id_usuario: number;
  id_profesional?: number | null;
  activo: boolean;
  fecha_vinculacion?: string | null;
  nombre: string;
  apellido: string;
  email: string;
  permisos?: PermisosRecepcionistaDto | Record<string, boolean> | null;
  permisos_activos_count?: number | null;
  permisosActivosCount?: number | null;
  permisos_resumen?: string | null;
  permisosResumen?: string | null;
}

export interface PermisosRecepcionistaDto {
  agenda?: boolean | null;
  citas?: boolean | null;
  pacientes?: boolean | null;
  notas_clinicas?: boolean | null;
  configuracion?: boolean | null;
  puede_crear_citas?: boolean | null;
  puede_ver_citas?: boolean | null;
  puede_editar_citas?: boolean | null;
  puede_cancelar_citas?: boolean | null;
  puede_ver_agenda?: boolean | null;
  puede_gestionar_agenda?: boolean | null;
  puede_ver_pacientes?: boolean | null;
  puede_crear_pacientes?: boolean | null;
  puede_editar_pacientes?: boolean | null;
  puede_ver_notas_clinicas?: boolean | null;
  puede_crear_notas_clinicas?: boolean | null;
  puede_editar_notas_clinicas?: boolean | null;
  puede_ver_configuracion?: boolean | null;
  puede_editar_configuracion?: boolean | null;
}

export interface CodigoVinculacionDto {
  codigo_vinculacion: string;
}

/**
 * View model listo para renderizar cada recepcionista en la vista Equipo.
 *
 * Este modelo desacopla la representación interna (UsuarioMock) de la vista,
 * concentrando todo el cálculo/formateo en el servicio para que el template
 * solo consuma propiedades ya preparadas.
 *
 * Cuando se integre un backend real, bastará con que el servicio construya
 * instancias de esta misma interfaz a partir de la respuesta HTTP.
 */
export interface RecepcionistaEquipoViewModel {
  /** Identificador único del recepcionista */
  id: number;

  /** Nombre de pila */
  nombre: string;

  /** Apellido */
  apellido: string;

  /** "Apellido, Nombre" — formato estándar para listas */
  nombreCompleto: string;

  /** Iniciales para el avatar circular, p. ej. "LM" */
  initials: string;

  /** Correo electrónico */
  email: string;

  /** Si el recepcionista tiene acceso activo al sistema */
  activo: boolean;

  /** Fecha de vinculación formateada para display ("10 mar 2026") */
  fechaVinculacion: string;

  /** Mapa completo de permisos (útil para futuras pantallas de edición) */
  permisos: PermisosRecepcionista;

  /** Cantidad de permisos con valor true */
  permisosActivosCount: number;

  /**
   * Resumen textual de los permisos activos.
   * Ejemplos:
   *   "Agenda, Citas, Pacientes"
   *   "Agenda, Citas +1 más"
   *   "Sin permisos"
   */
  permisosResumen: string;
}
