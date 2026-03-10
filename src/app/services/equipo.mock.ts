import { Injectable } from '@angular/core';
import { VinculacionMockService } from './vinculacion.mock';
import { UsuarioMock } from '../shared/models/usuario.model';
import { PermisosRecepcionista, PERMISO_LABEL } from '../shared/models/permisos.model';
import { PermisoDetalle, RecepcionistaEquipoViewModel } from '../shared/models/equipo.model';

/**
 * Definición completa de cada permiso para el modal de edición.
 * El orden del array determina el orden visual en la lista del modal.
 */
export const PERMISOS_DETALLES: PermisoDetalle[] = [
  {
    key:         'agenda',
    label:       'Agenda',
    descripcion: 'Puede ver y gestionar la agenda del consultorio',
    icono:       'calendar-outline',
  },
  {
    key:         'citas',
    label:       'Citas',
    descripcion: 'Puede crear, editar y cancelar citas',
    icono:       'medical-outline',
  },
  {
    key:         'pacientes',
    label:       'Pacientes',
    descripcion: 'Puede registrar y editar fichas de pacientes',
    icono:       'people-outline',
  },
  {
    key:         'notasClinicas',
    label:       'Notas clínicas',
    descripcion: 'Puede ver y gestionar las notas de sesión',
    icono:       'document-text-outline',
  },
  {
    key:         'configuracion',
    label:       'Configuración',
    descripcion: 'Puede acceder a la configuración del sistema',
    icono:       'settings-outline',
  },
];

/**
 * Fecha mock fija que simula la fecha de vinculación de cada recepcionista.
 * En producción este dato vendrá del campo `createdAt` de la relación backend.
 */
const FECHA_VINCULACION_MOCK = '10 mar 2026';

/**
 * Permisos vacíos usados como fallback cuando un recepcionista no tiene
 * permisos asignados (no debería ocurrir con datos bien formados, pero
 * protege contra undefined en tiempo de ejecución).
 */
const PERMISOS_VACIOS: PermisosRecepcionista = {
  agenda: false,
  citas: false,
  pacientes: false,
  notasClinicas: false,
  configuracion: false,
};

/**
 * Servicio de datos mock para la vista Equipo de Configuración.
 *
 * Responsabilidades:
 * - Resolver el profesional "actualmente logueado" (mock fijo en esta fase).
 * - Exponer su código de vinculación.
 * - Devolver la lista de recepcionistas vinculados, ya enriquecidos con
 *   los campos calculados que necesita la UI.
 *
 * Cuando se integre la auth real, únicamente hay que reemplazar
 * `getProfesionalActual()` para que lea el usuario desde el servicio de sesión,
 * sin tocar el resto de la lógica.
 */
@Injectable({ providedIn: 'root' })
export class EquipoMockService {

  /**
   * Copia mutable en memoria de los recepcionistas.
   * Se inicializa en la primera lectura y persiste mientras la sesión esté viva.
   * En producción, este estado vivirá en un store (NgRx / signals) o se
   * refrescará tras cada mutación con una llamada HTTP PATCH.
   */
  private mutableRecepcionistas: Map<number, UsuarioMock> | null = null;

  constructor(private vinculacionSvc: VinculacionMockService) {}

  // ─── Estado mutable (lazy init) ─────────────────────────────────────────────

  private getMutableMap(): Map<number, UsuarioMock> {
    if (!this.mutableRecepcionistas) {
      this.mutableRecepcionistas = new Map(
        this.vinculacionSvc
          .getRecepcionistas()
          .map(r => [r.id, { ...r, permisos: { ...r.permisos! } }])
      );
    }
    return this.mutableRecepcionistas;
  }

  // ─── Mutaciones mock ─────────────────────────────────────────────────────────

