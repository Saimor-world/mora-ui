import { act, renderHook, waitFor } from '@testing-library/react';
import { useActionEvents, type ActionEvent } from '@/lib/hooks/useActionEvents';
import { NAVIGATION_RESULT_EVENT } from '@/lib/utils/searchOpen';

const invalidateQueries = jest.fn();
const realtimeOn = jest.fn();
const realtimeOff = jest.fn();
const coreGet = jest.fn();

jest.mock('@/lib/queryClient', () => ({
  getQueryClient: () => ({ invalidateQueries }),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: (...args: unknown[]) => realtimeOn(...args),
    off: (...args: unknown[]) => realtimeOff(...args),
  },
}));

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: (...args: unknown[]) => coreGet(...args),
}));

function actionEvent(status: ActionEvent['status']): ActionEvent {
  return {
    action_id: `act-${status}`,
    status,
    intent: 'create_folder',
    message: null,
    error: null,
    payload: { tool_name: 'create_folder' },
    timestamp: new Date().toISOString(),
  };
}

describe('useActionEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    coreGet.mockResolvedValue({ events: [] });
  });

  it('invalidates Mora perception when an action reaches a terminal status', async () => {
    renderHook(() => useActionEvents(true));

    await waitFor(() => expect(realtimeOn).toHaveBeenCalledWith('action_status', expect.any(Function)));
    const handler = realtimeOn.mock.calls[0][1] as (event: ActionEvent) => void;

    act(() => handler(actionEvent('done')));

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['perception'] });
  });

  it('does not invalidate Mora perception for proposed actions', async () => {
    renderHook(() => useActionEvents(true));

    await waitFor(() => expect(realtimeOn).toHaveBeenCalledWith('action_status', expect.any(Function)));
    const handler = realtimeOn.mock.calls[0][1] as (event: ActionEvent) => void;

    act(() => handler(actionEvent('proposed')));

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('invalidates Mora perception after local navigation results', async () => {
    renderHook(() => useActionEvents(true));

    await waitFor(() => expect(realtimeOn).toHaveBeenCalledWith('action_status', expect.any(Function)));

    act(() => {
      window.dispatchEvent(new CustomEvent(NAVIGATION_RESULT_EVENT, {
        detail: {
          targetType: 'folder',
          folderId: 'folder-1',
          label: 'Planung',
          message: 'Geoeffnet',
        },
      }));
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['perception'] });
  });
});
