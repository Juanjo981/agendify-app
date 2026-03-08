import { Injectable } from '@angular/core';
import {
  EstadisticasResumen,
  KpiCard,
  CitasPorPeriodo,
  PeriodoCitas,
  EstadoCitaEstadistica,
  ResumenCitasEstadistica,
  IngresoPorPeriodo,
  IngresoPorMetodoPago,
  ResumenIngresosEstadistica,
  PacienteEstadistica,
  RankingPaciente,
  NuevosVsRecurrentesPunto,
  ResumenPacientesEstadistica,
  InsightEstadistica,
  ResumenCajaDiaria,
  ReporteEstadistica,
  ExportacionReporteRequest,
  ExportacionReporteResponse,
} from './models/estadisticas.model';
import { FiltroEstadisticas } from './models/filtros-estadisticas.model';

@Injectable({ providedIn: 'root' })
export class EstadisticasMockService {

  // ─── Filters ───────────────────────────────────────────────────────────────

  getFiltrosIniciales(): FiltroEstadisticas {
    const hoy = new Date();
    return {
      rango: 'mes',
      fechaDesde: this.toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
      fechaHasta: this.toIso(hoy),
      profesional: '',
      estadoCita: 'todos',
      metodoPago: 'todos',
    };
  }

  // ─── KPI Summary ───────────────────────────────────────────────────────────

  getResumenKpis(): EstadisticasResumen {
    return {
      citasHoy: 4,
      citasMes: 48,
      pacientesNuevosMes: 7,
      pacientesRecurrentes: 31,
      ingresosHoy: 320,
      ingresosMes: 3840,
      noAsistencias: 3,
      tasaCancelacion: 8.3,
    };
  }

  getKpiCards(resumen: EstadisticasResumen): KpiCard[] {
    return [
      {
        id: 'citas-hoy',
        label: 'Citas hoy',
        valor: resumen.citasHoy,
        icono: 'calendar-outline',
        color: 'primary',
        tendencia: { valor: 25, direccion: 'up', positivo: true, label: 'vs ayer' },
      },
      {
        id: 'citas-mes',
        label: 'Citas este mes',
        valor: resumen.citasMes,
        icono: 'calendar-number-outline',
        color: 'info',
        tendencia: { valor: 12, direccion: 'up', positivo: true, label: 'vs mes pasado' },
      },
      {
        id: 'pacientes-nuevos',
        label: 'Pacientes nuevos',
        valor: resumen.pacientesNuevosMes,
        icono: 'person-add-outline',
        color: 'success',
        tendencia: { valor: 40, direccion: 'up', positivo: true, label: 'vs mes pasado' },
      },
      {
        id: 'pacientes-recurrentes',
        label: 'Recurrentes',
        valor: resumen.pacientesRecurrentes,
        icono: 'people-outline',
        color: 'purple',
      },
      {
        id: 'ingresos-hoy',
        label: 'Ingresos hoy',
        valor: resumen.ingresosHoy,
        sufijo: '€',
        icono: 'cash-outline',
        color: 'success',
        tendencia: { valor: 5, direccion: 'down', positivo: false, label: 'vs ayer' },
      },
      {
        id: 'ingresos-mes',
        label: 'Ingresos del mes',
        valor: resumen.ingresosMes,
        sufijo: '€',
        icono: 'trending-up-outline',
        color: 'info',
        tendencia: { valor: 18, direccion: 'up', positivo: true, label: 'vs mes pasado' },
      },
      {
        id: 'no-asistencias',
        label: 'No asistencias',
        valor: resumen.noAsistencias,
        icono: 'person-remove-outline',
        color: 'warning',
      },
      {
        id: 'tasa-cancelacion',
        label: 'Cancelaciones',
        valor: resumen.tasaCancelacion,
        sufijo: '%',
        icono: 'close-circle-outline',
        color: 'danger',
        tendencia: { valor: 2, direccion: 'down', positivo: true, label: 'vs mes pasado' },
      },
    ];
  }

  // ─── Citas analytics ───────────────────────────────────────────────────────

