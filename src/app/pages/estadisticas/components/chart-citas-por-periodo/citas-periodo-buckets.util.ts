import { CitasPorPeriodo, PeriodoCitas } from '../../models/estadisticas.model';

const empty = (fecha: string, label: string): CitasPorPeriodo => ({
  fecha,
  label,
  total: 0,
  confirmadas: 0,
  completadas: 0,
  canceladas: 0,
  noAsistio: 0,
});

function parseYmdLocal(s: string): Date | null {
  if (!s || s.length < 10) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hoy en calendario local a mediodía (evita saltos DST). */
function startOfTodayLocal(ref = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0, 0);
}

/** Lunes de la semana que contiene `d` (local). */
function mondayOfWeekContaining(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const dow = x.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  return x;
}

/** Lunes aproximado para clave ISO `YYYY-Www`. */
function isoWeekToMonday(isoYear: number, week: number): Date {
  const simple = new Date(isoYear, 0, 1 + (week - 1) * 7, 12, 0, 0, 0);
  const dow = simple.getDay();
  const mon = new Date(simple);
  if (dow <= 4) {
    mon.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    mon.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return mon;
}

function labelMes(keyYyyyMm: string): string {
  const safe = keyYyyyMm.length === 7 ? `${keyYyyyMm}-01` : keyYyyyMm;
  const d = parseYmdLocal(safe.slice(0, 10));
  if (!d) return keyYyyyMm;
  return d.toLocaleDateString('es-MX', { month: 'short' });
}

function labelDia(keyYmd: string): string {
  const d = parseYmdLocal(keyYmd);
  if (!d) return keyYmd;
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
}

function labelSemana(monday: Date): string {
  const sun = new Date(monday);
  sun.setDate(monday.getDate() + 6);
  const sameMonth = monday.getMonth() === sun.getMonth();
  const mShort = monday.toLocaleDateString('es-MX', { month: 'short' });
  if (sameMonth) {
    return `${monday.getDate()}–${sun.getDate()} ${mShort}`;
  }
  const m2 = sun.toLocaleDateString('es-MX', { month: 'short' });
  return `${monday.getDate()} ${mShort} – ${sun.getDate()} ${m2}`;
}

function normalizePeriodKey(fecha: string, periodo: PeriodoCitas): string {
  if (!fecha?.trim()) return '';
  const f = fecha.trim();
  if (periodo === 'mes') {
    return f.length >= 7 ? f.slice(0, 7) : f;
  }
  if (periodo === 'dia') {
    return f.length >= 10 ? f.slice(0, 10) : f;
  }
  const iso = f.match(/^(\d{4})-W(\d{1,2})$/i);
  if (iso) {
    return formatYmd(isoWeekToMonday(Number(iso[1]), Number(iso[2])));
  }
  const ymd = parseYmdLocal(f.slice(0, 10));
  if (ymd) {
    return formatYmd(mondayOfWeekContaining(ymd));
  }
  return f;
}

function mergeSameKey(rows: CitasPorPeriodo[], periodo: PeriodoCitas): Map<string, CitasPorPeriodo> {
  const m = new Map<string, CitasPorPeriodo>();
  for (const b of rows) {
    const k = normalizePeriodKey(b.fecha, periodo);
    if (!k) continue;
    const prev = m.get(k);
    if (!prev) {
      m.set(k, { ...b, fecha: k });
    } else {
      m.set(k, {
        ...prev,
        fecha: k,
        total: prev.total + b.total,
        confirmadas: prev.confirmadas + b.confirmadas,
        completadas: prev.completadas + b.completadas,
        canceladas: prev.canceladas + b.canceladas,
        noAsistio: prev.noAsistio + b.noAsistio,
      });
    }
  }
  return m;
}

function fallbackLabel(key: string, periodo: PeriodoCitas): string {
  if (periodo === 'mes') {
    return key.length >= 7 ? labelMes(key.slice(0, 7)) : key;
  }
  if (periodo === 'dia') {
    return labelDia(key.length >= 10 ? key.slice(0, 10) : key);
  }
  const d = parseYmdLocal(key.slice(0, 10));
  return d ? labelSemana(d) : key;
}

/** Etiquetas fijas vista anual (mes). */
export const MESES_ABREV_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export function resolveAnioVistaAnual(fechaDesde: string, fechaHasta: string): number {
  const y = Number(fechaHasta?.slice(0, 4));
  if (Number.isFinite(y) && y >= 1970 && y <= 2100) return y;
  const y2 = Number(fechaDesde?.slice(0, 4));
  if (Number.isFinite(y2) && y2 >= 1970 && y2 <= 2100) return y2;
  return new Date().getFullYear();
}

/**
 * Eje X fijo: últimos 7 días calendario incluyendo `hoy` (orden cronológico).
 */
export function normalize7Days(barrasApi: CitasPorPeriodo[], hoy = new Date()): CitasPorPeriodo[] {
  const end = startOfTodayLocal(hoy);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const expected: Array<{ key: string; label: string }> = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = formatYmd(cur);
    expected.push({ key, label: labelDia(key) });
    cur.setDate(cur.getDate() + 1);
  }

  const byKey = mergeSameKey(barrasApi, 'dia');
  const keys = new Set(expected.map(e => e.key));

  const main = expected.map(({ key, label }) => {
    const hit = byKey.get(key);
    if (!hit) return empty(key, label);
    return { ...hit, fecha: key, label: hit.label?.trim() ? hit.label : label };
  });

  const extras: CitasPorPeriodo[] = [];
  for (const [k, row] of byKey) {
    if (!keys.has(k)) {
      extras.push({
        ...row,
        fecha: k,
        label: row.label?.trim() ? row.label : fallbackLabel(k, 'dia'),
      });
    }
  }
  extras.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return extras.length ? [...main, ...extras] : main;
}

