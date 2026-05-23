/**
 * deptStyle.ts — Shared semantic colour + icon mapping for department/space orbs
 *
 * ARCHITECTURAL NOTE (2026-02-27):
 * When L2 (DepartmentLayer) and L3 (SpaceLayer) were first written they each
 * had ad-hoc emerald/cyan colour choices that ignored the rich visual language
 * already defined in Planet.tsx.  The mismatch made L2/L3 look visually
 * inferior to L1 (UniverseView + Planet.tsx).
 *
 * Fix: extract getDeptStyle() here so every layer — CoreLayer, DepartmentLayer,
 * SpaceLayer — can import the same semantic colours and icons, giving the whole
 * navigation stack a coherent look.
 *
 * What was *expected* to live in CoreLayer.tsx (or a shared barrel) but did not:
 *  - Semantic colour mapping keyed on department name
 *  - Icon assignment for the same names
 *  - A single source of truth for glow / border / core colours
 *
 * Consumers: Planet.tsx, DepartmentLayer.tsx, SpaceLayer.tsx
 */

import {
    Building2, Briefcase, Users, DollarSign, TrendingUp,
    Code, LucideIcon, Compass, ShoppingCart, Activity,
    Folder as FolderIcon, Star, Sparkles, Brain, FlaskConical,
} from 'lucide-react';

export interface DeptStyle {
    /** Glow / ring / primary accent colour (hex) */
    glow: string;
    /** Border colour (hex, slightly lighter than glow) */
    border: string;
    /** Core background colour (hex, slightly darker) */
    core: string;
    /** Lucide icon for this department semantic category */
    icon: LucideIcon;
}

/**
 * Returns semantic colours + icon for a given department/space name.
 * Pass an optional `customColor` (from the DB) to override colours while
 * preserving the semantic icon.
 */
export function getDeptStyle(name: string, customColor?: string | null): DeptStyle {
    const n = name.toLowerCase();

    let style: DeptStyle = { glow: '#64748B', border: '#94A3B8', core: '#475569', icon: Compass };

    // Intelligence / KI / Research → violet (Cosmic Dawn accent)
    if (n.includes('intelligence') || n.includes('bi ') || n.includes('analytics') || n.includes('insight'))
        style = { glow: '#8B5CF6', border: '#A78BFA', core: '#6D28D9', icon: Brain };

    // R&D / Research / Science → cyan (discovery / frontier)
    else if (n.includes('r&d') || n.includes('research') || n.includes('lab') || n.includes('science') || n.includes('innovation'))
        style = { glow: '#22D3EE', border: '#67E8F9', core: '#0891B2', icon: FlaskConical };

    else if (n.includes('finance') || n.includes('finanz') || n.includes('growth'))
        style = { glow: '#F59E0B', border: '#FBBF24', core: '#D97706', icon: DollarSign };

    else if (n.includes('hr') || n.includes('human') || n.includes('culture') || n.includes('people'))
        style = { glow: '#EC4899', border: '#F472B6', core: '#DB2777', icon: Users };

    else if (n.includes('tech') || n.includes('it ') || n.includes('dev') || n.includes('ai') || n.includes('code'))
        style = { glow: '#06B6D4', border: '#22D3EE', core: '#0891B2', icon: Code };

    else if (n.includes('sales') || n.includes('store') || n.includes('shop') || n.includes('retail') || n.includes('commerce'))
        style = { glow: '#14B8A6', border: '#2DD4BF', core: '#0D9488', icon: ShoppingCart };

    else if (n.includes('marketing') || n.includes('brand') || n.includes('pr') || n.includes('media'))
        style = { glow: '#8B5CF6', border: '#A78BFA', core: '#7C3AED', icon: TrendingUp };

    else if (n.includes('management') || n.includes('legal') || n.includes('admin') || n.includes('strategy') || n.includes('hq'))
        style = { glow: '#10B981', border: '#34D399', core: '#059669', icon: Briefcase };

    else if (n.includes('ops') || n.includes('logis') || n.includes('supply') || n.includes('infrastructure'))
        style = { glow: '#6366F1', border: '#818CF8', core: '#4F46E5', icon: Activity };

    else if (n.includes('product'))
        style = { glow: '#14B8A6', border: '#2DD4BF', core: '#0D9488', icon: Sparkles };

    if (customColor) {
        return { ...style, glow: customColor, border: `${customColor}CC`, core: customColor };
    }

    return style;
}

/** Sequential accent palette for workspace moons / folder orbs (non-semantic) */
export const ORBIT_PALETTE: string[] = [
    '#06B6D4', // cyan
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#EC4899', // pink
    '#10B981', // emerald
    '#F97316', // orange
    '#6366F1', // indigo
    '#14B8A6', // teal
];
