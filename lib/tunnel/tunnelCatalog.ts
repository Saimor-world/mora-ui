/**
 * Dev-only catalog of hidden, gated, archived, and orphaned UI in INTERFACE.
 * Consumed by /tunnel — not for production.
 */

import type { PaneType, SurfaceTier } from '@/lib/surface/surfaceRegistry';
import { APP_IDS } from '@/lib/apps/AppLoader';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { FUTURE_PANE_TYPES, SURFACE_TIERS } from '@/lib/surface/surfaceRegistry';
import { getMoraFeatureFlags } from '@/lib/featureFlags';

export type TunnelCategory =
  | 'apps'
  | 'gated-shell'
  | 'visual'
  | 'organic'
  | 'archive'
  | 'orphan-pane'
  | 'product';

export type TunnelPreviewKind = 'app' | 'component' | 'info';

export interface TunnelEntry {
  id: string;
  title: string;
  category: TunnelCategory;
  preview: TunnelPreviewKind;
  /** App id for AppLoader */
  appId?: string;
  /** Dynamic component key — see TUNNEL_COMPONENT_KEYS */
  componentKey?: string;
  status: 'live' | 'gated' | 'orphan' | 'archive' | 'broken-wire';
  tier?: SurfaceTier;
  location: string;
  whyHidden: string;
  keepVisual?: boolean;
  problem?: string;
  solution?: string;
  tags?: string[];
}

/** Keys resolved in TunnelComponentPreview */
export const TUNNEL_COMPONENT_KEYS = [
  'ResonanceRoom',
  'GhostOverlay',
  'CursorTrailEffect',
  'MemorySidebar',
  'MoraPulsePanel',
  'MoraInsightPopup',
  'LiquidOrb',
  'PlasmaOrb',
  'MoraOrb',
  'StarField',
  'ForestLightCanopy',
  'NeuralGrid',
  'MyceliumLayer',
  'AmbientDust',
  'OrganicBackground',
  'RadarCard',
  'MoraPlayground',
  'BootSequence',
  'EventsViewer',
  'ConfirmCard',
  'FocusModeWidget',
  'ActionTray',
] as const;

export type TunnelComponentKey = (typeof TUNNEL_COMPONENT_KEYS)[number];

function paneEntries(): TunnelEntry[] {
  const inPaneManager = new Set([
    'settings', 'document', 'team', 'notes', 'finder', 'chat', 'meine-dateien',
    'grid', 'search', 'scanner', 'users', 'mail', 'calendar', 'integrations',
    'browser', 'website-dossier', 'terminal', 'company-detail', 'mora-hub',
    'apps', 'timeline', 'tasks', 'canvas', 'space', 'actions', 'action-center',
    'work-session',
  ]);

  const allPaneTypes = Object.keys(SURFACE_TIERS) as PaneType[];

  return allPaneTypes.map((type) => {
    const tier = SURFACE_TIERS[type];
    const inRegistry = APP_REGISTRY.some((a) => a.id === type);
    const inAppMap = APP_IDS.includes(type);
    const wired = inPaneManager.has(type);

    let status: TunnelEntry['status'] = 'live';
    if (FUTURE_PANE_TYPES.includes(type)) status = 'gated';
    else if (!wired && (inRegistry || inAppMap)) status = 'broken-wire';
    else if (!wired) status = 'orphan';

    return {
      id: `pane-${type}`,
      title: type,
      category: inRegistry ? 'apps' : 'orphan-pane',
      preview: inAppMap ? 'app' : 'info',
      appId: inAppMap ? type : undefined,
      status,
      tier,
      location: wired
        ? 'components/mora/PaneManager.tsx'
        : inAppMap
          ? `components/panes/*Pane.tsx → AppLoader("${type}")`
          : 'surfaceRegistry only',
      whyHidden:
        tier === 'future'
          ? 'future-tier in surfaceRegistry — isPaneEnabled() blockiert Öffnen'
          : !wired
            ? 'Pane existiert, fehlt aber im PaneManager switch'
            : tier === 'app'
              ? 'App-Tier — nur über App-Bibliothek / Kontext, nicht im Dock'
              : 'Core — normalerweise über Dock erreichbar',
      problem:
        status === 'broken-wire'
          ? `openPane({ type: '${type}' }) rendert null — PaneManager hat keinen case`
          : tier === 'future'
            ? 'Chat/Dock feuert openPane, PaneManager verwirft wegen isPaneEnabled'
            : undefined,
      solution:
        status === 'broken-wire'
          ? `case '${type}' in PaneManager + passende *Pane importieren`
          : tier === 'future'
            ? 'Tier auf app heben ODER Tunnel/Feature-Flag für Preview beibehalten'
            : undefined,
      tags: [tier, status],
    };
  });
}

