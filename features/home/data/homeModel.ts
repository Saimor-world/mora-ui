import { hasMinRole } from '@/lib/auth/roles';
import { JOB_ROLES } from '@/lib/demo/morgenrot/jobRoles';
import type { DemoCompany } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE, type DemoEvents, type DemoPlanet } from '@/lib/demo/morgenrot/structure';

export interface HomeItem { id: string; title: string; detail: string; action: string; owner: string; primary?: boolean }
export interface HomeTeamLine { personId: string; name: string; role: string; shift: string }
export interface HomeModel {
  scope: 'owner' | 'staff';
  greeting: string;
  subline: string;
  needsYou: HomeItem[];
  shift: string | null;
  team: HomeTeamLine[];
  yesterday: { revenue: number; vsLastWeek: number; tillOk: boolean } | null;
}

const first = (name: string) => name.split(' ')[0];
const isOwner = (data: DemoCompany, id: string) => hasMinRole(data.people.find((p) => p.id === id)?.systemRole, 'owner');

function shiftOf(data: DemoCompany, ev: DemoEvents, date: string, personId: string): string | null {
  if (ev.sick.some((s) => s.date === date && s.personId === personId)) return 'krank';
  const cover = ev.sick.find((s) => s.date === date && s.substituteId === personId);
  const src = cover ? cover.personId : personId;
  const s = data.shifts.find((x) => x.date === date && x.personId === src);
  return s ? `${s.start}–${s.end}` : null;
}

export function buildHomeModel(data: DemoCompany, ev: DemoEvents, date: string, viewerId: string): HomeModel {
  const me = data.people.find((p) => p.id === viewerId) ?? data.people[0];
  const greeting = `Guten Morgen, ${first(me.name)}.`;
  if (isOwner(data, me.id)) {
    const sick = ev.sick.find((s) => s.date === date);
    const name = (id: string) => first(data.people.find((p) => p.id === id)?.name ?? id);
    const items: HomeItem[] = [];
    if (sick) items.push({ id: 'sick', owner: me.id, primary: true, action: 'Bestätigen',
      title: `${name(sick.personId)} ist krank, ${name(sick.substituteId)} übernimmt die Frühschicht`,
      detail: `Krankmeldung ${sick.at} · ${name(sick.substituteId)} hat zugesagt · ${shiftOf(data, ev, date, sick.substituteId)}` });
    if (ev.reviews.date === date) items.push({ id: 'reviews', owner: me.id, action: 'Ansehen',
      title: `${ev.reviews.drafts} Antworten auf neue Google-Bewertungen`,
      detail: `In deinem Ton entworfen · ${ev.reviews.stars.map((s) => `${s} ★`).join(', ')}` });
    if (ev.order.date === date) items.push({ id: 'order', owner: me.id, action: 'Freigeben',
      title: `Bestellung für ${ev.order.for}: ${ev.order.items}`,
      detail: `Nach Bestand und Verbrauch vorbereitet · ${ev.order.total} €` });
    const team = data.people.filter((p) => p.id !== me.id).map((p) => {
      const covering = ev.sick.some((s) => s.date === date && s.substituteId === p.id);
      return { personId: p.id, name: first(p.name), role: JOB_ROLES[p.jobRole].label + (covering ? ' (Vertretung)' : ''), shift: shiftOf(data, ev, date, p.id) ?? 'frei' };
    });
    return { scope: 'owner', greeting, subline: items.length ? `${['Nichts', 'Ein Ding braucht', 'Zwei Dinge brauchen', 'Drei Dinge brauchen'][Math.min(items.length, 3)]} dich. Alles andere läuft.` : 'Nichts braucht dich. Alles läuft.',
      needsYou: items.slice(0, 3), shift: null, team, yesterday: { revenue: ev.yesterday.revenue, vsLastWeek: ev.yesterday.vsLastWeek, tillOk: ev.yesterday.tillOk } };
  }
  const raw = shiftOf(data, ev, date, me.id);
  const shift = raw === 'krank' ? 'Gute Besserung, heute frei' : raw;
  const covering = ev.sick.find((s) => s.date === date && s.substituteId === me.id);
  const mine = raw === 'krank' ? [] : data.tasks.filter((t) => t.date === date && !t.needsApproval && (t.assignee === me.id || (covering && t.assignee === covering.personId)));
  const needsYou = mine.slice(0, 3).map((t) => ({ id: t.id, owner: me.id, title: t.title.replace(/\s*\(fiktiv[^)]*\)/, ''), detail: t.due ? `bis ${t.due}` : 'heute', action: 'Erledigt' }));
  const subline = raw === 'krank' ? 'Jonas übernimmt deine Schicht. Ruh dich aus.' : covering ? `Du vertrittst heute ${first(data.people.find((p) => p.id === covering.personId)!.name)}. Danke!` : `Deine Schicht: ${shift ?? 'frei'}.`;
  return { scope: 'staff', greeting, subline, needsYou, shift, team: [], yesterday: null };
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
