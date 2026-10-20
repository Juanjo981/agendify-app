import {
  mapActividadEventoToItem,
  mapIndicadoresToIndiceView,
  mapKpiAsistencia,
  mapKpiProximaCita,
  mapKpiSesiones,
} from './paciente-resumen.mappers';
import { PacienteResumenIndicadoresDto } from './models/paciente-resumen.models';
import { labelClasificacionResumen, toneClasificacionPositiva } from './paciente-resumen.labels';
import { tiempoRelativoCalendario } from 'src/app/shared/utils/date.utils';

function baseIndicadores(
  overrides: Partial<PacienteResumenIndicadoresDto> = {},
): PacienteResumenIndicadoresDto {
  return {
    id_paciente: 1,
    ventana_dias: 90,
    fecha_desde: '2026-04-29T00:00:00',
    fecha_hasta: '2026-07-28T12:00:00',
    puntaje_general: 72,
    clasificacion_general: 'BUENO',
    asistencia: {
      porcentaje: 93,
      clasificacion: 'EXCELENTE',
      citas_completadas: 14,
      citas_no_asistidas: 1,
      citas_computables: 15,
    },
    cancelaciones: { cantidad: 1, porcentaje: 5, clasificacion: 'MUY_BAJAS' },
    reprogramaciones: { cantidad: 3, porcentaje: 15, clasificacion: 'MODERADAS' },
    ausencias: { cantidad: 0, porcentaje: 0, clasificacion: 'NINGUNA' },
    frecuencia: {
      promedio_dias: 10,
      clasificacion: 'CONSTANTE',
      citas_completadas_consideradas: 10,
    },
    total_sesiones: 8,
    proxima_cita: {
      existe: true,
      id_cita: 99,
      fecha_inicio: '2026-07-30T18:00:00',
      fecha_fin: '2026-07-30T19:00:00',
      estado_cita: 'CONFIRMADA',
      motivo: 'Seguimiento',
    },
    ...overrides,
  };
}

