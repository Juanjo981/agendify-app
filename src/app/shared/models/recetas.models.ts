/**
 * Contratos TypeScript del módulo de recetas médicas.
 * Alineados a los DTO Jackson SNAKE_CASE del backend (RecetaController).
 *
 * No confundir con:
 * - plantilla-recetas.models.ts → apariencia del profesional
 * - receta-contenido.models.ts → preview UI local (sin persistencia)
 */

import { PlantillaRecetasConfigDto } from './plantilla-recetas.models';
import { PageRequest } from './page.model';

// ── Estados ──────────────────────────────────────────────────────────────────

export const RECETA_ESTADOS = ['BORRADOR', 'EMITIDA', 'ANULADA', 'ELIMINADA'] as const;
export type RecetaEstado = (typeof RECETA_ESTADOS)[number];

export type RecetaPdfDisposition = 'inline' | 'attachment';

/** Modos explícitos del panel de receta (evitar booleanos isEdit/isView). */
export type RecetaModalModo =
  | 'CREAR'
  | 'EDITAR_BORRADOR'
  | 'VER_EMITIDA'
  | 'EDITAR_EMITIDA'
  | 'CREAR_COPIA'
  | 'VER_ANULADA';

/** Longitud máxima de nombre (backend CopiarRecetaRequestDto / CrearRecetaRequestDto). */
export const RECETA_NOMBRE_MAX_LENGTH = 255;

export function modoDesdeEstado(
  estado: RecetaEstado,
  preferEdit = false,
): RecetaModalModo {
  if (estado === 'BORRADOR') return 'EDITAR_BORRADOR';
  if (estado === 'ANULADA') return 'VER_ANULADA';
  if (estado === 'EMITIDA') return preferEdit ? 'EDITAR_EMITIDA' : 'VER_EMITIDA';
  return 'VER_EMITIDA';
}

// ── Medicamentos ─────────────────────────────────────────────────────────────

export interface RecetaMedicamentoRequest {
  id_receta_medicamento?: number | null;
  nombre: string;
  dosis?: string | null;
  frecuencia?: string | null;
  duracion?: string | null;
  indicaciones_adicionales?: string | null;
  orden?: number | null;
}

