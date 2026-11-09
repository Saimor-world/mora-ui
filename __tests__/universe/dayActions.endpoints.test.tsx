import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const corePost = jest.fn();
jest.mock('@/lib/api/http', () => ({ corePost: (...a: unknown[]) => corePost(...a) }));
const invalidateToday = jest.fn();
jest.mock('@/lib/os/useScopedToday', () => ({ invalidateToday: () => invalidateToday() }));

import { useDayActions } from '@/lib/lea/useDayActions';

const task = { id: 't1', title: 'Roadmap Q1', status: 'backlog', due_date: '2026-11-06', folder_id: 'f-brief' } as never;

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['lea-world', 'tasks', 'comp-1'], [task]);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useDayActions('comp-1'), { wrapper });
  return { qc, result };
}

describe('Arbeitsfläche → CORE (dieselben Endpunkte wie Heute)', () => {
  beforeEach(() => { corePost.mockReset(); invalidateToday.mockReset(); });

  it('legt eine Aufgabe im Ordner mit Fälligkeit an: POST /v3/tasks', async () => {
    corePost.mockResolvedValue({ data: { id: 'task_new', title: 'Neu', status: 'backlog', due_date: '2026-11-12', folder_id: 'f-brief' } });
    const { qc, result } = setup();
    await act(async () => { expect(await result.current.addTask('Neu', 'f-brief', '2026-11-12')).toBe(true); });
    expect(corePost).toHaveBeenCalledWith('/v3/tasks', { title: 'Neu', due_date: '2026-11-12', folder_id: 'f-brief', company_id: 'comp-1' });
    expect((qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as { id: string }[]).map((t) => t.id)).toEqual(['t1', 'task_new']);
    expect(invalidateToday).toHaveBeenCalled();
  });

  it('hakt ab und nimmt zurück: POST /v3/tasks/{id} {status}', async () => {
    corePost.mockResolvedValue({ data: { ...(task as object), status: 'done' } });
    const { qc, result } = setup();
    await act(async () => { await result.current.setDone(task, true); });
    expect(corePost).toHaveBeenLastCalledWith('/v3/tasks/t1', { status: 'done' });
    expect((qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as { status: string }[])[0].status).toBe('done');
    await act(async () => { await result.current.setDone(task, false); });
    expect(corePost).toHaveBeenLastCalledWith('/v3/tasks/t1', { status: 'backlog' });
  });

  it('setzt die Fälligkeit: POST /v3/tasks/{id} {due_date}', async () => {
    corePost.mockResolvedValue({ data: { ...(task as object), due_date: '2026-11-10' } });
    const { qc, result } = setup();
    await act(async () => { await result.current.update(task, { due_date: '2026-11-10' }); });
    expect(corePost).toHaveBeenCalledWith('/v3/tasks/t1', { due_date: '2026-11-10' });
    expect((qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as { due_date: string }[])[0].due_date).toBe('2026-11-10');
  });

  it('rollt bei Fehler zurück', async () => {
    corePost.mockRejectedValue(new Error('offline'));
    const { qc, result } = setup();
    await act(async () => { expect(await result.current.setDone(task, true)).toBe(false); });
    expect((qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as { status: string }[])[0].status).toBe('backlog');
    expect(invalidateToday).not.toHaveBeenCalled();
  });
});