describe('paciente-resumen.mappers', () => {
  it('mapea puntaje y clasificación con datos completos', () => {
    const view = mapIndicadoresToIndiceView(baseIndicadores());
    expect(view.sinDatos).toBeFalse();
    expect(view.score).toBe(72);
    expect(view.estado).toBe('Bueno');
    expect(view.estadoTone).toBe('ok');
    expect(view.factores.map(f => f.nombre)).toEqual([
      'Asistencia',
      'Cancelaciones',
      'Reprogramaciones',
      'Ausencias',
      'Frecuencia',
    ]);
    expect(view.factores[0].valor).toBe('Excelente');
  });

  it('sin datos suficientes no muestra puntaje falso', () => {
    const view = mapIndicadoresToIndiceView(
      baseIndicadores({
        clasificacion_general: 'SIN_DATOS',
        puntaje_general: 0,
        asistencia: {
          porcentaje: null,
          clasificacion: 'SIN_DATOS',
          citas_completadas: 0,
          citas_no_asistidas: 0,
          citas_computables: 0,
        },
      }),
    );
    expect(view.sinDatos).toBeTrue();
    expect(view.score).toBeNull();
    expect(view.barWidthPct).toBe(0);
    expect(view.estado).toBe('Sin datos suficientes');
    expect(view.estadoTone).toBe('neutral');
  });

  it('KPI asistencia sin citas computables', () => {
    const kpi = mapKpiAsistencia(
      baseIndicadores({
        asistencia: {
          porcentaje: null,
          clasificacion: 'SIN_DATOS',
          citas_completadas: 0,
          citas_no_asistidas: 0,
          citas_computables: 0,
        },
      }),
    );
    expect(kpi.valor).toBe('—');
    expect(kpi.meta).toBe('Aún no hay citas computables');
    expect(kpi.sinDatos).toBeTrue();
  });

  it('KPI asistencia con porcentaje real', () => {
    const kpi = mapKpiAsistencia(baseIndicadores());
    expect(kpi.valor).toBe('93');
    expect(kpi.sinDatos).toBeFalse();
  });

  it('KPI sesiones vacías y con datos', () => {
    expect(mapKpiSesiones(baseIndicadores({ total_sesiones: 0 })).meta).toBe(
      'Sin sesiones registradas',
    );
    expect(mapKpiSesiones(baseIndicadores({ total_sesiones: 8 })).valor).toBe('8');
  });

  it('KPI próxima cita vacía y con datos', () => {
    const vacia = mapKpiProximaCita(
      baseIndicadores({ proxima_cita: { existe: false } }),
    );
    expect(vacia.valor).toBe('Sin próxima cita');
    expect(vacia.sinCita).toBeTrue();

    const conCita = mapKpiProximaCita(baseIndicadores());
    expect(conCita.sinCita).toBeFalse();
    expect(conCita.valor.toLowerCase()).toContain('julio');
  });

  it('mapea evento de timeline con icono y tono', () => {
    const item = mapActividadEventoToItem({
      id: 'SESION-1',
      tipo: 'SESION_REGISTRADA',
      titulo: 'Sesión registrada',
      fecha_hora: '2026-07-28T10:00:00',
      icono: 'sesion',
    });
    expect(item.titulo).toBe('Sesión registrada');
    expect(item.icono).toBe('checkmark-circle-outline');
    expect(item.tone).toBe('success');
  });

  it('KPI sesiones con 0 no usa fallback de ejemplo', () => {
    const kpi = mapKpiSesiones(baseIndicadores({ total_sesiones: 0 }));
    expect(kpi.valor).toBe('0');
    expect(kpi.meta).toBe('Sin sesiones registradas');
    expect(kpi.valor).not.toBe('8');
    expect(kpi.valor).not.toBe('17');
  });

  it('al cambiar la respuesta del servicio cambia el mapeo visible', () => {
    const a = mapIndicadoresToIndiceView(baseIndicadores({ puntaje_general: 55, clasificacion_general: 'REGULAR' }));
    const b = mapIndicadoresToIndiceView(baseIndicadores({ puntaje_general: 93, clasificacion_general: 'EXCELENTE' }));
    expect(a.score).toBe(55);
    expect(a.estado).toBe('Regular');
    expect(b.score).toBe(93);
    expect(b.estado).toBe('Excelente');
    expect(a.score).not.toBe(b.score);
  });

  it('timeline vacío no inventa eventos', () => {
    const eventos: [] = [];
    expect(eventos.map(ev => mapActividadEventoToItem(ev))).toEqual([]);
  });

  it('próxima cita y sesiones salen del DTO, no de constantes', () => {
    const prox = mapKpiProximaCita(
      baseIndicadores({
        proxima_cita: {
          existe: true,
          fecha_inicio: '2026-08-05T15:30:00',
        },
      }),
    );
    expect(prox.valor.toLowerCase()).toContain('agosto');
    expect(prox.valor).not.toContain('31');
    expect(mapKpiSesiones(baseIndicadores({ total_sesiones: 42 })).valor).toBe('42');
  });

  it('no introduce textos Placeholder ni datos de ejemplo', () => {
    const view = mapIndicadoresToIndiceView(baseIndicadores());
    const blob = JSON.stringify({
      view,
      asis: mapKpiAsistencia(baseIndicadores()),
      ses: mapKpiSesiones(baseIndicadores()),
      prox: mapKpiProximaCita(baseIndicadores()),
    });
    expect(blob.toLowerCase()).not.toContain('placeholder');
    expect(blob.toLowerCase()).not.toContain('datos de ejemplo');
    expect(blob.toLowerCase()).not.toContain('vista preliminar');
  });
});

describe('paciente-resumen.labels', () => {
  it('centraliza labels y tones', () => {
    expect(labelClasificacionResumen('EXCELENTE')).toBe('Excelente');
    expect(labelClasificacionResumen('REQUIERE_ATENCION')).toBe('Requiere atención');
    expect(labelClasificacionResumen('ESPORADICA')).toBe('Esporádica');
    expect(toneClasificacionPositiva('BUENO')).toBe('ok');
    expect(toneClasificacionPositiva('SIN_DATOS')).toBe('neutral');
  });
});

describe('tiempoRelativoCalendario', () => {
  const now = new Date(2026, 6, 28, 15, 0, 0); // 28 jul 2026

  it('Hoy / Ayer / Hace 3 días / Hace 1 semana', () => {
    expect(tiempoRelativoCalendario('2026-07-28T10:00:00', now)).toBe('Hoy');
    expect(tiempoRelativoCalendario('2026-07-27T10:00:00', now)).toBe('Ayer');
    expect(tiempoRelativoCalendario('2026-07-25T10:00:00', now)).toBe('Hace 3 días');
    expect(tiempoRelativoCalendario('2026-07-21T10:00:00', now)).toBe('Hace 1 semana');
  });
});
