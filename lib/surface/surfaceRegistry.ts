/**
 * Surface Hierarchy Registry
 * ==========================
 *
 * Canonical source of truth for the SAIMOR 1.0 OS surface hierarchy.
 * Every pane type is assigned to exactly one tier:
 *
 *   core_work  — daily-driver surfaces, Dock-first (6 entries)
 *   app        — legitimate programs, reachable via Cmd+K / context menu / deep link
 *   future     — gated in 1.0: not mounted, not routed, not reachable
 *
 * Shell elements (Dock, Breadcrumb, Orb, Spotlight, Notifications) are not
 * pane types and are not tracked here — they are permanent OS frame components.
 *
 * @see docs/plans/2026-03-27-surface-hierarchy-1.0.md
 */

// ─── Tier Definition ────────────────────────────────────────────────────────

export type SurfaceTier = 'core_work' | 'app' | 'future';

export type PaneType =
    | 'settings' | 'finder' | 'document' | 'chat' | 'team' | 'notes' | 'meine-dateien'
    | 'scanner' | 'users' | 'company-detail' | 'grid' | 'search' | 'space'
    | 'mail' | 'calendar' | 'integrations' | 'terminal' | 'mora-hub'
    | 'actions' | 'work-session' | 'apps';

/**
 * Every pane type mapped to its tier.
 *
 * core_work — Dock-first, daily use for the Beachhead (5–50 user knowledge workspace)
 * app       — legitimate programs, not in Dock, reachable via Cmd+K or context action
 * future    — no backend, unstable path, or outside 1.0 Beachhead scope
 */
export const SURFACE_TIERS: Record<PaneType, SurfaceTier> = {
    // ── Core Work (Dock-first) ──────────────────────────────────────────────
    finder:          'core_work',
    document:        'core_work',
    chat:            'core_work',
    team:            'core_work',
    notes:           'core_work',
    settings:        'core_work',
    'meine-dateien': 'core_work',

    // ── Apps (reachable, not dominant) ───────────────────────────────────────
    scanner:         'app',
    users:           'app',
    'company-detail':'app',
    grid:            'app',
    search:          'app',
    space:           'app',

    // ── Future (gated in 1.0) ───────────────────────────────────────────────
    mail:            'future',    // no backend
    calendar:        'future',    // no backend
    integrations:    'future',    // no backend
    terminal:        'future',    // dev-only, security risk for pilot
    'mora-hub':      'app',
    actions:         'future',    // Action Path not stabilized
    'work-session':  'future',    // agentic execution too early
    apps:            'future',    // AppLibrary self-referential with <10 apps
};

// ─── Derived Constants ──────────────────────────────────────────────────────

/** All future-tier pane types — for quick inclusion checks. */
export const FUTURE_PANE_TYPES: PaneType[] = (Object.entries(SURFACE_TIERS) as [PaneType, SurfaceTier][])
    .filter(([, tier]) => tier === 'future')
    .map(([type]) => type);

const _futureSet = new Set<string>(FUTURE_PANE_TYPES);

/**
 * Returns the tier for a pane type string, or undefined if unknown.
 * Safe to call with arbitrary strings — no implicit any index error.
 */
export function getTier(paneType: string): SurfaceTier | undefined {
    return SURFACE_TIERS[paneType as PaneType];
}

/**
 * Returns true if a pane type is enabled in 1.0 (core_work or app).
 * Returns false for future-tier or unknown types.
 */
export function isPaneEnabled(paneType: string): boolean {
    const tier = getTier(paneType);
    if (!tier) return false;
    return tier !== 'future';
}

// ─── Core Dock Items ────────────────────────────────────────────────────────

export interface CoreDockItem {
    action: string;
    label: string;
    description: string;
    shortcutSuffix: string | null; // e.g. 'H' for Mod+H — Dock prepends platform modifier
}

/**
 * The 6 Dock entries for 1.0, in display order.
 * Dock reads this instead of hardcoding its own array.
 */
export function getCoreDockItems(): CoreDockItem[] {
    return [
        { action: 'home',     label: 'Start',    description: 'Arbeitsplatz',          shortcutSuffix: 'H' },
        { action: 'chat',     label: 'Mora',     description: 'Mit Mora sprechen',     shortcutSuffix: 'J' },
        { action: 'finder',   label: 'Finder',   description: 'Dateien & Ordner',      shortcutSuffix: 'F' },
        { action: 'team',     label: 'Team',     description: 'Teammitglieder',        shortcutSuffix: 'U' },
        { action: 'notes',    label: 'Notizen',  description: 'Persoenliche Notizen',  shortcutSuffix: 'N' },
        { action: 'settings', label: 'System',   description: 'Einstellungen',         shortcutSuffix: ',' },
    ];
}
