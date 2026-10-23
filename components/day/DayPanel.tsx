'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MoraStone } from '@/components/os-kit';
import { useWorld } from '@/lib/lea/useWorld';
import { useDayStore } from '@/lib/lea/dayStore';
import { useDayActions } from '@/lib/lea/useDayActions';
import { buildLiveDay } from '@/lib/lea/live';
import { personOf, serviceOf, inMinutes } from '@/lib/lea/day';
import { localISO, shortDate, type WorldTask } from '@/lib/lea/world';

/**
 * Leas Tag zum Anfassen: „Als Nächstes“ mit „… ist da“ / „Termin abschließen“,
 * „Was heute drängt“ zum Abhaken (mit Rückgängig), „Morgen planen“ und MÔRAs Satz.
 * Aufgaben gehen an CORE (/v3/tasks), der Terminstatus bleibt auf diesem Gerät.
 * Jede Änderung zeigt das Universe sofort (gleiche Daten, gleicher Store).
 */
export function DayPanel({ onAskMora, compact = false }: { onAskMora: (text: string) => void; compact?: boolean }) {
  const world = useWorld();
  const phases = useDayStore((s) => s.phases);
  const setPhase = useDayStore((s) => s.setPhase);
  const actions = useDayActions(world.companyId ?? null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const h = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(h); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [tick, world.events, world.tasks, phases]);
  const day = useMemo(() => buildLiveDay(world.events, world.tasks, phases, now), [world.events, world.tasks, phases, now]);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const say = (text: string, undo?: () => void) => {
    setToast({ text, undo });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const [draft, setDraft] = useState('');
  const [planning, setPlanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (planning) inputRef.current?.focus(); }, [planning]);

  if (!world.enabled || world.loading) return null;

  const done = async (t: WorldTask, value: boolean) => {
    const ok = await actions.setDone(t, value);
    if (!ok) return say('Konnte nicht gespeichert werden. Bitte noch einmal.');
    say(value ? `Erledigt: ${t.title}` : `Wieder offen: ${t.title}`, value ? () => { void done(t, false); } : undefined);
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return inputRef.current?.focus();
    const ok = await actions.addForTomorrow(v);
    if (!ok) return say('Konnte nicht gespeichert werden. Bitte noch einmal.');
    setDraft('');
    say('Für morgen notiert.');
  };

  const ev = day.running ?? day.next;
  const isToday = ev ? ev.date === localISO(now) : false;
  const t = new Date(now); t.setDate(t.getDate() + 1);
  const tomorrowLabel = t.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <section className="dy" data-compact={compact ? 'true' : 'false'} aria-label="Dein Tag" data-testid="day-panel">
      <div className="dy-grid">
        {day.stale ? (
          <div className="dy-card dy-next" data-testid="day-stale">
            <p className="dy-eyebrow">Heute · {day.stale.time} · vorbei</p>
            <p className="dy-title">{personOf(day.stale.title)} {day.stale.duration ? <small>{day.stale.duration} Min</small> : null}</p>
            <p className="dy-meta">{serviceOf(day.stale.title) || 'Termin'} · noch nicht abgeschlossen</p>
            <button type="button" className="dy-btn" data-testid="day-finish-stale" onClick={() => { const s = day.stale!; setPhase(s.id, 'erledigt'); say(`Termin mit ${personOf(s.title)} abgeschlossen.`, () => setPhase(s.id, 'geplant')); }}>Termin abschließen</button>
          </div>
        ) : (
        <div className={`dy-card dy-next${day.running ? ' dy-next--live' : ''}`} data-testid="day-next">
          <p className="dy-eyebrow">
            {day.running ? `Jetzt · seit ${day.running.time ?? ''}` : ev ? `Als Nächstes${isToday && day.minutesToNext !== null ? ` · ${inMinutes(day.minutesToNext)}` : ev.date !== localISO(now) ? ` · am ${shortDate(ev.date)}` : ''}` : 'Als Nächstes'}
          </p>
          {ev ? (
            <>
              <p className="dy-title">{ev.time && !day.running ? `${ev.time} ` : ''}{personOf(ev.title)} {day.running ? <small>läuft</small> : ev.duration ? <small>{ev.duration} Min</small> : null}</p>
              <p className="dy-meta">{serviceOf(ev.title) || 'Termin'}</p>
              {day.running ? (
                <button type="button" className="dy-btn" data-testid="day-finish" onClick={() => { setPhase(day.running!.id, 'erledigt'); say(`Termin mit ${personOf(day.running!.title)} abgeschlossen.`, () => setPhase(day.running!.id, 'laeuft')); }}>Termin abschließen</button>
              ) : isToday ? (
                <button type="button" className="dy-btn" data-testid="day-arrived" onClick={() => { setPhase(ev.id, 'laeuft'); say(`${personOf(ev.title)} ist da. Termin läuft.`, () => setPhase(ev.id, 'geplant')); }}>{personOf(ev.title)} ist da</button>
              ) : null}
            </>
          ) : (
            <>
              <p className="dy-title">Frei</p>
              <p className="dy-meta">Keine Termine mehr eingetragen.</p>
            </>
          )}
        </div>
        )}

        <div className="dy-card" data-testid="day-tasks">
          <p className="dy-eyebrow">Was heute drängt · {day.open.length ? `${day.open.length} ${day.open.length === 1 ? 'Aufgabe' : 'Aufgaben'}` : 'erledigt'}</p>
          {day.open.length ? (
            <ul className="dy-list">
              {day.open.map((o) => (
                <li key={o.task.id} className="dy-task">
                  <button type="button" className="dy-box" aria-label={`Erledigt: ${o.task.title}`} data-testid={`day-tick-${o.task.id}`} onClick={() => done(o.task, true)} />
                  <span className="dy-tx">{o.task.title}<small>{o.meta}</small></span>
                  <span className={`dy-tag${o.overdue ? ' dy-tag--over' : ''}`}>{o.overdue ? 'Überfällig' : 'Heute'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="dy-empty">Nichts drängt mehr.</p>}
          {day.doneToday.length ? (
            <ul className="dy-list dy-list--done">
              {day.doneToday.map((x) => (
                <li key={x.id} className="dy-task dy-task--done">
                  <button type="button" className="dy-box dy-box--on" aria-label={`Wieder öffnen: ${x.title}`} onClick={() => done(x, false)}>✓</button>
                  <span className="dy-tx">{x.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="dy-tomorrow">
            <p className="dy-eyebrow">Morgen · {tomorrowLabel}</p>
            {day.tomorrow.map((x) => <p key={x.id} className="dy-tomorrow__item">{x.title}</p>)}
            {planning || day.tomorrow.length ? (
              <form className="dy-add" onSubmit={add}>
                <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Was steht morgen an?" aria-label="Aufgabe für morgen" data-testid="day-tomorrow-input" />
                <button type="submit" className="dy-btn dy-btn--ghost">Hinzufügen</button>
              </form>
            ) : (
              <button type="button" className="dy-link" onClick={() => setPlanning(true)} data-testid="day-plan">Morgen planen</button>
            )}
          </div>
        </div>
      </div>

      <button type="button" className="dy-say" onClick={() => onAskMora('Was steht heute an, und was sollte ich zuerst tun?')} data-testid="day-mora">
        <MoraStone size={40} />
        <span>„{day.ahead ?? day.sentence}“</span>
      </button>

      {toast ? (
        <div className="dy-toast" role="status" data-testid="day-toast">
          <span>{toast.text}</span>
          {toast.undo ? <button type="button" onClick={() => { toast.undo!(); setToast(null); }}>Rückgängig</button> : null}
        </div>
      ) : null}
    </section>
  );
}
