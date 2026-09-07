'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import {
    AlertTriangle,
    CheckSquare,
    Circle,
    Clock,
    Loader2,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

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
    { key: 'backlog',     label: 'Warteschlange', accent: 'border-white/10',       iconColor: 'text-white/40' },
    { key: 'in_progress', label: 'In Arbeit',     accent: 'border-blue-500/30',    iconColor: 'text-blue-400' },
    { key: 'done',        label: 'Erledigt',      accent: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
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
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
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
            setError('Aufgaben konnten nicht aus CORE gelesen werden. Der letzte sichtbare Stand bleibt erhalten.');
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
                throw new Error('CORE returned no persisted task');
            }
            setTasks((previous) => [...previous, saved as Task]);
            setAddingColumn(null);
            setNewTitle('');
            setNewDue('');
            setAvailable(true);
        } catch (requestError) {
            console.warn('[TasksApp] task creation failed', requestError);
            setError('Die Aufgabe wurde nicht gespeichert. Es wird kein lokaler Schein-Eintrag erzeugt.');
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
                throw new Error('CORE returned no persisted task');
            }
            setTasks((previous) => previous.map((task) => task.id === taskId ? saved as Task : task));
        } catch (requestError) {
            console.warn('[TasksApp] task update failed', requestError);
            setError('Status wurde nicht geändert. Der bestätigte CORE-Stand bleibt sichtbar.');
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
                throw new Error('CORE did not confirm deletion');
            }
            setTasks((previous) => previous.filter((task) => task.id !== taskId));
        } catch (requestError) {
            console.warn('[TasksApp] task delete failed', requestError);
            setError('Aufgabe wurde nicht gelöscht. Ohne CORE-Bestätigung bleibt sie sichtbar.');
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
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/28">
                        <span className={`h-1.5 w-1.5 rounded-full ${available === true ? 'bg-emerald-300/65' : 'bg-white/20'}`} />
                        {available === true ? 'CORE · tenant scope' : available === false ? 'CORE nicht verfügbar' : 'CORE wird geprüft'}
                    </div>
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
                ) : available === false && tasks.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                        <AlertTriangle size={24} className="text-amber-100/30" />
                        <p className="text-[12px] text-white/38">Aufgaben sind gerade nicht lesbar.</p>
                        <p className="max-w-[300px] text-[10px] leading-relaxed text-white/22">
                            Das OS zeigt bewusst nicht „leer“ an, solange CORE den Zustand nicht bestätigt hat.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-1 gap-3 overflow-x-auto p-4">
                        {STATUS_COLUMNS.map((column) => {
                            const columnTasks = tasks.filter((task) => task.status === column.key);
                            return (
                                <div key={column.key} className="flex min-w-[220px] flex-1 flex-col">
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
                                                placeholder="Aufgabe..."
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
                                            <div className="rounded-xl border border-dashed border-white/[0.06] py-4 text-center text-[11px] text-white/20">
                                                Leer
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