  getCitasPorPeriodo(periodo: PeriodoCitas = 'mes'): CitasPorPeriodo[] {
    if (periodo === 'dia') {
      return [
        { fecha: '2026-03-02', label: 'Lun', total: 5,  confirmadas: 3, completadas: 1, canceladas: 1, noAsistio: 0 },
        { fecha: '2026-03-03', label: 'Mar', total: 7,  confirmadas: 4, completadas: 2, canceladas: 1, noAsistio: 0 },
        { fecha: '2026-03-04', label: 'Mié', total: 3,  confirmadas: 2, completadas: 0, canceladas: 1, noAsistio: 0 },
        { fecha: '2026-03-05', label: 'Jue', total: 6,  confirmadas: 3, completadas: 2, canceladas: 0, noAsistio: 1 },
        { fecha: '2026-03-06', label: 'Vie', total: 8,  confirmadas: 5, completadas: 3, canceladas: 0, noAsistio: 0 },
        { fecha: '2026-03-07', label: 'Sáb', total: 4,  confirmadas: 2, completadas: 1, canceladas: 1, noAsistio: 0 },
        { fecha: '2026-03-08', label: 'Hoy', total: 4,  confirmadas: 4, completadas: 0, canceladas: 0, noAsistio: 0 },
      ];
    }
    if (periodo === 'semana') {
      return [
        { fecha: '2026-01-19', label: 'Sem 1', total: 22, confirmadas: 10, completadas: 9,  canceladas: 2, noAsistio: 1 },
        { fecha: '2026-01-26', label: 'Sem 2', total: 25, confirmadas: 12, completadas: 10, canceladas: 2, noAsistio: 1 },
        { fecha: '2026-02-02', label: 'Sem 3', total: 19, confirmadas: 9,  completadas: 8,  canceladas: 1, noAsistio: 1 },
        { fecha: '2026-02-09', label: 'Sem 4', total: 28, confirmadas: 14, completadas: 11, canceladas: 2, noAsistio: 1 },
        { fecha: '2026-02-16', label: 'Sem 5', total: 24, confirmadas: 11, completadas: 10, canceladas: 2, noAsistio: 1 },
        { fecha: '2026-02-23', label: 'Sem 6', total: 27, confirmadas: 13, completadas: 11, canceladas: 2, noAsistio: 1 },
        { fecha: '2026-03-02', label: 'Sem 7', total: 30, confirmadas: 15, completadas: 12, canceladas: 2, noAsistio: 1 },
        { fecha: '2026-03-08', label: 'Sem 8', total: 18, confirmadas: 9,  completadas: 0,  canceladas: 1, noAsistio: 0 },
      ];
    }
    // 'mes' — last 6 months
    return [
      { fecha: '2025-10', label: 'Oct', total: 35, confirmadas: 16, completadas: 14, canceladas: 3, noAsistio: 2 },
      { fecha: '2025-11', label: 'Nov', total: 42, confirmadas: 19, completadas: 17, canceladas: 4, noAsistio: 2 },
      { fecha: '2025-12', label: 'Dic', total: 38, confirmadas: 17, completadas: 16, canceladas: 3, noAsistio: 2 },
      { fecha: '2026-01', label: 'Ene', total: 44, confirmadas: 20, completadas: 18, canceladas: 4, noAsistio: 2 },
      { fecha: '2026-02', label: 'Feb', total: 40, confirmadas: 18, completadas: 16, canceladas: 4, noAsistio: 2 },
      { fecha: '2026-03', label: 'Mar', total: 48, confirmadas: 18, completadas: 15, canceladas: 4, noAsistio: 2 },
    ];
  }

  getEstadosCita(): EstadoCitaEstadistica[] {
    const datos = [
      { estado: 'Confirmada', total: 18, color: '#6366f1' },
      { estado: 'Completada', total: 15, color: '#10b981' },
      { estado: 'Pendiente',  total: 8,  color: '#f59e0b' },
      { estado: 'Cancelada',  total: 4,  color: '#ef4444' },
      { estado: 'No asistió', total: 2,  color: '#64748b' },
      { estado: 'Pospuesta',  total: 1,  color: '#8b5cf6' },
    ];
    const total = datos.reduce((s, d) => s + d.total, 0);
    return datos.map(d => ({
      ...d,
      porcentaje: parseFloat(((d.total / total) * 100).toFixed(1)),
    }));
  }

