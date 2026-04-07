import { useState, useCallback, useEffect } from 'react';

type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
}

const STORAGE_KEY = 'saimor_tasks';
const STATUS_CYCLE: TaskStatus[] = ['todo', 'doing', 'done'];

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => load());

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    save(updated);
  }, []);

  const addTask = useCallback((title: string) => {
    const task: Task = { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, status: 'todo', createdAt: Date.now() };
    persist([task, ...load()]);
  }, [persist]);

  const advanceTask = useCallback((id: string) => {
    const current = load();
    persist(current.map(t => {
      if (t.id !== id) return t;
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length];
      return { ...t, status: next };
    }));
  }, [persist]);

  const deleteTask = useCallback((id: string) => {
    persist(load().filter(t => t.id !== id));
  }, [persist]);

  return { tasks, addTask, advanceTask, deleteTask };
}
