// ─── KPI Cards ────────────────────────────────────────────────────────────────
export type KpiColor = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

export interface KpiCard {
  id: string;
  label: string;
  valor: number | string;
  /** '€' | '%' — prefix/suffix handled by the component */
  sufijo?: '€' | '%';
  icono: string;
  color: KpiColor;
  tendencia?: {
    valor: number;
    direccion: 'up' | 'down';
    /** true = good news for the business (green), false = bad (red) */
    positivo: boolean;
    label: string; // 'vs ayer', 'vs mes pasado'
  };
}

// ─── Main summary returned by the service ─────────────────────────────────────
export interface EstadisticasResumen {
  citasHoy: number;
  citasMes: number;
  pacientesNuevosMes: number;
  pacientesRecurrentes: number;
  ingresosHoy: number;
  ingresosMes: number;
  noAsistencias: number;
  tasaCancelacion: number; // percentage (e.g. 8.3 = 8.3%)
}

// ─── Time-series data ────────────────────────────────────────────────────────
export type PeriodoCitas = 'dia' | 'semana' | 'mes';

export interface CitasPorPeriodo {
  fecha: string;    // 'YYYY-MM-DD' or period key
  label: string;    // display label for chart axis
  total: number;
  confirmadas: number;
  completadas: number;
  canceladas: number;
  noAsistio: number;
}

export interface IngresoPorPeriodo {
  fecha: string; // 'YYYY-MM-DD' or period key
  label: string; // display label for chart axis
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  pendiente: number;
}

export interface IngresoPorMetodoPago {
  metodo: string;       // 'Efectivo', 'Transferencia', 'Débito', 'Crédito'
  total: number;
  porcentaje: number;   // 0–100
  color: string;        // hex
}

export interface ResumenIngresosEstadistica {
  totalPeriodo: number;
  montoPendiente: number;
  citasPagadas: number;
  citasPendientes: number;
  metodoPrincipal: string;
}

export interface PacienteEstadistica {
  id: number;
  nombre: string;
  apellido: string;
  totalCitas: number;
  noAsistencias: number;
  ingresos: number;
  esNuevo: boolean; // joined this month
}

export interface RankingPaciente {
  posicion: number;
  id: number;
  nombre: string;
  apellido: string;
  valor: number;       // citas count or no-asistencias count
  avatarInicial: string;
  colorAvatar: string; // hex
}

export interface NuevosVsRecurrentesPunto {
  label: string;       // 'Oct', 'Nov', …
  nuevos: number;
  recurrentes: number;
}

export interface ResumenPacientesEstadistica {
  totalActivos: number;
  nuevosEsteMes: number;
  recurrentesEsteMes: number;
  tasaRetencion: number;  // percentage
}

export type InsightTipo = 'success' | 'info' | 'warning' | 'purple' | 'primary';

export interface InsightEstadistica {
  id: string;
  icono: string;
  titulo: string;
  valor: string;
  descripcion: string;
  tipo: InsightTipo;
}

// ─── Daily Cash Summary ───────────────────────────────────────────────────────
export interface ResumenCajaDiaria {
  fecha: string; // 'YYYY-MM-DD'
  totalCobrado: number;
  efectivo: number;
  transferencia: number;
  debito: number;
  credito: number;
  pagosExentos: number;
  pagosPendientes: number;
  citasCobradas: number;
}

// ─── Citas analytics ──────────────────────────────────────────────────────────
export interface HoraOcupada {
  hora: string;   // '09:00'
  citas: number;
}

export interface DiaOcupado {
  dia: string;    // 'Lunes'
  citas: number;
}

export interface EstadoCitaEstadistica {
  estado: string;     // matches EstadoCita values
  total: number;
  porcentaje: number; // 0–100
  color: string;      // hex
}

export interface ResumenCitasEstadistica {
  totalPeriodo: number;
  estadoPredominante: string;
  horasMasOcupadas: HoraOcupada[];
  diasMasOcupados: DiaOcupado[];
}

// ─── Exportable Reports ───────────────────────────────────────────────────────
export type TipoReporte =
  | 'citas'
  | 'ingresos'
  | 'pacientes'
  | 'pagos-pendientes'
  | 'no-asistencias';

