/**
 * Contratos de GET /api/pacientes/{id}/resumen/indicadores
 * y GET /api/pacientes/{id}/resumen/actividad (snake_case del backend).
 */

export type ClasificacionGeneral =
  | 'EXCELENTE'
  | 'BUENO'
  | 'REGULAR'
  | 'REQUIERE_ATENCION'
  | 'SIN_DATOS';

export type ClasificacionCantidad =
  | 'NINGUNA'
  | 'MUY_BAJAS'
  | 'BAJAS'
  | 'MODERADAS'
  | 'ALTAS'
  | 'FRECUENTES'
  | 'SIN_DATOS';

export type ClasificacionFrecuencia =
  | 'CONSTANTE'
  | 'REGULAR'
  | 'ESPORADICA'
  | 'INACTIVA'
  | 'SIN_DATOS';

export interface IndicadorAsistenciaDto {
  porcentaje: number | null;
  clasificacion: string;
  citas_completadas: number;
  citas_no_asistidas: number;
  citas_computables: number;
}

export interface IndicadorCantidadDto {
  cantidad: number;
  porcentaje: number | null;
  clasificacion: string;
}

export interface IndicadorFrecuenciaDto {
  promedio_dias: number | null;
  clasificacion: string;
  citas_completadas_consideradas: number;
}

export interface ProximaCitaIndicadorDto {
  existe: boolean;
  id_cita?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado_cita?: string | null;
  motivo?: string | null;
}

export interface PacienteResumenIndicadoresDto {
  id_paciente: number;
  ventana_dias: number;
  fecha_desde: string;
  fecha_hasta: string;
  puntaje_general: number;
  clasificacion_general: string;
  asistencia: IndicadorAsistenciaDto;
  cancelaciones: IndicadorCantidadDto;
  reprogramaciones: IndicadorCantidadDto;
  ausencias: IndicadorCantidadDto;
  frecuencia: IndicadorFrecuenciaDto;
  total_sesiones: number;
  proxima_cita: ProximaCitaIndicadorDto;
}

export type PacienteActividadTipo =
  | 'CITA_CREADA'
  | 'CITA_CONFIRMADA'
  | 'CITA_COMPLETADA'
  | 'CITA_CANCELADA'
  | 'CITA_REPROGRAMADA'
  | 'AUSENCIA'
  | 'SESION_REGISTRADA'
  | 'NOTA_CLINICA_CREADA'
  | 'RECETA_CREADA'
  | 'RECETA_EMITIDA'
  | 'RECETA_NUEVA_VERSION'
  | 'EVALUACION_CREADA'
  | 'EVALUACION_COMPLETADA'
  | 'EVALUACION_ANULADA'
  | string;

export interface PacienteActividadEventoDto {
  id: string;
  tipo: PacienteActividadTipo;
  titulo: string;
  descripcion?: string | null;
  fecha_hora: string;
  entidad_id?: number | null;
  categoria?: string | null;
  icono?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Tone UI del desglose / estado. */
export type ResumenFactorTone = 'ok' | 'warn' | 'risk' | 'neutral';

export interface ResumenFactorView {
  nombre: string;
  valor: string;
  tone: ResumenFactorTone;
}

export interface IndiceTratamientoView {
  sinDatos: boolean;
  score: number | null;
  max: number;
  estado: string;
  estadoTone: ResumenFactorTone;
  leyenda: string;
  barWidthPct: number;
  factores: ResumenFactorView[];
}

export interface KpiAsistenciaView {
  valor: string;
  meta: string;
  sinDatos: boolean;
}

export interface KpiSesionesView {
  valor: string;
  meta: string;
}

export interface KpiProximaCitaView {
  valor: string;
  meta: string;
  sinCita: boolean;
}
