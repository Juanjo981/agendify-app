import { PageRequest } from 'src/app/shared/models/page.model';

export type EstadoCita =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO'
  | 'REPROGRAMADA';

export type EstadoPago =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'PAGADO'
  | 'NO_APLICA'
  | 'REEMBOLSADO';

export type TipoPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'TARJETA'
  | 'OTRO';

export type EstadoCitaLabel =
  | 'Pendiente'
  | 'Confirmada'
  | 'Completada'
  | 'Cancelada'
  | 'No asistio'
  | 'Reprogramada';

export type EstadoPagoLabel =
  | 'Pendiente'
  | 'Parcial'
  | 'Pagado'
  | 'No aplica'
  | 'Reembolsado';

export type TipoPagoLabel =
  | 'Efectivo'
  | 'Transferencia'
  | 'Tarjeta'
  | 'Otro';

export interface CitaDto {
  id_cita: number;
  id_profesional?: number;
  id_paciente: number;
  id_recepcionista_creador?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  notas_internas?: string | null;
  observaciones?: string | null;
  estado_cita: EstadoCita;
  estado_pago: EstadoPago;
  tipoPago?: TipoPago | null;
  tipo_pago?: TipoPago | null;
  monto: number;
  origen_cita?: string;
  confirmado_por_paciente?: boolean;
  fecha_confirmacion?: string | null;
  motivo_cancelacion?: string | null;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
  nombre_paciente: string;
  apellido_paciente: string;
  tiene_sesion: boolean;

  // Legacy compatibility for modules not integrated yet (Agenda/Fase 5+).
  /** @deprecated usar fecha_inicio */
  fecha?: string;
  /** @deprecated usar fecha_inicio */
  hora_inicio?: string;
  /** @deprecated usar fecha_fin */
  hora_fin?: string;
  /** @deprecated derivar desde fecha_inicio/fecha_fin */
  duracion?: number;
  /** @deprecated usar estado_cita */
  estado?: EstadoCitaLabel;
  /** @deprecated usar observaciones o notas_internas */
  notas_rapidas?: string;
  /** @deprecated backend no expone metodo de pago en CitaDto */
  metodo_pago?: string;
  /** @deprecated backend no expone monto_pagado en CitaDto */
  monto_pagado?: number;
}

export interface CitaUpsertRequest {
  id_paciente: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string;
  notas_internas?: string | null;
  observaciones?: string | null;
  monto?: number;
  tipoPago?: TipoPago;
}

export interface CitaPagoRequest {
  estado_pago: EstadoPago;
  monto: number;
  /** Opcional; `null` limpia el tipo en backend si lo soporta. */
  tipoPago?: TipoPago | null;
}

export interface CitaEstadoRequest {
  estado: EstadoCita;
}

export interface FiltroCitas {
  busqueda: string;
  estado: EstadoCita | 'todos';
  estado_pago: EstadoPago | 'todos';
  fecha_desde: string;
  fecha_hasta: string;
  id_paciente?: number | null;
}

export interface CitasListParams extends PageRequest {
  search?: string;
  estado?: EstadoCita;
  estadoPago?: EstadoPago;
  pacienteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  activo?: boolean;
}

export interface DisponibilidadSlot {
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadResponse {
  fecha: string;
  duracion_minutos: number;
  total_slots: number;
  slots: DisponibilidadSlot[];
}

export const ESTADO_CITA_LABEL: Record<EstadoCita, EstadoCitaLabel> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  NO_ASISTIO: 'No asistio',
  REPROGRAMADA: 'Reprogramada',
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, EstadoPagoLabel> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADO: 'Pagado',
  NO_APLICA: 'No aplica',
  REEMBOLSADO: 'Reembolsado',
};

export const TIPO_PAGO_LABEL: Record<TipoPago, TipoPagoLabel> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  OTRO: 'Otro',
};

export const ESTADO_CITA_VALUES: EstadoCita[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'COMPLETADA',
  'CANCELADA',
  'NO_ASISTIO',
  'REPROGRAMADA',
];

