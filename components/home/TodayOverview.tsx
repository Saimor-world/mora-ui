'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, ListTodo, Mail, Radar, RefreshCw, type LucideIcon } from 'lucide-react';
import {
  fetchTodaySnapshot,
  type TodaySnapshot,
  type TodaySourceStatus,
} from '@/lib/api/todayClient';
import { CoreError } from '@/lib/api/http';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';

type TodayCardProps = {
  eyebrow: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
  unavailable?: boolean;
  attention?: boolean;
};

type SnapshotState = {
  key: string;
  data: TodaySnapshot;
};

type TodayLoadError = 'unauthorized' | 'forbidden' | 'unavailable' | null;

const BACKGROUND_REFRESH_MS = 5 * 60_000;
const FOCUS_REFRESH_MIN_AGE_MS = 2 * 60_000;

function TodayCard({ eyebrow, value, detail, icon: Icon, onClick, unavailable, attention }: TodayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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
      return {
        value: 'Nicht verbunden',
        detail: `${label} ist für diesen Kontext nicht verbunden.`,
        unavailable: true,
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
  const activeCompanyId = useNavStore((state) => state.activeCompanyId);
  const userId = useSessionStore((state) => state.user?.id ?? null);
  const openPane = usePaneStore((state) => state.openPane);
  const contextKey = `${userId ?? 'anonymous'}:${activeCompanyId ?? 'tenant'}`;

  const [snapshotState, setSnapshotState] = useState<SnapshotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<TodayLoadError>(null);
  const requestGenerationRef = useRef(0);
  const lastSuccessfulRefreshRef = useRef(0);

  const snapshot = snapshotState?.key === contextKey ? snapshotState.data : null;

  const refresh = useCallback(async (showLoading = false) => {
    const requestGeneration = ++requestGenerationRef.current;
    if (showLoading) setLoading(true);
    setRefreshing(true);

    try {
      const data = await fetchTodaySnapshot(activeCompanyId, userId);
      if (requestGeneration !== requestGenerationRef.current) return;

      if (data) {
        setSnapshotState({ key: contextKey, data });
        setLoadError(null);
        lastSuccessfulRefreshRef.current = Date.now();
      } else {
        setSnapshotState(null);
        setLoadError('unavailable');
      }
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return;
      setSnapshotState(null);
      if (error instanceof CoreError && error.status === 401) {
        setLoadError('unauthorized');
      } else if (error instanceof CoreError && error.status === 403) {
        setLoadError('forbidden');
      } else {
        setLoadError('unavailable');
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeCompanyId, contextKey, userId]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    setSnapshotState(null);
    setLoadError(null);
    setLoading(true);
    setRefreshing(false);
    lastSuccessfulRefreshRef.current = 0;
    void refresh(true);

    const refreshIfUseful = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSuccessfulRefreshRef.current < FOCUS_REFRESH_MIN_AGE_MS) return;
      void refresh(false);
    };

    const timer = window.setInterval(refreshIfUseful, BACKGROUND_REFRESH_MS);
    window.addEventListener('focus', refreshIfUseful);
    document.addEventListener('visibilitychange', refreshIfUseful);

    return () => {
      requestGenerationRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfUseful);
      document.removeEventListener('visibilitychange', refreshIfUseful);
    };
  }, [refresh]);

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
    if (!snapshot) return topLevelStateCopy('Aufgaben', loadError, loading);
    if (snapshot.tasks.status === 'empty') {
      return { value: 'Nichts offen', detail: 'Keine offenen Aufgaben.' };
    }
    if (snapshot.tasks.status !== 'ok') return sourceStateCopy('Aufgaben', snapshot.tasks.status);

    const { due_today: due, overdue, open } = snapshot.tasks.counts;
    if (typeof due !== 'number' || typeof overdue !== 'number' || typeof open !== 'number') {
      return sourceStateCopy('Aufgaben', 'unavailable');
    }
    if (overdue > 0) {
      return {
        value: `${overdue} überfällig`,
        detail: due > 0 ? `Zusätzlich ${due} heute fällig · ${open} offen.` : `${open} Aufgaben insgesamt offen.`,
        attention: true,
      };
    }
    if (due > 0) return { value: `${due} heute fällig`, detail: `${open} Aufgaben insgesamt offen.`, attention: true };
    return { value: `${open} offen`, detail: 'Keine Aufgabe ist heute fällig.' };
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
          {...calendarCopy}
        />
        <TodayCard
          eyebrow="Mail"
          icon={Mail}
          onClick={() => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 1080, height: 760 } })}
          {...mailCopy}
        />
        <TodayCard
          eyebrow="Aufgaben"
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
    </section>
  );
}
