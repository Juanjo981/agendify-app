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
