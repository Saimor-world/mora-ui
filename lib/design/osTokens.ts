/**
 * SAIMÔR OS — Prototype design layer (os-recovery-prototype-v1)
 *
 * Single source of truth for colour, spacing, radius, type and motion used by
 * the new shell (`components/os-shell`), the primitives (`components/os-kit`)
 * and every `features/*` surface. New code must not hardcode colours; it reads
 * the CSS custom properties generated here (`--os-*`).
 *
 * Builds on `lib/design/tokens.ts` (semantic meanings stay identical: safe,
 * warning, critical, ai, info, neutral) but adds the calm base palette the
 * legacy token file never defined.
 */
import { semanticColor, type SemanticMeaning } from './tokens';

export const osColor = {
  /** Deep ink background — calm, slightly green-black like the login portal. */
  canvas: '#05090a',
  canvasRaised: '#0a1112',
  surface: 'rgba(255,255,255,0.028)',
  surfaceStrong: 'rgba(255,255,255,0.05)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  overlay: 'rgba(2,5,6,0.72)',
  hairline: 'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.14)',
  text: 'rgba(244,247,246,0.94)',
  textMuted: 'rgba(226,234,232,0.62)',
  textFaint: 'rgba(226,234,232,0.40)',
  /** Brand accent (emerald) — used sparingly: active nav, primary action, MÔRA presence. */
  accent: '#6ee7b7',
  accentSoft: 'rgba(110,231,183,0.10)',
  accentLine: 'rgba(110,231,183,0.28)',
  accentInk: '#04130d',
  /** MÔRA atmosphere glow. */
  aura: 'rgba(16,185,129,0.16)',
  auraSecondary: 'rgba(34,211,238,0.08)',
  focus: 'rgba(110,231,183,0.55)',
  /** V1.1 glass panels over the universe plate. */
  glass: 'rgba(8,14,16,0.46)',
  glassStrong: 'rgba(8,14,16,0.62)',
  glassHover: 'rgba(16,26,28,0.56)',
  glassEdge: 'rgba(255,255,255,0.09)',
  glassHighlight: 'rgba(255,255,255,0.05)',
  glassShadow: 'rgba(0,0,0,0.38)',
  /** Veil over the dimmed universe plate on calm surfaces (strong, content in front). */
  veilCalmInner: 'rgba(3,6,8,0.4)',
  veilCalmOuter: 'rgba(3,6,8,0.84)',
  /** Lighter veil inside the Universe place (only for legibility at the edges). */
  veilUniverse: 'rgba(3,6,8,0.28)',
  /** V1.3 – exakt die Kapsel aus components/mora/Dock.tsx (Legacy-Dock). */
  dockCapsule: 'linear-gradient(180deg, rgba(12,26,34,0.55) 0%, rgba(10,13,28,0.45) 54%, rgba(2,7,10,0.6) 100%)',
  dockEdge: 'rgba(103,232,249,0.16)',
  dockAccent: 'rgba(34,211,238,0.14)',
  dockShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 20px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.07)',
  dockGrid: 'rgba(103,232,249,0.05)',
  dockLine: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.55), rgba(16,185,129,0.45), transparent)',
  dockStoneRing: 'rgba(52,211,153,0.42)',
  dockStoneGlow: '0 0 22px rgba(16,185,129,0.32)',
  /** Mobile static plate veil. */
  veilMobile: 'rgba(3,6,8,0.78)',
  railVeilTop: 'rgba(4,8,9,0.78)',
  railVeilBottom: 'rgba(4,8,9,0.42)',
  stoneHalo: 'rgba(110,231,183,0.28)',
  stoneHaloThinking: 'rgba(110,231,183,0.5)',
  /** V1.2 Universe planets: light core → deep body, calm and slightly desaturated. */
  planetTodayLight: '#f6e7c1', planetTodayDeep: '#7a5a22',
  planetPostLight: '#cfe9f7', planetPostDeep: '#245a78',
  planetFinanceLight: '#c9f3df', planetFinanceDeep: '#1d6b4e',
  planetKnowledgeLight: '#ddd3f7', planetKnowledgeDeep: '#4a3c82',
  planetSpacesLight: '#f3d2bd', planetSpacesDeep: '#7d3f24',
  planetConnectionsLight: '#cfeee9', planetConnectionsDeep: '#2b6660',
  planetLabsLight: '#dadfe3', planetLabsDeep: '#3d464d',
  planetShadow: 'rgba(0,0,0,0.72)',
  planetRim: 'rgba(255,255,255,0.22)',
  orbitLine: 'rgba(255,255,255,0.08)',
  orbitLineStrong: 'rgba(110,231,183,0.22)',
  strandAssigned: 'rgba(110,231,183,0.55)',
  strandInferred: 'rgba(253,211,140,0.42)',
  signalWarning: '#fcd34d',
  signalInfo: '#7dd3fc',
  coreGlow: 'rgba(110,231,183,0.14)',
} as const;

