import { Injectable } from '@angular/core';
import {
  CitaDto,
  EstadoCita,
  EstadoPago,
  toIsoDateTime,
  withLegacyCitaFields,
} from './models/cita.model';

interface CitaSeed {
  id_cita: number;
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  notas_rapidas: string;
  estado_cita: EstadoCita;
  estado_pago: EstadoPago;
  monto: number;
  monto_pagado: number;
  metodo_pago: string;
  tiene_sesion: boolean;
}

const SEED: CitaSeed[] = [
  {
    id_cita: 1,
    id_paciente: 1,
    nombre_paciente: 'Maria',
    apellido_paciente: 'Torres',
    fecha: '2026-03-12',
    hora_inicio: '09:00',
    hora_fin: '10:00',
    motivo: 'Revision general',
    notas_rapidas: 'Traer analisis anteriores',
    estado_cita: 'CONFIRMADA',
    estado_pago: 'PAGADO',
    monto: 80,
    monto_pagado: 80,
    metodo_pago: 'Transferencia',
    tiene_sesion: false,
  },
  {
    id_cita: 2,
    id_paciente: 2,
    nombre_paciente: 'Carlos',
    apellido_paciente: 'Ruiz',
    fecha: '2026-03-12',
    hora_inicio: '10:30',
    hora_fin: '11:30',
    motivo: 'Control tension arterial',
    notas_rapidas: '',
    estado_cita: 'PENDIENTE',
    estado_pago: 'PENDIENTE',
    monto: 60,
    monto_pagado: 0,
    metodo_pago: '',
    tiene_sesion: false,
  },
  {
    id_cita: 3,
    id_paciente: 3,
    nombre_paciente: 'Laura',
    apellido_paciente: 'Gomez',
    fecha: '2026-03-10',
    hora_inicio: '11:00',
    hora_fin: '11:30',
    motivo: 'Consulta rapida',
    notas_rapidas: 'Seguimiento medicacion',
    estado_cita: 'COMPLETADA',
    estado_pago: 'PAGADO',
    monto: 40,
    monto_pagado: 40,
    metodo_pago: 'Efectivo',
    tiene_sesion: true,
  },
  {
    id_cita: 4,
    id_paciente: 4,
    nombre_paciente: 'Roberto',
    apellido_paciente: 'Sanz',
    fecha: '2026-03-14',
    hora_inicio: '08:00',
    hora_fin: '09:00',
    motivo: 'Primera consulta',
    notas_rapidas: '',
    estado_cita: 'CONFIRMADA',
    estado_pago: 'PARCIAL',
    monto: 90,
    monto_pagado: 45,
    metodo_pago: 'Efectivo',
    tiene_sesion: false,
  },
  {
    id_cita: 5,
    id_paciente: 5,
    nombre_paciente: 'Ana',
    apellido_paciente: 'Lopez',
    fecha: '2026-03-10',
    hora_inicio: '16:00',
    hora_fin: '17:00',
    motivo: 'Seguimiento tratamiento',
    notas_rapidas: 'Evaluar respuesta al tratamiento',
    estado_cita: 'COMPLETADA',
    estado_pago: 'PAGADO',
    monto: 80,
    monto_pagado: 80,
    metodo_pago: 'Tarjeta',
    tiene_sesion: false,
  },
  {
    id_cita: 6,
    id_paciente: 1,
    nombre_paciente: 'Maria',
    apellido_paciente: 'Torres',
    fecha: '2026-02-28',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    motivo: 'Control mensual',
    notas_rapidas: '',
    estado_cita: 'CANCELADA',
    estado_pago: 'PENDIENTE',
    monto: 80,
    monto_pagado: 0,
    metodo_pago: '',
    tiene_sesion: false,
  },
  {
    id_cita: 7,
    id_paciente: 6,
    nombre_paciente: 'Pedro',
    apellido_paciente: 'Martin',
    fecha: '2026-03-15',
    hora_inicio: '12:00',
    hora_fin: '13:00',
    motivo: 'Evaluacion psicologica',
    notas_rapidas: 'Primera sesion',
    estado_cita: 'PENDIENTE',
    estado_pago: 'PENDIENTE',
    monto: 100,
    monto_pagado: 0,
    metodo_pago: '',
    tiene_sesion: false,
  },
  {
    id_cita: 8,
    id_paciente: 7,
    nombre_paciente: 'Sofia',
    apellido_paciente: 'Fernandez',
    fecha: '2026-03-08',
    hora_inicio: '15:00',
    hora_fin: '15:45',
    motivo: 'Control post-operatorio',
    notas_rapidas: '',
    estado_cita: 'NO_ASISTIO',
    estado_pago: 'PENDIENTE',
    monto: 60,
    monto_pagado: 0,
    metodo_pago: '',
    tiene_sesion: false,
  },
];

/**
 * @deprecated Fase 4 migra Citas a API real con CitasApiService.
 * Se mantiene temporalmente para Agenda (Fase 5 pendiente).
 */
@Injectable({ providedIn: 'root' })
export class CitasMockService {
  private citas: CitaDto[] = SEED.map(seed => this.seedToCita(seed));

  getCitas(): CitaDto[] {
    return [...this.citas].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  }

  getCitaById(id: number): CitaDto | undefined {
    return this.citas.find(c => c.id_cita === id);
  }

