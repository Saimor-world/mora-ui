import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { buildTunnelCatalog, TUNNEL_PRODUCT_ISSUES } from '@/lib/tunnel/tunnelCatalog';
import type { AppUniverseGroup } from '@/lib/openflow/types';

const GROUPS: AppUniverseGroup[] = [
  {
    id: 'work',
    label: 'Arbeit',
    description: 'Finder, Aufgaben, Kalender, Notizen und konkrete Arbeitsfenster.',
    appIds: ['finder', 'document', 'notes', 'tasks', 'calendar', 'grid', 'timeline'],
  },
  {
    id: 'sources',
    label: 'Quellen',
    description: 'Mail, Cloud, Integrationen, Dossiers und verbundene Datenquellen.',
    appIds: ['mail', 'integrations', 'meine-dateien', 'website-dossier', 'search'],
  },
  {
    id: 'agents_flows',
    label: 'Agenten & Flows',
    description: 'MORA, Scanner, Action Center und Arbeitssitzungen.',
    appIds: ['chat', 'scanner', 'action-center', 'work-session'],
  },
  {
    id: 'people',
    label: 'Menschen',
    description: 'Team, Benutzer und Verantwortlichkeiten.',
    appIds: ['team', 'users'],
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Canvas und kreative Arbeitsflaechen.',
    appIds: ['canvas'],
  },
  {
    id: 'system',
    label: 'System',
    description: 'Einstellungen, Apps, Terminal und technische Kontrolle.',
    appIds: ['settings', 'apps', 'terminal'],
  },
];

export function getAppUniverseGroups(): AppUniverseGroup[] {
  const existingIds = new Set(APP_REGISTRY.map((app) => app.id));

  return GROUPS
    .map((group) => ({
      ...group,
      appIds: group.appIds.filter((appId) => existingIds.has(appId)),
    }))
    .filter((group) => group.appIds.length > 0);
}

export function getAppUniverseGroupForApp(appId: string): AppUniverseGroup | undefined {
  return getAppUniverseGroups().find((group) => group.appIds.includes(appId));
}

export function summarizeHiddenSurfaces() {
  const entries = buildTunnelCatalog();
  const gated = entries.filter((entry) => entry.status === 'gated');
  const orphan = entries.filter((entry) => entry.status === 'orphan' || entry.status === 'broken-wire');
  const keepVisual = entries.filter((entry) => entry.keepVisual);

  return {
    gatedCount: gated.length,
    orphanCount: orphan.length,
    keepVisualIds: keepVisual.map((entry) => entry.id),
    productIssueIds: TUNNEL_PRODUCT_ISSUES.map((entry) => entry.id),
  };
}
