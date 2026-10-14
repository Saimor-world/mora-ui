// Planeten-Modell v1 – das UI zeichnet nur, was CORE /v3/universe liefert.
// Kein Raten über Namen: Archetyp, Zeichen, Seed, Größe, Zustand kommen vom Server.
import type React from 'react';
import {
  Wallet, Mail, BookOpen, ShieldCheck, Hammer, Users, TrendingUp, Server, Compass, Receipt, Handshake, Megaphone,
  CalendarRange, Wrench, Store, HeartHandshake, Cpu, FlaskConical, Radar, Sprout, Box, MessagesSquare, Orbit, Hexagon,
  Triangle, Diamond, Star, Feather, Leaf, Gem, Anchor, Mountain, Waves, Sun,
} from 'lucide-react';

export type PlanetLook = { archetype: string; hue: number; glyph: string; seed: number };
export type PlanetSize = 'S' | 'M' | 'L' | 'XL';
export type PlanetState = 'seed' | 'active' | 'sleeping' | 'hidden';

export interface ModelPlanet {
  key: string;
  kind: 'system' | 'domain';
  capability?: string;
  domain_type?: string;
  department_id?: string;
  label: string;
  state: PlanetState;
  size: PlanetSize;
  brightness: number;
  score: number;
  ring: number;
  angle?: number;
  look: PlanetLook;
  moons: { key: string; label: string; docs?: number; status?: string; department_id?: string }[];
  more_moons: number;
  counts: Record<string, number | string | null>;
  glow?: { level: string; reason: string } | null;
  links?: { open?: string };
  connect_hint?: string | null;
  joins?: string;
  cluster?: string;
  pinned?: boolean;
  sources?: { type: string; status?: string; label?: string }[];
}
export interface ModelCluster { key: string; domain_type: string; label: string; members: string[]; score: number; look: PlanetLook; size: PlanetSize; angle?: number }
export interface UniverseModel {
  company: { id: string; name: string; sector: 'live' | 'demo'; industry_template: string; template_label: string };
  edition: 'owner' | 'customer';
  model_version: number;
  planets: ModelPlanet[];
  clusters: ModelCluster[];
  belt: { unassigned: { spaces: number; docs: number } } | null;
  suggestions: { type: string; planets: string[]; reason: string; tier: string }[];
  companies?: { id: string; name: string; sector: string; label: string }[];
}

const GLYPHS: Record<string, React.ComponentType<any>> = {
  wallet: Wallet, mail: Mail, 'book-open': BookOpen, 'shield-check': ShieldCheck, hammer: Hammer, users: Users,
  'trending-up': TrendingUp, server: Server, compass: Compass, receipt: Receipt, handshake: Handshake, megaphone: Megaphone,
  'calendar-range': CalendarRange, wrench: Wrench, store: Store, 'heart-handshake': HeartHandshake, cpu: Cpu,
  'flask-conical': FlaskConical, radar: Radar, sprout: Sprout, box: Box, 'messages-square': MessagesSquare, orbit: Orbit,
  hexagon: Hexagon, triangle: Triangle, diamond: Diamond, star: Star, feather: Feather, leaf: Leaf, gem: Gem,
  anchor: Anchor, mountain: Mountain, waves: Waves, sun: Sun,
};
export function glyphFor(name: string | undefined): React.ComponentType<any> {
  return (name && GLYPHS[name]) || Orbit;
}

/** Durchmesser je Größenstufe (vor fieldScale). Systemkörper tragen den Blick. */
export function planetDiameter(size: PlanetSize, state: PlanetState, kind: 'system' | 'domain' | 'cluster'): number {
  if (state === 'seed') return 36;
  // Innen (System) höchstens L, damit der Kern ruhig bleibt; außen dürfen Bereiche wachsen.
  const s = kind === 'system' && size === 'XL' ? 'L' : size;
  const base = { S: 48, M: 60, L: 74, XL: 88 }[s] ?? 60;
  return kind === 'cluster' ? base + 6 : base;
}

export interface PlacedBody {
  id: string;
  kind: 'system' | 'domain' | 'cluster';
  label: string;
  x: number; y: number;
  planet: ModelPlanet | null;
  cluster: ModelCluster | null;
}

/** Eine Bahn je Planet (wie ein echtes Sonnensystem): konzentrische Ellipsen in % der Feldfläche.
 *  Innen die Systemplaneten (Katalogreihenfolge), außen Bereiche/Cluster. */
export const ORBIT = { innerRx: 12, outerRx: 44, aspect: 0.92 } as const;

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }

