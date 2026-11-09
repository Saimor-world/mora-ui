'use client';
import './workbench.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FileText, StickyNote } from 'lucide-react';
import { GlassOrb, glassVariantFor } from '@/components/world/GlassOrb';
import { planetColor } from '@/features/home/cockpit/Scene';
import type { DemoMoon, DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { fetchNodeDetails } from '@/lib/api/orgClient';
import { useUpdateNode } from '@/lib/queries/useNodes';
import { useDayActions } from '@/lib/lea/useDayActions';
import { shortDate } from '@/lib/lea/world';
import type { DeptWork, MoonWork, WorkTask } from '@/lib/universe/deptWork';

const ORB = 260;
const MOON = 104;
const clean = (s: string) => stripFiktiv(s) || s;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const kindLabel = (meta: string) => (/note/i.test(meta) ? 'Notiz' : /document|file|doc/i.test(meta) ? 'Dokument' : clean(meta));
const dueLabel = (t: WorkTask) => (!t.due ? '' : t.dueToday ? 'heute' : t.overdue ? `seit ${shortDate(t.due)}` : shortDate(t.due));

/** Wohin ein Objekt fliegt: Mittelpunkt des angeklickten Elements im Fenster. */
export type Origin = { x: number; y: number; r: number };
export const originOf = (el: Element | null | undefined): Origin | null => {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: Math.max(b.width, b.height) };
};

/** Monde links und rechts des Planeten, nie über oder unter ihm (dort stehen Name und See). */
function moonSlots(n: number) {
  const left = Math.ceil(n / 2), right = n - left;
  const spread = (k: number, count: number, a0: number, a1: number) => (count === 1 ? (a0 + a1) / 2 : a0 + (k * (a1 - a0)) / (count - 1));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const isLeft = i % 2 === 0, k = Math.floor(i / 2);
    const deg = isLeft ? spread(k, left, 216, 146) : spread(k, right, -34, 34);
    const a = (deg * Math.PI) / 180;
    out.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return out;
}

