'use client';
import { APP_REGISTRY, getAppManifest } from '@/lib/apps/appRegistry';
import { usePaneStore } from '@/lib/store/paneStore';
import type { PaneType } from '@/lib/surface/surfaceRegistry';

/**
 * Where every legacy app (lib/apps/appRegistry) lives in the new OS information
 * architecture. Nothing is deleted: each app keeps its own code and is opened
 * as a classic pane from the surface that now "owns" it, or from Labs/System.
 *
 * Tests assert that every id in AppLoader's APP_MAP has exactly one placement.
 */
export type LegacyPlacement = 'mora' | 'finance' | 'knowledge' | 'post' | 'settings' | 'labs' | 'system' | 'work' | 'legacy';

export interface LegacyAppEntry {
  appId: string;
  placement: LegacyPlacement;
  /** One sentence: why it sits there / what replaces it. */
  note: string;
}

export const LEGACY_APP_PLACEMENT: LegacyAppEntry[] = [
  { appId: 'chat', placement: 'mora', note: 'Volle Chat-App; MÔRA-Panel nutzt denselben /v3/chat-Client.' },
  { appId: 'finance-v2', placement: 'finance', note: 'In der Finance-Fläche eingebettet (FinanceV2Workspace).' },
  { appId: 'finance', placement: 'legacy', note: 'Alte Capital-App mit hartkodierten Konten – nur noch Legacy-Ansicht.' },
  { appId: 'finder', placement: 'knowledge', note: 'Ordner & Dateien – Quelle in Wissen.' },
  { appId: 'meine-dateien', placement: 'knowledge', note: 'Persönliche Dateien – Quelle in Wissen.' },
  { appId: 'search', placement: 'knowledge', note: 'Volle Suche – Wissen sucht über denselben Client.' },
  { appId: 'document', placement: 'knowledge', note: 'Dokument-Ansicht – öffnet aus Treffern.' },
  { appId: 'notes', placement: 'knowledge', note: 'Notizen – Quelle in Wissen.' },
  { appId: 'mail', placement: 'post', note: 'Postfach – Post zeigt Überblick und öffnet es.' },
  { appId: 'calendar', placement: 'post', note: 'Kalender – Post zeigt Termine und öffnet ihn.' },
  { appId: 'settings', placement: 'settings', note: 'Vollständige alte Einstellungen (1.806 Z.) – Einstieg aus Einstellungen.' },
  { appId: 'integrations', placement: 'settings', note: 'Verbindungen – Einstellungen › Verbindungen.' },
  { appId: 'work', placement: 'work', note: 'Arbeitsfläche (Cockpit).' },
  { appId: 'tasks', placement: 'work', note: 'Aufgaben – offene Arbeit erscheint in Heute.' },
  { appId: 'action-center', placement: 'work', note: 'Action Center.' },
  { appId: 'work-session', placement: 'work', note: 'Arbeitssitzung.' },
  { appId: 'scanner', placement: 'labs', note: 'Scanner (experimentell).' },
  { appId: 'nightwatch', placement: 'labs', note: 'Nightwatch – Agent-Monitoring; Signal erscheint in Heute.' },
  { appId: 'lagefeld', placement: 'labs', note: 'Lagefeld.' },
  { appId: 'codex', placement: 'labs', note: 'Codex.' },
  { appId: 'canvas', placement: 'labs', note: 'Canvas.' },
  { appId: 'grid', placement: 'labs', note: 'Alle Inhalte (Grid).' },
  { appId: 'website-dossier', placement: 'labs', note: 'Website-Dossier.' },
  { appId: 'timeline', placement: 'labs', note: 'Timeline.' },
  { appId: 'feeds', placement: 'labs', note: 'Feeds.' },
  { appId: 'terminal', placement: 'system', note: 'Terminal – Sicherheitsfläche, nur System-Rollen.' },
  { appId: 'team', placement: 'system', note: 'Team.' },
  { appId: 'users', placement: 'system', note: 'Benutzer.' },
  { appId: 'apps', placement: 'system', note: 'Alte App-Bibliothek.' },
];

export function legacyAppsFor(placement: LegacyPlacement): LegacyAppEntry[] {
  return LEGACY_APP_PLACEMENT.filter((e) => e.placement === placement);
}

export function legacyAppName(appId: string): string {
  return getAppManifest(appId)?.name ?? appId;
}

export function knownLegacyAppIds(): string[] {
  return APP_REGISTRY.map((m) => m.id);
}

/** Open a legacy app as a classic pane above the new shell (PaneManager renders it). */
export function openLegacyApp(appId: string, data?: Record<string, unknown>) {
  const manifest = getAppManifest(appId);
  if (!manifest) return false;
  usePaneStore.getState().openPane({
    id: `os-${appId}`,
    type: appId as PaneType,
    title: manifest.name,
    size: manifest.defaultSize,
    data: { ...(data || {}), openedFrom: 'os-prototype' },
  });
  return true;
}
