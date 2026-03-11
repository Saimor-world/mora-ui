import { act, renderHook, waitFor } from '@testing-library/react';
import { useMindLoopInsights } from '@/lib/hooks/useMindLoopInsights';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
  corePost: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: jest.fn(),
    off: jest.fn(),
  },
}));

const mockCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;
const mockCorePost = corePost as jest.MockedFunction<typeof corePost>;
const mockRealtime = realtime as jest.Mocked<typeof realtime>;

describe('useMindLoopInsights', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCoreGet.mockResolvedValue({ events: [] } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('surfaces a realtime mindloop insight immediately', async () => {
    const { result } = renderHook(() => useMindLoopInsights());
    const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'mindloop_event')?.[1];

    await act(async () => {
      handler?.({
        id: 'evt-1',
        event_type: 'potential_risk',
        summary: 'Supply risk detected',
        timestamp: '2026-03-11T10:00:00Z',
      });
    });

    expect(result.current.currentInsight).toEqual(
      expect.objectContaining({
        id: 'evt-1',
        content: 'Supply risk detected',
        source: 'pattern',
      })
    );
  });

  it('keeps polling as fallback and ignores duplicate ids after realtime delivery', async () => {
    mockCoreGet.mockResolvedValue({
      events: [{
        id: 'evt-1',
        event_type: 'semantic',
        summary: 'Duplicate event',
        timestamp: '2026-03-11T10:00:00Z',
      }],
    } as any);

    const { result } = renderHook(() => useMindLoopInsights());
    const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'mindloop_event')?.[1];

    await act(async () => {
      handler?.({
        id: 'evt-1',
        event_type: 'semantic',
        summary: 'Duplicate event',
        timestamp: '2026-03-11T10:00:00Z',
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.currentInsight).toEqual(
      expect.objectContaining({ id: 'evt-1', content: 'Duplicate event' })
    );
    expect(mockCoreGet).toHaveBeenCalledWith('/v3/mindloop/events?limit=12', { isOptional: true });
  });

  it('confirms and dismisses insights cleanly', async () => {
    const { result } = renderHook(() => useMindLoopInsights());
    const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'mindloop_event')?.[1];

    await act(async () => {
      handler?.({
        id: 'evt-2',
        event_type: 'context_shift',
        summary: 'Context changed',
        timestamp: '2026-03-11T10:00:00Z',
      });
    });

    await act(async () => {
      await result.current.confirmInsight('evt-2');
    });

    expect(mockCorePost).toHaveBeenCalledWith('/v3/mindloop/insight/evt-2/confirm', {});
    expect(result.current.currentInsight).toBeNull();
  });
});