  getResumenCitas(): ResumenCitasEstadistica {
    return {
      totalPeriodo: 48,
      estadoPredominante: 'Confirmada',
      horasMasOcupadas: [
        { hora: '10:00', citas: 12 },
        { hora: '09:00', citas: 10 },
        { hora: '11:00', citas: 9  },
      ],
      diasMasOcupados: [
        { dia: 'Jueves',    citas: 11 },
        { dia: 'Martes',    citas: 10 },
        { dia: 'Miércoles', citas: 9  },
      ],
    };
  }

  getIngresosPorPeriodo(periodo: PeriodoCitas = 'mes'): IngresoPorPeriodo[] {
    if (periodo === 'dia') {
      return [
        { fecha: '2026-03-02', label: 'Lun', total: 400,  efectivo: 120, transferencia: 200, tarjeta: 80,  pendiente: 0  },
        { fecha: '2026-03-03', label: 'Mar', total: 560,  efectivo: 160, transferencia: 240, tarjeta: 160, pendiente: 0  },
        { fecha: '2026-03-04', label: 'Mié', total: 360,  efectivo: 80,  transferencia: 200, tarjeta: 80,  pendiente: 0  },
        { fecha: '2026-03-05', label: 'Jue', total: 480,  efectivo: 120, transferencia: 240, tarjeta: 120, pendiente: 0  },
        { fecha: '2026-03-06', label: 'Vie', total: 640,  efectivo: 200, transferencia: 280, tarjeta: 160, pendiente: 0  },
        { fecha: '2026-03-07', label: 'Sáb', total: 440,  efectivo: 80,  transferencia: 200, tarjeta: 80,  pendiente: 80 },
        { fecha: '2026-03-08', label: 'Hoy', total: 320,  efectivo: 80,  transferencia: 160, tarjeta: 80,  pendiente: 0  },
      ];
    }
    if (periodo === 'semana') {
      return [
        { fecha: '2026-01-19', label: 'Sem 1', total: 2100, efectivo: 620,  transferencia: 980,  tarjeta: 500, pendiente: 0   },
        { fecha: '2026-01-26', label: 'Sem 2', total: 2480, efectivo: 720,  transferencia: 1120, tarjeta: 640, pendiente: 0   },
        { fecha: '2026-02-02', label: 'Sem 3', total: 1920, efectivo: 560,  transferencia: 880,  tarjeta: 480, pendiente: 0   },
        { fecha: '2026-02-09', label: 'Sem 4', total: 2760, efectivo: 800,  transferencia: 1240, tarjeta: 720, pendiente: 0   },
        { fecha: '2026-02-16', label: 'Sem 5', total: 2340, efectivo: 680,  transferencia: 1040, tarjeta: 620, pendiente: 0   },
        { fecha: '2026-02-23', label: 'Sem 6', total: 2600, efectivo: 760,  transferencia: 1160, tarjeta: 680, pendiente: 0   },
        { fecha: '2026-03-02', label: 'Sem 7', total: 2840, efectivo: 840,  transferencia: 1280, tarjeta: 720, pendiente: 0   },
        { fecha: '2026-03-08', label: 'Sem 8', total: 1320, efectivo: 400,  transferencia: 600,  tarjeta: 320, pendiente: 220 },
      ];
    }
    // 'mes' — last 6 months
    return [
      { fecha: '2025-10', label: 'Oct', total: 8400,  efectivo: 2400, transferencia: 3800, tarjeta: 2200, pendiente: 0   },
      { fecha: '2025-11', label: 'Nov', total: 9200,  efectivo: 2640, transferencia: 4160, tarjeta: 2400, pendiente: 0   },
      { fecha: '2025-12', label: 'Dic', total: 8760,  efectivo: 2520, transferencia: 3960, tarjeta: 2280, pendiente: 0   },
      { fecha: '2026-01', label: 'Ene', total: 9600,  efectivo: 2760, transferencia: 4320, tarjeta: 2520, pendiente: 0   },
      { fecha: '2026-02', label: 'Feb', total: 9100,  efectivo: 2620, transferencia: 4080, tarjeta: 2400, pendiente: 0   },
      { fecha: '2026-03', label: 'Mar', total: 3840,  efectivo: 1120, transferencia: 1720, tarjeta: 1000, pendiente: 220 },
    ];
  }