/** Atmosphere: how the shared universe image is treated per mode (non-colour values). */
export const osAtmosphere = {
  image: '/universe/deep-space-warm.jpg',
  calm: { blur: '16px', brightness: '0.72', saturate: '0.9' },
  universe: { blur: '0px', brightness: '1', saturate: '1' },
  transition: '900ms',
  glassBlur: '18px',
  glassSaturate: '1.25',
} as const;

export const osSpace = { 0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px' } as const;
export type OsSpace = keyof typeof osSpace;

export const osRadius = { sm: '10px', md: '14px', lg: '20px', xl: '28px', pill: '999px' } as const;

export const osType = {
  family: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  display: { size: '38px', line: '1.1', weight: '300', tracking: '-0.03em' },
  title: { size: '20px', line: '1.25', weight: '400', tracking: '-0.015em' },
  brand: { size: '15px', line: '1.2', weight: '400', tracking: '0.34em' },
  body: { size: '14px', line: '1.55', weight: '400', tracking: '0' },
  meta: { size: '12px', line: '1.45', weight: '400', tracking: '0' },
  eyebrow: { size: '10.5px', line: '1.3', weight: '500', tracking: '0.2em' },
} as const;

export const osMotion = { fast: '120ms', base: '200ms', slow: '360ms', ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)' } as const;

export const osLayout = { railWidth: '232px', moraWidth: '380px', bottomBar: '64px', dockSpace: '96px', contentMax: '1120px', mobileBreakpoint: 900 } as const;

export type OsTone = SemanticMeaning;

/** Flatten tokens into CSS custom properties applied on the OS root element. */
export function osCssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(osColor)) vars[`--os-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(osSpace)) vars[`--os-space-${k}`] = v;
  for (const [k, v] of Object.entries(osRadius)) vars[`--os-radius-${k}`] = v;
  vars['--os-font'] = osType.family;
  for (const key of ['display', 'title', 'body', 'meta', 'eyebrow'] as const) {
    const t = osType[key];
    vars[`--os-type-${key}-size`] = t.size;
    vars[`--os-type-${key}-line`] = t.line;
    vars[`--os-type-${key}-weight`] = t.weight;
    vars[`--os-type-${key}-tracking`] = t.tracking;
  }
  vars['--os-type-brand-size'] = osType.brand.size;
  vars['--os-type-brand-weight'] = osType.brand.weight;
  vars['--os-type-brand-tracking'] = osType.brand.tracking;
  for (const [k, v] of Object.entries(osMotion)) vars[`--os-motion-${k}`] = v;
  vars['--os-atmo-image'] = `url(${osAtmosphere.image})`;
  vars['--os-atmo-calm-filter'] = `blur(${osAtmosphere.calm.blur}) brightness(${osAtmosphere.calm.brightness}) saturate(${osAtmosphere.calm.saturate})`;
  vars['--os-atmo-universe-filter'] = `blur(${osAtmosphere.universe.blur}) brightness(${osAtmosphere.universe.brightness}) saturate(${osAtmosphere.universe.saturate})`;
  vars['--os-atmo-transition'] = osAtmosphere.transition;
  vars['--os-glass-filter'] = `blur(${osAtmosphere.glassBlur}) saturate(${osAtmosphere.glassSaturate})`;
  vars['--os-rail-width'] = osLayout.railWidth;
  vars['--os-mora-width'] = osLayout.moraWidth;
  vars['--os-bottom-bar'] = osLayout.bottomBar;
  vars['--os-dock-space'] = osLayout.dockSpace;
  vars['--os-content-max'] = osLayout.contentMax;
  const tones: SemanticMeaning[] = ['critical', 'warning', 'safe', 'ai', 'info', 'neutral'];
  for (const tone of tones) {
    const p = semanticColor(tone);
    vars[`--os-tone-${tone}-text`] = p.text;
    vars[`--os-tone-${tone}-bg`] = p.bg;
    vars[`--os-tone-${tone}-border`] = p.border;
  }
  return vars;
}

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/* ── V1.5 Tagesphasen × Look ───────────────────────────────────────────────
 * Vier Phasen wie im Legacy-Ritual (lib/os/ritualMode.ts: Flow/Build/Lounge/
 * Nacht, gleiche Akzentfarben). Jede Phase färbt Akzent, Aura, Glas und
 * Hintergrund. Look „Kosmos“ = Legacy-Home-Atmosphäre (hell, Raum),
 * Look „Klar“ = ruhige Business-Darstellung: deckende Flächen, kein Bildraum.
 */
export type OsPhase = 'flow' | 'build' | 'lounge' | 'night';
export type OsLook = 'kosmos' | 'klar';

const PHASE_PALETTE: Record<OsPhase, { accent: string; rgb: string; aura: string; aura2: string; base: string; baseKlar: string; glass: string }> = {
  flow:   { accent: '#6ee7b7', rgb: '16,185,129',  aura: 'rgba(16,185,129,0.30)',  aura2: 'rgba(34,211,238,0.22)',  base: 'linear-gradient(160deg, #0f4f63 0%, #177a86 40%, #2f8f86 64%, #a59a52 100%)', baseKlar: 'linear-gradient(180deg, #121b1f 0%, #0e1518 100%)', glass: 'rgba(10,30,36,0.46)' },
  build:  { accent: '#7dd3fc', rgb: '56,189,248',  aura: 'rgba(56,189,248,0.30)',  aura2: 'rgba(251,191,36,0.22)',  base: 'linear-gradient(160deg, #134a7c 0%, #2a7bb3 42%, #5b97bf 66%, #c39a4a 100%)', baseKlar: 'linear-gradient(180deg, #131a22 0%, #0f141b 100%)', glass: 'rgba(10,24,40,0.46)' },
  lounge: { accent: '#fdba74', rgb: '251,146,60',  aura: 'rgba(251,146,60,0.28)',  aura2: 'rgba(244,114,182,0.22)', base: 'linear-gradient(160deg, #3b2150 0%, #6a3360 40%, #a24f58 66%, #cf8448 100%)', baseKlar: 'linear-gradient(180deg, #1c1719 0%, #151214 100%)', glass: 'rgba(34,16,28,0.46)' },
  night:  { accent: '#a5b4fc', rgb: '99,102,241',  aura: 'rgba(99,102,241,0.30)',  aura2: 'rgba(34,211,238,0.16)',  base: 'linear-gradient(160deg, #0c1230 0%, #1d2860 45%, #2b2f78 70%, #12405a 100%)', baseKlar: 'linear-gradient(180deg, #11131b 0%, #0c0e14 100%)', glass: 'rgba(10,12,30,0.50)' },
};

export function osPhaseVariables(phase: OsPhase, look: OsLook): Record<string, string> {
  const p = PHASE_PALETTE[phase];
  const klar = look === 'klar';
  return {
    '--os-accent': p.accent,
    '--os-accent-soft': `rgba(${p.rgb},0.14)`,
    '--os-accent-line': `rgba(${p.rgb},0.34)`,
    '--os-focus': `rgba(${p.rgb},0.6)`,
    '--os-aura': klar ? `rgba(${p.rgb},0.06)` : p.aura,
    '--os-aura-secondary': klar ? 'transparent' : p.aura2,
    '--os-phase-base': klar ? p.baseKlar : p.base,
    '--os-glass': klar ? 'rgba(22,28,32,0.94)' : 'rgba(10,20,30,0.30)',
    '--os-glass-strong': klar ? 'rgba(24,30,34,0.97)' : 'rgba(8,16,24,0.42)',
    '--os-surface': klar ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.04)',
    '--os-glass-filter': klar ? 'none' : 'blur(18px) saturate(1.2)',
  };
}
