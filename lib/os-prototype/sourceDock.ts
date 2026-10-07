/**
 * V1.7 Andockstation – reine Logik (testbar, ohne React).
 * Quellen sind Stationen, die an die Abteilungs-Planeten andocken, die sie speisen.
 * Status kommt ausschließlich aus CORE (`GET /v3/connections`); hier wird nur
 * angeordnet, priorisiert und übersetzt – nie etwas behauptet.
 */
import type { SourceEntry } from './useSources';

export interface DockPlanet { id: string; name: string; color: string }
export interface DockStation { id: string; label: string; group: string; status: string; sample?: boolean; entry?: SourceEntry }

/** Ruhige Planeten-Farben, wenn CORE keine liefert (angelehnt an die Original-Planeten). */
export const PLANET_COLORS = ['#fbbf24', '#67e8f9', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'];

/** Mittelstand zuerst: Kalender, Mail, Dateien. Werkzeuge und Zahlungen liegen hinter „Weitere“. */
export const GROUP_PRIORITY = ['calendar', 'mail', 'cloud', 'creator', 'payments'];
export const CORE_GROUPS = new Set(['calendar', 'mail', 'cloud']);

export function groupRank(group: string): number {
  const i = GROUP_PRIORITY.indexOf(group);
  return i === -1 ? GROUP_PRIORITY.length : i;
}

/** Stationen in Ruhe-Reihenfolge: angedockt, dann nach Mittelstands-Priorität. */
export function sortStations<T extends { group: string; status: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.status === 'connected' ? 0 : 1) - (b.status === 'connected' ? 0 : 1) || groupRank(a.group) - groupRank(b.group));
}

/** Die eine Station, die MÔRA als Nächstes vorschlägt (nur „bereit“, nie Admin-Fälle). */
export function recommendStation<T extends { group: string; status: string; id: string }>(list: T[]): T | null {
  const ready = list.filter((s) => s.status === 'available').sort((a, b) => groupRank(a.group) - groupRank(b.group));
  return ready[0] ?? null;
}

/** Sichtbar ohne Aufklappen: Kern-Gruppen und alles, was schon angedockt ist. Admin-Fälle nie. */
export function isPrimaryStation(s: { group: string; status: string }): boolean {
  if (s.status === 'connected') return true;
  if (s.status === 'setup_required') return false;
  return CORE_GROUPS.has(s.group);
}

/** Je Gruppe Schlagworte in Vorrang-Reihenfolge (erste Liste schlägt die zweite). */
const TARGET_HINTS: Record<string, RegExp[]> = {
  calendar: [/(management|führung|geschäftsführung|leitung)/i, /(organisation|office|verwaltung|zentrale)/i],
  mail: [/(vertrieb|sales|kunden|service)/i, /(office|verwaltung|management)/i],
  cloud: [/(wissen|technolog|tech|\bit\b|projekt)/i, /(verwaltung|operations|betrieb)/i],
  creator: [/(marketing|brand|marke|kommunikation|content)/i],
  payments: [/(finanz|finance|buchhaltung|controlling|rechnung)/i],
};

/**
 * Wohin eine Station andockt: der Planet, den sie vor allem speist (Schlagwort im Abteilungsnamen).
 * Kein Treffer → Firmenkern (MÔRA), also die ganze Firma. Reine Darstellung, CORE speichert keine Zuordnung.
 */
export function dockTarget(group: string, planets: DockPlanet[]): DockPlanet | null {
  for (const hint of TARGET_HINTS[group] || []) {
    const hit = planets.find((p) => hint.test(p.name));
    if (hit) return hit;
  }
  return null;
}

/** Freigabe-Schleuse: was hereinkommt – kurz, je Gruppe. */
export const CONSENT_IN: Record<string, string> = {
  calendar: 'Termine und freie Zeiten',
  mail: 'Betreff, Absender und Text',
  cloud: 'Ordner und Dateien, die du freigibst',
  creator: 'Seiten und Listen aus dem Werkzeug',
  payments: 'Zahlungen und Abos, nur lesend',
};

