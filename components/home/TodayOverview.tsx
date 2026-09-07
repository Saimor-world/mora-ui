'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, ListTodo, Mail, Radar, RefreshCw, type LucideIcon } from 'lucide-react';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/api/todayClient';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';

type TodayCardProps = {
  eyebrow: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
  unavailable?: boolean;
  attention?: boolean;
};

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

function unknownCopy(label: string) {
  return {
    value: 'Nicht verfügbar',
    detail: `${label} konnte gerade nicht sicher gelesen werden.`,
    unavailable: true,
  };
}

export function TodayOverview() {
  const activeCompanyId = useNavStore((state) => state.activeCompanyId);
  const openPane = usePaneStore((state) => state.openPane);
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchTodaySnapshot(activeCompanyId);
    setSnapshot(data);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const data = await fetchTodaySnapshot(activeCompanyId);
      if (!cancelled) {
        setSnapshot(data);
        setLoading(false);
      }
    };

    setLoading(true);
    void run();
    const timer = window.setInterval(() => void run(), 60_000);
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeCompanyId]);

  const calendarCopy = useMemo(() => {
    if (!snapshot || snapshot.calendar.status !== 'ok') return unknownCopy('Kalender');
    const next = snapshot.calendar.next_event;
    if (!next) {
      return {
        value: snapshot.calendar.count === 0 ? 'Heute frei' : `${snapshot.calendar.count ?? 0} Termine`,
        detail: snapshot.calendar.count === 0 ? 'Keine weiteren Termine für heute.' : 'Keine weitere Startzeit ermittelt.',
      };
    }
    return {
      value: next.time ? `${next.time} · ${next.title}` : next.title,
      detail: next.location ? next.location : `${snapshot.calendar.count ?? 1} Termin${snapshot.calendar.count === 1 ? '' : 'e'} heute`,
    };
  }, [snapshot]);

  const mailCopy = useMemo(() => {
    if (!snapshot || snapshot.mail.status !== 'ok') return unknownCopy('Post');
    const latest = snapshot.mail.items[0];
    if (!latest) return { value: 'Posteingang ruhig', detail: 'Keine Nachricht in der geladenen Inbox-Ansicht.' };
    return {
      value: latest.subject || 'Neue Post',
      detail: snapshot.mail.inbox_loaded === 1
        ? '1 Nachricht in der geladenen Inbox-Ansicht.'
        : `${snapshot.mail.inbox_loaded ?? 0} Nachrichten in der geladenen Inbox-Ansicht.`,
    };
  }, [snapshot]);

  const taskCopy = useMemo(() => {
    if (!snapshot || snapshot.tasks.status !== 'ok') return unknownCopy('Aufgaben');
    const due = snapshot.tasks.counts.due_today ?? 0;
    const overdue = snapshot.tasks.counts.overdue ?? 0;
    const open = snapshot.tasks.counts.open ?? 0;
    if (overdue > 0) {
      return {
        value: `${overdue} überfällig`,
        detail: due > 0 ? `Zusätzlich ${due} heute fällig · ${open} offen.` : `${open} Aufgaben insgesamt offen.`,
        attention: true,
      };
    }
    if (due > 0) return { value: `${due} heute fällig`, detail: `${open} Aufgaben insgesamt offen.`, attention: true };
    return { value: open === 0 ? 'Nichts offen' : `${open} offen`, detail: open === 0 ? 'Keine offenen Aufgaben.' : 'Keine Aufgabe ist heute fällig.' };
  }, [snapshot]);

  const nightwatchCopy = useMemo(() => {
    if (!snapshot || snapshot.nightwatch.status !== 'ok') return unknownCopy('Nightwatch');
    const open = snapshot.nightwatch.open_incidents ?? 0;
    if (open === 0) return { value: 'Keine offenen Vorfälle', detail: 'Nightwatch meldet aktuell keinen offenen Incident.' };
    return {
      value: `${open} offen`,
      detail: snapshot.nightwatch.incidents[0]?.title || 'Nightwatch braucht Aufmerksamkeit.',
      attention: true,
    };
  }, [snapshot]);

  const overallLabel = loading
    ? 'wird geladen'
    : !snapshot
      ? 'nicht verbunden'
      : snapshot.status === 'ok'
        ? 'live'
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
            <span className={snapshot?.status === 'degraded' ? 'text-amber-100/45' : 'text-emerald-100/42'}>{overallLabel}</span>
          </div>
          <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-white/72">Was jetzt tatsächlich anliegt.</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.065] bg-white/[0.025] text-white/28 transition-colors hover:text-white/62"
          title="Tageslage aktualisieren"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
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
          eyebrow="Post"
          icon={Mail}
          onClick={() => openPane({ id: 'mail-main', type: 'mail', title: 'Post', size: { width: 1080, height: 760 } })}
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
