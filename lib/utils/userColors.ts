/**
 * Deterministic per-user palette colors.
 *
 * Maps a user identifier (email, name, or id) to a stable color from a
 * curated palette. The mapping is a fast string hash — same input always
 * produces the same color, no server round-trip needed.
 *
 * Used for: UserAvatar aura, TeamRoom presence dots, chat author colors.
 *
 * Design principle (Habbo/Club-Penguin-style): each user "owns" a color
 * that persists across sessions and surfaces — makes the space feel social.
 */

export interface UserColorPalette {
  /** Main color: used for text, icons, active states */
  primary: string;
  /** Subtle background: used for aura glow */
  glow: string;
  /** Hex for inline styles */
  hex: string;
}

/** Curated palette — excludes red (error), cyan (system) */
const PALETTE: UserColorPalette[] = [
  { primary: 'text-emerald-400',  glow: 'rgba(52,211,153,0.22)',  hex: '#34d399' },
  { primary: 'text-violet-400',   glow: 'rgba(167,139,250,0.22)', hex: '#a78bfa' },
  { primary: 'text-sky-400',      glow: 'rgba(56,189,248,0.22)',  hex: '#38bdf8' },
  { primary: 'text-amber-400',    glow: 'rgba(251,191,36,0.22)',  hex: '#fbbf24' },
  { primary: 'text-pink-400',     glow: 'rgba(244,114,182,0.22)', hex: '#f472b6' },
  { primary: 'text-teal-400',     glow: 'rgba(45,212,191,0.22)',  hex: '#2dd4bf' },
  { primary: 'text-orange-400',   glow: 'rgba(251,146,60,0.22)',  hex: '#fb923c' },
  { primary: 'text-indigo-400',   glow: 'rgba(129,140,248,0.22)', hex: '#818cf8' },
  { primary: 'text-lime-400',     glow: 'rgba(163,230,53,0.22)',  hex: '#a3e635' },
  { primary: 'text-rose-300',     glow: 'rgba(253,164,175,0.22)', hex: '#fda4af' },
  { primary: 'text-fuchsia-400',  glow: 'rgba(232,121,249,0.22)', hex: '#e879f9' },
  { primary: 'text-yellow-300',   glow: 'rgba(253,224,71,0.22)',  hex: '#fde047' },
];

/** djb2-style string hash — fast, stable, no crypto needed */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep 32-bit unsigned
  }
  return h;
}

/**
 * Returns a deterministic palette entry for the given user identifier.
 * Pass email (most unique) or fall back to name.
 */
export function getUserColor(identifier: string): UserColorPalette {
  if (!identifier) return PALETTE[0];
  const idx = hashString(identifier.toLowerCase().trim()) % PALETTE.length;
  return PALETTE[idx];
}

/** Convenience: just the hex color for a user */
export function getUserColorHex(identifier: string): string {
  return getUserColor(identifier).hex;
}
