'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  ListTodo,
  Loader2,
  Mail,
  MessageCircleMore,
  Plus,
  RefreshCw,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { corePost } from '@/lib/api/coreClient';
import { fetchTodaySnapshot, type TodaySnapshot, type TodayTask } from '@/lib/api/todayClient';
import type { AppProps } from '@/lib/apps/types';
import { openMoraWorkspace } from '@/lib/os/openMoraWorkspace';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';

type RelatedArea = {
  id: string;
  type: PaneType;
  title: string;
  icon: LucideIcon;
  size: { width: number; height: number };
};

const RELATED_AREAS: RelatedArea[] = [
  { id: 'mail', type: 'mail', title: 'Mail', icon: Mail, size: { width: 1040, height: 720 } },
  { id: 'calendar', type: 'calendar', title: 'Kalender', icon: CalendarDays, size: { width: 920, height: 680 } },
  { id: 'files', type: 'meine-dateien', title: 'Dateien', icon: FolderOpen, size: { width: 960, height: 700 } },
];

function taskStatusLabel(status: TodayTask['status']) {
  if (status === 'in_progress') return 'In Arbeit';
  if (status === 'done') return 'Erledigt';
  return 'Offen';
}

function availabilityLabel(snapshot: TodaySnapshot | null) {
  const status = snapshot?.tasks.status;
  if (!status) return 'Noch kein Stand';
  if (status === 'ok') return 'Aktuell';
  if (status === 'empty') return 'Keine offenen Aufgaben';
  if (status === 'stale') return 'Stand veraltet';
  if (status === 'partial') return 'Teilweise verfügbar';
  if (status === 'disconnected') return 'Nicht verbunden';
  return 'Nicht verfügbar';
}

function dueLabel(value?: string | null) {
  if (!value) return null;
  const due = new Date(`${value}T12:00:00`);
  if (Number.isNaN(due.getTime())) return value;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diff = Math.round((due.getTime() - start) / 86_400_000);
  if (diff < 0) return `Überfällig · ${due.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}`;
  if (diff === 0) return 'Heute fällig';
  if (diff === 1) return 'Morgen fällig';
  return due.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function TaskRow({ task, onOpen }: { task: TodayTask; onOpen: () => void }) {
  const due = dueLabel(task.due_date);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 rounded-[18px] border border-white/[0.055] bg-white/[0.018] px-3.5 py-3 text-left transition hover:border-white/[0.11] hover:bg-white/[0.035]"
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          task.priority === 'high'
            ? 'bg-rose-300/80'
            : task.status === 'in_progress'
              ? 'bg-cyan-200/70'
              : 'bg-white/28'
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-snug text-white/72">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] uppercase tracking-[0.14em] text-white/25">
          <span>{taskStatusLabel(task.status)}</span>
          {due && <span>{due}</span>}
        </span>
      </span>
      <ArrowRight size={12} className="mt-1 shrink-0 text-white/14 transition group-hover:translate-x-0.5 group-hover:text-white/42" />
    </button>
  );
}