  getIngresosPorMetodoPago(): IngresoPorMetodoPago[] {
    const datos = [
      { metodo: 'Transferencia', total: 1720, color: '#6366f1' },
      { metodo: 'Efectivo',      total: 1120, color: '#10b981' },
      { metodo: 'Débito',        total: 560,  color: '#0ea5e9' },
      { metodo: 'Crédito',       total: 440,  color: '#f59e0b' },
    ];
    const total = datos.reduce((s, d) => s + d.total, 0);
    return datos.map(d => ({
      ...d,
      porcentaje: parseFloat(((d.total / total) * 100).toFixed(1)),
    }));
  }

  getResumenIngresos(): ResumenIngresosEstadistica {
    return {
      totalPeriodo: 3840,
      montoPendiente: 220,
      citasPagadas: 44,
      citasPendientes: 4,
      metodoPrincipal: 'Transferencia',
    };
  }

  getPacientesEstadisticas(): PacienteEstadistica[] {
    return [
      { id: 1, nombre: 'María',    apellido: 'Torres',    totalCitas: 6, noAsistencias: 0, ingresos: 480, esNuevo: false },
      { id: 2, nombre: 'Carlos',   apellido: 'Ruiz',      totalCitas: 4, noAsistencias: 1, ingresos: 240, esNuevo: false },
      { id: 3, nombre: 'Laura',    apellido: 'Gómez',     totalCitas: 5, noAsistencias: 0, ingresos: 400, esNuevo: false },
      { id: 4, nombre: 'Roberto',  apellido: 'Sanz',      totalCitas: 3, noAsistencias: 0, ingresos: 270, esNuevo: true  },
      { id: 5, nombre: 'Ana',      apellido: 'López',     totalCitas: 4, noAsistencias: 0, ingresos: 320, esNuevo: false },
      { id: 6, nombre: 'Pedro',    apellido: 'Martín',    totalCitas: 2, noAsistencias: 0, ingresos: 200, esNuevo: true  },
      { id: 7, nombre: 'Sofía',    apellido: 'Fernández', totalCitas: 2, noAsistencias: 1, ingresos: 60,  esNuevo: true  },
      { id: 8, nombre: 'Diego',    apellido: 'Herrera',   totalCitas: 1, noAsistencias: 0, ingresos: 75,  esNuevo: true  },
    ];
  }

  getResumenCajaDiaria(): ResumenCajaDiaria {
    const hoy = this.toIso(new Date());
    return {
      fecha: hoy,
      totalCobrado: 320,
      efectivo: 80,
      transferencia: 160,
      debito: 40,
      credito: 40,
      pagosExentos: 0,
      pagosPendientes: 60,
      citasCobradas: 4,
    };
  }

  // ─── Pacientes analytics ────────────────────────────────────────────

  getNuevosVsRecurrentes(): NuevosVsRecurrentesPunto[] {
    return [
      { label: 'Oct', nuevos: 4, recurrentes: 18 },
      { label: 'Nov', nuevos: 6, recurrentes: 21 },
      { label: 'Dic', nuevos: 3, recurrentes: 22 },
      { label: 'Ene', nuevos: 7, recurrentes: 23 },
      { label: 'Feb', nuevos: 5, recurrentes: 24 },
      { label: 'Mar', nuevos: 7, recurrentes: 31 },
    ];
  }

  getResumenPacientes(): ResumenPacientesEstadistica {
    return {
      totalActivos: 38,
      nuevosEsteMes: 7,
      recurrentesEsteMes: 31,
      tasaRetencion: 81.6,
    };
  }

  getRankingMasCitas(): RankingPaciente[] {
    const colores = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'];
    const datos = [
      { id: 1, nombre: 'María',   apellido: 'Torres',    valor: 6 },
      { id: 3, nombre: 'Laura',   apellido: 'Gómez',     valor: 5 },
      { id: 2, nombre: 'Carlos',  apellido: 'Ruiz',      valor: 4 },
      { id: 5, nombre: 'Ana',     apellido: 'López',     valor: 4 },
      { id: 4, nombre: 'Roberto', apellido: 'Sanz',      valor: 3 },
    ];
    return datos.map((d, i) => ({
      posicion: i + 1,
      ...d,
      avatarInicial: d.nombre.charAt(0),
      colorAvatar: colores[i],
    }));
  }

