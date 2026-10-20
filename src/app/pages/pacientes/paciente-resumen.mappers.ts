import { ActividadRecienteItem, ActividadTone } from './components/actividad-reciente/actividad-reciente.models';
import {
  IndiceTratamientoView,
  KpiAsistenciaView,
  KpiProximaCitaView,
  KpiSesionesView,
  PacienteActividadEventoDto,
  PacienteResumenIndicadoresDto,
  ResumenFactorView,
} from './models/paciente-resumen.models';
import {
  labelClasificacionResumen,
  toneClasificacionIncidencia,
  toneClasificacionPositiva,
} from './paciente-resumen.labels';
import { formatLocalDate, formatLocalTime } from 'src/app/shared/utils/local-date.utils';
import { tiempoRelativoCalendario } from 'src/app/shared/utils/date.utils';

const ICONO_BACKEND_A_ION: Record<string, string> = {
  cita: 'calendar-outline',
  sesion: 'checkmark-circle-outline',
  nota: 'document-text-outline',
  receta: 'medkit-outline',
  evaluacion: 'clipboard-outline',
};

const TONE_POR_TIPO: Record<string, ActividadTone> = {
  CITA_CREADA: 'blue',
  CITA_CONFIRMADA: 'blue',
  CITA_COMPLETADA: 'success',
  CITA_CANCELADA: 'warning',
  CITA_REPROGRAMADA: 'warning',
  AUSENCIA: 'warning',
  SESION_REGISTRADA: 'success',
  NOTA_CLINICA_CREADA: 'primary',
  RECETA_CREADA: 'teal',
  RECETA_EMITIDA: 'teal',
  RECETA_NUEVA_VERSION: 'teal',
  EVALUACION_CREADA: 'purple',
  EVALUACION_COMPLETADA: 'purple',
  EVALUACION_ANULADA: 'warning',
};

export function mapIndicadoresToIndiceView(
  dto: PacienteResumenIndicadoresDto,
): IndiceTratamientoView {
  const sinDatos = dto.clasificacion_general === 'SIN_DATOS';
  const factores: ResumenFactorView[] = [
    {
      nombre: 'Asistencia',
      valor: labelClasificacionResumen(dto.asistencia?.clasificacion),
      tone: toneClasificacionPositiva(dto.asistencia?.clasificacion),
    },
    {
      nombre: 'Cancelaciones',
      valor: labelClasificacionResumen(dto.cancelaciones?.clasificacion),
      tone: toneClasificacionIncidencia(dto.cancelaciones?.clasificacion),
    },
    {
      nombre: 'Reprogramaciones',
      valor: labelClasificacionResumen(dto.reprogramaciones?.clasificacion),
      tone: toneClasificacionIncidencia(dto.reprogramaciones?.clasificacion),
    },
    {
      nombre: 'Ausencias',
      valor: labelClasificacionResumen(dto.ausencias?.clasificacion),
      tone: toneClasificacionIncidencia(dto.ausencias?.clasificacion),
    },
    {
      nombre: 'Frecuencia',
      valor: labelClasificacionResumen(dto.frecuencia?.clasificacion),
      tone: toneClasificacionPositiva(dto.frecuencia?.clasificacion),
    },
  ];

  if (sinDatos) {
    return {
      sinDatos: true,
      score: null,
      max: 100,
      estado: labelClasificacionResumen('SIN_DATOS'),
      estadoTone: 'neutral',
      leyenda: 'Aún no hay actividad suficiente para calcular el estado',
      barWidthPct: 0,
      factores,
    };
  }

  const score = Math.max(0, Math.min(100, dto.puntaje_general ?? 0));
  return {
    sinDatos: false,
    score,
    max: 100,
    estado: labelClasificacionResumen(dto.clasificacion_general),
    estadoTone: toneClasificacionPositiva(dto.clasificacion_general),
    leyenda: `Basado en los últimos ${dto.ventana_dias ?? 90} días`,
    barWidthPct: score,
    factores,
  };
}

export function mapKpiAsistencia(dto: PacienteResumenIndicadoresDto): KpiAsistenciaView {
  const pct = dto.asistencia?.porcentaje;
  const computables = dto.asistencia?.citas_computables ?? 0;
  if (pct == null || computables === 0 || dto.asistencia?.clasificacion === 'SIN_DATOS') {
    return {
      valor: '—',
      meta: 'Aún no hay citas computables',
      sinDatos: true,
    };
  }
  const rounded = Math.round(pct);
  return {
    valor: `${rounded}`,
    meta: labelClasificacionResumen(dto.asistencia.clasificacion),
    sinDatos: false,
  };
}

export function mapKpiSesiones(dto: PacienteResumenIndicadoresDto): KpiSesionesView {
  const total = dto.total_sesiones ?? 0;
  return {
    valor: String(total),
    meta: total === 0 ? 'Sin sesiones registradas' : total === 1 ? '1 sesión registrada' : `${total} sesiones registradas`,
  };
}

export function mapKpiProximaCita(dto: PacienteResumenIndicadoresDto): KpiProximaCitaView {
  const proxima = dto.proxima_cita;
  if (!proxima?.existe || !proxima.fecha_inicio) {
    return {
      valor: 'Sin próxima cita',
      meta: '—',
      sinCita: true,
    };
  }
  return {
    valor: formatFechaCitaCorta(proxima.fecha_inicio),
    meta: formatHoraCita(proxima.fecha_inicio),
    sinCita: false,
  };
}

export function mapActividadEventoToItem(
  evento: PacienteActividadEventoDto,
  now = new Date(),
): ActividadRecienteItem {
  const iconKey = (evento.icono ?? '').toLowerCase();
  return {
    id: evento.id,
    cuando: tiempoRelativoCalendario(evento.fecha_hora, now),
    titulo: evento.titulo?.trim() || labelTipoActividad(evento.tipo),
    icono: ICONO_BACKEND_A_ION[iconKey] ?? iconoPorTipo(evento.tipo),
    tone: TONE_POR_TIPO[evento.tipo] ?? 'primary',
  };
}

function iconoPorTipo(tipo: string): string {
  if (tipo.startsWith('RECETA')) return 'medkit-outline';
  if (tipo.startsWith('EVALUACION')) return 'clipboard-outline';
  if (tipo.startsWith('NOTA')) return 'document-text-outline';
  if (tipo === 'SESION_REGISTRADA') return 'checkmark-circle-outline';
  return 'calendar-outline';
}

function labelTipoActividad(tipo: string): string {
  return tipo.replace(/_/g, ' ').toLowerCase();
}

/** "24 de julio" en es-MX sin desfase por zona. */
export function formatFechaCitaCorta(fechaHora: string): string {
  const isoDate = formatLocalDate(fechaHora);
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

/** "6:00 p. m." en es-MX. */
export function formatHoraCita(fechaHora: string): string {
  const time = formatLocalTime(fechaHora);
  if (!time) {
    // Intentar extraer de datetime ISO local
    const m = fechaHora.match(/T(\d{2}):(\d{2})/);
    if (!m) return '—';
    const hh = Number(m[1]);
    const mm = m[2];
    const date = new Date(2000, 0, 1, hh, Number(mm));
    return date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  }
  const [hh, mm] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hh, mm);
  return date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}