/** Leuchten auf einem Bogen um einen Mittelpunkt (Grad, 0 = rechts, im Uhrzeigersinn). */
function arc(count: number, from: number, to: number, r: number) {
  return Array.from({ length: count }, (_, k) => {
    const deg = count === 1 ? (from + to) / 2 : from + (k * (to - from)) / (count - 1);
    const a = (deg * Math.PI) / 180;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

/**
 * Die Abteilung als Arbeitsplatz: der Planet in der Mitte, seine echten Ordner als Monde,
 * Dokumente als helle Punkte auf dem Mond, offene Aufgaben als warme Lichter, die ihn umkreisen.
 */
export function StationPlanet({
  planet, work, space, colorIndex, activeMoon, leaving, watch, onMoon, onTask, onOpenDept,
}: {
  planet: DemoPlanet;
  work: DeptWork;
  space?: string | null;
  colorIndex?: number;
  activeMoon: string | null;
  leaving?: boolean;
  watch?: Set<string>;
  onMoon: (id: string, origin: Origin | null) => void;
  onTask: (id: string, origin: Origin | null) => void;
  onOpenDept?: () => void;
}) {
  const title = clean(planet.title);
  const variant = glassVariantFor(title);
  const slots = useMemo(() => moonSlots(planet.moons.length), [planet.moons.length]);
  const loose = arc(Math.min(work.loose.length, 9), 238, 302, ORB / 2 + 30);
  return (
    <div className={`ck-open ck-open--orbit ws-station${leaving ? ' is-leaving' : ''}`} data-testid={`planet-${planet.id}`} style={colorIndex !== undefined ? planetColor(colorIndex) : undefined}>
      <i className="ws-path" aria-hidden />
      <div className="ck-open__core" aria-hidden>
        <GlassOrb size={ORB} variant={variant} className="ck-opal ck-opal--true">
          <span className="ck-opal__milk" aria-hidden />
          <span className="ck-opal__iris" aria-hidden />
          <span className="ck-opal__spec" aria-hidden />
        </GlassOrb>
      </div>
      {work.loose.slice(0, 9).map((t, k) => (
        <button key={t.id} type="button" className="ws-light ws-light--planet" data-overdue={t.overdue ? '1' : undefined} data-testid={`task-light-${t.id}`}
          style={{ left: `calc(50% + ${loose[k].x}px)`, top: `calc(30% + ${loose[k].y}px)`, ['--d' as string]: `${k * 0.7}s` }}
          title={t.title} aria-label={t.title} onClick={(e) => onTask(t.id, originOf(e.currentTarget))}><i /></button>
      ))}
      <div className="ck-moons ws-moons">
        {planet.moons.map((m, i) => {
          const w = work.moons.get(m.id);
          const s = slots[i];
          const disabled = Boolean(m.loadError || m.disabled);
          const docs = w?.docs ?? [];
          const open = w?.open ?? [];
          const docPts = arc(Math.min(docs.length, 7), 238, 302, MOON / 2 + 12);
          const lights = arc(Math.min(open.length, 7), s.x < 0 ? 212 : -32, s.x < 0 ? 140 : 40, MOON / 2 + 24);
          return (
            <div key={m.id} className="ws-moon" style={{ left: `calc(50% + ${(s.x * 31).toFixed(2)}%)`, top: `calc(30% + ${Math.round(s.y * 175)}px)`, ['--i' as string]: i }} data-active={activeMoon === m.id ? '1' : undefined}>
              <button type="button" className="ck-moon ws-moon__btn" aria-pressed={activeMoon === m.id} disabled={disabled} data-testid={`moon-${m.id}`}
                data-watch={watch?.has(m.id) ? 'true' : undefined} title={disabled ? (m.hint || 'Ordner gerade nicht ladbar') : undefined}
                onClick={disabled ? undefined : (e) => onMoon(m.id, originOf(e.currentTarget.querySelector('.glass-orb')))}>
                <span className="ck-moon__body ws-moon__body">
                  <GlassOrb size={MOON} variant={variant} className="ck-opal ck-opal--true" />
                  {docs.slice(0, 7).map((f, k) => <i key={f.id} className="ck-moon__doc ws-doc" style={{ ['--bx' as string]: `${docPts[k].x}px`, ['--by' as string]: `${docPts[k].y}px` }} aria-hidden />)}
                  {watch?.has(m.id) ? <span className="ck-planet__ring" data-testid={`moon-ring-${m.id}`} aria-hidden /> : null}
                  {w?.overdue ? <span className="ck-planet__count" data-testid={`moon-count-${m.id}`} aria-label={`${w.overdue} überfällig`}>{w.overdue}</span> : null}
                </span>
                <b>{clean(m.title)}</b>
                <small>{disabled ? (m.hint || 'Ordner gerade nicht ladbar') : [plural(docs.length, 'Dokument', 'Dokumente'), open.length ? `${open.length} offen` : ''].filter(Boolean).join(' · ')}</small>
              </button>
              {open.slice(0, 7).map((t, k) => (
                <button key={t.id} type="button" className="ws-light" data-overdue={t.overdue ? '1' : undefined} data-testid={`task-light-${t.id}`}
                  style={{ left: `${lights[k].x}px`, top: `${lights[k].y}px`, ['--d' as string]: `${(i * 3 + k) * 0.6}s` }}
                  title={t.title} aria-label={t.title} onClick={(e) => onTask(t.id, originOf(e.currentTarget))}><i /></button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}><div className="ck-horizon__img" /></div>
      <h2 className="ck-horizon__title ws-title" style={onOpenDept ? { cursor: 'pointer' } : undefined} onClick={onOpenDept}>
        {title}
        {space ? <small>{clean(space)}</small> : null}
        {work.open ? <span className="ws-title__n">{work.open} offen{work.overdue ? <em> · {work.overdue} überfällig</em> : null}</span> : null}
      </h2>
    </div>
  );
}

type View = { kind: 'moon'; task?: string } | { kind: 'doc'; id: string } | { kind: 'task'; id: string };

/**
 * Nahansicht: das angeklickte Objekt kommt nach vorn und wird zur lesbaren Arbeitsfläche – im selben Raum,
 * der Himmel dahinter wird nur leiser. Keine Box über der Szene, kein Weiß.
 */
export function WorkSurface({
  planet, moon, work, task, origin, companyId, owner, colorIndex, onClose,
}: {
  planet: DemoPlanet;
  moon: DemoMoon | null;
  work: DeptWork;
  /** Direkt eine Aufgabe (Licht angeklickt). */
  task?: WorkTask | null;
  origin: Origin | null;
  companyId: string | null;
  owner: string;
  colorIndex?: number;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>(task ? { kind: 'task', id: task.id } : { kind: 'moon' });
  const [phase, setPhase] = useState<'from' | 'in' | 'out'>('from');
  const ref = useRef<HTMLElement>(null);
  const flushDoc = useRef<(() => void) | null>(null);
  const [vars, setVars] = useState<React.CSSProperties>({});

  // Anflug vom Objekt: Startpunkt = Ort des Mondes/Lichts relativ zur Mitte der Fläche.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const o = origin ?? { x: b.left + b.width / 2, y: b.top + b.height / 2, r: 80 };
    const bridge = document.querySelector('.bridge')?.getBoundingClientRect().top;
    setVars({
      ['--fx' as string]: `${Math.round(o.x - (b.left + b.width / 2))}px`,
      ['--fy' as string]: `${Math.round(o.y - (b.top + b.height / 2))}px`,
      ['--fk' as string]: Math.max(0.06, Math.min(0.4, o.r / Math.max(1, el.offsetWidth))).toFixed(3),
      ...(bridge && bridge > 300 ? { ['--ws-bottom' as string]: `${Math.round(window.innerHeight - bridge + 52)}px` } : {}),
    });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (phase === 'in') ref.current?.focus({ preventScroll: true }); }, [phase]);

  const close = useCallback(() => {
    flushDoc.current?.();
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    setPhase('out');
    window.setTimeout(onClose, 380);
  }, [onClose]);
  const back = useCallback(() => {
    if (view.kind === 'doc') { flushDoc.current?.(); setView({ kind: 'moon' }); return; }
    if (view.kind === 'moon' && view.task) { setView({ kind: 'moon' }); return; }
    close();
  }, [view, close]);

  // Esc: eine Ebene zurück. Capture, damit das Universe nicht gleichzeitig hinausfliegt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'INPUT' && (t as HTMLInputElement).value && t.dataset.clearOnEsc) { (t as HTMLInputElement).value = ''; e.preventDefault(); return; }
      e.preventDefault();
      back();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [back]);

  const mw: MoonWork | undefined = moon ? work.moons.get(moon.id) : undefined;
  const allTasks = useMemo(() => {
    const list: WorkTask[] = [...work.loose];
    work.moons.forEach((w) => list.push(...w.open, ...w.done));
    return list;
  }, [work]);
  const current = view.kind === 'task' ? allTasks.find((t) => t.id === view.id) ?? (task?.id === view.id ? task : null) : null;
  const folderOf = (t: WorkTask | null) => (t?.folderId ? planet.moons.find((m) => m.id === t.folderId) ?? null : null);
  const size = view.kind === 'task' ? 'task' : 'full';

  return (
    <section
      ref={ref}
      tabIndex={-1}
      className={`ws-surface ws-surface--${size}`}
      data-phase={phase}
      data-testid="work-surface"
      data-view={view.kind}
      aria-label={view.kind === 'task' ? current?.title : clean(moon?.title ?? planet.title)}
      style={{ ...vars, ...(colorIndex !== undefined ? planetColor(colorIndex) : {}) }}
    >
      {view.kind === 'moon' && moon ? (
        <MoonDesk planet={planet} moon={moon} w={mw} companyId={companyId} owner={owner} expanded={view.task ?? null}
          onBack={close} onDoc={(id) => setView({ kind: 'doc', id })} onTask={(id) => setView(view.task === id ? { kind: 'moon' } : { kind: 'moon', task: id })} />
      ) : null}
      {view.kind === 'doc' && moon ? (
        <DocDesk id={view.id} moon={moon} name={mw?.docs.find((d) => d.id === view.id)?.name ?? ''} onBack={back} flushRef={flushDoc} />
      ) : null}
      {view.kind === 'task' && current ? (
        <TaskDesk task={current} planet={planet} folder={folderOf(current)} owner={current.assignee ?? owner} companyId={companyId} onBack={back} backLabel={clean(planet.title)} />
      ) : null}
    </section>
  );
}

function Head({ onBack, backLabel, children, orb }: { onBack: () => void; backLabel: string; children: React.ReactNode; orb?: React.ReactNode }) {
  return (
    <header className="ws-head">
      <button type="button" className="ws-back" onClick={onBack} aria-label={`Zurück zu ${backLabel}`} data-testid="work-back"><ArrowLeft size={17} /></button>
      {orb}
      <div className="ws-head__t">{children}</div>
    </header>
  );
}

function MoonDesk({ planet, moon, w, companyId, owner, expanded, onBack, onDoc, onTask }: {
  planet: DemoPlanet; moon: DemoMoon; w?: MoonWork; companyId: string | null; owner: string; expanded: string | null;
  onBack: () => void; onDoc: (id: string) => void; onTask: (id: string) => void;
}) {
  const { setDone, addTask } = useDayActions(companyId);
  // Gerade abgehakte bleiben durchgestrichen stehen (zurücknehmbar), bis die Fläche schließt.
  const [recent, setRecent] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = w?.docs ?? [];
  const open = w?.open ?? [];
  const done = (w?.done ?? []).filter((t) => recent.includes(t.id));
  const toggle = async (t: WorkTask) => {
    if (!t.done) setRecent((r) => (r.includes(t.id) ? r : [...r, t.id]));
    await setDone(t.raw, !t.done);
  };
  const create = async () => {
    const v = title.trim();
    if (!v || busy) return;
    setBusy(true);
    const ok = await addTask(v, moon.id, due || null);
    setBusy(false);
    if (ok) { setTitle(''); setDue(''); }
  };
  return (
    <>
      <Head onBack={onBack} backLabel={clean(planet.title)} orb={<GlassOrb size={46} variant={glassVariantFor(clean(planet.title))} className="ck-opal ck-opal--true ws-head__orb" />}>
        <h2>{clean(moon.title)}</h2>
        <p>{clean(planet.title)}{w?.overdue ? <em> · {w.overdue} überfällig</em> : null}</p>
      </Head>
      <div className="ws-desk">
        <div className="ws-col" data-testid="work-docs">
          <h3>Dokumente <span>{docs.length}</span></h3>
          <div className="ws-list">
            {docs.map((d) => (
              <button key={d.id} type="button" className="ws-row ws-row--doc" onClick={() => onDoc(d.id)} data-testid={`work-doc-${d.id}`}>
                {/note/i.test(d.meta) ? <StickyNote size={15} aria-hidden /> : <FileText size={15} aria-hidden />}
                <b>{clean(d.name)}</b><span>{kindLabel(d.meta)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ws-col" data-testid="work-tasks">
          <h3>Aufgaben <span>{open.length}</span></h3>
          <div className="ws-list">
            {[...open, ...done].map((t) => (
              <div key={t.id} className="ws-row ws-row--task" data-done={t.done ? '1' : undefined} data-overdue={t.overdue ? '1' : undefined} data-testid={`work-task-${t.id}`}>
                <button type="button" className="ws-check" aria-pressed={t.done} aria-label={t.done ? `${t.title} wieder öffnen` : `${t.title} erledigen`} onClick={() => void toggle(t)} data-testid={`work-check-${t.id}`}>{t.done ? <Check size={13} strokeWidth={2.6} /> : null}</button>
                <button type="button" className="ws-row__t" aria-expanded={expanded === t.id} onClick={() => onTask(t.id)}>{t.title}</button>
                {t.due && !t.done ? <span className="ws-due">{dueLabel(t)}</span> : null}
                {expanded === t.id ? <div className="ws-row__more"><TaskFacts task={t} owner={t.assignee ?? owner} companyId={companyId} /></div> : null}
              </div>
            ))}
          </div>
          <form className="ws-new" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <span className="ws-check ws-check--ghost" aria-hidden />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe" aria-label="Neue Aufgabe" data-clear-on-esc="1" data-testid="work-new-title" />
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig" data-testid="work-new-due" />
          </form>
        </div>
      </div>
    </>
  );
}

function DocDesk({ id, moon, name, onBack, flushRef }: { id: string; moon: DemoMoon; name: string; onBack: () => void; flushRef: React.MutableRefObject<(() => void) | null> }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['node', id], queryFn: () => fetchNodeDetails(id), staleTime: 30_000 });
  const upd = useUpdateNode(moon.id);
  const [title, setTitle] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = useRef(false);
  const node = q.data as ({ title?: string; name?: string; content?: string; type?: string; updated_at?: string } | undefined);
  const t = title ?? (node?.title || name);
  const c = body ?? (node?.content ?? '');
  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    upd.mutate({ id, payload: { title: t, content: c } }, {
      onSuccess: () => {
        setSaved(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        qc.setQueryData(['node', id], (old: object | undefined) => ({ ...(old ?? {}), title: t, content: c }));
        qc.invalidateQueries({ queryKey: ['lea-world', 'nodes'] });
      },
    });
  }, [id, t, c, upd, qc]);
  flushRef.current = save;
  // Leise sichern, kurz nachdem du aufhörst zu schreiben.
  useEffect(() => {
    if (!dirty.current) return;
    const h = window.setTimeout(save, 900);
    return () => window.clearTimeout(h);
  }, [t, c, save]);
  useEffect(() => () => { flushRef.current = null; }, [flushRef]);
  const edited = node?.updated_at ? new Date(node.updated_at) : null;
  return (
    <>
      <Head onBack={onBack} backLabel={clean(moon.title)}>
        <input className="ws-doc__title" value={t} onChange={(e) => { dirty.current = true; setTitle(e.target.value); }} aria-label="Titel" data-testid="work-doc-title" />
        <p>{clean(moon.title)}{node?.name && node.name !== t ? ` · ${node.name}` : ''}{saved ? ` · gesichert ${saved}` : edited && !Number.isNaN(edited.getTime()) ? ` · ${edited.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}</p>
      </Head>
      <textarea className="ws-doc__body" value={c} onChange={(e) => { dirty.current = true; setBody(e.target.value); }} aria-label={t} data-testid="work-doc-body" disabled={q.isLoading} spellCheck />
    </>
  );
}

function TaskDesk({ task, planet, folder, owner, companyId, onBack, backLabel }: {
  task: WorkTask; planet: DemoPlanet; folder: DemoMoon | null; owner: string; companyId: string | null; onBack: () => void; backLabel: string;
}) {
  const { setDone, update } = useDayActions(companyId);
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.title]);
  const commitTitle = () => { const v = title.trim(); if (v && v !== task.title) void update(task.raw, { title: v }); else setTitle(task.title); };
  return (
    <>
      <Head onBack={onBack} backLabel={backLabel}>
        <p className="ws-head__ctx">{clean(planet.title)}{folder ? ` · ${clean(folder.title)}` : ''}</p>
      </Head>
      <div className="ws-task" data-done={task.done ? '1' : undefined} data-overdue={task.overdue ? '1' : undefined} data-testid="work-task-view">
        <button type="button" className="ws-check ws-check--big" aria-pressed={task.done} aria-label={task.done ? 'Wieder öffnen' : 'Erledigen'} onClick={() => void setDone(task.raw, !task.done)} data-testid="work-task-done">{task.done ? <Check size={20} strokeWidth={2.4} /> : null}</button>
        <input className="ws-task__title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} aria-label="Aufgabe" data-testid="work-task-title" />
      </div>
      <TaskFacts task={task} owner={owner} companyId={companyId} />
    </>
  );
}

function TaskFacts({ task, owner, companyId }: { task: WorkTask; owner: string; companyId: string | null }) {
  const { update } = useDayActions(companyId);
  return (
    <dl className="ws-facts" data-testid={`work-facts-${task.id}`}>
      <div><dt>Fällig</dt><dd>
        <input type="date" value={task.due ?? ''} onChange={(e) => e.target.value && void update(task.raw, { due_date: e.target.value })} aria-label="Fällig" data-testid="work-task-due" />
        {task.overdue ? <em>überfällig {dueLabel(task)}</em> : task.dueToday ? <em className="is-today">heute</em> : null}
      </dd></div>
      <div><dt>Verantwortlich</dt><dd>{owner || '–'}</dd></div>
      <div><dt>Status</dt><dd>{task.done ? 'erledigt' : task.status === 'in_progress' ? 'in Arbeit' : 'offen'}</dd></div>
    </dl>
  );
}