  getRankingMasNoAsistencias(): RankingPaciente[] {
    const colores = ['#ef4444', '#f59e0b', '#64748b', '#0ea5e9', '#8b5cf6'];
    const datos = [
      { id: 2, nombre: 'Carlos', apellido: 'Ruiz',      valor: 1 },
      { id: 7, nombre: 'Sofía',  apellido: 'Fernández', valor: 1 },
    ];
    return datos.map((d, i) => ({
      posicion: i + 1,
      ...d,
      avatarInicial: d.nombre.charAt(0),
      colorAvatar: colores[i],
    }));
  }

  getInsights(): InsightEstadistica[] {
    return [
      {
        id: 'dia-mas-citas',
        icono: 'today-outline',
        titulo: 'Día más activo',
        valor: 'Jueves',
        descripcion: '11 citas en promedio',
        tipo: 'primary',
      },
      {
        id: 'hora-mas-demandada',
        icono: 'time-outline',
        titulo: 'Hora más demandada',
        valor: '10:00 AM',
        descripcion: '12 citas este mes',
        tipo: 'info',
      },
      {
        id: 'paciente-mas-visitas',
        icono: 'person-outline',
        titulo: 'Paciente más fiel',
        valor: 'M. Torres',
        descripcion: '6 visitas este mes',
        tipo: 'success',
      },
      {
        id: 'tasa-no-asistencia',
        icono: 'alert-circle-outline',
        titulo: 'No asistencia',
        valor: '4.2%',
        descripcion: '2 citas perdidas',
        tipo: 'warning',
      },
      {
        id: 'tasa-retencion',
        icono: 'repeat-outline',
        titulo: 'Retención',
        valor: '81.6%',
        descripcion: 'Pacientes recurrentes',
        tipo: 'purple',
      },
      {
        id: 'ingreso-por-cita',
        icono: 'cash-outline',
        titulo: 'Ingreso × cita',
        valor: '€80',
        descripcion: 'Promedio este mes',
        tipo: 'success',
      },
    ];
  }

  // ─── Utility ───────────────────────────────────────────────────────────────
  // ─── Reportes ────────────────────────────────────────────────