/**
 * Eje X fijo: una barra por semana (lunes) que intersecta el mes de `fechaRef` (típ. 4–6 semanas).
 * `fechaRef` = YYYY-MM-DD (usa fecha_hasta del filtro o hoy).
 */
export function normalizeWeeks(barrasApi: CitasPorPeriodo[], fechaRefYmd: string): CitasPorPeriodo[] {
  const ref = parseYmdLocal(fechaRefYmd.slice(0, 10)) ?? startOfTodayLocal();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const first = new Date(y, m, 1, 12, 0, 0, 0);
  const last = new Date(y, m + 1, 0, 12, 0, 0, 0);

  const expected: Array<{ key: string; label: string }> = [];
  let mon = mondayOfWeekContaining(first);
  const lastMon = mondayOfWeekContaining(last);
  while (mon <= lastMon) {
    const key = formatYmd(mon);
    expected.push({ key, label: labelSemana(new Date(mon)) });
    const n = new Date(mon);
    n.setDate(n.getDate() + 7);
    mon = n;
  }

  const byKey = mergeSameKey(barrasApi, 'semana');
  const keySet = new Set(expected.map(e => e.key));

  const main = expected.map(({ key, label }) => {
    const hit = byKey.get(key);
    if (!hit) return empty(key, label);
    return { ...hit, fecha: key, label: hit.label?.trim() ? hit.label : label };
  });

  const extras: CitasPorPeriodo[] = [];
  for (const [k, row] of byKey) {
    if (!keySet.has(k)) {
      extras.push({
        ...row,
        fecha: k,
        label: row.label?.trim() ? row.label : fallbackLabel(k, 'semana'),
      });
    }
  }
  extras.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return extras.length ? [...main, ...extras] : main;
}

/**
 * Eje X fijo: 12 meses (Ene–Dic) del año indicado por filtros.
 */
export function normalizeMonths(
  barrasApi: CitasPorPeriodo[],
  fechaDesde: string,
  fechaHasta: string,
): CitasPorPeriodo[] {
  const anio = resolveAnioVistaAnual(fechaDesde, fechaHasta);
  const byKey = mergeSameKey(barrasApi, 'mes');
  const out: CitasPorPeriodo[] = [];
  for (let mo = 1; mo <= 12; mo++) {
    const key = `${anio}-${String(mo).padStart(2, '0')}`;
    const hit = byKey.get(key);
    const label = MESES_ABREV_ES[mo - 1];
    if (!hit) {
      out.push(empty(key, label));
    } else {
      out.push({ ...hit, fecha: key, label });
    }
  }
  return out;
}

/** @deprecated usar normalizeMonths */
export function rellenarSerieAnualDoceMeses(barrasApi: CitasPorPeriodo[], anio: number): CitasPorPeriodo[] {
  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;
  return normalizeMonths(barrasApi, desde, hasta);
}

/**
 * Punto único de entrada: aplica la normalización según pestaña.
 */
export function rellenarSerieCitasPorPeriodo(
  barrasApi: CitasPorPeriodo[],
  fechaDesde: string,
  fechaHasta: string,
  periodo: PeriodoCitas,
  opts?: { hoy?: Date },
): CitasPorPeriodo[] {
  switch (periodo) {
    case 'dia':
      return normalize7Days(barrasApi, opts?.hoy ?? new Date());
    case 'semana':
      return normalizeWeeks(barrasApi, fechaHasta || formatYmd(startOfTodayLocal()));
    case 'mes':
      return normalizeMonths(barrasApi, fechaDesde, fechaHasta);
    default:
      return barrasApi;
  }
}
