import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';
import type { HomeModel } from '../data/homeModel';
import type { SourceWidget } from './types';
import { MORGENROT_EVENTS, MORGENROT_STRUCTURE, orderTotal } from '@/lib/demo/morgenrot/structure';
import { hasFiktivMarker, stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { reviewsOpen, type DemoDay } from '../data/demoDay';

const readable = (s?: TodaySourceMeta | null) =>
  Boolean(s && (s.status === 'ok' || s.status === 'empty' || s.status === 'stale'));

const meta = (s: TodaySourceMeta, fallbackSource: string, demo = false) => ({
  source: fallbackSource,
  updatedAt: s.last_synced_at ?? s.as_of ?? null,
  state: s.status === 'stale' ? ('stale' as const) : ('ready' as const),
  size: 'm' as const,
  demo,
});

/** Values are scoped by useScopedToday and are not fabricated from a partial sample. */
export function widgetsFromToday(snapshot: TodaySnapshot | null): SourceWidget[] {
  if (!snapshot) return [];
  const out: SourceWidget[] = [];

  // 1. Post / E-Mail
  if (readable(snapshot.mail) && snapshot.mail.unread_count != null) {
    const unread = snapshot.mail.unread_count;
    const recent = snapshot.mail.items ?? [];
    if (recent.length > 0) {
      const slice = recent.slice(0, 3);
      const isFiktiv = slice.some((m) => hasFiktivMarker(m.subject));
      out.push({
        id: 'mail',
        title: 'Posteingang',
        ...meta(snapshot.mail, 'Post', isFiktiv),
        content: {
          type: 'list',
          items: slice.map((m) => ({
            id: m.id,
            title: stripFiktiv(m.subject) || 'Ohne Betreff',
            detail: m.from_addr || undefined,
          })),
        },
      });
    } else {
      out.push({
        id: 'mail',
        title: 'Post',
        ...meta(snapshot.mail, 'Post'),
        content: {
          type: 'metric',
          value: unread > 0 ? `${unread} ungelesen` : 'Postfach leer',
          detail: unread > 0 ? 'Im Firmen-Posteingang' : 'Alle Nachrichten gelesen',
        },
      });
    }
  }

  // 2. Termine / Kalender
  if (readable(snapshot.calendar)) {
    const evs = snapshot.calendar.events ?? [];
    if (evs.length > 0) {
      const isFiktiv = evs.some((e) => hasFiktivMarker(e.title));
      out.push({
        id: 'calendar',
        title: 'Heutige Termine',
        ...meta(snapshot.calendar, 'Kalender', isFiktiv),
        content: {
          type: 'appointments',
          items: evs.map((e) => ({
            id: e.id,
            title: stripFiktiv(e.title) || e.title,
            detail: e.time ? `${e.time} Uhr` : undefined,
          })),
        },
      });
    } else {
      out.push({
        id: 'calendar',
        title: 'Termine',
        ...meta(snapshot.calendar, 'Kalender'),
        content: {
          type: 'status',
          label: 'Keine Termine heute',
          detail: 'Kalender ist für den Tag frei',
        },
      });
    }
  }

  // 3. Fällige Aufgaben
  if (readable(snapshot.tasks)) {
    const due = snapshot.tasks.due_today ?? [];
    const overdue = snapshot.tasks.overdue ?? [];
    const counts = snapshot.tasks.counts;

    if (due.length > 0) {
      const isFiktiv = due.some((t) => hasFiktivMarker(t.title));
      out.push({
        id: 'tasks',
        title: 'Heute fällig',
        ...meta(snapshot.tasks, 'Aufgaben', isFiktiv),
        content: {
          type: 'list',
          items: due.map((t) => ({
            id: t.id,
            title: stripFiktiv(t.title) || t.title,
            detail: t.priority ? `Priorität ${t.priority}` : undefined,
          })),
        },
      });
    } else if (counts?.open && counts.open > 0) {
      out.push({
        id: 'tasks',
        title: 'Aufgaben',
        ...meta(snapshot.tasks, 'Aufgaben'),
        content: {
          type: 'metric',
          value: `${counts.open} offen`,
          detail: 'Keine für heute datiert',
        },
      });
    }

    if (overdue.length > 0) {
      const slice = overdue.slice(0, 3);
      const isFiktiv = slice.some((t) => hasFiktivMarker(t.title));
      out.push({
        id: 'overdue-tasks',
        title: 'Überfällige Aufgaben',
        ...meta(snapshot.tasks, 'Aufgaben', isFiktiv),
        content: {
          type: 'list',
          items: slice.map((t) => ({
            id: t.id,
            title: stripFiktiv(t.title) || t.title,
            detail: t.due_date ? `Fällig seit ${t.due_date}` : undefined,
          })),
        },
      });
    }
  }

  // 4. Nightwatch / System-Integrität (nur falls vorhanden)
  if (readable(snapshot.nightwatch) && (snapshot.nightwatch.open_incidents !== null || snapshot.nightwatch.health_score !== null)) {
    const incidents = snapshot.nightwatch.open_incidents ?? 0;
    const rawScore = snapshot.nightwatch.health_score;
    const scorePct = rawScore !== null
      ? Math.round(rawScore > 0 && rawScore <= 1 ? rawScore * 100 : rawScore)
      : null;
    out.push({
      id: 'nightwatch',
      title: 'Betriebsstatus',
      ...meta(snapshot.nightwatch, 'System'),
      content: {
        type: 'status',
        label: incidents === 0 ? 'Alles ruhig' : `${incidents} offener Hinweis`,
        detail: scorePct !== null ? `Score ${scorePct} %` : undefined,
      },
    });
  }

  return out;
}

/** Existing, fictional demo-day data only; money remains owner-only. */
export function widgetsFromDemo(model: HomeModel, day?: DemoDay): SourceWidget[] {
  const common = { updatedAt: '28. Okt · 07:00', state: 'ready' as const, size: 'm' as const, demo: true };
  const widgets: SourceWidget[] = [];
  if (model.scope === 'owner' && model.yesterday) {
    widgets.push({
      id: 'revenue',
      title: 'Gestern',
      source: 'Kasse',
      ...common,
      content: {
        type: 'metric',
        value: `${model.yesterday.revenue.toLocaleString('de-DE')} €`,
        detail: `${Math.round(model.yesterday.vsLastWeek * 100)} % zur Vorwoche`,
      },
    });
    widgets.push({
      id: 'team',
      title: 'Team heute',
      source: 'Schichtplan',
      ...common,
      content: {
        type: 'list',
        items: model.team.map((t) => ({ id: t.personId, title: stripFiktiv(t.name) || t.name, detail: t.shift })),
      },
    });
    if (day?.close) {
      widgets.push({
        id: 'close',
        title: 'Tagesabschluss',
        source: 'Kasse',
        ...common,
        content: {
          type: 'metric',
          value: `${day.close.cash.toLocaleString('de-DE')} €`,
          detail: `Jonas · ${day.close.at}`,
        },
      });
    }
    const moon = (id: string) => MORGENROT_STRUCTURE.flatMap((p) => p.moons).find((m) => m.id === id);
    const list = (id: string, title: string, source: string, moonId: string) => {
      const folder = moon(moonId);
      if (folder) {
        widgets.push({
          id,
          title,
          source,
          ...common,
          content: {
            type: 'list',
            items: folder.files.slice(0, 2).map((f) => ({ id: f.id, title: stripFiktiv(f.name) || f.name })),
          },
        });
      }
    };
    list('reservations', 'Reservierungen', 'Reservierungen', 's-res');
    list('inventory', 'Bestand', 'Bestandsliste', 'k-best');
    if (day) {
      widgets.push({
        id: 'reviews',
        title: 'Bewertungen',
        source: 'Bewertungen',
        ...common,
        content: {
          type: 'status',
          label: reviewsOpen(day) ? `${reviewsOpen(day)} Antwortentwürfe` : 'Alle Antworten freigegeben',
          detail: 'Nur Demo',
        },
      });
      widgets.push({
        id: 'order',
        title: 'Bestellung',
        source: 'Bestellliste',
        ...common,
        content: {
          type: 'approval',
          title: day.order === 'approved' ? 'Freigegeben' : 'Freigabe offen',
          detail: `${orderTotal(MORGENROT_EVENTS)} € · ${MORGENROT_EVENTS.order.for}`,
        },
      });
    }
  }
  if (model.shift) {
    widgets.push({ id: 'shift', title: 'Deine Schicht', source: 'Schichtplan', ...common, content: { type: 'status', label: model.shift } });
  }
  return widgets;
}