const GATED_SHELL: TunnelEntry[] = [
  {
    id: 'resonance-room',
    title: 'Resonance Room',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'ResonanceRoom',
    status: 'gated',
    location: 'MoraShell.tsx (import auskommentiert)',
    whyHidden: '1.0 gated — future-tier dialogue surface',
    keepVisual: true,
    tags: ['dialogue', 'mora'],
  },
  {
    id: 'ghost-overlay',
    title: 'Ghost Overlay',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'GhostOverlay',
    status: 'gated',
    location: 'MoraShell.tsx',
    whyHidden: 'Agentic cursor / ghost preview — future-tier',
    keepVisual: true,
  },
  {
    id: 'cursor-trail',
    title: 'Cursor Trail Effect',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'CursorTrailEffect',
    status: 'gated',
    location: 'MoraShell.tsx',
    whyHidden: 'Visueller Cursor-Effekt — Performance & Ablenkung',
    keepVisual: true,
  },
  {
    id: 'memory-sidebar',
    title: 'Memory Sidebar',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'MemorySidebar',
    status: 'gated',
    location: 'MoraShell.tsx',
    whyHidden: 'Memory-UI ohne fertiges Produkt-Polishing',
    keepVisual: true,
  },
  {
    id: 'mora-pulse-panel',
    title: 'Mora Pulse Panel',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'MoraPulsePanel',
    status: 'gated',
    location: 'MoraShell.tsx (importiert, JSX auskommentiert)',
    whyHidden: 'Kontext jetzt in HomeSurface — Panel bewusst stillgelegt',
    keepVisual: true,
  },
  {
    id: 'mora-insight-popup',
    title: 'Mora Insight Popup',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'MoraInsightPopup',
    status: 'gated',
    location: 'MoraShell.tsx',
    whyHidden: 'MindLoop insight events — future-tier',
    keepVisual: true,
  },
  {
    id: 'focus-mode',
    title: 'Focus Mode Widget',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'FocusModeWidget',
    status: 'gated',
    location: 'Dock.tsx',
    whyHidden: '1.0 surface hierarchy — aus Dock entfernt',
    keepVisual: true,
  },
  {
    id: 'action-tray',
    title: 'Action Tray',
    category: 'gated-shell',
    preview: 'component',
    componentKey: 'ActionTray',
    status: 'gated',
    location: 'Dock.tsx',
    whyHidden: 'Operative Aktionen — noch nicht produktreif',
    keepVisual: true,
  },
];

const VISUAL: TunnelEntry[] = [
  {
    id: 'liquid-orb',
    title: 'Liquid Orb',
    category: 'visual',
    preview: 'component',
    componentKey: 'LiquidOrb',
    status: 'live',
    location: 'components/mora/LiquidOrb.tsx',
    whyHidden: 'Alternative Orb-Darstellung — nicht Standard im Dock',
    keepVisual: true,
  },
  {
    id: 'plasma-orb',
    title: 'Plasma Orb',
    category: 'visual',
    preview: 'component',
    componentKey: 'PlasmaOrb',
    status: 'live',
    location: 'MoraPlayground / Experimente',
    whyHidden: 'Playground-Variante des Orbs',
    keepVisual: true,
  },
  {
    id: 'mora-orb',
    title: 'Mora Orb',
    category: 'visual',
    preview: 'component',
    componentKey: 'MoraOrb',
    status: 'live',
    location: 'Dock, ResonanceRoom',
    whyHidden: 'Standard-Orb — hier isoliert zur Inspektion',
    keepVisual: true,
  },
  {
    id: 'starfield',
    title: 'StarField',
    category: 'visual',
    preview: 'component',
    componentKey: 'StarField',
    status: 'live',
    location: 'MoraShell Hintergrund',
    whyHidden: 'Immer aktiv im Shell — hier einzeln sichtbar',
    keepVisual: true,
  },
  {
    id: 'forest-canopy',
    title: 'Forest Light Canopy',
    category: 'visual',
    preview: 'component',
    componentKey: 'ForestLightCanopy',
    status: 'live',
    location: 'MoraShell',
    whyHidden: 'Atmosphäre-Layer',
    keepVisual: true,
  },
  {
    id: 'neural-grid',
    title: 'Neural Grid',
    category: 'visual',
    preview: 'component',
    componentKey: 'NeuralGrid',
    status: 'orphan',
    location: 'components/visual/NeuralGrid.tsx',
    whyHidden: 'Nicht mehr im Shell verdrahtet',
    keepVisual: true,
  },
  {
    id: 'mora-playground',
    title: 'Mora Playground',
    category: 'visual',
    preview: 'component',
    componentKey: 'MoraPlayground',
    status: 'live',
    location: 'components/mora/MoraPlayground.tsx',
    whyHidden: 'Feed + Orb Status — frühere Home-Variante',
    keepVisual: true,
  },
  {
    id: 'radar-card',
    title: 'Radar Card (Mock)',
    category: 'visual',
    preview: 'component',
    componentKey: 'RadarCard',
    status: 'live',
    location: 'NotificationCenter',
    whyHidden: 'Nur bei echten Radar-Events sichtbar',
    keepVisual: true,
  },
  {
    id: 'confirm-card',
    title: 'Dialogue Confirm Card',
    category: 'visual',
    preview: 'component',
    componentKey: 'ConfirmCard',
    status: 'live',
    location: 'components/mora/dialogue/',
    whyHidden: 'Nur bei Mora-Bestätigungs-Flow',
    keepVisual: true,
  },
];