export function placeUniverse(model: UniverseModel): PlacedBody[] {
  const inner = model.planets.filter((p) => p.kind === 'system').sort((a, b) => (a.angle ?? 0) - (b.angle ?? 0));
  const outerPlanets = model.planets.filter((p) => p.kind === 'domain' && !p.joins && !p.cluster);
  const outer: { key: string; planet: ModelPlanet | null; cluster: ModelCluster | null }[] = [
    ...outerPlanets.map((p) => ({ key: p.key, planet: p, cluster: null })),
    ...model.clusters.map((c) => ({ key: c.key, planet: null, cluster: c })),
  ].sort((a, b) => (a.key < b.key ? -1 : 1));
  const all = [
    ...inner.map((p) => ({ key: p.key, kind: 'system' as const, label: p.label, planet: p as ModelPlanet | null, cluster: null as ModelCluster | null })),
    ...outer.map((o) => ({ key: o.key, kind: (o.cluster ? 'cluster' : 'domain') as 'cluster' | 'domain', label: o.planet?.label ?? o.cluster!.label, planet: o.planet, cluster: o.cluster })),
  ];
  const n = all.length;
  const rxOf = (i: number) => (n > 1 ? ORBIT.innerRx + (i * (ORBIT.outerRx - ORBIT.innerRx)) / (n - 1) : ORBIT.innerRx);
  const at = (i: number, slot: number) => {
    const rx = rxOf(i), rad = ((slot * (360 / Math.max(1, n)) - 90) * Math.PI) / 180;
    return { x: 50 + rx * Math.cos(rad), y: 50 + rx * ORBIT.aspect * Math.sin(rad) };
  };
  // Winkel: n gleich große Schritte, jeder genau einmal (Schrittweite teilerfremd zu n). Aus allen Schrittweiten/Drehungen
  // die nehmen, bei der sich Kugeln und Namen am wenigsten nahe kommen (Name hängt unter der Kugel). Deterministisch.
  let best = { step: 1, rot: 0, score: -Infinity };
  for (let step = 1; step < Math.max(2, n); step++) {
    if (n > 1 && gcd(step, n) !== 1) continue;
    for (let rot = 0; rot < Math.max(1, n); rot++) {
      const pts = all.map((_, i) => at(i, (i * step + rot) % Math.max(1, n)));
      // Jeder Körper belegt eine Box: Kugel (≈ ±5%) plus Name/Unterzeile darunter (≈ 16% breit, bis +13%).
      let overlap = 0, minD = Infinity;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const ox = Math.max(0, Math.min(pts[i].x + 8.5, pts[j].x + 8.5) - Math.max(pts[i].x - 8.5, pts[j].x - 8.5));
        const oy = Math.max(0, Math.min(pts[i].y + 13, pts[j].y + 13) - Math.max(pts[i].y - 5, pts[j].y - 5));
        overlap += ox * oy;
        minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
      }
      let score = minD - overlap * 0.5;
      // Ausgewogen: Schwerpunkt nahe der Mitte
      const cx = pts.reduce((a, p) => a + p.x, 0) / Math.max(1, n), cy = pts.reduce((a, p) => a + p.y, 0) / Math.max(1, n);
      score -= Math.hypot(cx - 50, cy - 50) * 0.3;
      if (score > best.score + 1e-6) best = { step, rot, score };
    }
  }
  return all.map((b, i) => {
    const p = at(i, (i * best.step + best.rot) % Math.max(1, n));
    return { id: b.key, kind: b.kind, label: b.label, x: +p.x.toFixed(2), y: +p.y.toFixed(2), planet: b.planet, cluster: b.cluster };
  });
}

/** Bahnradius (rx in %) aus einer Position – für das Zeichnen der eigenen Bahn. */
export function orbitRxOf(x: number, y: number): number {
  return Math.hypot(x - 50, (y - 50) / ORBIT.aspect);
}

/** planet_key → Department-ID (für Ablage, Navigation, Môra-Ziele). */
export function departmentIdOf(key: string): string | null {
  return key.startsWith('dept:') ? key.slice(5) : null;
}

export const SYSTEM_PANES: Record<string, { id: string; type: string; title: string; size: { width: number; height: number } }> = {
  finanzen: { id: 'finance-main', type: 'finance', title: 'Finanzen', size: { width: 1100, height: 760 } },
  post: { id: 'mail-main', type: 'mail', title: 'Post', size: { width: 1100, height: 760 } },
  wissen: { id: 'search-main', type: 'search', title: 'Wissen', size: { width: 1000, height: 720 } },
  wache: { id: 'nightwatch-main', type: 'nightwatch', title: 'Wache', size: { width: 1100, height: 760 } },
  werkstatt: { id: 'tasks-main', type: 'tasks', title: 'Werkstatt', size: { width: 1000, height: 720 } },
  menschen: { id: 'team-main', type: 'team', title: 'Team', size: { width: 1000, height: 720 } },
  markt: { id: 'integrations-main', type: 'integrations', title: 'Markt', size: { width: 1000, height: 720 } },
  betrieb: { id: 'nightwatch-main', type: 'nightwatch', title: 'Saimôr Betrieb', size: { width: 1100, height: 760 } },
};

export function bodyMeta(p: ModelPlanet | null, c: ModelCluster | null): string {
  if (c) return `${c.members.length} Bereiche`;
  if (!p) return '';
  if (p.state === 'seed') return 'verbinden';
  const n = (k: string) => Number(p.counts?.[k] ?? 0);
  const parts: string[] = [];
  if (p.kind === 'domain') {
    if (n('spaces')) parts.push(`${n('spaces')} ${n('spaces') === 1 ? 'Bereich' : 'Bereiche'}`);
    if (n('docs')) parts.push(`${n('docs')} ${n('docs') === 1 ? 'Dokument' : 'Dokumente'}`);
  } else {
    const cap = p.capability;
    if (cap === 'wissen' && n('docs')) parts.push(`${n('docs')} Dokumente`);
    if (cap === 'post' && n('mails')) parts.push(`${n('mails')} Mails`);
    if (cap === 'wache') parts.push(n('open_incidents') ? `${n('open_incidents')} offen` : 'ruhig');
    if (cap === 'werkstatt' && n('open_tasks')) parts.push(`${n('open_tasks')} offene Aufgaben`);
    if (cap === 'betrieb' && p.counts?.tenants) parts.push(`${p.counts.tenants} Tenants`);
    const connected = (p.sources || []).filter((s) => s.status === 'connected').map((s) => s.label || s.type);
    if (!parts.length && connected.length) parts.push(connected.slice(0, 2).join(' · '));
  }
  if (p.state === 'sleeping') parts.push('ruht');
  return parts.join(' · ');
}
