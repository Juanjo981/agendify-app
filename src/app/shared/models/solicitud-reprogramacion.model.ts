export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface SolicitudReprogramacion {
  /** Identificador único de la solicitud */
  idSolicitud: number;
  /** Cita afectada */
  idCita: number;
  /** Nombre completo del paciente */
  pacienteNombre: string;
  /** Fecha de la cita original — 'YYYY-MM-DD' */
  fechaCita: string;
  /** Hora de la cita original — 'HH:MM' */
  horaCita: string;
  /** Mensaje libre escrito por el paciente */
  mensajePaciente: string;
  /** Fecha y hora sugerida por el paciente (ISO 8601), present when the patient proposes a specific slot */
  fechaHoraSugerida?: string;
  /** Estado del ciclo de vida de la solicitud */
  estado: EstadoSolicitud;
  /** Momento en que el paciente envió la solicitud (ISO 8601) */
  fechaSolicitud: string;
}