const ORGANIC: TunnelEntry[] = [
  {
    id: 'mycelium-layer',
    title: 'Mycelium Layer (2D)',
    category: 'organic',
    preview: 'component',
    componentKey: 'MyceliumLayer',
    status: 'orphan',
    location: 'components/organic/MyceliumLayer.tsx',
    whyHidden: 'Nutzt deprecated activeNode — nicht im aktuellen Nav-Flow',
    keepVisual: true,
    problem: 'activeNode aus moraState — Migration unvollständig',
    solution: 'Auf useNavStore + Query umstellen oder als „Museum“ behalten',
  },
  {
    id: 'ambient-dust',
    title: 'Ambient Dust',
    category: 'organic',
    preview: 'component',
    componentKey: 'AmbientDust',
    status: 'orphan',
    location: 'components/organic/AmbientDust.tsx',
    whyHidden: 'Dekor-Partikel — nicht eingebunden',
    keepVisual: true,
  },
  {
    id: 'organic-background',
    title: 'Organic Background',
    category: 'organic',
    preview: 'component',
    componentKey: 'OrganicBackground',
    status: 'orphan',
    location: 'components/organic/OrganicBackground.tsx',
    whyHidden: 'Früherer Hintergrund-Stil',
    keepVisual: true,
  },
  {
    id: 'boot-sequence',
    title: 'Boot Sequence (Organic)',
    category: 'organic',
    preview: 'component',
    componentKey: 'BootSequence',
    status: 'orphan',
    location: 'components/organic/BootSequence.tsx',
    whyHidden: 'Duplikat zu ui/BootSequence?',
    keepVisual: true,
  },
];

const ARCHIVE: TunnelEntry[] = [
  {
    id: 'events-viewer',
    title: 'Events Viewer (Debug)',
    category: 'archive',
    preview: 'component',
    componentKey: 'EventsViewer',
    status: 'archive',
    location: '_archive/debug/EventsViewer.tsx',
    whyHidden: 'Dev-Tool, nutzt useMoraStore',
    tags: ['legacy'],
  },
];

