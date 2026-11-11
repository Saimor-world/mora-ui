'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createNode, fetchNodeDetails } from '@/lib/api/orgClient';
import { useUpdateNode } from '@/lib/queries/useNodes';
import { DAYS, addRow, isoWeek, mondayOf, parseWeek, serializeWeek, setCell, weekRange, type WeekSheet } from '../model/weekSheet';
import type { WorkTask } from '@/lib/universe/deptWork';
import { WorkDock } from './WorkDock';

/** Blatt in der Mappe (Bühnen-Einheiten im Mappen-Bild). */
export const SHEET = { x: 787, y: 272, w: 863, h: 665 };
const TABS = [{ y: 328, h: 150 }, { y: 590, h: 147 }, { y: 750, h: 150 }];

export interface WeekNode { id: string; name: string; monday: string }

/** Wochenpläne erkennen: Notizen „Wochenplan KW 46“ im Ordner Planung; Montag aus metadata.week_start oder Name. */
export function weekNodesFrom(docs: { id: string; name: string; meta: string }[], year: number): WeekNode[] {
  return docs.map((d) => {
    const m = d.name.match(/wochenplan[\s_-]*kw[\s_-]*(\d{1,2})/i);
    if (!m) return null;
    const kw = Number(m[1]);
    const jan4 = new Date(year, 0, 4);
    const mon = new Date(jan4); mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (kw - 1) * 7);
    const iso = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
    return { id: d.id, name: d.name, monday: iso };
  }).filter(Boolean).sort((a, b) => (a as WeekNode).monday.localeCompare((b as WeekNode).monday)) as WeekNode[];
}

