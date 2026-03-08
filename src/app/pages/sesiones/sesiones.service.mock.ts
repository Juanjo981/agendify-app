import { Injectable } from '@angular/core';
import { SesionDto, SesionAdjunto } from './models/sesion.model';

const MOCK: SesionDto[] = [
  {
    id_sesion: 1,
    id_cita: 3,
    id_paciente: 3,
    nombre_paciente: 'Laura',
    apellido_paciente: 'Gómez',
    fecha_cita: '2026-03-10',
    notas: 'Paciente muestra buena respuesta al tratamiento. Continúa con la medicación actual. Se observan mejoras significativas en el cuadro general. Se recomienda mantener hábitos actuales y regresar en un mes.',
    fecha_creacion: '2026-03-10T12:05:00.000Z',
  },
  {
    id_sesion: 2,
    id_cita: 5,
    id_paciente: 5,
    nombre_paciente: 'Ana',
    apellido_paciente: 'López',
    fecha_cita: '2026-03-10',
    notas: 'Primera sesión de seguimiento. Paciente refiere mejoría del 60% respecto a la consulta anterior. Se ajusta dosis del medicamento principal. Próxima revisión en dos semanas.',
    fecha_creacion: '2026-03-10T17:20:00.000Z',
  },
  {
    id_sesion: 3,
    id_cita: 1,
    id_paciente: 1,
    nombre_paciente: 'María',
    apellido_paciente: 'Torres',
    fecha_cita: '2026-03-12',
    notas: 'Revisión general sin hallazgos relevantes. Analítica dentro de los parámetros normales. Se recomienda mantener dieta y ejercicio moderado. Control en 3 meses.',
    fecha_creacion: '2026-03-12T10:45:00.000Z',
    adjunto: {
      name: 'analitica-marzo-2026.pdf',
      type: 'application/pdf',
      size: 245760,
    },
  },
  {
    id_sesion: 4,
    id_cita: 4,
    id_paciente: 4,
    nombre_paciente: 'Roberto',
    apellido_paciente: 'Sanz',
    fecha_cita: '2026-03-14',
    notas: 'Primera consulta. Motivo de consulta: dolores de cabeza recurrentes. Se solicita resonancia magnética. Prescripción de analgésicos de bajo impacto mientras se esperan resultados.',
    fecha_creacion: '2026-03-14T09:30:00.000Z',
  },
  {
    id_sesion: 5,
    id_cita: 9,
    id_paciente: 8,
    nombre_paciente: 'Diego',
    apellido_paciente: 'Herrera',
    fecha_cita: '2026-03-18',
    notas: 'Examen de rutina anual. Sin alteraciones cardiovasculares. Glucosa en 98 mg/dL. Se indica mantener control nutricional y actividad física. Se solicita ecografía abdominal preventiva.',
    fecha_creacion: '2026-03-18T11:10:00.000Z',
    adjunto: {
      name: 'resultados-examen.jpg',
      type: 'image/jpeg',
      size: 512000,
      previewUrl: undefined,
    },
  },
];

@Injectable({ providedIn: 'root' })
export class SesionesMockService {
  private sesiones: SesionDto[] = [...MOCK];

  getAllSesiones(): SesionDto[] {
    return [...this.sesiones].sort(
      (a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    );
  }

  getSesionesByPaciente(id_paciente: number): SesionDto[] {
    return this.sesiones.filter(s => s.id_paciente === id_paciente);
  }

  getSesionByCita(id_cita: number): SesionDto | undefined {
    return this.sesiones.find(s => s.id_cita === id_cita);
  }

  getSesionById(id: number): SesionDto | undefined {
    return this.sesiones.find(s => s.id_sesion === id);
  }

  createSesion(data: Omit<SesionDto, 'id_sesion' | 'fecha_creacion'>): SesionDto {
    const sesion: SesionDto = {
      ...data,
      id_sesion: Date.now(),
      fecha_creacion: new Date().toISOString(),
    };
    this.sesiones = [sesion, ...this.sesiones];
    return sesion;
  }

  updateSesion(sesion: SesionDto): SesionDto {
    this.sesiones = this.sesiones.map(s => s.id_sesion === sesion.id_sesion ? { ...sesion } : s);
    return sesion;
  }

  uploadArchivoSesion(id: number, adjunto: SesionAdjunto): void {
    this.sesiones = this.sesiones.map(s => s.id_sesion === id ? { ...s, adjunto } : s);
  }

  deleteArchivoSesion(id: number): void {
    this.sesiones = this.sesiones.map(s => {
      if (s.id_sesion !== id) return s;
      const { adjunto, ...rest } = s;
      return rest;
    });
  }
}
