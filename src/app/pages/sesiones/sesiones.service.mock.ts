import { Injectable } from '@angular/core';
import { SesionDto } from './models/sesion.model';

const MOCK: SesionDto[] = [
  {
    id_sesion: 1,
    id_profesional: 1,
    id_cita: 3,
    id_paciente: 3,
    nombre_paciente: 'Laura',
    apellido_paciente: 'Gómez',
    fecha_sesion: '2026-03-10T10:00:00',
    tipo_sesion: 'SEGUIMIENTO',
    estatus: 'ABIERTA',
    resumen: 'Paciente muestra buena respuesta al tratamiento y se acuerda seguimiento en un mes.',
    created_at: '2026-03-10T12:05:00.000Z',
    updated_at: '2026-03-10T12:05:00.000Z',
  },
  {
    id_sesion: 2,
    id_profesional: 1,
    id_cita: 5,
    id_paciente: 5,
    nombre_paciente: 'Ana',
    apellido_paciente: 'López',
    fecha_sesion: '2026-03-10T17:00:00',
    tipo_sesion: 'INDIVIDUAL',
    estatus: 'ABIERTA',
    resumen: 'Primera sesión de seguimiento con ajuste de medicación principal.',
    created_at: '2026-03-10T17:20:00.000Z',
    updated_at: '2026-03-10T17:20:00.000Z',
  },
];

/**
 * @deprecated Fase 6 conecta SesionesApiService + AdjuntosServiceApi.
 * Se conserva temporalmente solo como respaldo local y no debe inyectarse en flujos activos.
 */
@Injectable({ providedIn: 'root' })
export class SesionesMockService {
  private sesiones: SesionDto[] = [...MOCK];

  getAllSesiones(): SesionDto[] {
    return [...this.sesiones].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getSesionesByPaciente(id_paciente: number): SesionDto[] {
    return this.sesiones.filter(sesion => sesion.id_paciente === id_paciente);
  }

  getSesionByCita(id_cita: number): SesionDto | undefined {
    return this.sesiones.find(sesion => sesion.id_cita === id_cita);
  }

  getSesionById(id: number): SesionDto | undefined {
    return this.sesiones.find(sesion => sesion.id_sesion === id);
  }
}
