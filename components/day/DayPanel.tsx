'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loading, MoraStone } from '@/components/os-kit';
import { useWorld } from '@/lib/lea/useWorld';
import { useDayStore, type EventPhase } from '@/lib/lea/dayStore';

/** Echte Check-in-Uhrzeit (HH:MM, lokal) aus dem gespeicherten Zeitpunkt. */
export function sinceLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
import { useDayActions } from '@/lib/lea/useDayActions';
import { buildLiveDay } from '@/lib/lea/live';
import { personOf, serviceOf, inMinutes } from '@/lib/lea/day';
import { localISO, shortDate, type WorldTask } from '@/lib/lea/world';

/**
 * Leas Tag zum Anfassen: „Als Nächstes“ mit „… ist da“ / „Termin abschließen“,
 * „Was heute drängt“ zum Abhaken (mit Rückgängig), „Morgen planen“ und MÔRAs Satz.
 * Aufgaben und Terminstatus werden von CORE bestätigt.
 * Jede Änderung zeigt das Universe sofort (gleiche Daten, gleicher Store).
 */
export function DayPanel({ onAskMora, compact = false, hideWhenUnavailable = false }: { onAskMora: (text: string) => void; compact?: boolean; hideWhenUnavailable?: boolean }) {
  const world = useWorld();
  const phases = useDayStore((s) => s.phases);
  const setPhase = useDayStore((s) => s.setPhase);
  const phasePending = useDayStore(s => s.pending);
  const sync = useDayStore(s => s.sync);
  const since = useDayStore((s) => s.since);
  const actions = useDayActions(world.companyId ?? null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const h = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(h); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [tick, world.events, world.tasks, phases]);
  const timeZone = world.calendar?.window.timezone;
  const day = useMemo(() => buildLiveDay(world.events, world.tasks, phases, now, timeZone), [world.events, world.tasks, phases, now, timeZone]);
  const [toast, setToast] = useState<{ text: string; undo?: () => void; tone: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const say = (text: string, undo?: () => void, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, undo, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const [draft, setDraft] = useState('');
  const [planning, setPlanning] = useState(false);
  // Was gerade gespeichert wird: Knöpfe warten, statt doppelt zu senden.
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const mark = (id: string, on: boolean) => setPending((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (planning) inputRef.current?.focus(); }, [planning]);

  if (!world.enabled) return null;
  if (world.loading) {
    return (
      <section className="dy" data-compact={compact ? 'true' : 'false'} aria-label="Dein Tag" aria-busy="true" data-testid="day-loading">
        <div className="dy-grid">
          <div className="dy-card"><p className="dy-eyebrow">Als Nächstes</p><div className="dy-skeleton"><Loading lines={2} label="Dein Tag wird geladen" /></div></div>
          <div className="dy-card"><p className="dy-eyebrow">Was heute drängt</p><div className="dy-skeleton"><Loading lines={3} label="Aufgaben werden geladen" /></div></div>
        </div>
      </section>
    );
  }
  if (world.failed || world.dayUnavailable) {
    // Heute fasst leere/unlesbare Zustände in einer ruhigen Statuszeile zusammen.
    if (hideWhenUnavailable) return null;
    return (
      <section className="dy" aria-label="Dein Tag" data-testid="day-error">
        <div className="dy-card dy-card--error" role="status">
          <p className="dy-eyebrow">Dein Tag</p>
          <p className="dy-title">Gerade nicht lesbar</p>
          <p className="dy-meta">Der Kalender- oder Aufgabenstand ist nicht vollständig bestätigt. Angezeigt wird nichts, was nicht belegt ist.</p>
        </div>
      </section>
    );
  }

  const done = async (t: WorldTask, value: boolean) => {
    if (pending.has(t.id)) return;
    mark(t.id, true);
    const ok = await actions.setDone(t, value);
    mark(t.id, false);
    if (!ok) return say('Konnte nicht gespeichert werden. Bitte noch einmal.', undefined, 'error');
    say(value ? `Erledigt: ${t.title}` : `Wieder offen: ${t.title}`, value ? () => { void done(t, false); } : undefined);
  };
  // Terminstatus ändern; der Toast nennt erst danach den Stand, der in CORE gilt.
  const PHASE_TEXT: Record<EventPhase, string> = { geplant: 'wieder geplant', laeuft: 'läuft', erledigt: 'abgeschlossen' };
  const change = async (id: string, title: string, phase: EventPhase, text: string, undoTo: EventPhase) => {
    const res = await setPhase(id, phase);
    if (res.conflict) {
      say(`Schon auf einem anderen Gerät geändert: Termin mit ${personOf(title)} ${PHASE_TEXT[res.phase]}.`);
      return;
    }
    if (!res.saved) return say('Terminstatus nicht gespeichert. Bitte erneut versuchen.', undefined, 'error');
    say(text, () => { void setPhase(id, undoTo, res.version, res.scope).then(result => {
      if (!result.saved) say(result.conflict ? 'Inzwischen auf einem anderen Gerät geändert. Bitte neu laden.' : 'Rückgängig nicht gespeichert. Bitte erneut versuchen.', undefined, 'error');
      else say('Terminstatus zurückgesetzt.');
    }); });
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return inputRef.current?.focus();
    if (pending.has('tomorrow')) return;
    mark('tomorrow', true);
    const ok = await actions.addForTomorrow(v);
    mark('tomorrow', false);
    if (!ok) return say('Konnte nicht gespeichert werden. Bitte noch einmal.', undefined, 'error');
    setDraft('');
    say('Für morgen notiert.');
  };

  const ev = day.running ?? day.next;
  const isToday = ev ? ev.date === localISO(now, timeZone) : false;
  const t = new Date(`${localISO(now, timeZone)}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1);
  const tomorrowLabel = t.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <section className="dy" data-compact={compact ? 'true' : 'false'} aria-label="Dein Tag" data-testid="day-panel">
      {sync === 'local' ? <p role="alert">Terminstatus gerade nicht abgeglichen. Bitte erneut laden.</p> : null}
      <div className="dy-grid">
        {day.stale ? (
          <div className="dy-card dy-next" data-testid="day-stale">
            <p className="dy-eyebrow">Heute · {day.stale.time} · offen</p>
            <p className="dy-title">{personOf(day.stale.title)} {day.stale.duration ? <small>{day.stale.duration} Min</small> : null}</p>
            <p className="dy-meta">{serviceOf(day.stale.title) || 'Termin'} · noch nicht abgeschlossen</p>
            <button type="button" className="dy-btn" data-testid="day-finish-stale" disabled={Boolean(phasePending[day.stale.id])} onClick={() => { const s = day.stale!; void change(s.id, s.title, 'erledigt', `Termin mit ${personOf(s.title)} abgeschlossen.`, 'geplant'); }}>Termin abschließen</button>
          </div>
        ) : (
        <div className={`dy-card dy-next${day.running ? ' dy-next--live' : ''}`} data-testid="day-next">
          <p className="dy-eyebrow">
            {day.running ? `Jetzt · seit ${sinceLabel(since[day.running.id]) ?? day.running.time ?? ''}` : ev ? `Als Nächstes${isToday && day.minutesToNext !== null ? ` · ${inMinutes(day.minutesToNext)}` : ev.date !== localISO(now, timeZone) ? ` · am ${shortDate(ev.date)}` : ''}` : 'Als Nächstes'}
          </p>
          {ev ? (
            <>
              <p className="dy-title">{ev.time && !day.running ? `${ev.time} ` : ''}{personOf(ev.title)} {day.running ? <small>läuft</small> : ev.duration ? <small>{ev.duration} Min</small> : null}</p>
              <p className="dy-meta">{serviceOf(ev.title) || 'Termin'}</p>
              {day.running ? (
                <button type="button" className="dy-btn" data-testid="day-finish" disabled={Boolean(phasePending[day.running.id])} onClick={() => { const r = day.running!; void change(r.id, r.title, 'erledigt', `Termin mit ${personOf(r.title)} abgeschlossen.`, 'laeuft'); }}>Termin abschließen</button>
              ) : isToday ? (
                <button type="button" className="dy-btn" data-testid="day-arrived" disabled={Boolean(phasePending[ev.id])} onClick={() => { void change(ev.id, ev.title, 'laeuft', `${personOf(ev.title)} ist da. Termin läuft.`, 'geplant'); }}>{personOf(ev.title)} ist da</button>
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
                  <button type="button" className="dy-box" aria-label={`Erledigt: ${o.task.title}`} aria-busy={pending.has(o.task.id) || undefined} disabled={pending.has(o.task.id)} data-testid={`day-tick-${o.task.id}`} onClick={() => done(o.task, true)} />
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
                  <button type="button" className="dy-box dy-box--on" aria-label={`Wieder öffnen: ${x.title}`} aria-busy={pending.has(x.id) || undefined} disabled={pending.has(x.id)} onClick={() => done(x, false)}>✓</button>
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
                <button type="submit" className="dy-btn dy-btn--ghost" disabled={pending.has('tomorrow')} aria-busy={pending.has('tomorrow') || undefined}>{pending.has('tomorrow') ? 'Speichert …' : 'Hinzufügen'}</button>
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
        <div className="dy-toast" role="status" data-tone={toast.tone} data-testid="day-toast">
          <span>{toast.text}</span>
          {toast.undo ? <button type="button" onClick={() => { toast.undo!(); setToast(null); }}>Rückgängig</button> : null}
        </div>
      ) : null}
    </section>
  );
}
