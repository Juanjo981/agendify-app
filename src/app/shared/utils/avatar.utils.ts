// ─── Avatar color utility ─────────────────────────────────────────────────────
// Pure function — no Angular dependencies.

const AVATAR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
];

/**
 * Returns a deterministic color from the palette based on the
 * first character of the provided name. Falls back to indigo if
 * the name is empty or undefined.
 */
export function getAvatarColor(nombre: string): string {
  if (!nombre) return AVATAR_COLORS[0];
  return AVATAR_COLORS[nombre.charCodeAt(0) % AVATAR_COLORS.length];
}
