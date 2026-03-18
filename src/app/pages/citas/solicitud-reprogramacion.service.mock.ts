import { Injectable } from '@angular/core';
import { SolicitudReprogramacion, EstadoSolicitud } from '../../shared/models/solicitud-reprogramacion.model';

// ─── Mock data ────────────────────────────────────────────────────────────────
// Matches citas with id_cita 2 (Carlos Ruiz) and 7 (Pedro Martín) in CitasMockService.
const MOCK: SolicitudReprogramacion[] = [
  {
    idSolicitud: 1,
    idCita: 2,
    pacienteNombre: 'Carlos Ruiz',
    fechaCita: '2026-03-12',
    horaCita: '10:30',
    mensajePaciente:
      'Tengo un compromiso laboral esa mañana. ¿Podríamos moverla para la tarde, después de las 5 pm?',
    fechaHoraSugerida: undefined,
    estado: 'PENDIENTE',
    fechaSolicitud: '2026-03-17T09:15:00',
  },
  {
    idSolicitud: 2,
    idCita: 7,
    pacienteNombre: 'Pedro Martín',
    fechaCita: '2026-03-15',
    horaCita: '12:00',
    mensajePaciente: 'Me gustaría reprogramar para el 20 de marzo por la tarde si hay disponibilidad.',
    fechaHoraSugerida: '2026-03-20T17:00',
    estado: 'PENDIENTE',
    fechaSolicitud: '2026-03-17T11:40:00',
  },
];

@Injectable({ providedIn: 'root' })
export class SolicitudReprogramacionService {

  private solicitudes: SolicitudReprogramacion[] = MOCK.map(s => ({ ...s }));

  /** Devuelve todas las solicitudes (cualquier estado). */
  getAll(): SolicitudReprogramacion[] {
    return [...this.solicitudes];
  }

  /** Solo solicitudes con estado PENDIENTE. */
  getPendientes(): SolicitudReprogramacion[] {
    return this.solicitudes.filter(s => s.estado === 'PENDIENTE');
  }

  /** Solicitud PENDIENTE asociada a una cita específica, o undefined. */
  getByCita(idCita: number): SolicitudReprogramacion | undefined {
    return this.solicitudes.find(s => s.idCita === idCita && s.estado === 'PENDIENTE');
  }

  /** Solicitud por su ID (cualquier estado). */
  getById(idSolicitud: number): SolicitudReprogramacion | undefined {
    return this.solicitudes.find(s => s.idSolicitud === idSolicitud);
  }

  /** Marca la solicitud como ACEPTADA. */
  aceptar(idSolicitud: number): void {
    const s = this.solicitudes.find(s => s.idSolicitud === idSolicitud);
    if (s) s.estado = 'ACEPTADA';
  }

  /** Marca la solicitud como RECHAZADA. */
  rechazar(idSolicitud: number): void {
    const s = this.solicitudes.find(s => s.idSolicitud === idSolicitud);
    if (s) s.estado = 'RECHAZADA';
  }
}
