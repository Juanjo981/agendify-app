export type EstadoCita =
  | 'Pendiente'
  | 'Confirmada'
  | 'Completada'
  | 'Cancelada'
  | 'No asistió'
  | 'Pospuesta';

export type EstadoPago = 'Pendiente' | 'Parcial' | 'Pagado';

export type MetodoPago = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro';

export interface CitaDto {
  id_cita: number;
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha: string;          // 'YYYY-MM-DD'
  hora_inicio: string;    // 'HH:MM'
  hora_fin: string;       // 'HH:MM'
  duracion: number;       // minutes
  motivo: string;
  notas_rapidas: string;
  estado: EstadoCita;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago | '';
  monto: number;
  monto_pagado: number;
  tiene_sesion: boolean;
}

export interface FiltroCitas {
  busqueda: string;
  estado: EstadoCita | 'todos';
  estado_pago: EstadoPago | 'todos';
  fecha_desde: string;
  fecha_hasta: string;
}