  createCita(data: Omit<CitaDto, 'id_cita'>): CitaDto {
    const cita = this.normalizeIncoming({
      ...data,
      id_cita: Date.now(),
    });
    this.citas = [cita, ...this.citas];
    return cita;
  }

  updateCita(cita: CitaDto): CitaDto {
    const normalized = this.normalizeIncoming(cita);
    this.citas = this.citas.map(c => c.id_cita === normalized.id_cita ? normalized : c);
    return normalized;
  }

  updateEstado(id: number, estado: EstadoCita): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id ? this.normalizeIncoming({ ...c, estado_cita: estado }) : c
    );
  }

  updatePago(id: number, estado_pago: EstadoPago, monto: number): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id
        ? this.normalizeIncoming({
            ...c,
            estado_pago,
            monto,
            monto_pagado: estado_pago === 'PAGADO' ? monto : c.monto_pagado ?? 0,
          })
        : c
    );
  }

  updateNotas(id: number, notas_rapidas: string): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id
        ? this.normalizeIncoming({ ...c, notas_internas: notas_rapidas, observaciones: notas_rapidas })
        : c
    );
  }

  reprogramarCita(id: number, fecha: string, hora_inicio: string, hora_fin: string): void {
    const fecha_inicio = toIsoDateTime(fecha, hora_inicio);
    const fecha_fin = toIsoDateTime(fecha, hora_fin);
    this.citas = this.citas.map(c =>
      c.id_cita === id
        ? this.normalizeIncoming({
            ...c,
            fecha_inicio,
            fecha_fin,
            estado_cita: 'PENDIENTE',
          })
        : c
    );
  }

  getCitasByPaciente(id_paciente: number): CitaDto[] {
    return this.citas.filter(c => c.id_paciente === id_paciente);
  }

  marcarConSesion(id_cita: number): void {
    this.citas = this.citas.map(c =>
      c.id_cita === id_cita ? this.normalizeIncoming({ ...c, tiene_sesion: true }) : c
    );
  }

  private seedToCita(seed: CitaSeed): CitaDto {
    const cita: CitaDto = {
      id_cita: seed.id_cita,
      id_paciente: seed.id_paciente,
      nombre_paciente: seed.nombre_paciente,
      apellido_paciente: seed.apellido_paciente,
      fecha_inicio: toIsoDateTime(seed.fecha, seed.hora_inicio),
      fecha_fin: toIsoDateTime(seed.fecha, seed.hora_fin),
      motivo: seed.motivo,
      notas_internas: seed.notas_rapidas,
      observaciones: seed.notas_rapidas,
      estado_cita: seed.estado_cita,
      estado_pago: seed.estado_pago,
      monto: seed.monto,
      tiene_sesion: seed.tiene_sesion,
      origen_cita: 'PROFESIONAL',
      confirmado_por_paciente: false,
      fecha_confirmacion: null,
      motivo_cancelacion: seed.estado_cita === 'CANCELADA' ? 'Cancelada en mock' : null,
      activo: true,
      monto_pagado: seed.monto_pagado,
      metodo_pago: seed.metodo_pago,
    };
    return withLegacyCitaFields(cita);
  }

  private normalizeIncoming(cita: any): CitaDto {
    const fechaInicio = cita.fecha_inicio ?? toIsoDateTime(cita.fecha ?? '', cita.hora_inicio ?? '');
    const fechaFin = cita.fecha_fin ?? toIsoDateTime(cita.fecha ?? '', cita.hora_fin ?? '');

    const normalized: CitaDto = {
      ...cita,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado_cita: cita.estado ? this.estadoLabelToApi(cita.estado) : (cita.estado_cita ?? 'PENDIENTE'),
      estado_pago: cita.estado_pago ? this.pagoLabelToApi(cita.estado_pago) : 'PENDIENTE',
      notas_internas: cita.notas_internas ?? cita.notas_rapidas ?? '',
      observaciones: cita.observaciones ?? cita.notas_rapidas ?? '',
    };

    return withLegacyCitaFields(normalized);
  }

  private estadoLabelToApi(value: string): EstadoCita {
    const map: Record<string, EstadoCita> = {
      Pendiente: 'PENDIENTE',
      Confirmada: 'CONFIRMADA',
      Completada: 'COMPLETADA',
      Cancelada: 'CANCELADA',
      'No asistio': 'NO_ASISTIO',
      'No asistió': 'NO_ASISTIO',
      Pospuesta: 'REPROGRAMADA',
      Reprogramada: 'REPROGRAMADA',
      PENDIENTE: 'PENDIENTE',
      CONFIRMADA: 'CONFIRMADA',
      COMPLETADA: 'COMPLETADA',
      CANCELADA: 'CANCELADA',
      NO_ASISTIO: 'NO_ASISTIO',
      REPROGRAMADA: 'REPROGRAMADA',
    };
    return map[value] ?? 'PENDIENTE';
  }

  private pagoLabelToApi(value: string): EstadoPago {
    const map: Record<string, EstadoPago> = {
      Pendiente: 'PENDIENTE',
      Parcial: 'PARCIAL',
      Pagado: 'PAGADO',
      'No aplica': 'NO_APLICA',
      Reembolsado: 'REEMBOLSADO',
      PENDIENTE: 'PENDIENTE',
      PARCIAL: 'PARCIAL',
      PAGADO: 'PAGADO',
      NO_APLICA: 'NO_APLICA',
      REEMBOLSADO: 'REEMBOLSADO',
    };
    return map[value] ?? 'PENDIENTE';
  }
}