  getReportes(): ReporteEstadistica[] {
    const ahora = new Date().toISOString();
    return [
      {
        id: 'rpt-citas',
        tipo: 'citas',
        titulo: 'Reporte de Citas',
        descripcion: 'Detalle de todas las citas del período: estado, profesional, paciente y hora.',
        icono: 'calendar-outline',
        colorIcono: '#6366f1',
        totalRegistros: 48,
        resumenTexto: '48 citas · 15 completadas · 4 canceladas',
        periodoLabel: 'Marzo 2026',
        ultimaActualizacion: ahora,
        filas: [
          { fecha: '2026-03-08', paciente: 'María Torres',    hora: '10:00', estado: 'Confirmada',  profesional: 'Dr. López' },
          { fecha: '2026-03-08', paciente: 'Carlos Ruiz',     hora: '11:00', estado: 'Completada',  profesional: 'Dr. López' },
          { fecha: '2026-03-07', paciente: 'Laura Gómez',    hora: '09:00', estado: 'Completada',  profesional: 'Dr. López' },
          { fecha: '2026-03-07', paciente: 'Roberto Sanz',    hora: '10:30', estado: 'Cancelada',   profesional: 'Dr. López' },
          { fecha: '2026-03-06', paciente: 'Ana López',      hora: '12:00', estado: 'Completada',  profesional: 'Dr. López' },
        ],
      },
      {
        id: 'rpt-ingresos',
        tipo: 'ingresos',
        titulo: 'Reporte de Ingresos',
        descripcion: 'Ingresos por cita, método de pago y estado del cobro en el período.',
        icono: 'trending-up-outline',
        colorIcono: '#059669',
        totalRegistros: 44,
        resumenTexto: '€3,840 cobrados · €220 pendientes',
        periodoLabel: 'Marzo 2026',
        ultimaActualizacion: ahora,
        filas: [
          { fecha: '2026-03-08', paciente: 'María Torres',    monto: 80,  metodo: 'Transferencia', estado: 'Cobrado'   },
          { fecha: '2026-03-08', paciente: 'Carlos Ruiz',     monto: 80,  metodo: 'Efectivo',       estado: 'Cobrado'   },
          { fecha: '2026-03-07', paciente: 'Laura Gómez',    monto: 80,  metodo: 'Transferencia', estado: 'Cobrado'   },
          { fecha: '2026-03-07', paciente: 'Roberto Sanz',    monto: 80,  metodo: 'Débito',         estado: 'Pendiente' },
          { fecha: '2026-03-06', paciente: 'Ana López',      monto: 80,  metodo: 'Crédito',        estado: 'Cobrado'   },
        ],
      },
      {
        id: 'rpt-pacientes',
        tipo: 'pacientes',
        titulo: 'Reporte de Pacientes Nuevos',
        descripcion: 'Pacientes que se registraron o tuvieron su primera cita en el período.',
        icono: 'person-add-outline',
        colorIcono: '#0ea5e9',
        totalRegistros: 7,
        resumenTexto: '7 nuevos · 4 con cita confirmada',
        periodoLabel: 'Marzo 2026',
        ultimaActualizacion: ahora,
        filas: [
          { fecha: '2026-03-02', paciente: 'Roberto Sanz',    correo: 'r.sanz@mail.com',    citas: 3 },
          { fecha: '2026-03-03', paciente: 'Pedro Martín',    correo: 'p.martin@mail.com',  citas: 2 },
          { fecha: '2026-03-04', paciente: 'Sofía Fernández', correo: 's.fernandez@mail.com', citas: 2 },
          { fecha: '2026-03-06', paciente: 'Diego Herrera',   correo: 'd.herrera@mail.com', citas: 1 },
        ],
      },
      {
        id: 'rpt-pendientes',
        tipo: 'pagos-pendientes',
        titulo: 'Pagos Pendientes',
        descripcion: 'Citas con pago pendiente o parcial que requieren seguimiento.',
        icono: 'hourglass-outline',
        colorIcono: '#f59e0b',
        totalRegistros: 4,
        resumenTexto: '€220 por cobrar · 4 citas',
        periodoLabel: 'Marzo 2026',
        ultimaActualizacion: ahora,
        filas: [
          { fecha: '2026-03-07', paciente: 'Roberto Sanz',    monto: 80,  diasPendiente: 1 },
          { fecha: '2026-03-05', paciente: 'Pedro Martín',    monto: 80,  diasPendiente: 3 },
          { fecha: '2026-03-04', paciente: 'Sofía Fernández', monto: 60,  diasPendiente: 4 },
        ],
      },
      {
        id: 'rpt-no-asistencias',
        tipo: 'no-asistencias',
        titulo: 'No Asistencias',
        descripcion: 'Pacientes que no se presentaron a sus citas en el período seleccionado.',
        icono: 'person-remove-outline',
        colorIcono: '#ef4444',
        totalRegistros: 2,
        resumenTexto: '2 no asistencias · 4.2% del total',
        periodoLabel: 'Marzo 2026',
        ultimaActualizacion: ahora,
        filas: [
          { fecha: '2026-03-05', paciente: 'Carlos Ruiz',     hora: '11:00', motivo: 'Sin aviso' },
          { fecha: '2026-03-06', paciente: 'Sofía Fernández', hora: '10:00', motivo: 'Sin aviso' },
        ],
      },
    ];
  }

  getReporteDetalle(id: string): ReporteEstadistica | undefined {
    return this.getReportes().find(r => r.id === id);
  }

  /**
   * Mock export — returns a resolved promise so the UI can follow the same
   * async flow that a real HTTP call would use.
   * Replace the body with an HttpClient call when the backend is ready.
   */
  exportarPdf(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    console.log('[mock] exportarPdf', req);
    return Promise.resolve({
      ok: true,
      url: undefined, // real backend will return a download URL
      mensaje: `PDF “${req.nombreArchivo}.pdf” generado correctamente.`,
    });
  }

  exportarExcel(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    console.log('[mock] exportarExcel', req);
    return Promise.resolve({
      ok: true,
      url: undefined,
      mensaje: `Excel “${req.nombreArchivo}.xlsx” generado correctamente.`,
    });
  }
  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
