// ─── Date / time utilities ────────────────────────────────────────────────────
// Pure functions — no Angular dependencies. Safe to use in components, services,
// pipes, and server-side code alike.

/**
 * Formats an ISO date string ('YYYY-MM-DD') to 'DD/MM/YYYY'.
 * Returns '—' for empty/null inputs.
 */
export function formatFecha(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formats an ISO date string ('YYYY-MM-DD') to a long Spanish label
 * such as "10 de marzo". Uses local time to avoid UTC offset shifts.
 */
export function formatFechaLarga(iso: string): string {
  const d = new Date(iso + 'T00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

/**
 * Returns a human-readable relative time string in Spanish
 * from an ISO timestamp ("Hace 5 min", "Hace 2h", "Hace 3 días").
 */
export function tiempoRelativo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days  = Math.floor(hours / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

/**
 * Parsea LocalDateTime del backend (`2026-07-25T18:00:00`) como fecha local
 * para evitar desfases por zona horaria.
 */
export function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!m) return null;
  const date = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0),
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Fecha relativa por calendario local (es-MX):
 * Hoy · Ayer · Hace 3 días · Hace 1 semana
 */
export function tiempoRelativoCalendario(
  isoDate: string,
  now: Date = new Date(),
): string {
  const date = parseLocalDateTime(isoDate);
  if (!date) return '—';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEvent = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfEvent.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return 'Hoy';
  if (dayDiff === 1) return 'Ayer';
  if (dayDiff > 1 && dayDiff < 7) return `Hace ${dayDiff} días`;
  if (dayDiff >= 7 && dayDiff < 14) return 'Hace 1 semana';
  if (dayDiff >= 14 && dayDiff < 30) {
    const weeks = Math.floor(dayDiff / 7);
    return `Hace ${weeks} semanas`;
  }
  if (dayDiff >= 30 && dayDiff < 365) {
    const months = Math.floor(dayDiff / 30);
    return months <= 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
  }
  if (dayDiff >= 365) {
    const years = Math.floor(dayDiff / 365);
    return years <= 1 ? 'Hace 1 año' : `Hace ${years} años`;
  }
  // Futuro cercano
  if (dayDiff === -1) return 'Mañana';
  return formatFecha(isoDate.slice(0, 10));
}