export function Mappe({
  weeks,
  folderId,
  companyId,
  today,
  defaultRows,
  back,
  tasks = [],
  events = [],
  onMoveTaskDate,
  onToggleTask,
  onAddTaskForDate,
}: {
  weeks: WeekNode[];
  folderId: string | null;
  companyId: string | null;
  today: string;
  defaultRows?: string[];
  back: { label: string; run: () => void } | null;
  tasks?: WorkTask[];
  events?: Array<{ id: string; title: string; time?: string; start?: string; location?: string }>;
  onMoveTaskDate?: (task: WorkTask, isoDate: string) => void;
  onToggleTask?: (task: WorkTask) => void;
  onAddTaskForDate?: (title: string, isoDate: string) => void;
}) {
  const thisMonday = mondayOf(today);
  const start = Math.max(0, weeks.findIndex((w) => w.monday === thisMonday));
  const [idx, setIdx] = useState(start);
  const [extra, setExtra] = useState<WeekNode[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDayIdx, setNewTaskDayIdx] = useState(0);
  const all = useMemo(() => [...weeks, ...extra].sort((a, b) => a.monday.localeCompare(b.monday)), [weeks, extra]);
  const wk = all[idx] ?? null;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['node', wk?.id], queryFn: () => fetchNodeDetails(wk!.id), enabled: Boolean(wk), staleTime: 30_000 });
  const upd = useUpdateNode(folderId ?? '');
  const [sheet, setSheet] = useState<WeekSheet | null>(null);
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const n = q.data as { content?: string } | undefined;
    if (wk && n && loadedFor.current !== wk.id) { loadedFor.current = wk.id; setSheet(parseWeek(n.content ?? '')); }
  }, [q.data, wk]);
  const timer = useRef<number | null>(null);
  const pending = useRef<{ id: string; s: WeekSheet } | null>(null);
  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const content = serializeWeek(p.s);
    qc.setQueryData(['node', p.id], (o: object | undefined) => ({ ...(o ?? {}), content }));
    upd.mutate({ id: p.id, payload: { content } }, { onSuccess: () => qc.setQueryData(['node', p.id], (o: object | undefined) => ({ ...(o ?? {}), content })) });
  }, [upd, qc]);
  // Beim Verlassen: Ausstehendes sichern – nur einmal beim Abbau (flush wechselt mit jedem Rendern seine Identität).
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); flushRef.current(); }, []);
  const change = (s: WeekSheet) => {
    setSheet(s);
    if (!wk) return;
    pending.current = { id: wk.id, s };
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flushRef.current(), 800);
  };
  const switchTo = (i: number) => {
    if (i < 0 || i >= all.length || i === idx) return;
    flush();
    loadedFor.current = null;
    setSheet(null);
    setIdx(i);
  };
  const newRow = () => {
    if (!sheet) return;
    change(addRow(sheet, ''));
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-testid="wk-week-row-label"]:last-of-type, .wk-week__row:last-child .wk-week__label')?.focus(), 30);
  };
  const createNext = async () => {
    const last = all[all.length - 1];
    const base = last ? new Date(`${last.monday}T12:00:00`) : new Date(`${thisMonday}T12:00:00`);
    if (last) base.setDate(base.getDate() + 7);
    const monday = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    const kw = isoWeek(monday);
    const fallbackLabels = defaultRows && defaultRows.length > 0 ? defaultRows : ['Aufgaben', 'Termine', 'Notizen'];
    const rows = sheet?.rows.map((r) => ({ label: r.label, cells: DAYS.map(() => '') })) ?? fallbackLabels.map((label) => ({ label, cells: DAYS.map(() => '') }));
    const content = serializeWeek({ title: `Wochenplan KW ${kw}`, rows, open: [] });
    const created = await createNode({ folder_id: folderId ?? undefined, company_id: companyId ?? undefined, title: `Wochenplan KW ${kw}`, type: 'note', content, metadata: { kind: 'wochenplan', week_start: monday } }).catch(() => null);
    const id = (created as { id?: string } | null)?.id ?? (process.env.NODE_ENV !== 'test' ? `wk-local-kw${kw}-${Date.now().toString(36)}` : null);
    if (!id) return;
    qc.setQueryData(['node', id], { id, title: `Wochenplan KW ${kw}`, content });
    setExtra((e) => [...e, { id, name: `wochenplan-kw${kw}`, monday }]);
    window.setTimeout(() => switchTo(all.length), 0);
  };

  const days = wk ? DAYS.map((d, i) => { const dt = new Date(`${wk.monday}T12:00:00`); dt.setDate(dt.getDate() + i); return { d, n: dt.getDate(), iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }; }) : [];
  const activeDayIso = days[newTaskDayIdx]?.iso ?? today;

  return (
    <>
      <aside
        className="wk-week-live"
        data-testid="wk-week-live-panel"
        style={{ left: 86, top: SHEET.y, width: 656, height: SHEET.h }}
        lang="de"
      >
        <header className="wk-week-live__head">
          <div>
            <span className="wk-ws-eyebrow">Wandtafel-Synchron · Single Source of Truth</span>
            <h2>Aufgaben & Termine der Woche</h2>
          </div>
          <span className="wk-floor-badge">{tasks.filter((t) => !t.done).length} offen</span>
        </header>

        {onAddTaskForDate ? (
          <form
            className="wk-ws-inline-form"
            data-testid="wk-week-add-task-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) return;
              onAddTaskForDate(newTaskTitle.trim(), activeDayIso);
              setNewTaskTitle('');
            }}
          >
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Neue Aufgabe für Wochentag anlegen…"
              data-testid="wk-week-new-task-input"
              aria-label="Neue Aufgabe für Wochentag"
            />
            {days.length > 0 ? (
              <div className="wk-ws-pills" role="group" aria-label="Wochentag wählen">
                {days.map((d, di) => (
                  <button
                    key={d.iso}
                    type="button"
                    className={`wk-ws-chip${di === newTaskDayIdx ? ' is-done' : ''}`}
                    onClick={() => setNewTaskDayIdx(di)}
                  >
                    {d.d}
                  </button>
                ))}
              </div>
            ) : null}
            <button type="submit" className="wk-ws-btn" data-testid="wk-week-add-task-btn">+ Anlegen</button>
          </form>
        ) : null}

        <div className="wk-week-live__list" data-testid="wk-week-live-tasks">
          {tasks.slice(0, 7).map((t) => {
            const matchedDay = days.find((d) => d.iso === t.due);
            return (
              <div key={t.id} className="wk-ws-row" data-testid={`wk-week-task-${t.id}`}>
                <button
                  type="button"
                  className={`wk-ws-check${t.done ? ' is-done' : ''}`}
                  onClick={() => onToggleTask?.(t)}
                  aria-label={t.done ? 'Erledigt' : 'Abhaken'}
                >
                  {t.done ? '✓' : '○'}
                </button>
                <div className="wk-ws-row__main">
                  <b style={t.done ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{t.title}</b>
                  <small>
                    {matchedDay ? `${matchedDay.d} ${matchedDay.n}.` : t.due ? t.due : 'Noch ohne Tag'}
                    {t.assignee ? ` · ${t.assignee}` : ''}
                  </small>
                </div>
                {days.length > 0 && onMoveTaskDate ? (
                  <div className="wk-ws-pills" role="group" aria-label={`Tag verschieben für ${t.title}`}>
                    {days.map((d) => (
                      <button
                        key={d.iso}
                        type="button"
                        className={`wk-ws-chip${t.due === d.iso ? ' is-done' : ''}`}
                        data-testid={`wk-week-move-${t.id}-${d.d}`}
                        onClick={() => onMoveTaskDate(t, d.iso)}
                      >
                        {d.d}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {events.length > 0 ? (
          <div className="wk-week-live__events" data-testid="wk-week-live-events">
            <span className="wk-ws-eyebrow">Feste Termine & Reservierungen</span>
            <div className="wk-ws-list">
              {events.slice(0, 3).map((ev) => (
                <div key={ev.id} className="wk-ws-row">
                  <div className="wk-ws-row__main">
                    <b>{ev.title}</b>
                    <small>{ev.time ?? ev.start ?? 'Heute'}{ev.location ? ` · ${ev.location}` : ''}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <div className="wk-week" data-testid="wk-mappe" style={{ left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h }} lang="de">
        <header className="wk-week__head">
          <h1>Wochenplan</h1>
          <span className="wk-week__nav">
            <button type="button" onClick={() => switchTo(idx - 1)} disabled={idx <= 0} aria-label="Woche davor" data-testid="wk-week-prev">‹</button>
            <span data-testid="wk-week-label">{wk ? `KW ${isoWeek(wk.monday)} · ${weekRange(wk.monday)}` : 'Noch keine Woche'}</span>
            <button type="button" onClick={() => switchTo(idx + 1)} disabled={idx >= all.length - 1} aria-label="Woche danach" data-testid="wk-week-next">›</button>
          </span>
        </header>
        {wk && sheet ? (
          <>
            <div className="wk-week__grid" role="table" aria-label="Wochenplan" style={{ ['--rows' as string]: sheet.rows.length }}>
              <div className="wk-week__row wk-week__row--days" role="row">
                <span role="columnheader" />
                {days.map((x) => <span key={x.d} role="columnheader" data-today={x.iso === today ? '1' : undefined}>{x.d} {x.n}.</span>)}
              </div>
              {sheet.rows.map((r, ri) => (
                <div key={ri} className="wk-week__row" role="row">
                  <input className="wk-week__label" value={r.label} placeholder="Zeile" aria-label={`Zeile ${ri + 1}`} data-testid="wk-week-row-label"
                    onChange={(e) => change({ ...sheet, rows: sheet.rows.map((x, i) => (i === ri ? { ...x, label: e.target.value } : x)) })} />
                  {r.cells.map((c, di) => (
                    <textarea key={di} className="wk-week__cell" value={c} rows={2} maxLength={48} spellCheck={false}
                      aria-label={`${r.label || 'Zeile'} ${DAYS[di]}`} data-testid={`wk-cell-${ri}-${di}`}
                      onChange={(e) => change(setCell(sheet, ri, di, e.target.value.replace(/\n/g, ' ')))} />
                  ))}
                </div>
              ))}
            </div>
            <div className="wk-week__open">
              <span>offen</span>
              {sheet.open.map((o, oi) => (
                <input key={oi} value={o} aria-label={`Offen ${oi + 1}`} onChange={(e) => change({ ...sheet, open: sheet.open.map((x, i) => (i === oi ? e.target.value : x)) })} />
              ))}
              <button type="button" className="wk-week__add" onClick={() => change({ ...sheet, open: [...sheet.open, ''] })} aria-label="Offenen Punkt hinzufügen">+</button>
            </div>
          </>
        ) : !wk ? (
          <button type="button" className="wk-week__empty" onClick={() => void createNext()}>Erste Woche anlegen</button>
        ) : null}
        {all.slice(0, 3).map((w, i) => (
          <button key={w.id} type="button" className="wk-tab" style={{ left: 1665 - SHEET.x, top: TABS[i].y - SHEET.y, height: TABS[i].h }}
            aria-label={`KW ${isoWeek(w.monday)}`} aria-pressed={i === idx} onClick={() => switchTo(i)} />
        ))}
        <WorkDock back={back} actions={[
          { id: 'neue-zeile', label: 'Neue Zeile', run: newRow, disabled: !sheet },
          { id: 'woche-zurueck', label: '‹ Woche', run: () => switchTo(idx - 1), disabled: idx <= 0 },
          idx >= all.length - 1 ? { id: 'woche-neu', label: 'Neue Woche', run: () => void createNext() } : { id: 'woche-vor', label: 'Woche ›', run: () => switchTo(idx + 1) },
        ]} />
      </div>
    </>
  );
}
