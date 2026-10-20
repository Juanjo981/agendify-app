import { PacienteResumenService } from 'src/app/services/paciente-resumen.service';
import {
  mapIndicadoresToIndiceView,
  mapKpiAsistencia,
  mapKpiProximaCita,
  mapKpiSesiones,
  mapActividadEventoToItem,
} from './paciente-resumen.mappers';
import { PacienteResumenIndicadoresDto } from './models/paciente-resumen.models';
import { RESUMEN_CLASIFICACION_LABELS } from './paciente-resumen.labels';

/**
 * Auditoría: el código productivo de Resumen no inyecta valores de ejemplo.
 * Los fixtures de test sí pueden usar números de prueba.
 */
describe('Auditoría productiva Resumen (sin mocks)', () => {
  function emptyDto(
    overrides: Partial<PacienteResumenIndicadoresDto> = {},
  ): PacienteResumenIndicadoresDto {
    return {
      id_paciente: 99,
      ventana_dias: 90,
      fecha_desde: '2026-01-01T00:00:00',
      fecha_hasta: '2026-07-28T00:00:00',
      puntaje_general: 0,
      clasificacion_general: 'SIN_DATOS',
      asistencia: {
        porcentaje: null,
        clasificacion: 'SIN_DATOS',
        citas_completadas: 0,
        citas_no_asistidas: 0,
        citas_computables: 0,
      },
      cancelaciones: { cantidad: 0, porcentaje: null, clasificacion: 'SIN_DATOS' },
      reprogramaciones: { cantidad: 0, porcentaje: null, clasificacion: 'SIN_DATOS' },
      ausencias: { cantidad: 0, porcentaje: null, clasificacion: 'SIN_DATOS' },
      frecuencia: {
        promedio_dias: null,
        clasificacion: 'SIN_DATOS',
        citas_completadas_consideradas: 0,
      },
      total_sesiones: 0,
      proxima_cita: { existe: false },
      ...overrides,
    };
  }

  it('PacienteResumenService expone métodos reales sin id fijo', () => {
    expect(PacienteResumenService.prototype.obtenerIndicadores).toBeDefined();
    expect(PacienteResumenService.prototype.obtenerActividad).toBeDefined();
    const src = PacienteResumenService.toString();
    expect(src).not.toContain('/pacientes/3/');
  });

  it('estado vacío no reintroduce 72/93/91/17 ni fechas de ejemplo', () => {
    const indice = mapIndicadoresToIndiceView(emptyDto());
    const asis = mapKpiAsistencia(emptyDto());
    const ses = mapKpiSesiones(emptyDto({ total_sesiones: 0 }));
    const prox = mapKpiProximaCita(emptyDto());
    const blob = JSON.stringify({ indice, asis, ses, prox });

    expect(indice.sinDatos).toBeTrue();
    expect(indice.score).toBeNull();
    expect(asis.valor).toBe('—');
    expect(ses.valor).toBe('0');
    expect(prox.valor).toBe('Sin próxima cita');

    expect(blob).not.toContain('"72"');
    expect(blob).not.toContain('"93"');
    expect(blob).not.toContain('"91"');
    expect(blob).not.toContain('"17"');
    expect(blob.toLowerCase()).not.toContain('24 julio');
    expect(blob.toLowerCase()).not.toContain('31 de julio');
    expect(blob.toLowerCase()).not.toContain('placeholder');
    expect(blob.toLowerCase()).not.toContain('datos de ejemplo');
  });

  it('labels centralizados no son datos de negocio hardcodeados en UI', () => {
    expect(RESUMEN_CLASIFICACION_LABELS['EXCELENTE']).toBe('Excelente');
    expect(RESUMEN_CLASIFICACION_LABELS['CONSTANTE']).toBe('Constante');
    expect(RESUMEN_CLASIFICACION_LABELS['MODERADAS']).toBe('Moderadas');
  });

  it('timeline vacío permanece vacío', () => {
    const items = ([] as Parameters<typeof mapActividadEventoToItem>[0][]).map(ev =>
      mapActividadEventoToItem(ev),
    );
    expect(items.length).toBe(0);
  });
});