export type FormatoExportacion = 'pdf' | 'excel';

export interface ReporteEstadistica {
  id: string;
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
  colorIcono: string;        // hex
  totalRegistros: number;
  resumenTexto: string;      // e.g. '48 citas · €3,840 total'
  periodoLabel: string;      // e.g. 'Marzo 2026'
  ultimaActualizacion: string; // ISO datetime
  filas: Record<string, string | number>[];
}

export interface ExportacionReporteRequest {
  tipo: TipoReporte;
  formato: FormatoExportacion;
  fechaDesde: string;
  fechaHasta: string;
  profesionalId?: number;
  incluirResumen: boolean;
  incluirDetalle: boolean;
  nombreArchivo: string;
}

export interface ExportacionReporteResponse {
  ok: boolean;
  url?: string;      // download URL when backend is real
  mensaje: string;
}

export interface ProfesionalFiltroOption {
  id: string;
  nombre: string;
}

export interface ProfesionalEstadisticaDto {
  id_profesional: number;
  nombre: string;
  apellido: string;
  nombre_consulta?: string | null;
}

export interface EstadisticasResumenDto {
  citas_hoy: number;
  citas_mes: number;
  pacientes_nuevos_mes: number;
  pacientes_recurrentes: number;
  ingresos_hoy: number;
  ingresos_mes: number;
  no_asistencias: number;
  tasa_cancelacion: number;
}

export interface CitasPorPeriodoDto {
  fecha: string;
  label: string;
  total: number;
  confirmadas: number;
  completadas: number;
  canceladas: number;
  no_asistio: number;
}

export interface EstadoCitaConteoDto {
  estado: string;
  cantidad: number;
}

export interface HoraOcupadaDto {
  hora: string;
  citas: number;
}

export interface DiaOcupadoDto {
  dia: string;
  citas: number;
}

export interface CitasStatsDto {
  serie: CitasPorPeriodoDto[];
  conteo_por_estado: EstadoCitaConteoDto[];
  total_citas: number;
  horas_mas_ocupadas: HoraOcupadaDto[];
  dias_mas_ocupados: DiaOcupadoDto[];
}

export interface IngresoPorPeriodoDto {
  fecha: string;
  label: string;
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  pendiente: number;
}

export interface IngresoMetodoPagoDto {
  metodo: string;
  total: number;
  porcentaje: number;
}

export interface IngresosStatsDto {
  serie: IngresoPorPeriodoDto[];
  por_metodo_pago: IngresoMetodoPagoDto[];
  total_periodo: number;
  monto_pendiente: number;
  citas_pagadas: number;
  citas_pendientes: number;
  metodo_principal?: string | null;
}

export interface NuevosVsRecurrentesPuntoDto {
  label: string;
  nuevos: number;
  recurrentes: number;
}

export interface RankingPacienteDto {
  posicion: number;
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente?: string | null;
  valor: number;
}

export interface PacienteEstadisticaDto {
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente?: string | null;
  total_citas: number;
  no_asistencias: number;
  ingresos: number;
  es_nuevo: boolean;
}

export interface PacientesStatsDto {
  nuevos_vs_recurrentes: NuevosVsRecurrentesPuntoDto[];
  total_activos: number;
  nuevos_este_mes: number;
  recurrentes_este_mes: number;
  tasa_retencion: number;
  ranking_mas_citas: RankingPacienteDto[];
  ranking_no_asistencias?: RankingPacienteDto[];
  ranking_por_ingresos?: RankingPacienteDto[];
  pacientes: PacienteEstadisticaDto[];
}

export interface InsightEstadisticaDto {
  id: string;
  icono: string;
  titulo: string;
  valor: string;
  descripcion: string;
  tipo: InsightTipo;
}

export interface ResumenCajaDiariaDto {
  fecha: string;
  total_cobrado: number;
  efectivo: number;
  transferencia: number;
  debito: number;
  credito: number;
  pagos_exentos: number;
  pagos_pendientes: number;
  citas_cobradas: number;
}

export interface ReporteEstadisticaDto {
  id: string;
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
  color_icono: string;
  total_registros: number;
  resumen_texto: string;
  periodo_label: string;
  ultima_actualizacion: string;
  filas: Record<string, string | number>[];
}
