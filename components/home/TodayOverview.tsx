'use client';

import React, { useMemo } from 'react';
import { CalendarContinuity } from './CalendarContinuity';
import { ArrowUpRight, CalendarDays, ListTodo, Mail, Radar, RefreshCw, type LucideIcon } from 'lucide-react';
import type { TodaySourceStatus } from '@/lib/api/todayClient';
import { useScopedToday, type TodayLoadError } from '@/lib/os/useScopedToday';
import { usePaneStore } from '@/lib/store/paneStore';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { useWorld } from '@/lib/lea/useWorld';
import { useDayStore } from '@/lib/lea/dayStore';
import { nextOpenToday } from '@/lib/lea/day';

type TodayCardProps = {
  eyebrow: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
  unavailable?: boolean | undefined;
  attention?: boolean | undefined;
  /** The source is not connected (or its access expired): tapping opens Integrationen. */
  reconnect?: boolean | undefined;
  onReconnect?: (() => void) | undefined;
};

function TodayCard({ eyebrow, value, detail, icon: Icon, onClick, unavailable, attention, reconnect, onReconnect }: TodayCardProps) {
  return (
    <button
      type="button"
      onClick={reconnect && onReconnect ? onReconnect : onClick}
      className="group min-w-0 rounded-[22px] border border-white/[0.065] bg-black/[0.11] px-4 py-4 text-left backdrop-blur-xl transition-colors hover:border-emerald-100/14 hover:bg-white/[0.035]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-emerald-100/62">
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/28">{eyebrow}</div>
            <div className={`mt-1 truncate text-sm font-medium ${unavailable ? 'text-white/36' : attention ? 'text-amber-100/80' : 'text-white/78'}`}>
              {value}
            </div>
          </div>
        </div>
        <ArrowUpRight size={13} className="mt-1 shrink-0 text-white/16 transition-colors group-hover:text-white/48" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-[10px] leading-5 text-white/31">{detail}</p>
    </button>
  );
}

type TodayCopy = { value: string; detail: string; unavailable?: boolean; attention?: boolean; reconnect?: boolean };

/** "um 09:42" bzw. "am 21.10. um 09:42" – Uhrzeit des letzten Abgleichs, Europe/Berlin. */
export function syncTimeLabel(iso?: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const tz = 'Europe/Berlin';
  const time = at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  const day = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: tz });
  return day(at) === day(now) ? `um ${time}` : `am ${day(at)} um ${time}`;
}

function sourceStateCopy(label: string, status?: TodaySourceStatus, loading = false, lastSyncedAt?: string | null): TodayCopy {
  const synced = syncTimeLabel(lastSyncedAt);
  if (loading && !status) {
    return {
      value: 'Wird geladen',
      detail: `${label} wird für den aktuellen Kontext geladen.`,
      unavailable: true,
    };
  }

  switch (status) {
    case 'disconnected':
      // Also used when a stored connection stopped working (expired Google access).
      return {
        value: 'Nicht verbunden',
        detail: `${label}-Verbindung fehlt oder ist abgelaufen – antippen, um neu zu verbinden.`,
        unavailable: true,
        reconnect: true,
      };
    case 'not_synced':
      // Ehrlich: CORE hat diese Quelle im Hintergrund noch nie erfolgreich abgeglichen.
      return {
        value: 'Noch nicht abgeglichen',
        detail: synced ? `Letzter Abgleich ${synced}.` : `${label} wird im Hintergrund abgeglichen – noch kein Stand.`,
        unavailable: true,
      };
    case 'stale':
      return {
        value: 'Stand veraltet',
        detail: synced ? `Zuletzt abgeglichen ${synced}.` : `${label} sollte aktualisiert werden.`,
        attention: true,
      };
    case 'unavailable':
    default:
      return {
        value: 'Nicht verfügbar',
        detail: `${label} konnte gerade nicht sicher geladen werden.`,
        unavailable: true,
      };
  }
}

