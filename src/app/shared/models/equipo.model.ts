import { PermisosRecepcionista } from './permisos.model';

/**
 * Descriptor de un permiso individual para renderizar en el modal de edición.
 * El array de detalles vive en EquipoMockService y se exporta como constante.
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
