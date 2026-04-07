'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, X, GripVertical } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { useTasks, type Task } from './hooks/useTasks';

type TaskStatus = 'todo' | 'doing' | 'done';

const COLUMNS: { id: TaskStatus; label: string; emptyLabel: string; headerCls: string }[] = [
  { id: 'todo',  label: 'Offen',     emptyLabel: 'Keine offenen Aufgaben', headerCls: 'text-white/40 border-white/[0.05]' },
  { id: 'doing', label: 'In Arbeit', emptyLabel: 'Nichts in Arbeit',       headerCls: 'text-blue-300/70 border-blue-500/15' },
  { id: 'done',  label: 'Erledigt',  emptyLabel: 'Noch nichts erledigt',   headerCls: 'text-emerald-300/70 border-emerald-500/15' },
];

function TaskCard({ task, onAdvance, onDelete }: { task: Task; onAdvance: () => void; onDelete: () => void }) {
  const Icon = task.status === 'done' ? CheckCircle2 : task.status === 'doing' ? Clock : Circle;
  const iconCls = task.status === 'done' ? 'text-emerald-400' : task.status === 'doing' ? 'text-blue-400' : 'text-white/25';
  return (
    <div className="group flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/10 transition-all">
      <GripVertical size={12} className="text-white/15 mt-0.5 shrink-0" />
      <button onClick={onAdvance} className="mt-0.5 shrink-0 hover:scale-110 transition-transform">
        <Icon size={13} className={iconCls} />
      </button>
      <span className={`flex-1 text-xs leading-relaxed ${task.status === 'done' ? 'line-through text-white/25' : 'text-white/75'}`}>
        {task.title}
      </span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all shrink-0">
        <X size={11} />
      </button>
    </div>
  );
}

function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const t = value.trim();
    if (t) { onAdd(t); setValue(''); }
  };
  return (
    <div className="flex gap-1.5 mt-2">
      <input value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder="Aufgabe hinzufügen…"
        className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
      <button onClick={submit} disabled={!value.trim()}
        className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-30">
        <Plus size={12} />
      </button>
    </div>
  );
}

export default function TasksApp({ paneId }: AppProps) {
  const { tasks, addTask, advanceTask, deleteTask } = useTasks();
  const openCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Aufgaben-Board</span>
          <span className="text-[10px] text-white/20">
            {openCount > 0 ? `${openCount} offen` : 'Alles erledigt'}{doneCount > 0 ? ` · ${doneCount} erledigt` : ''}
          </span>
        </div>
        <AddTaskInput onAdd={addTask} />
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-3 divide-x divide-white/[0.05]">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col overflow-hidden">
              <div className={`px-3 py-2 text-[10px] uppercase tracking-wider font-medium border-b ${col.headerCls}`}>
                {col.label}
                <span className="opacity-40 ml-1.5">{colTasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onAdvance={() => advanceTask(task.id)}
                    onDelete={() => deleteTask(task.id)} />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-white/12 text-[10px]">{col.emptyLabel}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
