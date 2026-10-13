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

const RINGS = { 1: { rx: 29, ry: 28 }, 2: { rx: 48, ry: 46 } } as const;

/** Systeme innen (gleichmäßig nach Katalogwinkel), Domänen/Cluster außen, halb versetzt. Stabil nach Schlüssel. */
export function placeUniverse(model: UniverseModel): PlacedBody[] {
  const inner = model.planets.filter((p) => p.kind === 'system').sort((a, b) => (a.angle ?? 0) - (b.angle ?? 0));
  const outerPlanets = model.planets.filter((p) => p.kind === 'domain' && !p.joins && !p.cluster);
  const outer: { key: string; planet: ModelPlanet | null; cluster: ModelCluster | null }[] = [
    ...outerPlanets.map((p) => ({ key: p.key, planet: p, cluster: null })),
    ...model.clusters.map((c) => ({ key: c.key, planet: null, cluster: c })),
  ].sort((a, b) => (a.key < b.key ? -1 : 1));
  const out: PlacedBody[] = [];
  const pos = (ring: 1 | 2, deg: number) => {
    const r = RINGS[ring];
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: +(50 + r.rx * Math.cos(rad)).toFixed(2), y: +(50 + r.ry * Math.sin(rad)).toFixed(2) };
  };
  inner.forEach((p, i) => {
    const deg = (i * 360) / Math.max(1, inner.length);
    out.push({ id: p.key, kind: 'system', label: p.label, ...pos(1, deg), planet: p, cluster: null });
  });
  // Außen nie auf demselben Strahl wie innen: Bereiche sitzen in den Lücken zwischen Systemplaneten.
  const n = inner.length;
  const slots = n && outer.length <= n
    ? Array.from({ length: outer.length }, (_, i) => ((Math.round((i * n) / outer.length) + 0.5) * 360) / n)
    : outer.map((_, i) => (n ? 180 / n : 0) + (i * 360) / Math.max(1, outer.length));
  outer.forEach((o, i) => {
    const deg = slots[i] % 360;
    out.push({ id: o.key, kind: o.cluster ? 'cluster' : 'domain', label: o.planet?.label ?? o.cluster!.label, ...pos(2, deg), planet: o.planet, cluster: o.cluster });
  });
  return out;
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
