import {
  ResumenFactorTone,
} from './models/paciente-resumen.models';

/** Labels centralizados para clasificaciones del resumen. */
export const RESUMEN_CLASIFICACION_LABELS: Record<string, string> = {
  EXCELENTE: 'Excelente',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  REQUIERE_ATENCION: 'Requiere atención',
  SIN_DATOS: 'Sin datos suficientes',
  NINGUNA: 'Ninguna',
  MUY_BAJAS: 'Muy bajas',
  BAJAS: 'Bajas',
  MODERADAS: 'Moderadas',
  ALTAS: 'Altas',
  FRECUENTES: 'Frecuentes',
  CONSTANTE: 'Constante',
  ESPORADICA: 'Esporádica',
  INACTIVA: 'Inactiva',
};

/** Tones para clasificaciones “positivas” (asistencia / general / frecuencia). */
const TONE_POSITIVO: Record<string, ResumenFactorTone> = {
  EXCELENTE: 'ok',
  BUENO: 'ok',
  CONSTANTE: 'ok',
  REGULAR: 'warn',
  ESPORADICA: 'warn',
  REQUIERE_ATENCION: 'risk',
  INACTIVA: 'risk',
  SIN_DATOS: 'neutral',
};

/** Tones para clasificaciones de incidencias (cancelaciones / ausencias / reprogramaciones). */
const TONE_INCIDENCIA: Record<string, ResumenFactorTone> = {
  NINGUNA: 'ok',
  MUY_BAJAS: 'ok',
  BAJAS: 'ok',
  MODERADAS: 'warn',
  ALTAS: 'risk',
  FRECUENTES: 'warn',
  SIN_DATOS: 'neutral',
};

export function labelClasificacionResumen(code: string | null | undefined): string {
  if (!code) return RESUMEN_CLASIFICACION_LABELS['SIN_DATOS'];
  return RESUMEN_CLASIFICACION_LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase();
}

export function toneClasificacionPositiva(code: string | null | undefined): ResumenFactorTone {
  if (!code) return 'neutral';
  return TONE_POSITIVO[code] ?? 'neutral';
}

export function toneClasificacionIncidencia(code: string | null | undefined): ResumenFactorTone {
  if (!code) return 'neutral';
  return TONE_INCIDENCIA[code] ?? 'neutral';
}
