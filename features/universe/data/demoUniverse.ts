import { buildSubstanceBars } from '@/lib/universe/substanceChart';
import type { UniverseSignal } from '@/lib/universe/types';
import type { OrganizationTerritory } from '@/components/universe/OrganizationField';
import { DEMO_CALENDAR, DEMO_COMPANY_NAME, DEMO_DEPARTMENTS, DEMO_FEED_SOURCES, DEMO_MAIL, DEMO_MINDLOOP, demoDocumentCount } from '@/lib/os-prototype/demoPack';

/**
 * Das Demo-Paket in genau die Formen, die das ORIGINAL-Organisationsfeld
 * (components/universe/OrganizationField) und das Observatorium erwarten.
 * Keine neuen Planeten – dieselben Abteilungs-Planeten, Ordner-Monde,
 * Signale wie mit echter CORE-Sitzung.
 */
export function buildDemoUniverse(opts: { compact?: boolean } = {}) {
  const metrics: Record<string, { nodes: number; spaces: number; folders: number; source: 'derived' }> = {};
  DEMO_DEPARTMENTS.forEach((d) => { metrics[d.id] = { nodes: demoDocumentCount(d), spaces: d.folders.length, folders: d.folders.length, source: 'derived' }; });
  const placed = opts.compact
    ? DEMO_DEPARTMENTS.map((d) => ({ ...d, x: COMPACT_POSITIONS[d.id]?.[0] ?? 50, y: COMPACT_POSITIONS[d.id]?.[1] ?? 50 }))
    : ringLayout(DEMO_DEPARTMENTS);
  const territories: OrganizationTerritory[] = placed.map((d) => ({
    id: d.id, name: d.name, description: d.description, color: d.color, x: d.x, y: d.y,
    spaces: metrics[d.id].spaces, folders: metrics[d.id].folders, documents: metrics[d.id].nodes,
    spaceList: d.folders.map((f, i) => ({ id: `${d.id}-folder-${i}`, name: f.name })),
    metricSource: 'derived', access: 'open',
  }));
  const byName = (text: string) => DEMO_DEPARTMENTS.find((d) => text.includes(d.name))?.id;
  const signals: UniverseSignal[] = [
    ...DEMO_MINDLOOP.map((m) => ({ id: m.id, title: m.title.replace(/^Môra:\s*/, ''), subtitle: m.message, targetId: m.targetId, kind: 'nightwatch' as const, evidence: 'assigned' as const, severity: m.category === 'risk' ? 'warning' : 'info' })),
    ...DEMO_MAIL.flatMap((m) => { const t = byName(m.subject) ?? (m.subject.startsWith('HR') ? 'demo-hr' : m.subject.includes('Marketing') ? 'demo-marketing' : undefined); return t ? [{ id: m.id, title: m.subject, subtitle: m.from, targetId: t, kind: 'mail' as const, evidence: 'inferred' as const }] : []; }),
    ...DEMO_CALENDAR.flatMap((e) => { const t = byName(e.location); return t ? [{ id: e.id, title: e.title, subtitle: `${e.time} · ${e.duration} min`, targetId: t, kind: 'calendar' as const, evidence: 'assigned' as const }] : []; }),
  ];
  const today = new Date().toISOString().slice(0, 10);
  return {
    organizationName: DEMO_COMPANY_NAME,
    territories,
    signals,
    substanceBars: buildSubstanceBars(territories),
    mail: DEMO_MAIL.map((m) => ({ id: m.id, subject: m.subject, from: m.from, snippet: m.snippet, date: today })),
    calendar: DEMO_CALENDAR.map((e) => ({ id: e.id, title: e.title, date: today, time: e.time, location: e.location })),
    feed: DEMO_FEED_SOURCES.map((s, i) => ({ id: `demo-feed-${i}`, sourceTitle: s, title: `${s} · Kaffee-Branche`, link: '', summary: 'Feed-Quelle aus dem Demo-Paket.' })),
    /** Keine Zahlungen im Demo-Paket → keine Zahl. */
    business: { monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] as string[] },
    attention: { targetId: 'demo-sf', message: 'Store San Francisco: Budget-Dokument seit 60+ Tagen nicht aktualisiert' },
  };
}

/**
 * V1.3.1: feste Ellipse um den MÔRA-Kern (Feldmitte 50/50). Gleichmaessige
 * Winkel, leicht versetzt, damit kein Planet direkt ueber oder unter dem Kern
 * steht und Beschriftungen sich nicht treffen. Prozent im Feld.
 */
export function ringLayout<T>(items: T[], rx = 40, ry = 32, cy = 45, startDeg?: number): Array<T & { x: number; y: number }> {
  const n = items.length;
  const start = startDeg ?? -90 + 360 / n / 2;
  return items.map((item, i) => {
    const a = (start + (360 / n) * i) * (Math.PI / 180);
    return { ...item, x: Math.round((50 + rx * Math.cos(a)) * 10) / 10, y: Math.round((cy + ry * Math.sin(a)) * 10) / 10 };
  });
}

/**
 * Flache Fenster (Höhe < 820 px): feste, im Browser vermessene Positionen
 * (1024x640 und 1280x800 ohne Überlappung von Planeten, Namen, Abzeichen,
 * Kern, Legende und Pille). Prozent im Feld, Kern bei 50/50.
 */
export const COMPACT_POSITIONS: Record<string, [number, number]> = {
  'demo-sf': [24, 16], 'demo-management': [50, 8], 'demo-hr': [72, 20],
  'demo-heilbronn': [7, 52], 'demo-tech': [93, 56], 'demo-stuttgart': [27, 82], 'demo-marketing': [73, 84],
};
