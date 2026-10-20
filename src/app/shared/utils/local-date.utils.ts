/**
 * Utilidades de fecha/hora clínica (LocalDate / LocalTime).
 * Evita Date.toISOString() para no cambiar el día por zona horaria.
 */
import { formatFecha } from './date.utils';

/** YYYY-MM-DD desde Date local (usa año/mes/día del calendario local). */
export function formatLocalDate(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // Extrae fecha de ISO datetime sin reinterpretar zona
    const isoDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
    const parsed = parseLooseDate(trimmed);
    return parsed ? formatLocalDate(parsed) : null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** HH:mm (o HH:mm:ss si includeSeconds). */
export function formatLocalTime(
  value: Date | string | null | undefined,
  includeSeconds = false,
): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      const mm = m[2];
      const ss = m[3] ?? '00';
      return includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    }
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const hh = String(value.getHours()).padStart(2, '0');
  const mm = String(value.getMinutes()).padStart(2, '0');
  const ss = String(value.getSeconds()).padStart(2, '0');
  return includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

/**
 * Interpreta YYYY-MM-DD como fecha local (mediodía local para evitar bordes DST).
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

/**
 * dd/MM/yyyy para mostrar en UI (es-MX). Cadena vacía si no hay fecha.
 * Solo presentación: el valor enviado al backend sigue siendo ISO.
 */
export function formatDisplayDate(value: Date | string | null | undefined): string {
  const iso = formatLocalDate(value);
  return iso ? formatFecha(iso) : '';
}

/** HH:mm para mostrar en UI. Cadena vacía si no hay hora. */
export function formatDisplayTime(value: Date | string | null | undefined): string {
  return formatLocalTime(value) ?? '';
}

/** Hoy en calendario local como YYYY-MM-DD. */
export function todayLocalDate(): string {
  return formatLocalDate(new Date())!;
}

function parseLooseDate(raw: string): Date | null {
  // dd/MM/yyyy o d/M/yyyy
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const d = Number(slash[1]);
    const mo = Number(slash[2]);
    const y = Number(slash[3]);
    const date = new Date(y, mo - 1, d, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
