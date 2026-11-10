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

  it('behält department_id beim Anlegen in einer Abteilung ohne Ordner: POST /v3/tasks', async () => {
    corePost.mockResolvedValue({ data: { id: 'task_dept', title: 'Abteilungsaufgabe', status: 'backlog' } });
    const { qc, result } = setup();
    await act(async () => { expect(await result.current.addTask('Abteilungsaufgabe', null, null, 'dept-fin')).toBe(true); });
    expect(corePost).toHaveBeenCalledWith('/v3/tasks', { title: 'Abteilungsaufgabe', due_date: undefined, folder_id: undefined, company_id: 'comp-1', department_id: 'dept-fin' });
    const stored = (qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as Array<{ id: string; department_id?: string }>);
    expect(stored.find((t) => t.id === 'task_dept')?.department_id).toBe('dept-fin');
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

  it('stellt in_progress wieder her statt immer backlog', async () => {
    const progress = { id: 't2', title: 'In Arbeit', status: 'in_progress', due_date: null, folder_id: 'f-brief' } as never;
    corePost.mockResolvedValue({ data: { ...(progress as object), status: 'done' } });
    const qc = new (require('@tanstack/react-query').QueryClient)({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['lea-world', 'tasks', 'comp-1'], [progress]);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDayActions('comp-1'), { wrapper });
    await act(async () => { await result.current.setDone(progress, true); });
    expect(corePost).toHaveBeenLastCalledWith('/v3/tasks/t2', { status: 'done' });
    corePost.mockResolvedValue({ data: { ...(progress as object), status: 'in_progress' } });
    await act(async () => { await result.current.setDone({ ...(progress as object), status: 'done' } as never, false); });
    expect(corePost).toHaveBeenLastCalledWith('/v3/tasks/t2', { status: 'in_progress' });
    expect((qc.getQueryData(['lea-world', 'tasks', 'comp-1']) as { status: string }[])[0].status).toBe('in_progress');
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
