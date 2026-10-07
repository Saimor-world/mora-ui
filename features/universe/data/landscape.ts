/**
 * Universe landscape model (pure, testable).
 *
 * The OS areas become planets around MÔRA (the core). Each planet carries
 * moons (sub-places / items), signals (what asks for attention) and metrics.
 * Strands connect planets when there is evidence — 'assigned' (solid) or
 * 'inferred' (dashed), the same evidence model as the legacy
 * OrganizationField (lib/universe/types: SignalEvidence).
 */
import type { SignalEvidence } from '@/lib/universe/types';

export type PlanetId = 'today' | 'post' | 'finance' | 'knowledge' | 'spaces' | 'connections' | 'labs';
export type PlanetTone = 'calm' | 'attention' | 'unknown';

export interface Moon { id: string; label: string }
export interface PlanetSignal { id: string; label: string; tone: 'info' | 'warning' | 'safe' }
export interface PlanetMetric { label: string; value: string }

export interface Planet {
  id: PlanetId;
  title: string;
  /** Short line under the name. */
  role: string;
  /** /os feature the "Bereich öffnen" action leads to. 'universe:organization' = legacy org field lens. */
  target: string;
  ring: 0 | 1;
  /** Base angle on the ring in degrees (0 = right, clockwise). */
  angle: number;
  /** Relative size 0.6 … 1.2 (substance). */
  size: number;
  moons: Moon[];
  signals: PlanetSignal[];
  metrics: PlanetMetric[];
  summary: string;
  tone: PlanetTone;
  sample: boolean;
}

export interface Strand { id: string; from: PlanetId | 'mora'; to: PlanetId; evidence: SignalEvidence; label: string }

export interface LandscapeInput {
  sample: boolean;
  tasks?: { open: number | null; overdue: number | null; dueToday: number | null; titles: string[] } | null;
  calendar?: { titles: string[] } | null;
  mail?: { unread: number; subjects: string[] } | null;
  finance?: { kind: 'value'; label: string; value: string; warnings: number } | { kind: 'state'; label: string } | null;
  memories?: { count: number; titles: string[] } | null;
  spaces?: { names: string[] } | null;
  connections?: { configured: string[]; missing: string[] } | null;
  labs?: { count: number; names: string[] } | null;
}

export interface Landscape { planets: Planet[]; strands: Strand[]; attention: { planetId: PlanetId; message: string } | null }

const FINANCE_HINT = /(rechnung|beleg|zahlung|angebot|invoice)/i;
const moons = (labels: string[], prefix: string, max = 5): Moon[] => labels.slice(0, max).map((label, i) => ({ id: `${prefix}-${i}`, label }));
const sizeFrom = (n: number) => Math.max(0.65, Math.min(1.2, 0.7 + Math.log10(1 + n) * 0.32));

