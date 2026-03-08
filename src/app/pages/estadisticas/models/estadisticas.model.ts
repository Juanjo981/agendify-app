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
  reporteId: string;
  tipo: TipoReporte;
  formato: FormatoExportacion;
  fechaDesde: string;
  fechaHasta: string;
  profesional?: string;
  incluirResumen: boolean;
  incluirDetalle: boolean;
  nombreArchivo: string;
}

export interface ExportacionReporteResponse {
  ok: boolean;
  url?: string;      // download URL when backend is real
  mensaje: string;
}
