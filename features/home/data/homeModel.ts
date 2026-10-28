import { hasMinRole } from '@/lib/auth/roles';
import { JOB_ROLES } from '@/lib/demo/morgenrot/jobRoles';
import type { DemoCompany } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE, orderTotal, type DemoEvents, type DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { initialDay, reviewsOpen, type DemoDay } from './demoDay';

/** Was eine Zeile auf Home auslöst: direkt erledigen oder ein Blatt mit Details öffnen. */
export type HomeAction = 'task' | 'reviews' | 'order' | 'swap' | 'oat' | 'close' | 'note';
export interface HomeItem { id: string; title: string; detail: string; action: string; owner: string; primary?: boolean; kind?: HomeAction; done?: boolean }
export interface HomeTeamLine { personId: string; name: string; role: string; shift: string }
export interface HomeModel {
  scope: 'owner' | 'staff';
  greeting: string;
  subline: string;
  needsYou: HomeItem[];
  doneToday: HomeItem[];
  shift: string | null;
  team: HomeTeamLine[];
  yesterday: { revenue: number; vsLastWeek: number; tillOk: boolean } | null;
  close: DemoDay['close'];
}

const first = (name: string) => name.split(' ')[0];
const isOwner = (data: DemoCompany, id: string) => hasMinRole(data.people.find((p) => p.id === id)?.systemRole, 'owner');
const COUNT = ['Nichts braucht', 'Ein Ding braucht', 'Zwei Dinge brauchen', 'Drei Dinge brauchen'];

function shiftOf(data: DemoCompany, date: string, personId: string): string | null {
  const s = data.shifts.find((x) => x.date === date && x.personId === personId);
  return s ? `${s.start}–${s.end}` : null;
}

export function buildHomeModel(data: DemoCompany, ev: DemoEvents, date: string, viewerId: string, day: DemoDay = initialDay()): HomeModel {
  const me = data.people.find((p) => p.id === viewerId) ?? data.people[0];
  const name = (id: string) => first(data.people.find((p) => p.id === id)?.name ?? id);
  const greeting = `Guten Morgen, ${first(me.name)}.`;
  const notes: HomeItem[] = day.notes.filter((n) => n.to === me.id && !n.read).map((n) => ({ id: n.id, owner: me.id, kind: 'note', action: 'Gelesen', title: `${name(n.from)}: „${n.text}“`, detail: 'Nachricht über MÔRA' }));

  if (isOwner(data, me.id)) {
    const all: HomeItem[] = [
      { id: 'swap', owner: me.id, kind: 'swap', primary: true, action: 'Prüfen', done: day.swap !== 'requested',
        title: `${name(ev.swap.from)} und ${name(ev.swap.to)} möchten am ${ev.swap.day} tauschen`,
        detail: day.swap === 'approved' ? 'Freigegeben · beide sind informiert' : day.swap === 'declined' ? 'Abgelehnt · beide sind informiert' : `${name(ev.swap.from)} übernimmt ${ev.swap.shift} · ${name(ev.swap.to)} hat zugestimmt` },
      { id: 'reviews', owner: me.id, kind: 'reviews', action: 'Ansehen', done: reviewsOpen(day) === 0,
        title: reviewsOpen(day) ? `${reviewsOpen(day)} Antworten auf neue Google-Bewertungen` : 'Bewertungen beantwortet',
        detail: reviewsOpen(day) ? 'In deinem Ton entworfen · 5 ★, 5 ★, 3 ★' : 'Alle drei Antworten veröffentlicht (Demo)' },
      { id: 'order', owner: me.id, kind: 'order', action: 'Ansehen', done: day.order === 'approved',
        title: `Bestellung für ${ev.order.for}: Kaffee & Milch`,
        detail: day.order === 'approved' ? `Freigegeben · ${orderTotal(ev)} €` : `${orderTotal(ev)} € · Bestellschluss ${ev.order.cutoff}${day.oatCount !== null ? ` · Tarek hat ${day.oatCount} l Hafermilch gezählt` : ''}` },
    ];
    const open = [...notes, ...all.filter((i) => !i.done)];
    const team = data.people.filter((p) => p.id !== me.id).map((p) => ({ personId: p.id, name: first(p.name), role: JOB_ROLES[p.jobRole].label, shift: shiftOf(data, date, p.id) ?? 'frei' }));
    return { scope: 'owner', greeting, subline: `${COUNT[Math.min(open.length, 3)]} dich. Alles andere läuft.`,
      needsYou: open.slice(0, 3), doneToday: all.filter((i) => i.done), shift: null, team,
      yesterday: { revenue: ev.yesterday.revenue, vsLastWeek: ev.yesterday.vsLastWeek, tillOk: ev.yesterday.tillOk }, close: day.close };
  }

  const shift = shiftOf(data, date, me.id);
  const tasks: HomeItem[] = data.tasks.filter((t) => t.date === date && !t.needsApproval && t.assignee === me.id)
    .map((t) => ({ id: t.id, owner: me.id, kind: (t.id === 't2' ? 'oat' : 'task') as HomeAction, done: day.done.includes(t.id),
      title: t.title.replace(/\s*\(fiktiv[^)]*\)/, '').replace(/\s*\(Bestellung Do\)/, ''),
      detail: t.id === 't2' && day.oatCount !== null ? `${day.oatCount} l gezählt · an die Bestellung übergeben` : t.due ? `bis ${t.due}` : 'heute',
      action: t.id === 't2' ? 'Zählen' : 'Erledigt' }));
  if (me.jobRole === 'aushilfe') tasks.push({ id: 'close', owner: me.id, kind: 'close', action: 'Abschließen', done: !!day.close, title: 'Tagesabschluss', detail: day.close ? `Kasse ${day.close.cash.toLocaleString('de-DE')} € · an Marius gesendet` : 'um 18:00 · Kasse zählen und senden' });
  if (me.id === ev.swap.from || me.id === ev.swap.to) tasks.push({ id: 'swap', owner: me.id, kind: 'swap', action: '', done: true,
    title: `Tausch am ${ev.swap.day} mit ${name(me.id === ev.swap.from ? ev.swap.to : ev.swap.from)}`,
    detail: day.swap === 'requested' ? 'wartet auf Marius' : day.swap === 'approved' ? 'von Marius freigegeben' : 'von Marius abgelehnt' });
  const open = [...notes, ...tasks.filter((t) => !t.done)];
  const subline = `Deine Schicht: ${shift ?? 'frei'}.${open.length ? '' : ' Alles erledigt.'}`;
  return { scope: 'staff', greeting, subline, needsYou: open, doneToday: tasks.filter((t) => t.done), shift, team: [], yesterday: null, close: null };
}

export function visiblePlanets(structure: DemoPlanet[], data: DemoCompany, viewerId: string): DemoPlanet[] {
  if (isOwner(data, viewerId)) return structure;
  const job = data.people.find((p) => p.id === viewerId)?.jobRole;
  return structure.filter((p) => job && p.jobRoles.includes(job));
}

export function landingFor(data: DemoCompany, viewerId: string, structure: DemoPlanet[] = MORGENROT_STRUCTURE): { feature: 'home'; planet: string | null } {
  if (isOwner(data, viewerId)) return { feature: 'home', planet: null };
  const job = data.people.find((p) => p.id === viewerId)?.jobRole;
  return { feature: 'home', planet: structure.find((p) => job && p.jobRoles.includes(job))?.id ?? null };
}