/** Produkt-/Flow-Themen (Punkt 4) — kein UI-Preview, nur Klarheit */
export const TUNNEL_PRODUCT_ISSUES: TunnelEntry[] = [
  {
    id: 'website-hq-entry',
    title: 'Website → HQ Einstieg',
    category: 'product',
    preview: 'info',
    status: 'live',
    location: 'WORLD + CORE entry_token + INTERFACE website-entry-login',
    whyHidden: 'Kein UI-Problem — Env/Deploy-Problem',
    problem:
      'Ohne identisches SAIMOR_ENTRY_SECRET in Vercel (WORLD) und Hetzner (CORE) entstehen keine gültigen Preview-Tokens in Produktion.',
    solution:
      'Secret in beiden Umgebungen setzen; lokal greift Fallback local-dev-entry-secret. Smoke: Scan → HQ-Link → tenant-preview-*.',
  },
  {
    id: 'owner-console',
    title: 'Owner Console',
    category: 'product',
    preview: 'info',
    status: 'live',
    location: 'WORLD owner views + CORE owner APIs',
    whyHidden: 'Funktional basic, nicht versteckt',
    problem: 'Approve Wall, Resend Link, Open Dossier — Workflow noch dünn.',
    solution: 'OWNER-APIs mit INTERFACE/WORLD Buttons verdrahten; Ledger als Single Source of Truth.',
  },
  {
    id: 'work-session-wire',
    title: 'Arbeitssitzung (work-session)',
    category: 'product',
    preview: 'app',
    appId: 'work-session',
    status: 'live',
    tier: 'app',
    location: 'Chat/Dock openPane → PaneManager',
    whyHidden: 'War future-tier + fehlender PaneManager-case; jetzt als App-Pane verdrahtet.',
    problem: 'Mora erzeugte Pläne, openPane feuerte, aber nichts renderte.',
    solution: 'Promoted: surfaceRegistry app-tier + PaneManager case work-session.',
  },
  {
    id: 'action-center-wire',
    title: 'Action Center',
    category: 'product',
    preview: 'app',
    appId: 'action-center',
    status: 'live',
    tier: 'app',
    location: 'App-Library exclude + PaneManager',
    whyHidden: 'War aus Launcher/Panes uneindeutig; jetzt über actions/action-center Alias verdrahtet.',
    problem: 'action-center war app-tier, aber PaneManager renderte es nicht.',
    solution: "Promoted: case 'actions' und case 'action-center' rendern ActionCenterPane.",
  },
  {
    id: 'failing-tests',
    title: '15 vorbekannte Test-Failures',
    category: 'product',
    preview: 'info',
    status: 'live',
    location: '__tests__ — surfaceRegistry, ScannerPane, UsersPane, Breadcrumb, UniverseView',
    whyHidden: 'Tech-Schuld, blockiert nicht Deploy',
    problem: 'Regressionen schwer erkennbar wenn Baseline rot ist.',
    solution: 'Pro Suite fixen oder quarantänieren mit Ticket — Ziel: grüne verify:os:smoke.',
  },
  {
    id: 'active-node',
    title: 'activeNode / Mycelium',
    category: 'product',
    preview: 'info',
    status: 'orphan',
    location: 'moraState + organic/*',
    whyHidden: 'Legacy-State',
    problem: '7 Dateien hängen an deprecated activeNode.',
    solution: 'NavStore + Query; visuelle Mycelium-Layer in Tunnel behalten bis Migration.',
  },
  {
    id: 'mora-memory-chat',
    title: 'Mora Memory ↔ Chat',
    category: 'product',
    preview: 'info',
    status: 'gated',
    location: 'docs/superpowers/plans/2026-05-15-mora-memory-chat-integration.md',
    whyHidden: 'Recall-Intent noch nicht implementiert',
    problem: 'detectRecallIntent fehlt — Memory-Tab im Chat unvollständig.',
    solution: 'Plan umsetzen; Feature-Flags NEXT_PUBLIC_MORA_* schrittweise aktivieren.',
  },
  {
    id: 'feature-flags',
    title: 'Real-Mora Feature Flags',
    category: 'product',
    preview: 'info',
    status: 'gated',
    location: 'lib/featureFlags.ts',
    whyHidden: 'Standard: alle OFF',
    problem: 'Perceive/Dialogue/Live V1 nicht sichtbar ohne Env.',
    solution: 'In .env.local setzen zum Testen; nach Verifikation Prod-Flip.',
  },
];

export function buildTunnelCatalog(): TunnelEntry[] {
  const pane = paneEntries();
  const seen = new Set<string>();
  const merged: TunnelEntry[] = [];

  for (const list of [pane, GATED_SHELL, VISUAL, ORGANIC, ARCHIVE]) {
    for (const e of list) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
  }

  return merged;
}

export function getTunnelFeatureFlags() {
  return getMoraFeatureFlags();
}

export const TUNNEL_CATEGORY_LABELS: Record<TunnelCategory, string> = {
  apps: 'Apps & Panes',
  'gated-shell': '1.0 gated (Shell/Dock)',
  visual: 'Visuell / Orbs / Effekte',
  organic: 'Organic / Mycelium',
  archive: 'Archiv',
  'orphan-pane': 'Verwaiste Panes',
  product: 'Produkt & Flows',
};
