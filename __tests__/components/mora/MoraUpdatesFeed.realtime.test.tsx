import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import MoraUpdatesFeed from '@/components/mora/MoraUpdatesFeed';
import { coreGet } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: jest.fn(),
    off: jest.fn(),
  },
}));

const NAV_STORE_STATE = {
  activeCompanyId: 'co-1',
  activeDepartmentId: 'dep-1',
  navigateToCore: jest.fn(),
  navigateToDepartment: jest.fn(),
  navigateToSpace: jest.fn(),
  navigateToFolder: jest.fn(),
};

jest.mock('@/lib/store/navStore', () => ({
  useNavStore: (selector?: (s: any) => any) => selector ? selector(NAV_STORE_STATE) : NAV_STORE_STATE,
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: () => ({
    openPane: jest.fn(),
  }),
}));

jest.mock('@/lib/hooks/useHilToggle', () => ({
  useHilToggle: () => ({
    hilEnabled: false,
    setHilEnabled: jest.fn(),
  }),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
  dispatchMoraPresence: jest.fn(),
}));

const mockCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;
const mockRealtime = realtime as jest.Mocked<typeof realtime>;

describe('MoraUpdatesFeed realtime refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCoreGet.mockResolvedValue({ events: [] } as any);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('refreshes after a matching mindloop_event', async () => {
    render(<MoraUpdatesFeed scope="company" showHeader={false} />);

    await waitFor(() => {
      expect(mockCoreGet).toHaveBeenCalledWith('/v3/mindloop/events?limit=12&company_id=co-1');
    });

    const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'mindloop_event')?.[1];

    await act(async () => {
      handler?.({
        id: 'evt-1',
        event_type: 'semantic',
        source: 'mindloop',
        payload: { company_id: 'co-1' },
      });
      jest.advanceTimersByTime(250);
    });

    expect(mockCoreGet).toHaveBeenCalledTimes(2);
  });

  it('ignores mindloop_event from another company', async () => {
    render(<MoraUpdatesFeed scope="company" showHeader={false} />);

    await waitFor(() => {
      expect(mockCoreGet).toHaveBeenCalledTimes(1);
    });

    const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'mindloop_event')?.[1];

    await act(async () => {
      handler?.({
        id: 'evt-2',
        event_type: 'semantic',
        source: 'mindloop',
        payload: { company_id: 'co-2' },
      });
      jest.advanceTimersByTime(250);
    });

    expect(mockCoreGet).toHaveBeenCalledTimes(1);
  });
});
