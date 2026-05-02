// ─── Avatar color utility ─────────────────────────────────────────────────────
// Pure function — no Angular dependencies.

const AVATAR_COLORS = [
  'var(--primary-mid)',
  'var(--accent-purple)',
  'var(--chart-primary)',
  'var(--chart-info)',
  'var(--success)',
  'var(--warning)',
  'var(--danger-bright)',
];

/**
 * Returns a deterministic color from the palette based on the
 * first character of the provided name. Values are CSS color tokens
 * so avatars respond to the active theme.
 */
export function getAvatarColor(nombre: string): string {
  if (!nombre) return AVATAR_COLORS[0];
  return AVATAR_COLORS[nombre.charCodeAt(0) % AVATAR_COLORS.length];
}
