import { Injectable } from '@angular/core';
import { CitaDto, EstadoCita, EstadoPago, MetodoPago } from './models/cita.model';

const MOCK: CitaDto[] = [
  {
    id_cita: 1, id_paciente: 1,
    nombre_paciente: 'María', apellido_paciente: 'Torres',
    fecha: '2026-03-12', hora_inicio: '09:00', hora_fin: '10:00', duracion: 60,
    motivo: 'Revisión general', notas_rapidas: 'Traer análisis anteriores',
    estado: 'Confirmada', estado_pago: 'Pagado', metodo_pago: 'Transferencia',
    monto: 80, monto_pagado: 80, tiene_sesion: false,
  },
  {
    id_cita: 2, id_paciente: 2,
    nombre_paciente: 'Carlos', apellido_paciente: 'Ruiz',
    fecha: '2026-03-12', hora_inicio: '10:30', hora_fin: '11:30', duracion: 60,
    motivo: 'Control tensión arterial', notas_rapidas: '',
    estado: 'Pendiente', estado_pago: 'Pendiente', metodo_pago: '',
    monto: 60, monto_pagado: 0, tiene_sesion: false,
  },
  {
    id_cita: 3, id_paciente: 3,
    nombre_paciente: 'Laura', apellido_paciente: 'Gómez',
    fecha: '2026-03-10', hora_inicio: '11:00', hora_fin: '11:30', duracion: 30,
    motivo: 'Consulta rápida', notas_rapidas: 'Seguimiento medicación',
    estado: 'Completada', estado_pago: 'Pagado', metodo_pago: 'Efectivo',
    monto: 40, monto_pagado: 40, tiene_sesion: true,
  },
  {
    id_cita: 4, id_paciente: 4,
    nombre_paciente: 'Roberto', apellido_paciente: 'Sanz',
    fecha: '2026-03-14', hora_inicio: '08:00', hora_fin: '09:00', duracion: 60,
    motivo: 'Primera consulta', notas_rapidas: '',
    estado: 'Confirmada', estado_pago: 'Parcial', metodo_pago: 'Efectivo',
    monto: 90, monto_pagado: 45, tiene_sesion: false,
  },
  {
    id_cita: 5, id_paciente: 5,
    nombre_paciente: 'Ana', apellido_paciente: 'López',
    fecha: '2026-03-10', hora_inicio: '16:00', hora_fin: '17:00', duracion: 60,
    motivo: 'Seguimiento tratamiento', notas_rapidas: 'Evaluar respuesta al tratamiento',
    estado: 'Completada', estado_pago: 'Pagado', metodo_pago: 'Tarjeta',
    monto: 80, monto_pagado: 80, tiene_sesion: false,
  },
  {
    id_cita: 6, id_paciente: 1,
    nombre_paciente: 'María', apellido_paciente: 'Torres',
    fecha: '2026-02-28', hora_inicio: '10:00', hora_fin: '11:00', duracion: 60,
    motivo: 'Control mensual', notas_rapidas: '',
    estado: 'Cancelada', estado_pago: 'Pendiente', metodo_pago: '',
    monto: 80, monto_pagado: 0, tiene_sesion: false,
  },
  {
    id_cita: 7, id_paciente: 6,
    nombre_paciente: 'Pedro', apellido_paciente: 'Martín',
    fecha: '2026-03-15', hora_inicio: '12:00', hora_fin: '13:00', duracion: 60,
    motivo: 'Evaluación psicológica', notas_rapidas: 'Primera sesión',
    estado: 'Pendiente', estado_pago: 'Pendiente', metodo_pago: '',
    monto: 100, monto_pagado: 0, tiene_sesion: false,
  },
  {
    id_cita: 8, id_paciente: 7,
    nombre_paciente: 'Sofía', apellido_paciente: 'Fernández',
    fecha: '2026-03-08', hora_inicio: '15:00', hora_fin: '15:45', duracion: 45,
    motivo: 'Control post-operatorio', notas_rapidas: '',
    estado: 'No asistió', estado_pago: 'Pendiente', metodo_pago: '',
    monto: 60, monto_pagado: 0, tiene_sesion: false,
  },
  {
    id_cita: 9, id_paciente: 8,
    nombre_paciente: 'Diego', apellido_paciente: 'Herrera',
    fecha: '2026-03-18', hora_inicio: '09:30', hora_fin: '10:30', duracion: 60,
    motivo: 'Examen de rutina', notas_rapidas: 'Ayuno requerido',
    estado: 'Confirmada', estado_pago: 'Pagado', metodo_pago: 'Transferencia',
    monto: 75, monto_pagado: 75, tiene_sesion: false,
  },
  {
    id_cita: 10, id_paciente: 3,
    nombre_paciente: 'Laura', apellido_paciente: 'Gómez',
    fecha: '2026-03-20', hora_inicio: '11:00', hora_fin: '12:00', duracion: 60,
    motivo: 'Seguimiento consulta anterior', notas_rapidas: '',
    estado: 'Pospuesta', estado_pago: 'Pendiente', metodo_pago: '',
    monto: 80, monto_pagado: 0, tiene_sesion: false,
  },
];

@Injectable({ providedIn: 'root' })
export class CitasMockService {
  private citas: CitaDto[] = [...MOCK];

  getCitas(): CitaDto[] {
    return [...this.citas].sort((a, b) => {
      const da = `${a.fecha}T${a.hora_inicio}`;
      const db = `${b.fecha}T${b.hora_inicio}`;
      return db.localeCompare(da);
    });
  }

  getCitaById(id: number): CitaDto | undefined {
    return this.citas.find(c => c.id_cita === id);
  }

  createCita(data: Omit<CitaDto, 'id_cita'>): CitaDto {
    const cita: CitaDto = { ...data, id_cita: Date.now() };
    this.citas = [cita, ...this.citas];
    return cita;
  }

  updateCita(cita: CitaDto): CitaDto {
    this.citas = this.citas.map(c => c.id_cita === cita.id_cita ? { ...cita } : c);
    return cita;
  }

  updateEstado(id: number, estado: EstadoCita): void {
    this.citas = this.citas.map(c => c.id_cita === id ? { ...c, estado } : c);
  }

  updatePago(id: number, estado_pago: EstadoPago, monto_pagado: number, metodo_pago: MetodoPago | ''): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id ? { ...c, estado_pago, monto_pagado, metodo_pago } : c
    );
  }

  updateNotas(id: number, notas_rapidas: string): void {
    this.citas = this.citas.map(c => c.id_cita === id ? { ...c, notas_rapidas } : c);
  }

  reprogramarCita(id: number, fecha: string, hora_inicio: string, hora_fin: string): void {
    const duracion = this.calcDuracion(hora_inicio, hora_fin);
    this.citas = this.citas.map(c =>
      c.id_cita === id
        ? { ...c, fecha, hora_inicio, hora_fin, duracion, estado: 'Pendiente' }
        : c
    );
  }

  getCitasByPaciente(id_paciente: number): CitaDto[] {
    return this.citas.filter(c => c.id_paciente === id_paciente);
  }

  marcarConSesion(id_cita: number): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id_cita ? { ...c, tiene_sesion: true } : c
    );
  }

  private calcDuracion(inicio: string, fin: string): number {
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }
}
