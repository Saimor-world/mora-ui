'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import { CheckSquare, Circle, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'backlog' | 'in_progress' | 'done';

interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    priority?: 'low' | 'medium' | 'high';
    assignee?: string;
    due_date?: string;
    folder_id?: string;
}

const STATUS_COLUMNS: { key: TaskStatus; label: string; accent: string; iconColor: string }[] = [
    { key: 'backlog',     label: 'Warteschlange', accent: 'border-white/10',         iconColor: 'text-white/40' },
    { key: 'in_progress', label: 'In Arbeit',     accent: 'border-blue-500/30',      iconColor: 'text-blue-400' },
    { key: 'done',        label: 'Erledigt',      accent: 'border-emerald-500/30',   iconColor: 'text-emerald-400' },
];

const PRIORITY_DOT: Record<string, string> = {
    high:   'bg-red-400',
    medium: 'bg-amber-400',
    low:    'bg-emerald-400/60',
};

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onMove, onDelete }: { task: Task; onMove: (id: string, status: TaskStatus) => void; onDelete: (id: string) => void }) {
    const nextStatus = (s: TaskStatus): TaskStatus => s === 'backlog' ? 'in_progress' : s === 'in_progress' ? 'done' : 'backlog';
    const prevStatus = (s: TaskStatus): TaskStatus => s === 'done' ? 'in_progress' : s === 'in_progress' ? 'backlog' : 'done';

    return (
        <div className="group rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:border-white/15 hover:bg-white/[0.06] transition-all">
            <div className="flex items-start gap-2">
                {task.priority && (
                    <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? 'bg-white/30'}`} />
                )}
                <span className={`flex-1 text-xs leading-snug ${task.status === 'done' ? 'text-white/35 line-through' : 'text-white/80'}`}>
                    {task.title}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                        onClick={() => onMove(task.id, prevStatus(task.status))}
                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors text-[10px]"
                        title="Zurück"
                    >←</button>
                    <button
                        onClick={() => onMove(task.id, nextStatus(task.status))}
                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors text-[10px]"
                        title="Weiter"
                    >→</button>
                    <button
                        onClick={() => onDelete(task.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors"
                        title="Löschen"
                    >
                        <Trash2 size={10} />
                    </button>
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

// ─── TasksApp ─────────────────────────────────────────────────────────────────

export default function TasksApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const { activeCompanyId } = useNavStore();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addingColumn, setAddingColumn] = useState<TaskStatus | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load tasks from API if endpoint exists, otherwise start empty
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        coreGet('/v3/tasks', { isOptional: true })
            .then((data) => {
                if (!cancelled && Array.isArray(data)) {
                    setTasks(data as Task[]);
                }
            })
            .catch(() => { /* endpoint not yet live, start empty */ })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [activeCompanyId]);

    const handleAddTask = useCallback(async (status: TaskStatus) => {
        if (!newTitle.trim()) return;
        setIsSubmitting(true);
        const tempId = `tmp-${Date.now()}`;
        const optimistic: Task = { id: tempId, title: newTitle.trim(), status };
        setTasks(prev => [...prev, optimistic]);
        setAddingColumn(null);
        setNewTitle('');

        try {
            const saved = await corePost('/v3/tasks', { title: newTitle.trim(), status }, { isOptional: true });
            if (saved && typeof saved === 'object' && (saved as any).id) {
                setTasks(prev => prev.map(t => t.id === tempId ? (saved as Task) : t));
            }
        } catch {
            // keep optimistic entry — API not yet live
        } finally {
            setIsSubmitting(false);
        }
    }, [newTitle]);

    const handleMoveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            await corePost(`/v3/tasks/${taskId}`, { status: newStatus }, { isOptional: true });
        } catch {
            // keep optimistic — API not yet live
        }
    }, []);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await coreGet(`/v3/tasks/${taskId}/delete`, { isOptional: true });
        } catch {
            // optimistic delete — API not yet live
        }
    }, []);

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
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
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
            {isLoading ? (
                <div className="flex h-full items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white/30" />
                </div>
            ) : (
                <div className="flex h-full gap-3 p-4 overflow-x-auto">
                    {STATUS_COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.key);
                        return (
                            <div key={col.key} className="flex flex-col min-w-[220px] flex-1">
                                {/* Column header */}
                                <div className={`flex items-center justify-between mb-3 pb-2 border-b ${col.accent}`}>
                                    <div className="flex items-center gap-2">
                                        {col.key === 'done'
                                            ? <CheckSquare size={13} className={col.iconColor} />
                                            : col.key === 'in_progress'
                                                ? <Clock size={13} className={col.iconColor} />
                                                : <Circle size={13} className={col.iconColor} />
                                        }
                                        <span className="text-xs font-medium text-white/70">{col.label}</span>
                                        <span className="text-[10px] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                                    </div>
                                    <button
                                        onClick={() => { setAddingColumn(col.key); setNewTitle(''); }}
                                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                                        title="Aufgabe hinzufuegen"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>

                                {/* New task input */}
                                {addingColumn === col.key && (
                                    <div className="mb-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-2 space-y-2">
                                        <input
                                            autoFocus
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            placeholder="Aufgabe..."
                                            className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleAddTask(col.key);
                                                if (e.key === 'Escape') { setAddingColumn(null); setNewTitle(''); }
                                            }}
                                        />
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => handleAddTask(col.key)}
                                                disabled={!newTitle.trim() || isSubmitting}
                                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] disabled:opacity-50 transition-colors hover:bg-emerald-500/30"
                                            >
                                                {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : 'Hinzufügen'}
                                            </button>
                                            <button onClick={() => { setAddingColumn(null); setNewTitle(''); }} className="px-2 py-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                                                Abbrechen
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Tasks */}
                                <div className="flex-1 space-y-2 overflow-y-auto">
                                    {colTasks.length === 0 && addingColumn !== col.key && (
                                        <div className="py-4 text-center text-[11px] text-white/20 border border-dashed border-white/[0.06] rounded-xl">
                                            Leer
                                        </div>
                                    )}
                                    {colTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
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
        </GlassPanel>
    );
}