/** Ein Satz von MÔRA: warum diese Station. */
export const STATION_WHY: Record<string, string> = {
  calendar: 'Mit dem Kalender startet dein Morgenbriefing.',
  mail: 'Mit der Post sieht MÔRA, was heute wirklich wartet.',
  cloud: 'Mit deinen Dateien wird Wissen durchsuchbar.',
  creator: 'Damit fließen Inhalte aus deinem Werkzeug ein.',
  payments: 'Damit wird Umsatz sichtbar – nur echte Zahlen.',
};

/** CORE-Fehler in einen nächsten Schritt übersetzen. Der Originaltext bleibt als Detail einsehbar. */
export function translateCoreError(raw: string): string {
  const t = raw || '';
  if (/not configured|nicht .*konfiguriert|setup_required/i.test(t)) return 'Diese Station richtet ein Admin auf dem Server ein.';
  if (/demo|boundary/i.test(t)) return 'Demo-Konten docken nichts Echtes an.';
  if (/reject|invalid|unauthori[sz]ed|forbidden|denied|abgelehnt|401|403|credential|passwor|token/i.test(t)) return 'Die Zugangsdaten wurden abgelehnt. Bitte prüfen und erneut andocken.';
  if (/timeout|timed out|unreachable|refused|resolve|network|ECONN|ENOTFOUND|nicht erreichbar/i.test(t)) return 'Der Dienst war nicht erreichbar. Adresse prüfen und erneut versuchen.';
  return 'Das Andocken hat nicht geklappt.';
}

/** Beispiel-Szene ohne Sitzung (klar als „Beispiel“ markiert, nichts davon ist echt). */
export const SAMPLE_STATIONS: DockStation[] = [
  { id: 'sample-calendar', label: 'Kalender', group: 'calendar', status: 'connected', sample: true },
  { id: 'sample-mail', label: 'E-Mail', group: 'mail', status: 'available', sample: true },
  { id: 'sample-cloud', label: 'Dateien', group: 'cloud', status: 'available', sample: true },
];

export interface Point { x: number; y: number }
export const SCENE = { w: 640, h: 330, cx: 320, cy: 165 };

/** Bahnen: innen die Abteilungs-Planeten, außen der Andock-Ring der freien Stationen. */
export function orbits(compact = false) {
  return compact
    ? { planet: { rx: 150, ry: 74 }, outer: { rx: 240, ry: 118 } }
    : { planet: { rx: 160, ry: 82 }, outer: { rx: 250, ry: 132 } };
}

/** Planeten auf der inneren Ellipse (wie im Universe: Kern in der Mitte). */
export function planetPositions(n: number, compact = false): Point[] {
  const { rx, ry } = orbits(compact).planet;
  return Array.from({ length: n }, (_, i) => {
    const a = (-90 + (360 / Math.max(n, 1)) * i + (n % 2 ? 0 : 180 / n)) * (Math.PI / 180);
    return { x: SCENE.cx + rx * Math.cos(a), y: SCENE.cy + ry * Math.sin(a) };
  });
}

/** Freie Stationen auf dem äußeren Andock-Ring, versetzt zu den Planeten. */
export function orbitPositions(n: number, compact = false): Point[] {
  const { rx, ry } = orbits(compact).outer;
  return Array.from({ length: n }, (_, i) => {
    const a = (-90 + (360 / Math.max(n, 1)) * (i + 0.5)) * (Math.PI / 180);
    return { x: SCENE.cx + rx * Math.cos(a), y: SCENE.cy + ry * Math.sin(a) };
  });
}

/**
 * Andock-Punkt: seitlich am Ziel-Planeten (nach außen, weg vom Kern), damit Planeten-Namen
 * frei bleiben; weitere Stationen stapeln sich darüber/darunter. Ohne Ziel: am Kern (MÔRA).
 */
export function dockPoint(target: Point | null, slot: number): Point {
  if (!target) {
    const side = slot % 2 ? -1 : 1;
    return { x: SCENE.cx + side * 52, y: SCENE.cy - 18 + Math.floor(slot / 2) * 30 };
  }
  const side = target.x >= SCENE.cx ? 1 : -1;
  const row = slot === 0 ? 0 : (slot % 2 ? -1 : 1) * Math.ceil(slot / 2);
  return { x: target.x + side * (34 - Math.abs(row) * 4), y: target.y + row * 26 };
}