  /**
   * Persiste (en memoria) el nuevo mapa de permisos para un recepcionista.
   *
   * @param id      - id del recepcionista a actualizar
   * @param permisos - objeto completo de permisos nuevos (se clona internamente)
   *
   * FASE REAL: reemplazar el cuerpo por:
   *   return this.http.patch(`/api/recepcionistas/${id}/permisos`, { permisos });
   */
  updateRecepcionistaPermisos(id: number, permisos: PermisosRecepcionista): void {
    const r = this.getMutableMap().get(id);
    if (r) r.permisos = { ...permisos };
  }

  /**
   * Establece explícitamente el estado activo/inactivo de un recepcionista.
   * Usar `!r.activo` desde el componente para toggle visual.
   *
   * @param id     - id del recepcionista
   * @param activo - nuevo valor deseado
   *
   * FASE REAL: reemplazar el cuerpo por:
   *   return this.http.patch(`/api/recepcionistas/${id}`, { activo });
   */
  setRecepcionistaActivo(id: number, activo: boolean): void {
    const r = this.getMutableMap().get(id);
    if (r) r.activo = activo;
  }

  // ─── Profesional actual ──────────────────────────────────────────────────────

  /**
   * Devuelve el profesional "actualmente logueado".
   *
   * FASE MOCK: se resuelve como el primer profesional del catálogo.
   * FASE REAL: sustituir por `this.authSvc.getCurrentUser()` o similar.
   */
  getProfesionalActual(): UsuarioMock {
    return this.vinculacionSvc.getProfesionales()[0];
  }

  /**
   * Devuelve el código de vinculación del profesional actual.
   * Retorna cadena vacía si el profesional aún no tiene código asignado.
   */
  getCodigoVinculacion(): string {
    return this.getProfesionalActual().codigoVinculacion ?? '';
  }

  // ─── Recepcionistas ──────────────────────────────────────────────────────────

  /**
   * Devuelve los recepcionistas vinculados a un profesional concreto.
   * Es la función base: acepta el profesionalId de forma explícita.
   *
   * FASE REAL: reemplazar el cuerpo por:
   *   return this.http.get<RecepcionistaEquipoViewModel[]>(
   *     `/api/profesionales/${profesionalId}/recepcionistas`
   *   );
   */
  getRecepcionistasByProfesionalId(profesionalId: number): RecepcionistaEquipoViewModel[] {
    return Array.from(this.getMutableMap().values())
      .filter(r => r.profesionalId === profesionalId)
      .map(r => this.toViewModel(r));
  }

  /**
   * Atajo que resuelve el profesional actual y delega en
   * `getRecepcionistasByProfesionalId`. Usar este método desde la vista
   * Equipo mientras no haya auth real.
   */
  getRecepcionistasDelProfesional(): RecepcionistaEquipoViewModel[] {
    return this.getRecepcionistasByProfesionalId(this.getProfesionalActual().id);
  }

  // ─── Privado: construcción del view model ────────────────────────────────────

  private toViewModel(r: UsuarioMock): RecepcionistaEquipoViewModel {
    const permisos = r.permisos ?? { ...PERMISOS_VACIOS };

    return {
      id:                  r.id,
      nombre:              r.nombre,
      apellido:            r.apellido,
      nombreCompleto:      `${r.apellido}, ${r.nombre}`,
      initials:            `${r.nombre.charAt(0)}${r.apellido.charAt(0)}`.toUpperCase(),
      email:               r.email,
      activo:              r.activo,
      fechaVinculacion:    FECHA_VINCULACION_MOCK,
      permisos,
      permisosActivosCount: this.contarPermisosActivos(permisos),
      permisosResumen:      this.construirResumenPermisos(permisos),
    };
  }

  private contarPermisosActivos(permisos: PermisosRecepcionista): number {
    return Object.values(permisos).filter(Boolean).length;
  }

  private construirResumenPermisos(permisos: PermisosRecepcionista): string {
    const activos = (Object.keys(permisos) as Array<keyof PermisosRecepcionista>)
      .filter(k => permisos[k])
      .map(k => PERMISO_LABEL[k]);

    if (activos.length === 0) return 'Sin permisos';
    if (activos.length <= 3) return activos.join(', ');
    return `${activos.slice(0, 2).join(', ')} +${activos.length - 2} más`;
  }
}
