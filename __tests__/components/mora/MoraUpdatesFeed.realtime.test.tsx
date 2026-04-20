import React from 'react';
import { act, cleanup, waitFor } from '@testing-library/react';
import MoraUpdatesFeed from '@/components/mora/MoraUpdatesFeed';
import { coreGet } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { renderWithProviders, resetAllStores } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: jest.fn(),
    off: jest.fn(),
  },
}));

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (sel?: (s: any) => unknown) => {
    const s = { panes: [STABLE_PANE], activePaneId: 'pane-test', openPane: jest.fn(), removePane: jest.fn(), updatePanePosition: jest.fn(), updatePaneSize: jest.fn(), minimizePane: jest.fn(), focusPane: jest.fn(), getPane: () => STABLE_PANE };
    return sel ? sel(s) : s;
  }
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

beforeEach(resetAllStores);

describe('MoraUpdatesFeed realtime refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCoreGet.mockResolvedValue({ events: [] } as any);

    useNavStore.setState({
      activeCompanyId: 'co-1',
      activeDepartmentId: 'dep-1',
      navigateToCore: jest.fn(),
      navigateToDepartment: jest.fn(),
      navigateToSpace: jest.fn(),
      navigateToFolder: jest.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('refreshes after a matching mindloop_event', async () => {
    renderWithProviders(<MoraUpdatesFeed scope="company" showHeader={false} />);

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
    renderWithProviders(<MoraUpdatesFeed scope="company" showHeader={false} />);

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
