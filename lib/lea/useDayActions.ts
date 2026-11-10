'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { corePost, isLocalDemoFallback } from '@/lib/api/http';
import { isDemoScopeActive } from '@/lib/demo/demoSourceGuard';
import { invalidateToday } from '@/lib/os/useScopedToday';
import { localISO, type WorldTask } from './world';

/**
 * Aufgaben abhaken, zurücknehmen und für morgen anlegen – über die bestehenden
 * CORE-Endpunkte POST /v3/tasks/{id} und POST /v3/tasks. Optimistisch, bei Fehler zurück.
 * Im Demo- oder lokalen Fallback-Modus (`isLocalDemoFallback()`) bleiben Änderungen lokal im Cache bestehen.
 * Nach jeder Änderung wird auch der Heute-Schnappschuss (Dock: Heute-Zahl) neu geladen.
 */
/** Merkt den Status vor dem Abhaken, damit „wieder öffnen“ in_progress etc. zurückbringt (clientseitig). */
const priorStatus = new Map<string, string>();

function isDemoOrLocalCompany(companyId: string | null) {
  return (
    process.env.NODE_ENV !== 'test' &&
    (isDemoScopeActive() || isLocalDemoFallback() || companyId === 'company-local-demo' || Boolean(companyId?.startsWith('demo-')))
  );
}

export function useDayActions(companyId: string | null) {
  const qc = useQueryClient();
  const key = ['lea-world', 'tasks', companyId];

  const patch = (fn: (list: WorldTask[]) => WorldTask[]) => {
    const prev = qc.getQueryData<WorldTask[]>(key);
    qc.setQueryData<WorldTask[]>(key, fn(prev ?? []));
    return prev;
  };

  const setDone = useCallback(async (task: WorldTask, done: boolean) => {
    let status: string;
    if (done) {
      const cur = (task.status && !/^(done|erledigt|closed|completed)$/i.test(task.status)) ? task.status : 'backlog';
      priorStatus.set(task.id, cur);
      status = 'done';
    } else {
      status = priorStatus.get(task.id) || 'backlog';
      priorStatus.delete(task.id);
    }
    const prev = patch((l) => l.map((t) => (t.id === task.id ? { ...t, status } : t)));
    if (isDemoOrLocalCompany(companyId)) {
      invalidateToday();
      return true;
    }
    try {
      const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, { status });
      if (!res) throw new Error('no response');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      invalidateToday();
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
    const due = localISO(t);
    if (isDemoOrLocalCompany(companyId)) {
      const localCreated: WorldTask = {
        id: `task-local-${Date.now().toString(36)}`,
        title,
        status: 'backlog',
        due_date: due,
      };
      patch((l) => [...l, localCreated]);
      invalidateToday();
      return true;
    }
    const res = await corePost('/v3/tasks', { title, due_date: due, company_id: companyId ?? undefined }).catch(() => null);
    const created = (res && (res.data ?? res)) as WorldTask | null;
    if (!created?.id) return false;
    patch((l) => [...l, created]);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    invalidateToday();
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  /** Neue Aufgabe mit Bereich (Ordner = Mond) und Abteilung. CORE nimmt folder_id und department_id beim Anlegen an. */
  const addTask = useCallback(async (title: string, folderId?: string | null, due?: string | null, departmentId?: string | null, assignee?: string | null) => {
    if (isDemoOrLocalCompany(companyId)) {
      const localTask: WorldTask = {
        id: `task-local-${Date.now().toString(36)}`,
        title,
        status: 'backlog',
        due_date: due || undefined,
        ...(folderId ? { folder_id: folderId } : {}),
        ...(departmentId ? ({ department_id: departmentId } as Partial<WorldTask>) : {}),
        ...(assignee ? { assignee } : {}),
      };
      patch((l) => [localTask, ...l]);
      invalidateToday();
      return true;
    }
    const payload: Record<string, unknown> = {
      title,
      due_date: due || undefined,
      folder_id: folderId || undefined,
      company_id: companyId ?? undefined,
    };
    if (departmentId) payload.department_id = departmentId;
    const res = await corePost('/v3/tasks', payload).catch(() => null);
    const created = (res && (res.data ?? res)) as WorldTask | null;
    if (!created?.id) return false;
    const nextTask: WorldTask = {
      ...created,
      ...(folderId && !created.folder_id ? { folder_id: folderId } : {}),
      ...(departmentId && !(created as { department_id?: string | null }).department_id ? ({ department_id: departmentId } as Partial<WorldTask>) : {}),
    };
    patch((l) => [...l, nextTask]);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    invalidateToday();
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  /** Bestehende Aufgabe einem Ordner zuordnen. Nur wahr, wenn CORE die folder_id wirklich zurückgibt –
   *  heute kennt TaskUpdate das Feld noch nicht, dann bleibt die Aufgabe ehrlich „noch nicht zugeordnet“. */
  const assignFolder = useCallback(async (task: WorldTask, folderId: string) => {
    if (isDemoOrLocalCompany(companyId)) {
      patch((l) => l.map((t) => (t.id === task.id ? { ...t, folder_id: folderId } : t)));
      invalidateToday();
      return true;
    }
    const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, { folder_id: folderId }).catch(() => null);
    const upd = (res && (res.data ?? res)) as WorldTask | null;
    if (!upd || upd.folder_id !== folderId) return false;
    patch((l) => l.map((t) => (t.id === task.id ? { ...t, folder_id: folderId } : t)));
    qc.invalidateQueries({ queryKey: ['tasks'] });
    invalidateToday();
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  /** Titel oder Fälligkeit ändern – derselbe Endpunkt POST /v3/tasks/{id} (TaskUpdate: title, status, priority, due_date). */
  const update = useCallback(async (task: WorldTask, change: { title?: string; due_date?: string; status?: string }) => {
    const prev = patch((l) => l.map((t) => (t.id === task.id ? { ...t, ...change } : t)));
    if (isDemoOrLocalCompany(companyId)) {
      invalidateToday();
      return true;
    }
    try {
      const res = await corePost(`/v3/tasks/${encodeURIComponent(task.id)}`, change);
      if (!res) throw new Error('no response');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      invalidateToday();
      return true;
    } catch {
      qc.setQueryData(key, prev);
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, companyId]);

  return { setDone, addForTomorrow, addTask, assignFolder, update };
}
