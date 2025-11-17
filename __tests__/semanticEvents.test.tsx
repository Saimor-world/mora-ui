import { act, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSemanticEvents } from '@/lib/hooks/useSemanticEvents';
import { isSemanticEnabled, getSemanticEvents } from '@/lib/api/semantic';
import { useHealthCheck } from '@/lib/hooks/useApi';
import React from 'react';
import MyceliumGraph2D from '@/components/canvas/FieldMode/MyceliumGraph2D';

jest.mock('@/lib/api/semantic', () => ({
  isSemanticEnabled: jest.fn(),
  getSemanticEvents: jest.fn(),
}));

jest.mock('@/lib/hooks/useApi', () => ({
  useHealthCheck: jest.fn(),
}));

const mockedSemanticEnabled = isSemanticEnabled as jest.Mock;
const mockedGetSemanticEvents = getSemanticEvents as jest.Mock;
const mockedUseHealthCheck = useHealthCheck as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useSemanticEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSemanticEnabled.mockReturnValue(false);
    mockedUseHealthCheck.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-17T10:00:00Z' },
      refetch: jest.fn(),
    });
  });

  it('returns empty events when feature flag is OFF', async () => {
    mockedSemanticEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useSemanticEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(false));
    expect(mockedGetSemanticEvents).not.toHaveBeenCalled();
  });

  it('fetches events when feature flag is ON and core is online', async () => {
    mockedSemanticEnabled.mockReturnValue(true);
    mockedGetSemanticEvents.mockResolvedValue({
      events: [
        {
          event_id: 'evt-1',
          entity_id: 'obj-1',
          signal_type: 'hint',
          severity: 0.7,
          message: 'New connection detected',
          related_objects: ['obj-2', 'obj-3'],
          timestamp: '2025-11-17T10:00:00Z',
        },
      ],
    });

    const { result } = renderHook(() => useSemanticEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetSemanticEvents).toHaveBeenCalled();
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].event_id).toBe('evt-1');
    expect(result.current.data?.[0].signal_type).toBe('hint');
  });

  it('returns empty array when API returns null', async () => {
    mockedSemanticEnabled.mockReturnValue(true);
    mockedGetSemanticEvents.mockResolvedValue(null);

    const { result } = renderHook(() => useSemanticEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not fetch events when core is offline', async () => {
    mockedSemanticEnabled.mockReturnValue(true);
    mockedUseHealthCheck.mockReturnValue({
      data: { status: 'offline', timestamp: '2025-11-17T10:00:00Z' },
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSemanticEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(false));
    expect(mockedGetSemanticEvents).not.toHaveBeenCalled();
  });

  it('respects custom limit parameter', async () => {
    mockedSemanticEnabled.mockReturnValue(true);
    mockedGetSemanticEvents.mockResolvedValue({ events: [] });

    const { result } = renderHook(() => useSemanticEvents(5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetSemanticEvents).toHaveBeenCalledWith(expect.anything(), 5);
  });
});

describe('MyceliumGraph2D semantic event impulses', () => {
  const snapshot = {
    ts: 't-test',
    nodes: [
      { id: 'obj-a', title: 'Node A', type: 'file', tags: [], spaceId: 's1' },
      { id: 'obj-b', title: 'Node B', type: 'file', tags: [], spaceId: 's1' },
    ],
    edges: [{ sourceId: 'obj-a', targetId: 'obj-b', kind: 'link' }],
  };

  const semanticEvent = {
    event_id: 'evt-active',
    entity_id: 'obj-a',
    signal_type: 'hint' as const,
    severity: 0.9,
    message: 'Link detected',
    related_objects: ['obj-b'],
    timestamp: '2025-11-17T10:00:00Z',
  };

  const buildCanvasMock = () => {
    const strokeStyles: string[] = [];
    const dashPatterns: any[] = [];
    const ctx = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      createRadialGradient: () => ({ addColorStop: jest.fn() }),
      setTransform: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      quadraticCurveTo: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      setLineDash: jest.fn((pattern: any) => {
        dashPatterns.push(pattern);
      }),
      lineDashOffset: 0,
      stroke: jest.fn(function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strokeStyles.push((this as any).strokeStyle);
      }),
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      fillStyle: '',
      font: '',
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      fillText: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    return { ctx, strokeStyles, dashPatterns };
  };

  const setCanvasSize = (width: number, height: number) => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'offsetWidth');
    const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', { configurable: true, value: width });
    Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', { configurable: true, value: height });
    return () => {
      if (widthDescriptor) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', widthDescriptor);
      } else {
        delete (HTMLCanvasElement.prototype as any).offsetWidth;
      }
      if (heightDescriptor) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', heightDescriptor);
      } else {
        delete (HTMLCanvasElement.prototype as any).offsetHeight;
      }
    };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('draws golden impulses and shimmers edges while events are active, then decays', () => {
    jest.useFakeTimers();
    let currentTime = 0;
    const { ctx, strokeStyles, dashPatterns } = buildCanvasMock();
    const restoreSize = setCanvasSize(800, 600);
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx);
    const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => currentTime);
    const raf = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(
        (cb: FrameRequestCallback) =>
          setTimeout(() => {
            cb(currentTime);
          }, 16) as unknown as number
      );
    const caf = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id: number) => clearTimeout(id as unknown as number));

    const { rerender, unmount } = render(
      <MyceliumGraph2D snapshot={snapshot} semanticEvents={[semanticEvent]} prefersReducedMotion={false} />
    );

    act(() => {
      currentTime += 80;
      jest.advanceTimersByTime(80);
    });

    expect(dashPatterns.some((pattern) => Array.isArray(pattern) && pattern[0] === 14)).toBe(true);
    expect(strokeStyles.some((style) => typeof style === 'string' && style.includes('248, 191, 77'))).toBe(true);

    dashPatterns.length = 0;
    strokeStyles.length = 0;
    rerender(<MyceliumGraph2D snapshot={snapshot} semanticEvents={[]} prefersReducedMotion={false} />);

    act(() => {
      currentTime += 1400;
      jest.advanceTimersByTime(1400);
    });

    expect(dashPatterns.some((pattern) => Array.isArray(pattern) && pattern[0] === 14)).toBe(false);
    expect(strokeStyles.some((style) => typeof style === 'string' && style.includes('248, 191, 77'))).toBe(false);

    unmount();
    raf.mockRestore();
    caf.mockRestore();
    perfSpy.mockRestore();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    restoreSize();
  });

  it('respects reduced motion by skipping shimmer while still highlighting nodes', () => {
    jest.useFakeTimers();
    let currentTime = 0;
    const { ctx, strokeStyles, dashPatterns } = buildCanvasMock();
    const restoreSize = setCanvasSize(800, 600);
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx);
    const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => currentTime);
    const raf = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(
        (cb: FrameRequestCallback) =>
          setTimeout(() => {
            cb(currentTime);
          }, 16) as unknown as number
      );
    const caf = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id: number) => clearTimeout(id as unknown as number));

    const { unmount } = render(
      <MyceliumGraph2D snapshot={snapshot} semanticEvents={[semanticEvent]} prefersReducedMotion />
    );

    act(() => {
      currentTime += 80;
      jest.advanceTimersByTime(80);
    });

    expect(dashPatterns.some((pattern) => Array.isArray(pattern) && pattern[0] === 14)).toBe(false);
    expect(strokeStyles.some((style) => typeof style === 'string' && style.includes('248, 191, 77'))).toBe(true);

    unmount();
    raf.mockRestore();
    caf.mockRestore();
    perfSpy.mockRestore();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    restoreSize();
  });
});
