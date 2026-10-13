'use client';

import React, { useMemo } from 'react';
import { CalendarContinuity } from './CalendarContinuity';
import { ArrowUpRight, CalendarDays, ListTodo, Mail, Radar, RefreshCw, type LucideIcon } from 'lucide-react';
import type { TodaySourceStatus } from '@/lib/api/todayClient';
import { useScopedToday, type TodayLoadError } from '@/lib/os/useScopedToday';
import { usePaneStore } from '@/lib/store/paneStore';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

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

function sourceStateCopy(label: string, status?: TodaySourceStatus, loading = false) {
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
    case 'partial':
      return {
        value: 'Teilweise verfügbar',
        detail: `${label} konnte nur teilweise geladen werden.`,
        attention: true,
      };
    case 'stale':
      return {
        value: 'Stand veraltet',
        detail: `${label} sollte aktualisiert werden.`,
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

function topLevelStateCopy(label: string, error: TodayLoadError, loading: boolean) {
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

export function TodayOverview() {
  const openPane = usePaneStore((state) => state.openPane);
  const { snapshot, loading, refreshing, loadError, refresh } = useScopedToday({ backgroundRefresh: true });
  const openIntegrations = () => openPane({ id: 'settings-main', type: 'integrations', title: 'Integrationen', size: { width: 860, height: 680 } });

  const calendarCopy = useMemo(() => {
    if (!snapshot) return topLevelStateCopy('Kalender', loadError, loading);
    if (snapshot.calendar.status === 'empty') {
      return { value: 'Heute frei', detail: 'Keine weiteren Termine für heute.' };
    }
    if (snapshot.calendar.status !== 'ok') return sourceStateCopy('Kalender', snapshot.calendar.status);
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
  }, [loadError, loading, snapshot]);

  const mailCopy = useMemo(() => {
    if (!snapshot) return topLevelStateCopy('Mail', loadError, loading);
    if (snapshot.mail.status === 'empty') {
      return { value: 'Posteingang ruhig', detail: 'Keine Mail im zuletzt geladenen Ausschnitt.' };
    }
    if (snapshot.mail.status !== 'ok') return sourceStateCopy('Mail', snapshot.mail.status);
    if (typeof snapshot.mail.inbox_loaded !== 'number') return sourceStateCopy('Mail', 'unavailable');

    const latest = snapshot.mail.items[0];
    if (!latest) return sourceStateCopy('Mail', 'partial');
    return {
      value: latest.subject || 'Neue Mail',
      detail: snapshot.mail.inbox_loaded === 1
        ? '1 zuletzt geladene Nachricht.'
        : `${snapshot.mail.inbox_loaded} zuletzt geladene Nachrichten.`,
    };
  }, [loadError, loading, snapshot]);

  const taskCopy = useMemo(() => {
    if (!snapshot) return topLevelStateCopy('Gemeinsame Aufgaben', loadError, loading);
    if (snapshot.tasks.status === 'empty') {
      return { value: 'Nichts offen', detail: 'Keine offenen gemeinsamen Aufgaben dieser Organisation.' };
    }
    if (snapshot.tasks.status !== 'ok') return sourceStateCopy('Gemeinsame Aufgaben', snapshot.tasks.status);

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

  const nightwatchCopy = useMemo(() => {
    if (!snapshot) return topLevelStateCopy('Nightwatch', loadError, loading);
    if (snapshot.nightwatch.status === 'empty') {
      return { value: 'Alles ruhig', detail: 'Keine offenen Vorfälle.' };
    }
    if (snapshot.nightwatch.status !== 'ok') return sourceStateCopy('Nightwatch', snapshot.nightwatch.status);
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
                ? 'teilweise'
                : 'nicht verfügbar';

  if (isUniverseV2Enabled()) {
    type Copy = { value: string; detail: string; unavailable?: boolean; attention?: boolean };
    const sources: { key: string; label: string; icon: LucideIcon; copy: Copy; open: () => void }[] = [
      { key: 'calendar', label: 'Kalender', icon: CalendarDays, copy: calendarCopy, open: () => openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 1080, height: 760 } }) },
      { key: 'mail', label: 'Post', icon: Mail, copy: mailCopy, open: () => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 1080, height: 760 } }) },
      { key: 'tasks', label: 'Aufgaben', icon: ListTodo, copy: taskCopy, open: () => openPane({ id: 'tasks-main', type: 'tasks', title: 'Aufgaben', size: { width: 1080, height: 760 } }) },
      { key: 'watch', label: 'Wache', icon: Radar, copy: nightwatchCopy, open: () => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } }) },
    ];
    const live = sources.filter((x) => !x.copy.unavailable);
    const fog = sources.filter((x) => x.copy.unavailable);
    const isLoading = loading && !snapshot;
    const M: React.CSSProperties = { fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' };
    return (
      <section className="mt-16" data-testid="uv2-today">
        <p style={{ ...M, color: '#D6A848' }}>Heute</p>
        {/* Jede Quelle eine Zeile: Name · Stand · Detail. Was fehlt, steht ehrlich als „nicht verbunden“ da – keine Null-Kacheln. */}
        <ol className="mt-4" style={{ borderTop: '0.5px solid rgba(247,244,233,.09)' }}>
          {sources.map((x, i) => {
            const off = x.copy.unavailable;
            return (
              <li key={x.key} style={{ borderBottom: '0.5px solid rgba(247,244,233,.09)' }}>
                <button type="button" onClick={off ? openIntegrations : x.open} data-testid={`uv2-today-${x.key}`}
                  className="group grid w-full grid-cols-[28px_1fr_auto] items-baseline gap-3 py-4 text-left sm:grid-cols-[48px_140px_1fr_auto] sm:gap-4">
                  <span style={{ ...M, color: 'rgba(247,244,233,.35)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="hidden sm:inline" style={{ ...M, color: 'rgba(247,244,233,.6)' }}>{x.label}</span>
                  <span className="min-w-0">
                    <span className="block sm:hidden" style={{ ...M, color: 'rgba(247,244,233,.6)' }}>{x.label}</span>
                    <span className="block truncate text-[15px] font-light" style={{ color: off ? 'rgba(247,244,233,.45)' : x.copy.attention ? '#D6A848' : 'rgba(247,244,233,.92)' }}>
                      {isLoading ? 'Wird gelesen …' : off ? 'Nicht verbunden' : x.copy.value}
                    </span>
                    {!off && !isLoading && x.copy.detail && <span className="mt-1 block truncate text-[15px] font-light" style={{ color: 'rgba(247,244,233,.45)' }}>{x.copy.detail}</span>}
                  </span>
                  <span className="transition-colors group-hover:text-[#D6A848]" style={{ ...M, color: 'rgba(247,244,233,.35)' }}>{off ? 'Verbinden' : 'Öffnen'}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {fog.length > 0 && !isLoading && (
          <div className="mt-4 flex items-center gap-6" data-testid="uv2-today-fog">
            <button type="button" onClick={() => void refresh(false)} className="text-[15px] font-light transition-colors hover:text-white" style={{ color: 'rgba(247,244,233,.6)' }}>
              {refreshing ? 'Prüft …' : 'Erneut prüfen'}
            </button>
          </div>
        )}
        {!(calendarCopy as Copy).unavailable && <CalendarContinuity />}
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

