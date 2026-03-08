export type RangoFecha = 'hoy' | 'semana' | 'mes' | 'personalizado';

export type EstadoCitaFiltro =
  | 'todos'
  | 'Pendiente'
  | 'Confirmada'
  | 'Completada'
  | 'Cancelada'
  | 'No asistió'
  | 'Pospuesta';

export type MetodoPagoFiltro =
  | 'todos'
  | 'Efectivo'
  | 'Transferencia'
  | 'Débito'
  | 'Crédito';

export interface FiltroEstadisticas {
  rango: RangoFecha;
  fechaDesde: string; // 'YYYY-MM-DD'
  fechaHasta: string; // 'YYYY-MM-DD'
  profesional: string; // '' = all
  estadoCita: EstadoCitaFiltro;
  metodoPago: MetodoPagoFiltro;
}
