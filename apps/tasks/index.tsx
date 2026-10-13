'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import {
    AlertTriangle,
    ArrowLeft,
    CheckSquare,
    Circle,
    Clock,
    Flag,
    Loader2,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { AppEmpty, uv2 } from '@/components/universe/app/AppStage';
import { Segmented } from '@/components/universe/app/Tiles';

type TaskStatus = 'backlog' | 'in_progress' | 'done';

type Task = {
    id: string;
    title: string;
    status: TaskStatus;
    priority?: 'low' | 'medium' | 'high';
    assignee?: string;
    due_date?: string;
    folder_id?: string;
};

const STATUS_COLUMNS: { key: TaskStatus; label: string; accent: string; iconColor: string }[] = [
    { key: 'backlog', label: 'Offen', accent: 'border-white/10', iconColor: 'text-white/40' },
    { key: 'in_progress', label: 'In Arbeit', accent: 'border-blue-500/30', iconColor: 'text-blue-400' },
    { key: 'done', label: 'Erledigt', accent: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
];

const PRIORITY_DOT: Record<string, string> = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-emerald-400/60',
};

function TaskCard({
    task,
    busy,
    onMove,
    onDelete,
}: {
    task: Task;
    busy: boolean;
    onMove: (id: string, status: TaskStatus) => void;
    onDelete: (id: string) => void;
}) {
    const nextStatus = (status: TaskStatus): TaskStatus => status === 'backlog' ? 'in_progress' : status === 'in_progress' ? 'done' : 'backlog';
    const prevStatus = (status: TaskStatus): TaskStatus => status === 'done' ? 'in_progress' : status === 'in_progress' ? 'backlog' : 'done';

    if (uv2()) {
        const today = new Date().toISOString().slice(0, 10);
        const overdue = task.status !== 'done' && !!task.due_date && task.due_date < today;
        const StatusIcon = task.status === 'done' ? CheckSquare : task.status === 'in_progress' ? Clock : Circle;
        return (
            <div className="uv2-task group" data-status={task.status} data-busy={busy ? '' : undefined} draggable={!busy}
                onDragStart={(event) => { event.dataTransfer.setData('text/x-task', task.id); event.dataTransfer.effectAllowed = 'move'; }}
                data-testid={`task-v2-${task.id}`}>
                <button type="button" className="uv2-task__state" disabled={busy} onClick={() => onMove(task.id, nextStatus(task.status))}
                    title={task.status === 'backlog' ? 'Beginnen' : task.status === 'in_progress' ? 'Erledigt' : 'Wieder öffnen'} aria-label={task.status === 'backlog' ? 'Beginnen' : task.status === 'in_progress' ? 'Erledigt' : 'Wieder öffnen'}>
                    {busy ? <Loader2 className="animate-spin" /> : <StatusIcon />}
                </button>
                <span className="uv2-task__title">{task.title}</span>
                {task.priority ? <span className="uv2-task__prio" data-p={task.priority} title={task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'} /> : null}
                {task.due_date ? <span className="uv2-task__due" data-overdue={overdue ? '' : undefined}>{new Date(task.due_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span> : null}
                <span className="uv2-task__tools">
                    <button type="button" onClick={() => onMove(task.id, prevStatus(task.status))} title="Zurück" aria-label="Zurück"><ArrowLeft /></button>
                    <button type="button" onClick={() => onDelete(task.id)} title="Löschen" aria-label="Löschen"><Trash2 /></button>
                </span>
            </div>
        );
    }

    return (
        <div className={`group rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/15 hover:bg-white/[0.06] ${busy ? 'opacity-55' : ''}`}>
            <div className="flex items-start gap-2">
                {task.priority && (
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority] ?? 'bg-white/30'}`} />
                )}
                <span className={`flex-1 text-xs leading-snug ${task.status === 'done' ? 'text-white/35 line-through' : 'text-white/80'}`}>
                    {task.title}
                </span>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {busy ? (
                        <Loader2 size={11} className="animate-spin text-white/35" />
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => onMove(task.id, prevStatus(task.status))}
                                className="rounded p-1 text-[10px] text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                                title="Zurück"
                            >←</button>
                            <button
                                type="button"
                                onClick={() => onMove(task.id, nextStatus(task.status))}
                                className="rounded p-1 text-[10px] text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                                title="Weiter"
                            >→</button>
                            <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                className="rounded p-1 text-white/20 transition-colors hover:bg-red-500/20 hover:text-red-400"
                                title="Löschen"
                            >
                                <Trash2 size={10} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            {task.due_date && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                    <Clock size={9} />
                    <span>{task.due_date}</span>
                </div>
            )}
        </div>
    );
}

export default function TasksApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
    const [addingColumn, setAddingColumn] = useState<TaskStatus | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDue, setNewDue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uvFilter, setUvFilter] = useState<'all' | 'high' | 'due'>('all');
    const [dropCol, setDropCol] = useState<TaskStatus | null>(null);

    const load = useCallback(async (quiet = false) => {
        if (quiet) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);
        try {
            const data = await coreGet('/v3/tasks', { isOptional: true, throwAuthErrors: true });
            if (!Array.isArray(data)) {
                setAvailable(false);
                return;
            }
            setTasks(data as Task[]);
            setAvailable(true);
        } catch (requestError) {
            console.warn('[TasksApp] task list failed', requestError);
            setAvailable(false);
            setError('Aufgaben konnten gerade nicht aktualisiert werden. Der letzte bestätigte Stand bleibt sichtbar.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleAddTask = useCallback(async (status: TaskStatus) => {
        const title = newTitle.trim();
        if (!title || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const saved = await corePost('/v3/tasks', {
                title,
                status,
                due_date: newDue.trim() || undefined,
            }, { throwAuthErrors: true });
            if (!saved || typeof saved !== 'object' || !(saved as Task).id) {
                throw new Error('Task persistence was not confirmed');
            }
            setTasks((previous) => [...previous, saved as Task]);
            setAddingColumn(null);
            setNewTitle('');
            setNewDue('');
            setAvailable(true);
        } catch (requestError) {
            console.warn('[TasksApp] task creation failed', requestError);
            setError('Die Aufgabe konnte nicht gespeichert werden.');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, newDue, newTitle]);

    const handleMoveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
        if (busyTaskId) return;
        setBusyTaskId(taskId);
        setError(null);
        try {
            const saved = await corePost(`/v3/tasks/${encodeURIComponent(taskId)}`, { status: newStatus }, { throwAuthErrors: true });
            if (!saved || typeof saved !== 'object' || !(saved as Task).id) {
                throw new Error('Task update was not confirmed');
            }
            setTasks((previous) => previous.map((task) => task.id === taskId ? saved as Task : task));
        } catch (requestError) {
            console.warn('[TasksApp] task update failed', requestError);
            setError('Der Status konnte nicht geändert werden.');
        } finally {
            setBusyTaskId(null);
        }
    }, [busyTaskId]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (busyTaskId) return;
        setBusyTaskId(taskId);
        setError(null);
        try {
            const result = await coreGet(`/v3/tasks/${encodeURIComponent(taskId)}/delete`, { throwAuthErrors: true });
            if (!result || typeof result !== 'object' || (result as { ok?: boolean }).ok !== true) {
                throw new Error('Task deletion was not confirmed');
            }
            setTasks((previous) => previous.filter((task) => task.id !== taskId));
        } catch (requestError) {
            console.warn('[TasksApp] task delete failed', requestError);
            setError('Die Aufgabe konnte nicht gelöscht werden.');
        } finally {
            setBusyTaskId(null);
        }
    }, [busyTaskId]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Aufgaben"
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
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full min-h-0 flex-col text-white">
                <header className="border-b border-white/[0.05] px-4 pb-3 pt-2">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => openPane({ id: 'work-main', type: 'work', title: 'Arbeit', size: { width: 1080, height: 760 } })}
                            className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/24 transition hover:text-white/52"
                        >
                            <ArrowLeft size={10} /> Arbeit
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${available === true ? 'bg-emerald-300/65' : 'bg-white/20'}`} />
                            <span className="text-[9px] uppercase tracking-[0.16em] text-white/24">
                                {available === true ? 'Aktuell' : available === false ? 'Nicht erreichbar' : 'Wird geladen'}
                            </span>
                            <button
                                type="button"
                                onClick={() => void load(true)}
                                disabled={isRefreshing}
                                className="rounded p-1.5 text-white/25 transition hover:bg-white/[0.06] hover:text-white/55 disabled:opacity-40"
                                title="Aktualisieren"
                            >
                                <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                    {!uv2() && <>
                    <h2 className="mt-3 text-[20px] font-medium tracking-[-0.03em] text-white/78">Alle Aufgaben</h2>
                    <p className="mt-1 text-[10px] leading-relaxed text-white/28">Der vollständige Aufgabenstand hinter deinem Work-Bereich.</p>
                    </>}
                </header>
                {uv2() && !isLoading && available !== false && (() => {
                    const open = tasks.filter((t) => t.status !== 'done');
                    const today = new Date().toISOString().slice(0, 10);
                    const rank = (t: Task) => (t.status === 'in_progress' ? 0 : 1) * 10 + (t.priority === 'high' ? 0 : t.priority === 'medium' ? 1 : 2);
                    const next = [...open].sort((a, b) => {
                        const ao = a.due_date && a.due_date < today ? 0 : 1; const bo = b.due_date && b.due_date < today ? 0 : 1;
                        return ao - bo || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || rank(a) - rank(b);
                    })[0];
                    if (!next) return null;
                    const overdue = next.due_date && next.due_date < today;
                    const due = next.due_date ? new Date(next.due_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : null;
                    const inWork = tasks.filter((t) => t.status === 'in_progress').length;
                    const todayKey = today;
                    return (
                        <div className="uv2-ftool" data-uv2-keep="" data-testid="tasks-v2-bar">
                            <Segmented value={uvFilter} onChange={setUvFilter} label="Filter" options={[
                                { id: 'all', label: `Alle ${open.length}`, icon: <Circle /> },
                                { id: 'high', label: `Hoch ${open.filter((t) => t.priority === 'high').length}`, icon: <Flag /> },
                                { id: 'due', label: `Fällig ${open.filter((t) => t.due_date && t.due_date <= todayKey).length}`, icon: <Clock /> },
                            ]} />
                            <span style={{ flex: 1 }} />
                            <span className="uv2-ftool__next" title={next.title}>{overdue ? <span className="uv2-dot" data-warn="" /> : null}{next.title}{due ? <i>{due}</i> : null}</span>
                            {!busyTaskId && <button type="button" className="uv2-pill" data-testid="tasks-v2-next" onClick={() => void handleMoveTask(next.id, next.status === 'backlog' ? 'in_progress' : 'done')}>
                                {next.status === 'backlog' ? <><Clock />Beginnen</> : <><CheckSquare />Erledigt</>}</button>}
                            <button type="button" className="uv2-pill uv2-pill--gold" data-testid="tasks-v2-add" onClick={() => { setAddingColumn('backlog'); setNewTitle(''); setNewDue(''); }}><Plus />Aufgabe</button>
                        </div>
                    );
                })()}

                {error && (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-amber-100/55">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white/30" />
                    </div>
                ) : available === false && tasks.length === 0 && uv2() ? (
                    <div className="flex flex-1 items-center justify-center">
                        <AppEmpty glyph={<AlertTriangle size={20} strokeWidth={1.25} />} title="Gerade keine Verbindung."
                            text="Saimôr zeigt keine leere Liste, solange der echte Stand nicht sicher gelesen werden kann."
                            action={{ label: 'Erneut laden', onClick: () => void load(true) }} />
                    </div>
                ) : available === false && tasks.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                        <AlertTriangle size={24} className="text-amber-100/30" />
                        <p className="text-[12px] text-white/38">Aufgaben sind gerade nicht verfügbar.</p>
                        <p className="max-w-[300px] text-[10px] leading-relaxed text-white/22">
                            Saimôr zeigt keinen leeren Aufgabenstand an, solange die aktuelle Liste nicht sicher gelesen werden kann.
                        </p>
                    </div>
                ) : uv2() && tasks.length === 0 && addingColumn === null ? (
                    <div className="flex flex-1 items-center justify-center">
                        <AppEmpty glyph={<CheckSquare size={22} strokeWidth={1.25} />} title="Nichts offen."
                            text="Ein klarer Kopf. Wenn etwas ansteht, beginnt es hier – MÔRA legt auch Aufgaben aus Mails und Terminen an, sobald du zustimmst."
                            action={{ label: 'Erste Aufgabe anlegen', onClick: () => { setAddingColumn('backlog'); setNewTitle(''); setNewDue(''); } }} />
                    </div>
                ) : (
                    <div className="flex flex-1 gap-3 overflow-x-auto p-4" data-uv2-board>
                        {STATUS_COLUMNS.map((column) => {
                            const todayKey = new Date().toISOString().slice(0, 10);
                            const columnTasks = tasks.filter((task) => task.status === column.key)
                                .filter((task) => !uv2() || uvFilter === 'all' || (uvFilter === 'high' ? task.priority === 'high' : !!task.due_date && task.due_date <= todayKey));
                            return (
                                <div key={column.key} className="flex min-w-[220px] flex-1 flex-col" data-uv2-taskcol={column.key} data-drop={dropCol === column.key ? '' : undefined}
                                    onDragOver={uv2() ? (event) => { if (event.dataTransfer.types.includes('text/x-task')) { event.preventDefault(); setDropCol(column.key); } } : undefined}
                                    onDragLeave={uv2() ? () => setDropCol((c) => (c === column.key ? null : c)) : undefined}
                                    onDrop={uv2() ? (event) => { event.preventDefault(); setDropCol(null); const id = event.dataTransfer.getData('text/x-task'); const t = tasks.find((x) => x.id === id); if (t && t.status !== column.key) void handleMoveTask(id, column.key); } : undefined}>
                                    <div className={`mb-3 flex items-center justify-between border-b pb-2 ${column.accent}`}>
                                        <div className="flex items-center gap-2">
                                            {column.key === 'done'
                                                ? <CheckSquare size={13} className={column.iconColor} />
                                                : column.key === 'in_progress'
                                                    ? <Clock size={13} className={column.iconColor} />
                                                    : <Circle size={13} className={column.iconColor} />
                                            }
                                            <span className="text-xs font-medium text-white/70">{column.label}</span>
                                            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/30">{columnTasks.length}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setAddingColumn(column.key); setNewTitle(''); setNewDue(''); }}
                                            className="rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                                            title="Aufgabe hinzufügen"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>

                                    {addingColumn === column.key && (
                                        <div className="mb-2 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-2">
                                            <input
                                                autoFocus
                                                value={newTitle}
                                                onChange={(event) => setNewTitle(event.target.value)}
                                                placeholder="Neue Aufgabe …"
                                                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') void handleAddTask(column.key);
                                                    if (event.key === 'Escape') { setAddingColumn(null); setNewTitle(''); setNewDue(''); }
                                                }}
                                            />
                                            <label className="flex items-center gap-1.5 text-[10px] text-white/35">
                                                <Clock size={9} />
                                                <span>Fällig</span>
                                                <input
                                                    type="date"
                                                    value={newDue}
                                                    onChange={(event) => setNewDue(event.target.value)}
                                                    className="flex-1 bg-transparent text-[11px] text-white/70 outline-none [color-scheme:dark]"
                                                />
                                            </label>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleAddTask(column.key)}
                                                    disabled={!newTitle.trim() || isSubmitting}
                                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : 'Hinzufügen'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddingColumn(null); setNewTitle(''); setNewDue(''); }}
                                                    className="px-2 py-1 text-[11px] text-white/30 transition-colors hover:text-white/60"
                                                >
                                                    Abbrechen
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2 overflow-y-auto">
                                        {columnTasks.length === 0 && addingColumn !== column.key && (
                                            <div className="rounded-xl border border-dashed border-white/[0.06] py-4 text-center text-[11px] text-white/20" data-uv2-col-empty>
                                                {uv2() ? (column.key === 'done' ? 'Noch nichts erledigt' : column.key === 'in_progress' ? 'Nichts in Arbeit' : 'Nichts offen') : 'Leer'}
                                            </div>
                                        )}
                                        {columnTasks.map((task) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                busy={busyTaskId === task.id}
                                                onMove={handleMoveTask}
                                                onDelete={handleDeleteTask}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}