export interface RecetaMedicamentoDto {
  id_receta_medicamento: number;
  orden: number;
  nombre: string;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  indicaciones_adicionales: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ── Requests ─────────────────────────────────────────────────────────────────

/** POST /api/recetas — crea BORRADOR. No enviar estado, versión, id_profesional ni PDF. */
export interface CrearRecetaRequest {
  id_paciente: number;
  id_plantilla_receta?: number | null;
  nombre: string;
  fecha_emision: string; // YYYY-MM-DD
  paciente_nombre?: string | null;
  paciente_fecha_nacimiento_snapshot?: string | null; // YYYY-MM-DD
  edad_texto?: string | null;
  diagnostico?: string | null;
  indicaciones?: string | null;
  proxima_cita_fecha?: string | null; // YYYY-MM-DD
  proxima_cita_hora?: string | null; // HH:mm[:ss]
  notas_internas?: string | null;
  configuracion_plantilla_snapshot?: PlantillaRecetasConfigDto | null;
  medicamentos?: RecetaMedicamentoRequest[];
}

/** PUT /api/recetas/{id} — solo BORRADOR */
export interface ActualizarRecetaRequest {
  nombre: string;
  id_plantilla_receta?: number | null;
  fecha_emision: string;
  paciente_nombre?: string | null;
  paciente_fecha_nacimiento_snapshot?: string | null;
  edad_texto?: string | null;
  diagnostico?: string | null;
  indicaciones?: string | null;
  proxima_cita_fecha?: string | null;
  proxima_cita_hora?: string | null;
  notas_internas?: string | null;
  configuracion_plantilla_snapshot?: PlantillaRecetasConfigDto | null;
  medicamentos?: RecetaMedicamentoRequest[];
}

/**
 * POST /api/recetas/{id}/versiones — CrearVersionRecetaRequestDto.
 * `numero_version_base` = version_actual del detalle cargado.
 * `lock_version` = lock técnico del detalle (puede ser 0).
 * No incrementar en frontend.
 */
export interface CrearVersionRecetaRequest {
  operation_id?: string;
  numero_version_base: number;
  lock_version: number;
  nombre: string;
  id_plantilla_receta?: number | null;
  fecha_emision: string;
  paciente_nombre?: string | null;
  paciente_fecha_nacimiento_snapshot?: string | null;
  edad_texto?: string | null;
  diagnostico?: string | null;
  indicaciones?: string | null;
  proxima_cita_fecha?: string | null;
  proxima_cita_hora?: string | null;
  notas_internas?: string | null;
  configuracion_plantilla_snapshot?: PlantillaRecetasConfigDto | null;
  medicamentos?: RecetaMedicamentoRequest[];
}

/** POST /api/recetas/{id}/copias */
export interface CopiarRecetaRequest {
  nombre: string;
  fecha_emision?: string | null;
  copiar_notas_internas?: boolean | null;
  id_plantilla_receta?: number | null;
  configuracion_plantilla_snapshot?: PlantillaRecetasConfigDto | null;
}

// ── Responses ────────────────────────────────────────────────────────────────

export interface RecetaDetalle {
  id_receta: number;
  id_profesional: number;
  id_paciente: number;
  id_plantilla_receta: number | null;
  id_receta_origen: number | null;
  nombre: string;
  fecha_emision: string;
  paciente_nombre: string;
  paciente_fecha_nacimiento_snapshot: string | null;
  edad_texto: string | null;
  diagnostico: string | null;
  indicaciones: string | null;
  proxima_cita_fecha: string | null;
  proxima_cita_hora: string | null;
  notas_internas: string | null;
  configuracion_plantilla_snapshot: PlantillaRecetasConfigDto | null;
  estado: RecetaEstado;
  /** Número clínico vigente (p. ej. 1). Fuente de `numero_version_base` al versionar. */
  version_actual: number;
  /**
   * Versión técnica de concurrencia (puede ser 0).
   * Obligatorio al crear nueva versión: enviar sin modificar.
   */
  lock_version: number;
  tiene_pdf: boolean;
  nombre_archivo: string | null;
  created_at: string | null;
  updated_at: string | null;
  emitida_at: string | null;
  ultima_emision_at: string | null;
  anulada_at: string | null;
  eliminada_at: string | null;
  medicamentos: RecetaMedicamentoDto[];
}

export interface RecetaResumen {
  id_receta: number;
  nombre: string;
  id_paciente: number;
  paciente_nombre: string;
  fecha_emision: string;
  diagnostico: string | null;
  estado: RecetaEstado;
  version_actual: number;
  tiene_pdf: boolean;
  cantidad_medicamentos: number;
  created_at: string | null;
  updated_at: string | null;
  id_receta_origen: number | null;
}

/** GET .../pdf-url — URL firmada temporal; no persistir. */
export interface RecetaPdfUrlResponse {
  url: string;
  expires_at: string;
  filename: string;
  content_type: string;
  disposition: RecetaPdfDisposition | string;
  version: number;
}

/**
 * Resumen de versión para historial en UI.
 * El backend actual NO expone GET /recetas/{id}/versiones;
 * sí permite GET .../versiones/{n}/pdf-url. El historial se deriva de version_actual.
 */
export type RecetaVersionTipoGuardado = 'CREACION' | 'ACTUALIZACION';

export interface RecetaVersionResumen {
  numero_version: number;
  tipo_guardado: RecetaVersionTipoGuardado;
  nombre_archivo: string | null;
  created_at: string | null;
  es_actual: boolean;
}

/**
 * Construye filas de historial 1..versionActual (desc).
 * Sin metadatos de listado: tipo se infiere (v1=Creación); fecha/archivo solo si se aportan para la actual.
 */
export function buildRecetaVersionHistorial(input: {
  versionActual: number;
  nombreArchivoActual?: string | null;
  fechaActual?: string | null;
}): RecetaVersionResumen[] {
  const max = Math.max(0, Math.floor(input.versionActual || 0));
  if (max < 1) return [];
  const rows: RecetaVersionResumen[] = [];
  for (let n = max; n >= 1; n--) {
    const esActual = n === max;
    rows.push({
      numero_version: n,
      tipo_guardado: n === 1 ? 'CREACION' : 'ACTUALIZACION',
      nombre_archivo: esActual ? input.nombreArchivoActual ?? null : null,
      created_at: esActual ? input.fechaActual ?? null : null,
      es_actual: esActual,
    });
  }
  return rows;
}

// ── Listado ──────────────────────────────────────────────────────────────────

export interface ListarRecetasPacienteParams extends PageRequest {
  /** Filtro opcional: BORRADOR | EMITIDA | ANULADA (ELIMINADA no se lista). */
  estado?: RecetaEstado;
}

// ── Formulario (capa UI, sin estado de modal ni Files) ────────────────────────

export interface RecetaMedicamentoFormItem {
  id_receta_medicamento?: number | null;
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones_adicionales: string;
  orden: number;
}

/**
 * Campos clínicos editables del formulario de receta.
 * No incluye tab activa, File, preview URLs ni flags de UI.
 */
export interface RecetaFormModel {
  nombre: string;
  id_plantilla_receta: number | null;
  fecha_emision: string;
  paciente_nombre: string;
  paciente_fecha_nacimiento_snapshot: string | null;
  edad_texto: string | null;
  diagnostico: string;
  indicaciones: string;
  proxima_cita_fecha: string | null;
  proxima_cita_hora: string | null;
  notas_internas: string;
  medicamentos: RecetaMedicamentoFormItem[];
  configuracion_plantilla_snapshot: PlantillaRecetasConfigDto | null;
}

export function createEmptyRecetaFormModel(): RecetaFormModel {
  return {
    nombre: '',
    id_plantilla_receta: null,
    fecha_emision: '',
    paciente_nombre: '',
    paciente_fecha_nacimiento_snapshot: null,
    edad_texto: null,
    diagnostico: '',
    indicaciones: '',
    proxima_cita_fecha: null,
    proxima_cita_hora: null,
    notas_internas: '',
    medicamentos: [
      {
        nombre: '',
        dosis: '',
        frecuencia: '',
        duracion: '',
        indicaciones_adicionales: '',
        orden: 1,
      },
    ],
    configuracion_plantilla_snapshot: null,
  };
}

// ── Estado de UI del módulo (local; no NgRx) ──────────────────────────────────

export interface RecetasUiState {
  loading: boolean;
  error: string | null;
  /** Guardar/crear borrador (sin PDF). */
  guardando: boolean;
  /** POST /versiones — generando PDF de nueva versión. */
  creandoVersion: boolean;
  /** POST /copias. */
  creandoCopia: boolean;
  emitiendo: boolean;
  generandoUrl: boolean;
  anulando: boolean;
}

export function createInitialRecetasUiState(): RecetasUiState {
  return {
    loading: false,
    error: null,
    guardando: false,
    creandoVersion: false,
    creandoCopia: false,
    emitiendo: false,
    generandoUrl: false,
    anulando: false,
  };
}
