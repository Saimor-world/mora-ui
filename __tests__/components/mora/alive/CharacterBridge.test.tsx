import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCharacter } from '@/lib/mora/alive/useCharacter';
import { realtime } from '@/lib/api/realtimeClient';
const mockHandlers = new Map<string, Set<(data: unknown) => void>>();
jest.mock('@/lib/api/realtimeClient', () => ({ realtime: {
  isConnected: jest.fn(() => false),
  on: jest.fn((kind: string, fn: (data: unknown) => void) => { if (!mockHandlers.has(kind)) mockHandlers.set(kind, new Set()); mockHandlers.get(kind)!.add(fn); }),
  off: jest.fn((kind: string, fn: (data: unknown) => void) => mockHandlers.get(kind)?.delete(fn)),
} }));
function emit(kind: string, data: unknown = {}) { act(() => { mockHandlers.get(kind)?.forEach(fn => fn(data)); }); }
describe('existing realtime -> character adapter', () => {
  beforeEach(() => { jest.mocked(realtime.isConnected).mockReturnValue(false); });
  afterEach(() => { mockHandlers.clear(); jest.clearAllMocks(); jest.useRealTimers(); });
  it('keeps public character previews detached from CORE', () => {
    const { result } = renderHook(() => useCharacter(false));
    expect(result.current).toEqual({ state: 'idle', source: 'preview' });
    expect(realtime.on).not.toHaveBeenCalled();
  });
  it('clears activity when the existing transport silently disconnects during logout', () => {
    jest.useFakeTimers();
    jest.mocked(realtime.isConnected).mockReturnValue(true);
    const { result, unmount } = renderHook(() => useCharacter(true));
    emit('mora.execution.started', { journal_id: 'job' });
    expect(result.current.state).toBe('working');
    jest.mocked(realtime.isConnected).mockReturnValue(false);
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.state).toBe('offline');
    unmount();
  });
  it('reads actual envelopes, handles disconnect and removes all subscriptions', () => {
    const { result, unmount } = renderHook(() => useCharacter(true));
    expect(result.current.state).toBe('offline');
    emit('connected');
    emit('mora.execution.started', { journal_id: 'job' });
    expect(result.current).toMatchObject({ state: 'working', source: 'core' });
    emit('mora.execution.done', { journal_id: 'job' });
    expect(result.current.state).toBe('working');
    emit('mora.execution.done', { journal_id: 'job', ok: true });
    expect(result.current.state).toBe('done');
    emit('disconnected');
    expect(result.current.state).toBe('offline');
    unmount();
    expect([...mockHandlers.values()].every(set => set.size === 0)).toBe(true);
  });
});