export default function WorkApp({ paneId }: AppProps) {
  const pane = usePaneStore((state) => state.getPane(paneId));
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const openPane = usePaneStore((state) => state.openPane);
  const removePane = usePaneStore((state) => state.removePane);
  const minimizePane = usePaneStore((state) => state.minimizePane);
  const focusPane = usePaneStore((state) => state.focusPane);
  const updatePanePosition = usePaneStore((state) => state.updatePanePosition);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const activeCompanyId = useNavStore((state) => state.activeCompanyId);
  const user = useSessionStore((state) => state.user);
  const activePlanId = useWorkSessionStore((state) => state.activePlanId);

  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');
  const [creating, setCreating] = useState(false);

  const userId = (user as any)?.id ?? null;

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await fetchTodaySnapshot(activeCompanyId ?? null, userId);
      setSnapshot(next);
      if (!next) setError('Der aktuelle Arbeitsstand konnte gerade nicht eindeutig gelesen werden.');
    } catch (requestError) {
      console.warn('[WorkApp] Today refresh failed', requestError);
      setSnapshot(null);
      setError('Der aktuelle Arbeitsstand ist gerade nicht erreichbar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCompanyId, userId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 120_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const tasks = snapshot?.tasks.items ?? [];
  const inProgress = useMemo(() => tasks.filter((task) => task.status === 'in_progress'), [tasks]);
  const backlog = useMemo(() => tasks.filter((task) => task.status === 'backlog'), [tasks]);
  const overdueIds = useMemo(() => new Set((snapshot?.tasks.overdue ?? []).map((task) => task.id)), [snapshot]);
  const dueTodayIds = useMemo(() => new Set((snapshot?.tasks.due_today ?? []).map((task) => task.id)), [snapshot]);

  const focusTask = useMemo(() => {
    return inProgress.find((task) => overdueIds.has(task.id))
      ?? inProgress.find((task) => dueTodayIds.has(task.id))
      ?? inProgress[0]
      ?? backlog.find((task) => overdueIds.has(task.id))
      ?? backlog.find((task) => dueTodayIds.has(task.id))
      ?? backlog[0]
      ?? null;
  }, [backlog, dueTodayIds, inProgress, overdueIds]);

  if (!pane) return null;

  const open = (id: string, type: PaneType, title: string, size: { width: number; height: number }) => {
    openPane({ id: `${id}-main`, type, title, size });
  };

  const openTasks = () => open('tasks', 'tasks', 'Aufgaben', { width: 980, height: 680 });

  const openPlan = () => {
    if (activePlanId) {
      openPane({
        id: `work-session-${activePlanId}`,
        type: 'work-session',
        title: 'Arbeitsplan',
        size: { width: 920, height: 700 },
        data: { plan_id: activePlanId },
      });
      return;
    }

    openMoraWorkspace({
      source: 'work',
      label: focusTask?.title ?? 'Arbeit',
      taskId: focusTask?.id,
      taskTitle: focusTask?.title,
      companyId: activeCompanyId,
    });
  };

  const createTask = async () => {
    const title = newTask.trim();
    if (!title || creating) return;
    setCreating(true);
    setError(null);
    try {
      const saved = await corePost('/v3/tasks', { title, status: 'backlog' }, { throwAuthErrors: true });
      if (!saved || typeof saved !== 'object') throw new Error('Task persistence was not confirmed');
      setNewTask('');
      await refresh(true);
    } catch (requestError) {
      console.warn('[WorkApp] Task creation failed', requestError);
      setError('Die neue Aufgabe konnte nicht gespeichert werden.');
    } finally {
      setCreating(false);
    }
  };

  const readable = snapshot?.tasks.status === 'ok' || snapshot?.tasks.status === 'empty';
  const openCount = snapshot?.tasks.counts.open;
  const overdueCount = snapshot?.tasks.counts.overdue;

  return (
    <GlassPanel
      title="Arbeit"
      paneId={paneId}
      width={pane.size.width}
      height={pane.size.height}
      initialX={pane.position.x}
      initialY={pane.position.y}
      onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
      onResize={(width, height) => updatePaneSize(paneId, width, height)}
      onClose={() => removePane(paneId)}
      onMinimize={() => minimizePane(paneId)}
      onFocus={() => focusPane(paneId)}
      isActive={activePaneId === paneId}
      zIndex={pane.zIndex}
      showCloseButton
      showMinimizeButton
      draggable
      resizable
    >
      <div className="flex h-full min-h-0 flex-col overflow-y-auto pr-1 text-white">
        <header className="border-b border-white/[0.05] px-1 pb-5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/26">
              <span className={`h-1.5 w-1.5 rounded-full ${readable ? 'bg-emerald-300/70' : 'bg-white/22'}`} />
              {availabilityLabel(snapshot)}
            </div>
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.055] bg-white/[0.018] px-2.5 py-1.5 text-[9px] text-white/28 transition hover:text-white/58 disabled:opacity-50"
            >
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} /> Aktualisieren
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-100/36">Arbeit</div>
              <h2 className="mt-1 text-[30px] font-medium tracking-[-0.045em] text-white/90">Was jetzt zählt.</h2>
              <p className="mt-2 max-w-[620px] text-[11px] leading-relaxed text-white/35">
                Fokus, offene Aufgaben und laufende Arbeitspläne in einem gemeinsamen Arbeitsstand.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {readable && typeof openCount === 'number' && (
                <span className="rounded-full border border-white/[0.055] bg-white/[0.018] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/30">{openCount} offen</span>
              )}
              {readable && typeof overdueCount === 'number' && overdueCount > 0 && (
                <span className="rounded-full border border-rose-200/[0.10] bg-rose-300/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-rose-100/48">{overdueCount} überfällig</span>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-white/25" />
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-[18px] border border-amber-200/[0.10] bg-amber-300/[0.035] px-4 py-3 text-[10px] leading-relaxed text-amber-100/52">
                {error}
              </div>
            )}

            <section className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
              <div className="rounded-[24px] border border-white/[0.06] bg-black/[0.13] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] text-white/23">Im Fokus</div>
                    <h3 className="mt-1 text-[15px] font-medium text-white/66">Nächste sinnvolle Arbeit</h3>
                  </div>
                  <Timer size={15} className="text-cyan-100/35" />
                </div>

                {readable && focusTask ? (
                  <div className="mt-6">
                    <div className="text-[clamp(1.35rem,2.8vw,2.15rem)] font-medium leading-[1.08] tracking-[-0.045em] text-white/90">
                      {focusTask.title}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.14em] text-white/28">
                      <span>{taskStatusLabel(focusTask.status)}</span>
                      {dueLabel(focusTask.due_date) && <span>{dueLabel(focusTask.due_date)}</span>}
                      {focusTask.priority && <span>Priorität {focusTask.priority}</span>}
                    </div>
                    <div className="mt-7 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openPlan}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-3.5 py-2 text-[10px] text-emerald-100/65 transition hover:bg-emerald-300/[0.09] hover:text-emerald-50"
                      >
                        <Timer size={12} /> {activePlanId ? 'Arbeitsplan öffnen' : 'Mit MÔRA planen'}
                      </button>
                      <button
                        type="button"
                        onClick={openTasks}
                        className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3.5 py-2 text-[10px] text-white/38 transition hover:text-white/68"
                      >
                        <ListTodo size={12} /> Alle Aufgaben
                      </button>
                    </div>
                  </div>
                ) : readable ? (
                  <div className="mt-8 rounded-[18px] border border-dashed border-white/[0.07] px-4 py-6 text-center">
                    <CheckCircle2 size={18} className="mx-auto text-emerald-100/35" />
                    <div className="mt-3 text-[12px] text-white/52">Gerade verlangt keine offene Aufgabe Aufmerksamkeit.</div>
                    <div className="mt-1 text-[10px] text-white/25">Du kannst direkt eine neue Aufgabe hinzufügen.</div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-[18px] border border-dashed border-white/[0.07] px-4 py-6 text-center text-[10px] leading-relaxed text-white/30">
                    Der aktuelle Arbeitsstand ist gerade nicht sicher lesbar.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-emerald-200/[0.07] bg-[linear-gradient(145deg,rgba(16,185,129,.035),rgba(0,0,0,.10))] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200/[0.09] bg-emerald-300/[0.035] text-emerald-100/58">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-100/32">MÔRA</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/38">
                      MÔRA kennt den aktuellen Arbeitskontext und kann priorisieren, einen Plan bauen oder direkt mit dir weiterarbeiten.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openMoraWorkspace({
                    source: 'work',
                    label: focusTask?.title ?? 'Arbeit',
                    taskId: focusTask?.id,
                    taskTitle: focusTask?.title,
                    companyId: activeCompanyId,
                  })}
                  className="mt-5 flex w-full items-center justify-between rounded-[16px] border border-white/[0.06] bg-black/15 px-3.5 py-3 text-[10px] text-white/42 transition hover:border-emerald-100/12 hover:text-white/68"
                >
                  <span className="flex items-center gap-2"><MessageCircleMore size={12} /> Mit MÔRA weiterarbeiten</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-medium text-white/55">In Arbeit</h3>
                  <span className="text-[9px] text-white/20">{inProgress.length}</span>
                </div>
                <div className="space-y-2">
                  {readable && inProgress.length > 0 ? inProgress.slice(0, 4).map((task) => (
                    <TaskRow key={task.id} task={task} onOpen={openTasks} />
                  )) : (
                    <div className="rounded-[18px] border border-dashed border-white/[0.055] px-4 py-5 text-[10px] text-white/24">
                      {readable ? 'Noch nichts aktiv in Arbeit.' : 'Status derzeit nicht lesbar.'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-medium text-white/55">Als Nächstes</h3>
                  <span className="text-[9px] text-white/20">{backlog.length}</span>
                </div>
                <div className="space-y-2">
                  {readable && backlog.length > 0 ? backlog.slice(0, 4).map((task) => (
                    <TaskRow key={task.id} task={task} onOpen={openTasks} />
                  )) : (
                    <div className="rounded-[18px] border border-dashed border-white/[0.055] px-4 py-5 text-[10px] text-white/24">
                      {readable ? 'Keine weiteren Aufgaben vorgemerkt.' : 'Status derzeit nicht lesbar.'}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[22px] border border-white/[0.055] bg-white/[0.015] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Plus size={13} className="shrink-0 text-emerald-100/42" />
                  <input
                    value={newTask}
                    onChange={(event) => setNewTask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void createTask();
                    }}
                    placeholder="Neue Aufgabe hinzufügen …"
                    className="min-w-0 flex-1 bg-transparent text-[11px] text-white/70 outline-none placeholder:text-white/22"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void createTask()}
                  disabled={!newTask.trim() || creating}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200/10 bg-emerald-300/[0.05] px-3.5 py-2 text-[10px] text-emerald-100/55 transition hover:bg-emerald-300/[0.09] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Hinzufügen
                </button>
              </div>
            </section>

            <section className="mt-5 border-t border-white/[0.045] pt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-white/20">Dazugehörig</div>
                  <div className="mt-1 text-[11px] text-white/32">Mail, Termine und Dateien direkt im Arbeitskontext öffnen.</div>
                </div>
                <button
                  type="button"
                  onClick={openTasks}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.018] px-3 py-2 text-[9px] text-white/28 transition hover:text-white/58"
                >
                  <ListTodo size={11} /> Alle Aufgaben
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {RELATED_AREAS.map((area) => {
                  const Icon = area.icon;
                  return (
                    <button
                      type="button"
                      key={area.id}
                      onClick={() => open(area.id, area.type, area.title, area.size)}
                      className="group flex items-center gap-3 rounded-[18px] border border-white/[0.05] bg-black/10 px-3.5 py-3 text-left transition hover:border-white/[0.10] hover:bg-white/[0.025]"
                    >
                      <Icon size={13} className="text-white/28" />
                      <span className="min-w-0 flex-1 text-[10px] text-white/42">{area.title}</span>
                      <ArrowRight size={11} className="text-white/12 transition group-hover:translate-x-0.5 group-hover:text-white/36" />
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </GlassPanel>
  );
}
