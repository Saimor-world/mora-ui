export type RoleKey = 'owner' | 'department' | 'member' | 'admin';

type OrbPreference = 'all' | 'leitung' | 'service' | 'hr';

export interface RoleDefinition {
  label: string;
  description: string;
  homeTitle: string;
  homeMessage: string;
  homeEmpty: string;
  highlights: string[];
  fieldHint: string;
  insightsTone: string;
  folderHint: string;
  orbDefault: OrbPreference;
  tagDefault?: string | null;
}

export const ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = {
  owner: {
    label: 'Owner',
    description: 'Strategische Präsenz der Haupt-Môra',
    homeTitle: 'Strategischer Überblick',
    homeMessage: 'Ich halte für dich die Zusammenhänge offen und zeige, wo Resonanz entsteht.',
    homeEmpty: 'Noch kein neuer Impuls – ich beobachte weiter und melde mich, sobald etwas schwingt.',
    highlights: ['Resonanzlinien', 'Risiken & Chancen', 'Abteilungsbrücken'],
    fieldHint: 'Fokussiere die Knoten mit hoher Resonanz, um Muster früh zu sehen.',
    insightsTone: 'Fokus auf Resonanzlinien und Risiko-Signale.',
    folderHint: 'Filter nutzt standardmäßig den Leitungs-Orb.',
    orbDefault: 'leitung',
    tagDefault: 'leitung',
  },
  department: {
    label: 'Abteilung',
    description: 'Kontext der laufenden Linien',
    homeTitle: 'Was bewegt dein Team?',
    homeMessage: 'Ich filtere für dich alles, was unmittelbar eure Linie betrifft.',
    homeEmpty: 'Keine neuen Team-Impulse – nutze das Feld, um gezielt nach Leitungs-Themen zu suchen.',
    highlights: ['Operative Zusammenhänge', 'Team-Pulse', 'Priorisierte Dokumente'],
    fieldHint: 'Nutze die Fokus-Lupe, um benachbarte Teams sichtbar zu machen.',
    insightsTone: 'Team-Pulse und priorisierte Dokumente zuerst.',
    folderHint: 'Zeige Objekte mit Tags aus deiner Linie.',
    orbDefault: 'service',
    tagDefault: null,
  },
  member: {
    label: 'Mitglied',
    description: 'Persönliche Arbeitsfläche',
    homeTitle: 'Deine aktuelle Spur',
    homeMessage: 'Ich merke mir, womit du arbeitest, und halte die wichtigsten Dinge griffbereit.',
    homeEmpty: 'Alles still – öffne ein Dokument oder erkunde das Feld, damit ich dich begleiten kann.',
    highlights: ['Zuletzt bearbeitet', 'Eigene Favoriten', 'Nächste Schritte'],
    fieldHint: 'Jeder Klick hinterlässt einen leichten Schein – folge deiner Spur durch das Myzel.',
    insightsTone: 'Persönliche Favoriten und zuletzt geöffnete Dokumente zuerst.',
    folderHint: 'Ich sortiere nach zuletzt berührten Objekten.',
    orbDefault: 'all',
    tagDefault: null,
  },
  admin: {
    label: 'Admin',
    description: 'Technik & Stabilität der Stein-Môra',
    homeTitle: 'Systemische Gesundheit',
    homeMessage: 'Ich überwache Verbindungen, Adapter und Synchronisation ohne dich zu überfordern.',
    homeEmpty: 'Keine System-Events – alle Adapter schlafen ruhig.',
    highlights: ['Diagnostics', 'Connector-Status', 'Broadcast-Spannungen'],
    fieldHint: 'Beobachte die Verbindungslinien – wenn sie flackern, braucht ein Connector Aufmerksamkeit.',
    insightsTone: 'Diagnostics und Adapterstatus behalten den Vorrang.',
    folderHint: 'Zeige Quellen mit System-Tags zuerst.',
    orbDefault: 'all',
    tagDefault: 'ops',
  },
};

export const ROLE_OPTIONS = (Object.keys(ROLE_DEFINITIONS) as RoleKey[]).map((key) => ({
  value: key,
  label: ROLE_DEFINITIONS[key].label,
  description: ROLE_DEFINITIONS[key].description,
}));