export const ESTADO_PAGO_VALUES: EstadoPago[] = [
  'PENDIENTE',
  'PARCIAL',
  'PAGADO',
  'NO_APLICA',
  'REEMBOLSADO',
];

export const TIPO_PAGO_VALUES: TipoPago[] = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA',
  'OTRO',
];

export function isEstadoPago(value: unknown): value is EstadoPago {
  return ESTADO_PAGO_VALUES.includes(value as EstadoPago);
}

export function isTipoPago(value: unknown): value is TipoPago {
  return TIPO_PAGO_VALUES.includes(normalizeTipoPagoValue(value) as TipoPago);
}

export function estadoCitaToLabel(estado: EstadoCita): EstadoCitaLabel {
  return ESTADO_CITA_LABEL[estado] ?? 'Pendiente';
}

export function estadoPagoToLabel(estado: EstadoPago): EstadoPagoLabel {
  return ESTADO_PAGO_LABEL[estado] ?? 'Pendiente';
}

export function tipoPagoToLabel(tipoPago: TipoPago | null | undefined): string {
  return tipoPago ? TIPO_PAGO_LABEL[tipoPago] ?? '' : '';
}

export function normalizeTipoPagoValue(value: unknown): TipoPago | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, '_');

  if (normalized === 'EFECTIVO') return 'EFECTIVO';
  if (normalized === 'TRANSFERENCIA') return 'TRANSFERENCIA';
  if (normalized === 'TARJETA') return 'TARJETA';
  if (normalized === 'OTRO') return 'OTRO';

  return null;
}

/** Lee el tipo de pago tal como puede venir del API (varias claves habituales). */
export function readTipoPagoRawFromCita(cita: unknown): unknown {
  if (!cita || typeof cita !== 'object') return undefined;
  const o = cita as Record<string, unknown>;
  return (
    o['tipoPago'] ??
    o['tipo_pago'] ??
    o['tipo_de_pago'] ??
    o['tipoDePago'] ??
    o['metodo_pago'] ??
    o['metodoPago']
  );
}

export function resolveTipoPagoCita(cita: unknown): TipoPago | null {
  return normalizeTipoPagoValue(readTipoPagoRawFromCita(cita));
}

export function toDatePart(isoDateTime: string): string {
  if (!isoDateTime) return '';
  return isoDateTime.substring(0, 10);
}

export function toTimePart(isoDateTime: string): string {
  if (!isoDateTime) return '';
  const raw = isoDateTime.substring(11, 19);
  return raw.length >= 5 ? raw.substring(0, 5) : '';
}

export function toIsoDateTime(dateIso: string, timeHHmm: string): string {
  if (!dateIso || !timeHHmm) return '';
  const normalizedTime = timeHHmm.length === 5 ? `${timeHHmm}:00` : timeHHmm;
  return `${dateIso}T${normalizedTime}`;
}

export function durationInMinutes(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0;
  const start = new Date(fechaInicio).getTime();
  const end = new Date(fechaFin).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

export function withLegacyCitaFields<T extends CitaDto>(cita: T): T {
  const fecha = toDatePart(cita.fecha_inicio);
  const horaInicio = toTimePart(cita.fecha_inicio);
  const horaFin = toTimePart(cita.fecha_fin);
  const duracion = durationInMinutes(cita.fecha_inicio, cita.fecha_fin);
  const notasRapidas = cita.notas_internas ?? cita.observaciones ?? '';
  const tipoPago = resolveTipoPagoCita(cita);
  const montoPagadoRaw = (cita as any).monto_pagado;
  const montoPagado = typeof montoPagadoRaw === 'number'
    ? montoPagadoRaw
    : cita.estado_pago === 'PAGADO'
      ? cita.monto
      : 0;

  return {
    ...cita,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    duracion,
    estado: estadoCitaToLabel(cita.estado_cita),
    notas_rapidas: notasRapidas,
    monto_pagado: montoPagado,
    tipoPago,
    tipo_pago: tipoPago,
    metodo_pago: tipoPago ?? (cita as any).metodo_pago ?? '',
  };
}
