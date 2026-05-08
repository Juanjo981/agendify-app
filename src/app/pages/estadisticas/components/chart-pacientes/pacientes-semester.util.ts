import { NuevosVsRecurrentesPunto } from '../../models/estadisticas.model';

function parseYmdLocal(s: string): Date | null {
  if (!s || s.length < 10) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function endMonthAnchor(fechaHastaYmd: string): Date {
  const d = parseYmdLocal(fechaHastaYmd.slice(0, 10));
  if (d) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
}

function labelMesCorto(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1, 12, 0, 0, 0).toLocaleDateString('es-MX', { month: 'short' });
}

/** Los 6 meses calendario terminando en el mes de `fechaHasta` (orden cronológico). */
export function bucketKeysUltimos6Meses(fechaHastaYmd: string): Array<{ key: string; label: string }> {
  const end = endMonthAnchor(fechaHastaYmd || '');
  const out: Array<{ key: string; label: string }> = [];
  for (let back = 5; back >= 0; back--) {
    const d = new Date(end.getFullYear(), end.getMonth() - back, 1, 12, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: labelMesCorto(d.getFullYear(), d.getMonth()) });
  }
  return out;
}

function inferKeyFromLabel(label: string, expectedKeys: Set<string>): string | null {
  const lab = label.trim().toLowerCase().replace(/\.$/, '');
  if (!lab) return null;
  for (const k of expectedKeys) {
    const parts = k.split('-');
    const y = Number(parts[0]);
    const mo = Number(parts[1]) - 1;
    if (!Number.isFinite(y) || mo < 0 || mo > 11) continue;
    const short = labelMesCorto(y, mo).toLowerCase().replace(/\.$/, '');
    if (short === lab || lab.startsWith(short)) return k;
  }
  return null;
}

function resolveRowKey(
  row: NuevosVsRecurrentesPunto,
  expectedKeys: Set<string>,
): string | null {
  const r = row as unknown as Record<string, unknown>;
  const fechaRaw = r['fecha'] ?? r['periodo'];
  if (typeof fechaRaw === 'string' && fechaRaw.trim().length >= 7) {
    const k = fechaRaw.trim().slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(k) && expectedKeys.has(k)) return k;
  }
  const mesNum = r['mes'];
  const anioNum = r['anio'] ?? r['year'];
  if (typeof mesNum === 'number' && mesNum >= 1 && mesNum <= 12 && typeof anioNum === 'number') {
    const k = `${anioNum}-${String(mesNum).padStart(2, '0')}`;
    if (expectedKeys.has(k)) return k;
  }
  return inferKeyFromLabel(String(row.label ?? ''), expectedKeys);
}

/**
 * Siempre 6 puntos con ceros; mapea respuesta dispersa del backend al semestre que termina en `fecha_hasta`.
 */
export function normalizeUltimos6MesesPacientes(
  puntosApi: NuevosVsRecurrentesPunto[],
  fechaHastaYmd: string,
): NuevosVsRecurrentesPunto[] {
  const buckets = bucketKeysUltimos6Meses(fechaHastaYmd);
  const expectedKeys = new Set(buckets.map(b => b.key));
  const sums = new Map<string, { nuevos: number; recurrentes: number }>();

  for (const row of puntosApi) {
    const key = resolveRowKey(row, expectedKeys);
    if (!key) continue;
    const nuevos = Number(row.nuevos ?? 0) || 0;
    const recurrentes = Number(row.recurrentes ?? 0) || 0;
    const prev = sums.get(key) ?? { nuevos: 0, recurrentes: 0 };
    sums.set(key, { nuevos: prev.nuevos + nuevos, recurrentes: prev.recurrentes + recurrentes });
  }

  return buckets.map(({ key, label }) => {
    const hit = sums.get(key);
    return {
      label,
      nuevos: hit?.nuevos ?? 0,
      recurrentes: hit?.recurrentes ?? 0,
    };
  });
}

export const RANKING_PACIENTES_TOP_N = 5;
