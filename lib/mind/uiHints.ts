/**
 * UI Hints – Proaktive Vorschläge für die Môra UI
 *
 * Diese Datei definiert UI-only Hints (keine Backend-Logik).
 * Hints werden in Home/Pulse Card angezeigt, später auch dynamisch generiert.
 */

export type HintType = 'insight' | 'action' | 'suggestion' | 'discovery';

export interface UIHint {
  id: string;
  type: HintType;
  message: string;
  contextLabel?: string;
  actionLabel?: string;
  actionPath?: string; // z.B. '/field', '/insights'
  priority?: number; // 1-10 (10 = höchste Priorität)
}

/**
 * Demo-Hints für die erste Welle
 * Später können diese dynamisch generiert werden (z.B. basierend auf Awareness-Daten)
 */
export const DEMO_HINTS: UIHint[] = [
  {
    id: 'hint-1',
    type: 'insight',
    message: 'Im Myzel gibt es 3 neue Verbindungen zu Q4-Budget.',
    contextLabel: 'Q4 Budget',
    actionLabel: 'Zum Feld',
    actionPath: '/field',
    priority: 8,
  },
  {
    id: 'hint-2',
    type: 'action',
    message: '5 Dokumente warten auf Review.',
    contextLabel: 'Folder',
    actionLabel: 'Zum Ordner',
    actionPath: '/folder',
    priority: 7,
  },
  {
    id: 'hint-3',
    type: 'suggestion',
    message: 'Service-Orb hat ähnliche Inhalte wie Strategy-Orb – möchtest du sie zusammenführen?',
    contextLabel: 'Insights',
    actionLabel: 'Insights ansehen',
    actionPath: '/insights',
    priority: 6,
  },
  {
    id: 'hint-4',
    type: 'discovery',
    message: 'Mora hat 2 potenzielle Duplikate entdeckt.',
    contextLabel: 'Duplicate Hunter',
    actionLabel: 'Zu Insights',
    actionPath: '/insights',
    priority: 9,
  },
  {
    id: 'hint-5',
    type: 'insight',
    message: 'Die häufigsten Tags in deinem Workspace: #strategy, #finance, #team.',
    contextLabel: 'Analytics',
    priority: 5,
  },
];

/**
 * Gibt die Top N Hints zurück, sortiert nach Priorität
 */
export function getTopHints(count: number = 3): UIHint[] {
  return DEMO_HINTS
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, count);
}

/**
 * Gibt Hints eines bestimmten Typs zurück
 */
export function getHintsByType(type: HintType): UIHint[] {
  return DEMO_HINTS.filter((hint) => hint.type === type);
}

/**
 * Formatiert einen Hint für die Anzeige
 */
export function formatHint(hint: UIHint): string {
  const prefix = hint.type === 'insight' ? '💡' :
                 hint.type === 'action' ? '⚡' :
                 hint.type === 'suggestion' ? '🌱' :
                 hint.type === 'discovery' ? '🔍' : '•';
  return `${prefix} ${hint.message}`;
}
