/**
 * SAIMÔR OS — Design Token Foundation
 *
 * The canonical design language. Every surface (Home, Chat, Dossier, Wall,
 * Department view, …) consumes these tokens so color carries meaning and
 * typography has a real hierarchy. Reference implementations: AuditDossierView
 * + WallPane (the expressive tier).
 *
 * Two consumption styles are supported:
 *   - className strings (typeScale)  → Tailwind/JSX className
 *   - raw value objects (semanticColor, surfaceTone) → inline style / CSS-in-JS
 *
 * See ./README.md for usage guidance.
 */

// ─── Type scale ───────────────────────────────────────────────────────────────
// Named by INTENT, not by size. Establishes the hierarchy that's currently
// missing (everything sat in one size corridor).

export const typeScale = {
    /** The one big moment per surface: a score, a greeting. */
    hero: 'text-6xl font-bold leading-none tracking-tight',
    /** Secondary large number / prominent headline. */
    display: 'text-3xl font-semibold leading-tight tracking-tight',
    /** Pane / section headline. */
    title: 'text-[18px] font-semibold tracking-tight',
    /** The uppercase caps-label that opens a section. */
    section: 'text-[10px] uppercase tracking-[0.22em]',
    /** Default reading text. */
    body: 'text-[13px] leading-relaxed',
    /** Timestamps, footnotes, supporting detail. */
    meta: 'text-[11px] leading-normal',
} as const;

export type TypeScaleKey = keyof typeof typeScale;

// ─── Semantic color (color = meaning) ───────────────────────────────────────────
// Each meaning resolves to a full set. Reconciliation decision (from audit of
// AuditDossierView vs WallPane): `glow` uses the deeper 500-level value from
// WallPane; `accent`/`border`/`chip` use the 400-level from AuditDossierView.
// AI/Mora and Info are unified violet/cyan.

export interface SemanticPalette {
    /** Solid foreground color (hex). */
    text: string;
    /** Subtle fill behind elements (rgba). */
    bg: string;
    /** Border / hairline (rgba). */
    border: string;
    /** Radial/box-shadow glow color (rgba) — the atmospheric layer. */
    glow: string;
    /** Strong glow for hero emphasis (rgba). */
    glowStrong: string;
    /** Saturated accent for numbers/icons (hex). */
    accent: string;
    /** Chip background (rgba). */
    chip: string;
    /** Chip text (hex). */
    chipText: string;
}

export type SemanticMeaning =
    | 'critical'
    | 'warning'
    | 'safe'
    | 'ai'
    | 'info'
    | 'neutral';

const PALETTES: Record<SemanticMeaning, SemanticPalette> = {
    critical: {
        text: '#fca5a5',
        bg: 'rgba(248,113,113,0.08)',
        border: 'rgba(248,113,113,0.22)',
        glow: 'rgba(239,68,68,0.28)',
        glowStrong: 'rgba(239,68,68,0.55)',
        accent: '#f87171',
        chip: 'rgba(248,113,113,0.15)',
        chipText: '#fca5a5',
    },
    warning: {
        text: '#fde68a',
        bg: 'rgba(251,191,36,0.07)',
        border: 'rgba(251,191,36,0.22)',
        glow: 'rgba(245,158,11,0.22)',
        glowStrong: 'rgba(245,158,11,0.48)',
        accent: '#fbbf24',
        chip: 'rgba(251,191,36,0.12)',
        chipText: '#fde68a',
    },
    safe: {
        text: '#6ee7b7',
        bg: 'rgba(52,211,153,0.07)',
        border: 'rgba(52,211,153,0.22)',
        glow: 'rgba(16,185,129,0.24)',
        glowStrong: 'rgba(16,185,129,0.5)',
        accent: '#34d399',
        chip: 'rgba(52,211,153,0.12)',
        chipText: '#6ee7b7',
    },
    ai: {
        text: '#c4b5fd',
        bg: 'rgba(139,92,246,0.12)',
        border: 'rgba(139,92,246,0.35)',
        glow: 'rgba(139,92,246,0.25)',
        glowStrong: 'rgba(139,92,246,0.5)',
        accent: '#a78bfa',
        chip: 'rgba(139,92,246,0.18)',
        chipText: '#c4b5fd',
    },
    info: {
        text: '#a5f3fc',
        bg: 'rgba(34,211,238,0.08)',
        border: 'rgba(34,211,238,0.25)',
        glow: 'rgba(34,211,238,0.22)',
        glowStrong: 'rgba(34,211,238,0.45)',
        accent: '#67e8f9',
        chip: 'rgba(34,211,238,0.12)',
        chipText: '#a5f3fc',
    },
    neutral: {
        text: 'rgba(255,255,255,0.6)',
        bg: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        glow: 'rgba(255,255,255,0.06)',
        glowStrong: 'rgba(255,255,255,0.12)',
        accent: 'rgba(255,255,255,0.85)',
        chip: 'rgba(255,255,255,0.08)',
        chipText: 'rgba(255,255,255,0.7)',
    },
};

/** Resolve a meaning to its full palette. */
export function semanticColor(meaning: SemanticMeaning): SemanticPalette {
    return PALETTES[meaning];
}

/** Map a German risk level (as used in audit data) to a semantic meaning. */
export function levelToMeaning(level?: string): SemanticMeaning {
    switch (level) {
        case 'Kritisch': return 'critical';
        case 'Sicher': return 'safe';
        case 'Mittel': return 'warning';
        default: return 'warning';
    }
}

// ─── Surface tones ──────────────────────────────────────────────────────────────
// The dark backgrounds. Named so we stop hardcoding rgba(7,7,16,…) everywhere.

export const surfaceTone = {
    /** Deepest base — the Wall / immersive surfaces. */
    base: 'rgba(7,7,16,0.97)',
    /** Raised card on the base. */
    raised: 'rgba(12,12,22,0.88)',
    /** Glass overlay element. */
    glass: 'rgba(255,255,255,0.04)',
    /** Glass border hairline. */
    glassBorder: 'rgba(255,255,255,0.07)',
} as const;

export type SurfaceToneKey = keyof typeof surfaceTone;

// ─── Glow + elevation utilities ─────────────────────────────────────────────────
// Atmospheric depth. Return CSS strings for inline style / template literals.

export const glow = {
    /** Soft ambient glow around an element. */
    soft: (color: string): string => `0 0 30px ${color}`,
    /** Strong hero glow + inner highlight. */
    strong: (color: string): string =>
        `0 0 60px ${color}, inset 0 1px 0 rgba(255,255,255,0.06)`,
    /** Text glow (for hero numbers). */
    text: (color: string): string => `0 0 24px ${color}`,
    /** Radial background wash for hero areas. */
    radial: (color: string, at = '20% 30%'): string =>
        `radial-gradient(ellipse at ${at}, ${color} 0%, transparent 55%)`,
} as const;

export const elevation = {
    /** Standard card shadow. */
    card: '0 8px 32px rgba(0,0,0,0.28)',
    /** Floating pane / drawer. */
    floating: '0 34px 130px rgba(0,0,0,0.4)',
    /** Inset top highlight (glass edge). */
    glassEdge: 'inset 0 1px 0 rgba(255,255,255,0.06)',
} as const;