export function buildLandscape(input: LandscapeInput): Landscape {
  const s = input.sample;
  const planets: Planet[] = [];

  const t = input.tasks;
  const cal = input.calendar;
  const todaySignals: PlanetSignal[] = [];
  if (t?.overdue) todaySignals.push({ id: 'overdue', label: `${t.overdue} überfällig`, tone: 'warning' });
  if (t?.dueToday) todaySignals.push({ id: 'due', label: `${t.dueToday} heute fällig`, tone: 'info' });
  planets.push({
    id: 'today', title: 'Heute', role: 'Aufgaben & Termine', target: 'today', ring: 0, angle: 200,
    size: sizeFrom((t?.open ?? 0) + (cal?.titles.length ?? 0)),
    moons: moons([...(cal?.titles ?? []), ...(t?.titles ?? [])], 'today'),
    signals: todaySignals,
    metrics: t ? [
      { label: 'Offen', value: fmt(t.open) }, { label: 'Überfällig', value: fmt(t.overdue) }, { label: 'Termine', value: String(cal?.titles.length ?? '—') },
    ] : [],
    summary: t ? 'Was heute ansteht – Termine als Monde, Fälliges als Signal.' : 'Tagesbild nicht geladen – unbekannt, nicht leer.',
    tone: t ? (todaySignals.some((x) => x.tone === 'warning') ? 'attention' : 'calm') : 'unknown', sample: s,
  });

  const m = input.mail;
  planets.push({
    id: 'post', title: 'Post', role: 'Mail & Nachrichten', target: 'post', ring: 0, angle: 320,
    size: sizeFrom(m?.subjects.length ?? 0),
    moons: moons(m?.subjects ?? [], 'post', 4),
    signals: m?.unread ? [{ id: 'unread', label: `${m.unread} ungelesen`, tone: 'info' }] : [],
    metrics: m ? [{ label: 'Ungelesen', value: String(m.unread) }, { label: 'Zuletzt', value: String(m.subjects.length) }] : [],
    summary: m ? 'Eingang als Umlaufbahn – Ungelesenes leuchtet.' : 'Postfach nicht verbunden oder nicht erreichbar.',
    tone: m ? (m.unread ? 'attention' : 'calm') : 'unknown', sample: s,
  });

  const f = input.finance;
  planets.push({
    id: 'finance', title: 'Finance', role: 'Finance v2 · Profit Center · Kapital', target: 'finance', ring: 0, angle: 80,
    size: 1.05,
    moons: moons(['Finanzstand', 'Profit Center', 'Kapital-Policy'], 'finance'),
    signals: f?.kind === 'value' && f.warnings ? [{ id: 'warn', label: `${f.warnings} Hinweis${f.warnings === 1 ? '' : 'e'}`, tone: 'warning' }]
      : f?.kind === 'state' ? [{ id: 'state', label: f.label, tone: 'warning' }] : [],
    metrics: f?.kind === 'value' ? [{ label: f.label, value: f.value }] : [{ label: 'Stand', value: 'nicht belegt' }],
    summary: f?.kind === 'value' ? 'Belegter Finanzstand aus CORE.' : 'Keine Zahl ohne Beleg – Finance zeigt ehrlich den Vertragsstand.',
    tone: f?.kind === 'value' ? (f.warnings ? 'attention' : 'calm') : 'unknown', sample: false,
  });

  const k = input.memories;
  planets.push({
    id: 'knowledge', title: 'Wissen', role: 'Suche & Gedächtnis', target: 'knowledge', ring: 1, angle: 20,
    size: sizeFrom(k?.count ?? 0), moons: moons(k?.titles ?? [], 'knowledge', 4), signals: [],
    metrics: k ? [{ label: 'Erinnerungen', value: String(k.count) }] : [],
    summary: k ? 'Was MÔRA sich gemerkt hat – durchsuchbar.' : 'Gedächtnis ohne Sitzung nicht lesbar.',
    tone: k ? 'calm' : 'unknown', sample: s,
  });

  const sp = input.spaces;
  planets.push({
    id: 'spaces', title: 'Spaces', role: 'Bereiche deiner Organisation', target: 'universe:organization', ring: 1, angle: 130,
    size: sizeFrom((sp?.names.length ?? 0) * 3), moons: moons(sp?.names ?? [], 'spaces', 6), signals: [],
    metrics: sp ? [{ label: 'Bereiche', value: String(sp.names.length) }] : [],
    summary: sp ? 'Abteilungen und Spaces – im Organisationsfeld mit Monden, Ordnern und Ablage.' : 'Bereiche erscheinen mit deinem Unternehmen.',
    tone: sp ? 'calm' : 'unknown', sample: s,
  });

  const c = input.connections;
  planets.push({
    id: 'connections', title: 'Quellen', role: 'Andockstation', target: 'settings', ring: 1, angle: 245,
    size: 0.8, moons: moons([...(c?.configured ?? []), ...(c?.missing ?? [])], 'conn', 5),
    signals: c?.missing.length ? [{ id: 'missing', label: `${c.missing.length} bereit zum Andocken`, tone: 'info' }] : [],
    metrics: c ? [{ label: 'Angedockt', value: String(c.configured.length) }, { label: 'Bereit', value: String(c.missing.length) }] : [],
    summary: 'Nur „angedockt“, wenn CORE es bestätigt – nie verbunden auf Verdacht.',
    tone: c ? 'calm' : 'unknown', sample: s,
  });

  const l = input.labs;
  planets.push({
    id: 'labs', title: 'Labs & System', role: 'Alle bisherigen Apps', target: 'labs', ring: 1, angle: 310,
    size: 0.68, moons: moons(l?.names ?? [], 'labs', 5), signals: [],
    metrics: l ? [{ label: 'Apps', value: String(l.count) }] : [],
    summary: 'Nichts verloren – jede klassische App bleibt erreichbar.', tone: 'calm', sample: false,
  });

  const strands: Strand[] = [];
  for (const p of planets) if (p.signals.length) strands.push({ id: `mora-${p.id}`, from: 'mora', to: p.id, evidence: 'assigned', label: p.signals[0].label });
  if ((m?.subjects ?? []).some((x) => FINANCE_HINT.test(x))) strands.push({ id: 'post-finance', from: 'post', to: 'finance', evidence: 'inferred', label: 'Post erwähnt Rechnung/Beleg' });
  if ((t?.titles ?? []).some((x) => FINANCE_HINT.test(x))) strands.push({ id: 'today-finance', from: 'today', to: 'finance', evidence: 'inferred', label: 'Aufgabe betrifft Finanzen' });
  if ((cal?.titles.length ?? 0) > 0 && m) strands.push({ id: 'today-post', from: 'today', to: 'post', evidence: 'inferred', label: 'Termine und Post am selben Tag' });

  const prio = planets.find((p) => p.signals.some((x) => x.tone === 'warning') && p.tone === 'attention') || planets.find((p) => p.tone === 'attention') || null;
  const attention = prio ? { planetId: prio.id, message: `${prio.title}: ${prio.signals[0]?.label ?? 'braucht Aufmerksamkeit'}` } : null;
  return { planets, strands, attention };
}

function fmt(n: number | null | undefined) { return n == null ? '—' : String(n); }
