export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface SolicitudReprogramacion {
  id_solicitud: number;
  id_cita: number;
  paciente_nombre: string;
  fecha_cita: string;
  hora_cita: string;
  mensaje_paciente: string;
  fecha_hora_sugerida?: string;
  estado: EstadoSolicitud;
  fecha_solicitud: string;
}
