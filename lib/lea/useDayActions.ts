'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { corePost } from '@/lib/api/http';
import { localISO, type WorldTask } from './world';

/**
 * Aufgaben abhaken, zurücknehmen und für morgen anlegen – über die bestehenden
 * CORE-Endpunkte POST /v3/tasks/{id} und POST /v3/tasks. Optimistisch, bei Fehler zurück.
 */
export function useDayActions(companyId: string | null) {
  const qc = useQueryClient();
  const key = ['lea-world', 'tasks', companyId];

  const patch = (fn: (list: WorldTask[]) => WorldTask[]) => {
    const prev = qc.getQueryData<WorldTask[]>(key);
    qc.setQueryData<WorldTask[]>(key, fn(prev ?? []));
    return prev;
  };

  const setDone = useCallback(async (task: WorldTask, done: boolean) => {
    const status = done ? 'done' : 'backlog';
    const prev = patch((l) => l.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, { status });
      if (!res) throw new Error('no response');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      return true;
    } catch {
      qc.setQueryData(key, prev);
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  const addForTomorrow = useCallback(async (title: string) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const res = await corePost('/v3/tasks', { title, due_date: localISO(t), company_id: companyId ?? undefined }).catch(() => null);
    const created = (res && (res.data ?? res)) as WorldTask | null;
    if (!created?.id) return false;
    patch((l) => [...l, created]);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  /** Neue Aufgabe mit Ort (Ordner = Mond). CORE nimmt folder_id beim Anlegen an. */
  const addTask = useCallback(async (title: string, folderId?: string | null, due?: string | null) => {
    const res = await corePost('/v3/tasks', { title, due_date: due || undefined, folder_id: folderId || undefined, company_id: companyId ?? undefined }).catch(() => null);
    const created = (res && (res.data ?? res)) as WorldTask | null;
    if (!created?.id) return false;
    patch((l) => [...l, created]);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  /** Bestehende Aufgabe einem Ordner zuordnen. Nur wahr, wenn CORE die folder_id wirklich zurückgibt –
   *  heute kennt TaskUpdate das Feld noch nicht, dann bleibt die Aufgabe ehrlich „ohne Ort“. */
  const assignFolder = useCallback(async (task: WorldTask, folderId: string) => {
    const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, { folder_id: folderId }).catch(() => null);
    const upd = (res && (res.data ?? res)) as WorldTask | null;
    if (!upd || upd.folder_id !== folderId) return false;
    patch((l) => l.map((t) => (t.id === task.id ? { ...t, folder_id: folderId } : t)));
    qc.invalidateQueries({ queryKey: ['tasks'] });
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  return { setDone, addForTomorrow, addTask, assignFolder };
}
