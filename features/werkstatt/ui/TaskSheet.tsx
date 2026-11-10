'use client';
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { corePost } from '@/lib/api/http';
import { useDayActions } from '@/lib/lea/useDayActions';
import { useTeamMembers } from '@/lib/queries/useTeamMembers';
import { shortDate, localISO } from '@/lib/lea/world';
import { invalidateToday } from '@/lib/os/useScopedToday';
import type { WorkTask } from '@/lib/universe/deptWork';
import { PaperSlip } from './PaperSlip';
import { WorkDock } from './WorkDock';

/** Blatt unter der Lampe (Bühnen-Einheiten im Schreibtisch-Bild). */
export const TASK_SHEET = { x: 600, y: 262, w: 780, h: 650 };

/**
 * Zuweisen schreibt einen Namen auf das Blatt. Die Namen kommen aus /v3/team/members (useTeamMembers).
 * Gespeichert wird über POST /v3/tasks/{id} mit `assignee`. CORE-TaskUpdate kennt das Feld noch nicht überall:
 * kommt es nicht zurück, bleibt der Name nur hier vermerkt (STUB, sichtbar markiert) – nichts wird vorgetäuscht.
 */
export async function assignTask(task: WorkTask, name: string): Promise<boolean> {
  const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, { assignee: name }).catch(() => null);
  const t = (res && ((res as { data?: unknown }).data ?? res)) as { assignee?: unknown } | null;
  return Boolean(t && t.assignee === name);
}

const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return localISO(d); };

export function TaskSheet({ task, crumb, companyId, docs, onOpenDoc, onNext, back }: {
  task: WorkTask; crumb: string; companyId: string | null; docs: { id: string; name: string }[];
  onOpenDoc: (id: string) => void; onNext?: () => void; back: { label: string; run: () => void } | null;
}) {
  const qc = useQueryClient();
  const { setDone, update } = useDayActions(companyId);
  const team = useTeamMembers(true);
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.title, task.id]);
  const [slip, setSlip] = useState<null | 'who' | 'due'>(null);
  const [who, setWho] = useState<string | null>(task.assignee);
  const [stub, setStub] = useState(false);
  useEffect(() => { setWho(task.assignee); setStub(false); }, [task.id, task.assignee]);
  const people = (team.data ?? []).map((m) => m.name).filter(Boolean);
  const commitTitle = () => { const v = title.trim(); if (v && v !== task.title) void update(task.raw, { title: v }); else setTitle(task.title); };
  const pick = async (name: string) => {
    setSlip(null);
    setWho(name);
    const key = ['lea-world', 'tasks', companyId];
    qc.setQueryData<unknown[]>(key, (l) => (l ?? []).map((t) => ((t as { id: string }).id === task.id ? { ...(t as object), assignee: name } : t)));
    const ok = await assignTask(task, name);
    setStub(!ok);
    if (ok) { qc.invalidateQueries({ queryKey: ['tasks'] }); invalidateToday(); }
  };
  const status = task.done ? 'done' : task.status === 'in_progress' ? 'in_progress' : 'open';
  const due = task.due ? shortDate(task.due) : null;
  const dueOptions = [
    { label: 'heute', v: plusDays(0) }, { label: 'morgen', v: plusDays(1) }, { label: 'übermorgen', v: plusDays(2) },
    { label: `nächsten Montag`, v: nextMonday() }, { label: 'in einer Woche', v: plusDays(7) },
  ];
  return (
    <article className="wk-sheet" data-testid="wk-task-sheet" data-done={task.done ? '1' : undefined}
      style={{ left: TASK_SHEET.x, top: TASK_SHEET.y, width: TASK_SHEET.w, minHeight: TASK_SHEET.h }} lang="de">
      <p className="wk-sheet__crumb">{crumb}</p>
      <div className="wk-sheet__title">
        <button type="button" className="wk-ring" aria-pressed={task.done} aria-label={task.done ? 'Wieder öffnen' : 'Erledigt'}
          onClick={() => void setDone(task.raw, !task.done)} data-testid="wk-task-done">
          <svg viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="22" />{task.done ? <path d="M21 33 l8 8 l15 -18" /> : null}</svg>
        </button>
        <textarea value={title} rows={2} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }} aria-label="Aufgabe" data-testid="wk-task-title" />
      </div>
      <dl className="wk-sheet__facts">
        <div>
          <dt>fällig</dt>
          <dd><button type="button" className="wk-ink" onClick={() => setSlip('due')} data-testid="wk-task-due">
            {due ?? 'ohne Datum'}{task.overdue ? <i className="wk-dot" aria-label="überfällig" data-testid="wk-overdue-dot" /> : null}
          </button></dd>
        </div>
        <div>
          <dt>zuständig</dt>
          <dd><button type="button" className="wk-ink wk-hand" onClick={() => setSlip('who')} data-testid="wk-task-who">{who ?? 'niemand'}</button>
            {stub ? <small className="wk-sheet__stub" data-testid="wk-assign-stub">nur hier vermerkt</small> : null}</dd>
        </div>
        <div>
          <dt>stand</dt>
          <dd className="wk-sheet__stand">
            <button type="button" className="wk-ink" aria-pressed={status === 'open'} onClick={() => status !== 'open' && void update(task.raw, { status: 'backlog' })}>offen</button>
            <button type="button" className="wk-ink" aria-pressed={status === 'in_progress'} onClick={() => status !== 'in_progress' && void update(task.raw, { status: 'in_progress' })}>in Arbeit</button>
          </dd>
        </div>
      </dl>
      {(task.raw as { description?: string }).description ? <p className="wk-sheet__body">{(task.raw as { description?: string }).description}</p> : null}
      {docs.length ? (
        <div className="wk-sheet__links">
          <span>dazu</span>
          {docs.slice(0, 3).map((d) => <button key={d.id} type="button" className="wk-ink wk-link" onClick={() => onOpenDoc(d.id)}>{d.name}</button>)}
        </div>
      ) : null}
      {slip === 'who' ? (
        <PaperSlip x={300} y={250} w={300} label="Wer übernimmt?" onClose={() => setSlip(null)} testId="wk-who-slip">
          <ul className="wk-slip__list wk-slip__list--hand">
            {people.length ? people.map((n) => (
              <li key={n}><button type="button" onClick={() => void pick(n)} aria-pressed={n === who}>{n}</button></li>
            )) : <li><span className="wk-slip__empty">{team.isLoading ? '…' : 'Noch niemand im Team'}</span></li>}
          </ul>
        </PaperSlip>
      ) : null}
      {slip === 'due' ? (
        <PaperSlip x={40} y={250} w={300} label="Wann?" onClose={() => setSlip(null)} testId="wk-due-slip">
          <ul className="wk-slip__list">
            {dueOptions.map((o) => <li key={o.label}><button type="button" onClick={() => { setSlip(null); void update(task.raw, { due_date: o.v }); }}><span>{o.label}</span><em>{shortDate(o.v)}</em></button></li>)}
          </ul>
        </PaperSlip>
      ) : null}
      <WorkDock back={back} actions={[
        { id: 'zuweisen', label: 'Zuweisen', run: () => setSlip((s) => (s === 'who' ? null : 'who')), pressed: slip === 'who' },
        { id: 'datum', label: 'Datum', run: () => setSlip((s) => (s === 'due' ? null : 'due')), pressed: slip === 'due' },
        ...(onNext ? [{ id: 'naechste', label: 'Nächste', run: onNext }] : []),
      ]} />
    </article>
  );
}
