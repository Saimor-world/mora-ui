import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';
import type { HomeModel } from '../data/homeModel';
import type { SourceWidget } from './types';
import { MORGENROT_EVENTS, MORGENROT_STRUCTURE, orderTotal } from '@/lib/demo/morgenrot/structure';
import { reviewsOpen, type DemoDay } from '../data/demoDay';

const readable = (s: TodaySourceMeta) => s.status === 'ok' || s.status === 'empty' || s.status === 'stale';
const meta = (s: TodaySourceMeta) => ({ source: s.source, updatedAt: s.last_synced_at ?? s.as_of, state: s.status === 'stale' ? 'stale' as const : 'ready' as const, size: 'm' as const, demo: false });
/** Values are scoped by useScopedToday and are not fabricated from a partial sample. */
export function widgetsFromToday(snapshot: TodaySnapshot | null): SourceWidget[] {
  if (!snapshot) return [];
  const out: SourceWidget[] = [];
  if (readable(snapshot.mail) && snapshot.mail.unread_count != null) out.push({ id: 'mail', title: 'Post', ...meta(snapshot.mail), content: { type: 'metric', value: `${snapshot.mail.unread_count} ungelesen` } });
  if (readable(snapshot.calendar)) out.push({ id: 'calendar', title: 'Termine', ...meta(snapshot.calendar), content: { type: 'appointments', items: snapshot.calendar.events.map(e => ({ id: e.id, title: e.title, detail: e.time })) } });
  if (readable(snapshot.tasks)) out.push({ id: 'tasks', title: 'Aufgaben', ...meta(snapshot.tasks), content: { type: 'list', items: snapshot.tasks.due_today.map(t => ({ id: t.id, title: t.title })) } });
  return out;
}
/** Existing, fictional demo-day data only; money remains owner-only. */
export function widgetsFromDemo(model: HomeModel, day?: DemoDay): SourceWidget[] {
  const common = { updatedAt: '28. Okt · 07:00', state: 'ready' as const, size: 'm' as const, demo: true };
  const widgets: SourceWidget[] = [];
  if (model.scope === 'owner' && model.yesterday) {
    widgets.push({ id: 'revenue', title: 'Gestern', source: 'Kasse', ...common, content: { type: 'metric', value: `${model.yesterday.revenue.toLocaleString('de-DE')} €`, detail: `${Math.round(model.yesterday.vsLastWeek * 100)} % zur Vorwoche` } });
    widgets.push({ id: 'team', title: 'Team heute', source: 'Schichtplan', ...common, content: { type: 'list', items: model.team.map(t => ({ id: t.personId, title: t.name, detail: t.shift })) } });
    if (day?.close) widgets.push({ id: 'close', title: 'Tagesabschluss', source: 'Kasse', ...common, content: { type: 'metric', value: `${day.close.cash.toLocaleString('de-DE')} €`, detail: `Jonas · ${day.close.at}` } });
    const moon = (id: string) => MORGENROT_STRUCTURE.flatMap(p => p.moons).find(m => m.id === id);
    const list = (id: string, title: string, source: string, moonId: string) => {
      const folder = moon(moonId);
      if (folder) widgets.push({ id, title, source, ...common, content: { type: 'list', items: folder.files.slice(0, 2).map(f => ({ id: f.id, title: f.name, detail: f.meta })) } });
    };
    list('reservations', 'Reservierungen', 'Reservierungen', 's-res');
    list('inventory', 'Bestand', 'Bestandsliste', 'k-best');
    if (day) {
      widgets.push({ id: 'reviews', title: 'Bewertungen', source: 'Bewertungen', ...common, content: { type: 'status', label: reviewsOpen(day) ? `${reviewsOpen(day)} Antwortentwürfe` : 'Alle Antworten freigegeben', detail: 'Nur Demo' } });
      widgets.push({ id: 'order', title: 'Bestellung', source: 'Bestellliste', ...common, content: { type: 'approval', title: day.order === 'approved' ? 'Freigegeben' : 'Freigabe offen', detail: `${orderTotal(MORGENROT_EVENTS)} € · ${MORGENROT_EVENTS.order.for}` } });
    }
  }
  if (model.shift) widgets.push({ id: 'shift', title: 'Deine Schicht', source: 'Schichtplan', ...common, content: { type: 'status', label: model.shift } });
  return widgets;
}
