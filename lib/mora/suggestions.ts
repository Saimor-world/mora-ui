import type { MoraEvent } from '@/lib/mora/listener';

export type SuggestionAction =
  | { type: 'navigate'; href: string }
  | { type: 'filter'; href?: string; orb?: string; tag?: string }
  | { type: 'favorite'; objectId: string; title?: string; path?: string; tags?: string[] }
  | { type: 'copy'; text: string }
  | { type: 'info'; message: string };

export interface SuggestionBlueprint {
  id: string;
  rule: string;
  title: string;
  description: string;
  icon: string;
  cta: string;
  action: SuggestionAction;
}

const FINANCE_REGEX = /finance|budget|q[1-4]/i;
const REPORT_REGEX = /report|leit|leitung/i;

export function buildSuggestions(event: MoraEvent): SuggestionBlueprint[] {
  switch (event.action) {
    case 'node_click':
      return buildNodeSuggestions(event);
    case 'filter_change':
      return buildFilterSuggestions(event);
    case 'connector_action':
      return buildConnectorSuggestions(event);
    case 'open_document':
      return buildDocumentSuggestions(event);
    default:
      return [];
  }
}

function buildNodeSuggestions(event: MoraEvent): SuggestionBlueprint[] {
  const payload = event.payload ?? {};
  const title = typeof payload.title === 'string' ? payload.title : 'Knoten';
  const path = typeof payload.path === 'string' ? payload.path : '';
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const id = typeof payload.id === 'string' ? payload.id : `node-${event.ts}`;
  const suggestions: SuggestionBlueprint[] = [];

  if (FINANCE_REGEX.test(path) || tags.some((tag) => FINANCE_REGEX.test(tag))) {
    suggestions.push({
      id: `finance-pin-${id}`,
      rule: 'finance-pin',
      title: 'Finanz-Pfad vormerken',
      description: `${title} liegt im Finance-Raum – pinne ihn für später.`,
      icon: '🌿',
      cta: 'Als Favorit pinnen',
      action: {
        type: 'favorite',
        objectId: id,
        title,
        path,
        tags,
      },
    });
  }

  if (REPORT_REGEX.test(path) || REPORT_REGEX.test(title)) {
    suggestions.push({
      id: `report-open-${id}`,
      rule: 'report-open',
      title: 'Bericht weiterlesen',
      description: 'Öffne den Bericht im Folder Mode mit aktivem Filter.',
      icon: '📑',
      cta: 'Folder öffnen',
      action: {
        type: 'filter',
        href: '/folder',
        tag: tags[0] ?? 'leitung',
      },
    });
  }

  if (tags.includes('insight')) {
    suggestions.push({
      id: `insight-link-${id}`,
      rule: 'insight-link',
      title: 'Resonanz prüfen',
      description: 'Springe zu Insights, um verbundene Resonanzen zu sehen.',
      icon: '✨',
      cta: 'Insights öffnen',
      action: {
        type: 'navigate',
        href: '/insights',
      },
    });
  }

  return suggestions;
}

function buildFilterSuggestions(event: MoraEvent): SuggestionBlueprint[] {
  const payload = event.payload ?? {};
  const suggestions: SuggestionBlueprint[] = [];
  if (typeof payload.orb === 'string' && payload.orb !== 'all') {
    suggestions.push({
      id: `orb-${payload.orb}`,
      rule: 'orb-focus',
      title: `Orb ${payload.orb.toUpperCase()} aktiv`,
      description: 'Zeige den passenden Leitungs-Report in Insights.',
      icon: '🧭',
      cta: 'Report öffnen',
      action: {
        type: 'navigate',
        href: `/insights?orb=${payload.orb}`,
      },
    });
  }

  if (typeof payload.tag === 'string' && payload.tag.length > 0) {
    suggestions.push({
      id: `tag-${payload.tag}`,
      rule: 'tag-focus',
      title: `Tag #${payload.tag} aktiv`,
      description: 'Filtere Folder Mode direkt auf diesen Tag.',
      icon: '🏷️',
      cta: 'Filter anwenden',
      action: {
        type: 'filter',
        href: '/folder',
        tag: payload.tag,
      },
    });
  }

  return suggestions;
}

function buildConnectorSuggestions(event: MoraEvent): SuggestionBlueprint[] {
  const payload = event.payload ?? {};
  const connectorId = typeof payload.id === 'string' ? payload.id : 'connector';
  const status = typeof payload.status === 'string' ? payload.status : 'unknown';
  const suggestions: SuggestionBlueprint[] = [];

  if (status === 'syncing') {
    suggestions.push({
      id: `sync-${connectorId}`,
      rule: 'sync-progress',
      title: 'Sync läuft',
      description: 'Mock-Sync dauert rund 3 Sekunden – du kannst weiterarbeiten.',
      icon: '🔄',
      cta: 'Okay',
      action: {
        type: 'info',
        message: 'Sync läuft weiter im Hintergrund.',
      },
    });
  }

  if (status === 'error' || payload.level === 'warning') {
    suggestions.push({
      id: `connector-health-${connectorId}`,
      rule: 'connector-health',
      title: 'Connector prüfen',
      description: 'Schau im Diagnostics-Panel nach Details zur Quelle.',
      icon: '🩺',
      cta: 'Diagnostics öffnen',
      action: {
        type: 'navigate',
        href: '/field#diagnostics',
      },
    });
  }

  return suggestions;
}

function buildDocumentSuggestions(event: MoraEvent): SuggestionBlueprint[] {
  const payload = event.payload ?? {};
  const path = typeof payload.path === 'string' ? payload.path : undefined;
  const title = typeof payload.title === 'string' ? payload.title : 'Dokument';
  const suggestions: SuggestionBlueprint[] = [];

  if (path) {
    suggestions.push({
      id: `doc-copy-${path}`,
      rule: 'doc-copy',
      title: `${title} teilen`,
      description: 'Pfad in die Zwischenablage kopieren und an Kolleg:innen senden.',
      icon: '📎',
      cta: 'Pfad kopieren',
      action: {
        type: 'copy',
        text: path,
      },
    });
  }

  return suggestions;
}