function topLevelStateCopy(label: string, error: TodayLoadError, loading: boolean): TodayCopy {
  if (loading) return sourceStateCopy(label, undefined, true);
  if (error === 'unauthorized') {
    return {
      value: 'Sitzung abgelaufen',
      detail: `${label} kann nach erneuter Anmeldung wieder geladen werden.`,
      unavailable: true,
    };
  }
  if (error === 'forbidden') {
    return {
      value: 'Kein Zugriff',
      detail: `${label} ist für den gewählten Firmenkontext nicht freigegeben.`,
      unavailable: true,
    };
  }
  return sourceStateCopy(label, 'unavailable');
}

/** Die eine Mail-Zahl aus CORE – dieselbe wie im Universe und in Post. */
export function mailCountDetail(unread: number | null | undefined, total: number | null | undefined): string {
  if (typeof unread === 'number') {
    const head = unread === 1 ? '1 ungelesen' : `${unread} ungelesen`;
    return typeof total === 'number' ? `${head} · ${total} im Posteingang` : head;
  }
  if (typeof total === 'number') return `${total} im Posteingang`;
  return 'Zahl wird gelesen …';
}

export function TodayOverview() {
  const openPane = usePaneStore((state) => state.openPane);
  const { snapshot, loading, refreshing, loadError, refresh } = useScopedToday({ backgroundRefresh: true });
  const openIntegrations = () => openPane({ id: 'settings-main', type: 'integrations', title: 'Integrationen', size: { width: 860, height: 680 } });

  const world = useWorld();
  const phases = useDayStore((s) => s.phases);
  const timeZone = world.calendar?.window.timezone;
  const openToday = useMemo(() => nextOpenToday(world.events ?? [], phases, new Date(), timeZone), [world.events, phases, timeZone]);

  const calendarCopy = useMemo<TodayCopy>(() => {
    if (world.calendarUnavailable) {
      const status = world.calendar?.status;
      return sourceStateCopy('Kalender', status === 'partial' ? 'unavailable' : status, world.loading, world.calendar?.last_synced_at);
    }
    // Leas Termine mit Status aus CORE: abgeschlossene überspringen, den nächsten offenen zeigen.
    if (openToday.total > 0) {
      const n = openToday.next;
      if (!n) return { value: 'Alle Termine abgeschlossen', detail: `${openToday.total} Termin${openToday.total === 1 ? '' : 'e'} heute, alle erledigt.` };
      return {
        value: n.time ? `${n.time} · ${n.title}` : n.title,
        detail: `${openToday.open} von ${openToday.total} Termin${openToday.total === 1 ? '' : 'en'} heute offen`,
      };
    }
    if (world.calendar?.complete) return { value: 'Keine Termine heute', detail: 'Im bestätigten Kalenderstand sind heute keine Termine eingetragen.' };
    if (!snapshot) return topLevelStateCopy('Kalender', loadError, loading);
    if (snapshot.calendar.status === 'empty') {
      // "frei" klang nach "nichts zu tun" – Termine und Aufgaben sind verschiedene Dinge.
      const overdue = snapshot.tasks?.counts?.overdue;
      return {
        value: 'Keine Termine heute',
        detail: typeof overdue === 'number' && overdue > 0
          ? `Aber ${overdue} Aufgabe${overdue === 1 ? '' : 'n'} überfällig.`
          : 'Keine weiteren Termine für heute.',
        attention: typeof overdue === 'number' && overdue > 0 ? true : undefined,
      };
    }
    if (snapshot.calendar.status !== 'ok') return sourceStateCopy('Kalender', snapshot.calendar.status, false, snapshot.calendar.last_synced_at);
    if (typeof snapshot.calendar.count !== 'number') return sourceStateCopy('Kalender', 'unavailable');

    const next = snapshot.calendar.next_event;
    if (!next) {
      return {
        value: `${snapshot.calendar.count} Termine`,
        detail: 'Keine weitere Startzeit ermittelt.',
      };
    }
    return {
      value: next.time ? `${next.time} · ${next.title}` : next.title,
      detail: next.location
        ? next.location
        : `${snapshot.calendar.count} Termin${snapshot.calendar.count === 1 ? '' : 'e'} heute`,
    };
  }, [loadError, loading, snapshot, openToday, world.calendarUnavailable, world.loading, world.calendar]);

  const mailCopy = useMemo<TodayCopy>(() => {
    if (!snapshot) return topLevelStateCopy('Mail', loadError, loading);
    if (snapshot.mail.status === 'empty') {
      return {
        value: 'Posteingang ruhig',
        detail: snapshot.mail.total === 0 ? 'Keine Mail im Posteingang.' : 'Keine Mail im zuletzt geladenen Ausschnitt.',
      };
    }
    if (snapshot.mail.status !== 'ok') return sourceStateCopy('Mail', snapshot.mail.status, false, snapshot.mail.last_synced_at);
    if (typeof snapshot.mail.inbox_loaded !== 'number') return sourceStateCopy('Mail', 'unavailable');

    const latest = snapshot.mail.items[0];
    if (!latest) {
      return { value: 'Post', detail: mailCountDetail(snapshot.mail.unread_count, snapshot.mail.total) };
    }
    return {
      value: latest.subject || 'Neue Mail',
      detail: mailCountDetail(snapshot.mail.unread_count, snapshot.mail.total),
    };
  }, [loadError, loading, snapshot]);

  const taskCopy = useMemo<TodayCopy>(() => {
    if (!snapshot) return topLevelStateCopy('Gemeinsame Aufgaben', loadError, loading);
    if (snapshot.tasks.status === 'empty') {
      return { value: 'Nichts offen', detail: 'Keine offenen gemeinsamen Aufgaben dieser Organisation.' };
    }
    if (snapshot.tasks.status !== 'ok') return sourceStateCopy('Gemeinsame Aufgaben', snapshot.tasks.status, false, snapshot.tasks.last_synced_at);

    const { due_today: due, overdue, open } = snapshot.tasks.counts;
    if (typeof due !== 'number' || typeof overdue !== 'number' || typeof open !== 'number') {
      return sourceStateCopy('Gemeinsame Aufgaben', 'unavailable');
    }
    if (overdue > 0) {
      return {
        value: `${overdue} überfällig`,
        detail: due > 0
          ? `Zusätzlich ${due} heute fällig · ${open} organisationsweit offen.`
          : `${open} gemeinsame Aufgaben organisationsweit offen.`,
        attention: true,
      };
    }
    if (due > 0) return { value: `${due} heute fällig`, detail: `${open} organisationsweit offen.`, attention: true };
    return { value: `${open} offen`, detail: 'Gemeinsame Aufgaben dieser Organisation · heute nichts fällig.' };
  }, [loadError, loading, snapshot]);

  const nightwatchCopy = useMemo<TodayCopy>(() => {
    if (!snapshot) return topLevelStateCopy('Nightwatch', loadError, loading);
    if (snapshot.nightwatch.status === 'empty') {
      return { value: 'Alles ruhig', detail: 'Keine offenen Vorfälle.' };
    }
    if (snapshot.nightwatch.status !== 'ok') return sourceStateCopy('Nightwatch', snapshot.nightwatch.status, false, snapshot.nightwatch.last_synced_at);
    if (typeof snapshot.nightwatch.open_incidents !== 'number') return sourceStateCopy('Nightwatch', 'unavailable');

    const open = snapshot.nightwatch.open_incidents;
    return {
      value: `${open} offen`,
      detail: snapshot.nightwatch.incidents[0]?.title || 'Nightwatch braucht Aufmerksamkeit.',
      attention: open > 0,
    };
  }, [loadError, loading, snapshot]);

  const overallLabel = loading && !snapshot
    ? 'wird geladen'
    : !snapshot && loadError === 'unauthorized'
      ? 'Sitzung abgelaufen'
      : !snapshot && loadError === 'forbidden'
        ? 'kein Zugriff'
        : !snapshot
          ? 'nicht verfügbar'
          : refreshing
            ? 'aktualisiert'
            : snapshot.status === 'ok'
              ? 'aktuell'
              : snapshot.status === 'degraded'
                ? 'nicht alles abgeglichen'
                : 'nicht verfügbar';

  if (isUniverseV2Enabled()) {
    const sources: { key: string; label: string; icon: LucideIcon; copy: TodayCopy; open: () => void; connectable?: boolean }[] = [
      { key: 'calendar', label: 'Kalender', icon: CalendarDays, copy: calendarCopy, connectable: true, open: () => openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 1080, height: 760 } }) },
      { key: 'mail', label: 'Post', icon: Mail, copy: mailCopy, connectable: true, open: () => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 1080, height: 760 } }) },
      { key: 'tasks', label: 'Aufgaben', icon: ListTodo, copy: taskCopy, open: () => openPane({ id: 'tasks-main', type: 'tasks', title: 'Aufgaben', size: { width: 1080, height: 760 } }) },
      { key: 'watch', label: 'Wache', icon: Radar, copy: nightwatchCopy, open: () => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } }) },
    ];
    const fog = sources.filter((x) => x.copy.unavailable);
    const isLoading = loading && !snapshot;
    const M: React.CSSProperties = { fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' };
    return (
      <section className="mt-10" data-testid="uv2-today" aria-busy={loading || refreshing}>
        <div className="flex items-center justify-between gap-4">
          <p style={{ ...M, color: '#D6A848' }}>Heute</p>
          <span className="uv2-today-status" role="status">{overallLabel}</span>
        </div>
        <div className="uv2-todayw mt-4">
          {sources.map((x) => {
            const off = x.copy.unavailable;
            const reconnect = Boolean(x.connectable && x.copy.reconnect);
            const retry = Boolean(off && !reconnect);
            const disabled = isLoading || (retry && refreshing) || (!snapshot && loadError === 'forbidden');
            const Icon = x.icon;
            return (
              <button key={x.key} type="button" disabled={disabled}
                onClick={reconnect ? openIntegrations : retry ? () => void refresh(false) : x.open}
                data-testid={`uv2-today-${x.key}`} className="uv2-widget" data-off={off ? '' : undefined} data-reconnect={reconnect ? '' : undefined}
                data-attn={!off && x.copy.attention ? '' : undefined}>
                <span className="uv2-widget__top">
                  <span className="uv2-widget__ico"><Icon /></span>
                  <span className="uv2-widget__label">{x.label}</span>
                  <span className="uv2-widget__go" aria-hidden>{reconnect ? 'Verbinden' : retry ? <RefreshCw size={14} /> : '›'}</span>
                </span>
                <span className="uv2-widget__value">{x.copy.value}</span>
                {x.copy.detail && <span className="uv2-widget__detail">{x.copy.detail}</span>}
              </button>
            );
          })}
        </div>
        {fog.length > 0 && !isLoading && (
          <div className="mt-4 flex items-center gap-6" data-testid="uv2-today-fog">
            <button type="button" disabled={refreshing} onClick={() => void refresh(false)} className="text-[15px] font-light transition-colors hover:text-white disabled:opacity-60" style={{ color: 'rgba(247,244,233,.6)' }}>
              {refreshing ? 'Prüft …' : 'Erneut prüfen'}
            </button>
          </div>
        )}
        {!calendarCopy.unavailable && <CalendarContinuity />}
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-white/24">
            Heute
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className={snapshot?.status === 'degraded' || loadError === 'forbidden' ? 'text-amber-100/45' : 'text-emerald-100/42'}>{overallLabel}</span>
          </div>
          <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-white/72">Das ist heute relevant.</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.065] bg-white/[0.025] text-white/28 transition-colors hover:text-white/62"
          title="Heute aktualisieren"
          aria-label="Heute aktualisieren"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <TodayCard
          eyebrow="Kalender"
          icon={CalendarDays}
          onClick={() => openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 1080, height: 760 } })}
          onReconnect={openIntegrations}
          {...calendarCopy}
        />
        <TodayCard
          eyebrow="Mail"
          icon={Mail}
          onClick={() => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 1080, height: 760 } })}
          onReconnect={openIntegrations}
          {...mailCopy}
        />
        <TodayCard
          eyebrow="Aufgaben · Organisation"
          icon={ListTodo}
          onClick={() => openPane({ id: 'tasks-main', type: 'tasks', title: 'Aufgaben', size: { width: 1080, height: 760 } })}
          {...taskCopy}
        />
        <TodayCard
          eyebrow="Nightwatch"
          icon={Radar}
          onClick={() => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } })}
          {...nightwatchCopy}
        />
      </div>
      <CalendarContinuity />
    </section>
  );
}

