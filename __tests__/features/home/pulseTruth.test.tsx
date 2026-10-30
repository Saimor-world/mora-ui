import { renderHook, act } from '@testing-library/react';
jest.mock('@/lib/api/coreClient', () => ({ coreGet: jest.fn() }));
const { coreGet } = require('@/lib/api/coreClient');
const { useIntelligencePulse } = require('@/lib/hooks/useIntelligencePulse');
beforeEach(() => { jest.useFakeTimers(); document.cookie = 'saimor_auth=test'; coreGet.mockReset(); });
afterEach(() => { jest.useRealTimers(); document.cookie = 'saimor_auth=; Max-Age=0'; });
it('returns unknown for missing data rather than inventing a low pulse', async () => {
  coreGet.mockResolvedValue(null);
  const { result, unmount } = renderHook(() => useIntelligencePulse());
  expect(result.current.pulse).toBe('unknown');
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(result.current.pulse).toBe('unknown');
  unmount();
});
it('clears a previously healthy pulse when the next read fails', async () => {
  coreGet.mockResolvedValueOnce({ pulse: 'high', hotspots: [], insights: [] }).mockRejectedValueOnce(new Error('offline'));
  const { result, unmount } = renderHook(() => useIntelligencePulse());
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(result.current.pulse).toBe('high');
  await act(async () => { jest.advanceTimersByTime(45000); });
  expect(result.current.pulse).toBe('unknown');
  unmount();
});
