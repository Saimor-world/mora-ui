import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RadarNotification } from '@/lib/store/radarStore';

jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: ({ children, initial, animate, exit, transition, layout, ...props }: any) =>
        React.createElement('div', props, children),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('@/lib/queries/useRadar', () => ({
  useRadar: jest.fn(() => ({})),
}));

const mockCorePost = jest.fn();
const mockCorePatch = jest.fn();
jest.mock('@/lib/api/http', () => ({
  corePost: (...args: any[]) => mockCorePost(...args),
  corePatch: (...args: any[]) => mockCorePatch(...args),
}));

const mockFetchNodeDetails = jest.fn();
const mockGetEntityContext = jest.fn();
jest.mock('@/lib/api/coreClient', () => ({
  fetchNodeDetails: (...args: any[]) => mockFetchNodeDetails(...args),
  getEntityContext: (...args: any[]) => mockGetEntityContext(...args),
}));

const mockRealtimeOn = jest.fn();
const mockRealtimeOff = jest.fn();
const mockRealtimeConnect = jest.fn();
jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: (...args: any[]) => mockRealtimeOn(...args),
    off: (...args: any[]) => mockRealtimeOff(...args),
    connect: (...args: any[]) => mockRealtimeConnect(...args),
  },
}));

import { NotificationCenter, useNotificationStore } from '@/components/os/NotificationCenter';
import { useRadarStore } from '@/lib/store/radarStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { queryKeys } from '@/lib/queries/queryKeys';

const makeRadar = (overrides: Partial<RadarNotification> = {}): RadarNotification => ({
  id: 'radar-1',
  signal_type: 'deadline_proximity',
  title: 'Termin prüfen',
  body: 'Ein Dokument braucht Aufmerksamkeit.',
  tier: 'suggest',
  status: 'pending',
  entity_id: 'node-1',
  entity_type: 'node',
  created_at: new Date().toISOString(),
  ...overrides,
});

function renderCenter(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationCenter />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCorePatch.mockResolvedValue({ ok: true });
  mockCorePost.mockResolvedValue({
    action_type: 'navigate',
    payload: { entity_id: 'node-1', entity_type: 'node' },
  });
  mockFetchNodeDetails.mockResolvedValue({
    id: 'node-1',
    title: 'Radar Dokument',
    folder_id: 'folder-1',
    company_id: 'company-1',
  });
  mockGetEntityContext.mockResolvedValue(null);

  useNotificationStore.setState({
    notifications: [],
    isOpen: true,
    focusModeEnabled: false,
  });
  useRadarStore.setState({
    notifications: [],
    unreadCount: 0,
  });
  useOrbStore.setState({
    hasProactiveAlert: false,
  });
  usePaneStore.setState({
    panes: [],
    activePaneId: null,
    nextZIndex: 500,
  });
});

describe('NotificationCenter radar integration', () => {
  it('shows radar cards, combined badge state and sets orb alert', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Systemmeldung',
      source: 'system',
      autoDismiss: 0,
    });
    useRadarStore.getState().setNotifications([makeRadar()], 1);

    renderCenter();

    expect(screen.getByText('Mora beobachtet')).toBeInTheDocument();
    expect(screen.getByText('Termin prüfen')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(useOrbStore.getState().hasProactiveAlert).toBe(true);
  });

  it('invalidates radar query when realtime push arrives', () => {
    useRadarStore.getState().setNotifications([makeRadar()], 1);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderCenter(queryClient);
    const radarHandler = mockRealtimeOn.mock.calls.find(([event]) => event === 'mora.radar.new')?.[1];
    expect(radarHandler).toBeInstanceOf(Function);

    radarHandler();

    expect(mockRealtimeConnect).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.radar() });
  });

  it('opens node radar targets as finder and document panes', async () => {
    useRadarStore.getState().setNotifications([makeRadar()], 1);
    renderCenter();

    fireEvent.click(screen.getByRole('button', { name: /oeffnen|ansehen/i }));

    await waitFor(() => {
      const panes = usePaneStore.getState().panes;
      expect(panes.some((pane) => pane.id === 'finder-folder-1')).toBe(true);
      expect(panes.some((pane) => pane.id === 'document-node-1')).toBe(true);
    });
  });

  it('opens folder radar targets in finder', async () => {
    useRadarStore.getState().setNotifications([
      makeRadar({
        id: 'radar-folder',
        title: 'Ordner ähnlich',
        entity_id: 'folder-2',
        entity_type: 'folder',
      }),
    ], 1);
    mockCorePost.mockResolvedValue({
      action_type: 'navigate',
      payload: { entity_id: 'folder-2', entity_type: 'folder' },
    });
    mockGetEntityContext.mockResolvedValue({
      name: 'Operations',
      path: {
        company: { id: 'company-1', name: 'Saimor' },
        department: { id: 'dept-1', name: 'Ops' },
        space: { id: 'space-1', name: 'Run' },
        breadcrumbs: [{ id: 'folder-2', name: 'Operations' }],
      },
    });

    renderCenter();

    fireEvent.click(screen.getByRole('button', { name: /oeffnen|ansehen/i }));

    await waitFor(() => {
      const panes = usePaneStore.getState().panes;
      expect(panes.some((pane) => pane.id === 'finder-folder-2')).toBe(true);
    });
  });

  it('opens space radar targets in finder', async () => {
    useRadarStore.getState().setNotifications([
      makeRadar({
        id: 'radar-space',
        title: 'Bereich inaktiv',
        entity_id: 'space-2',
        entity_type: 'space',
      }),
    ], 1);
    mockCorePost.mockResolvedValue({
      action_type: 'navigate',
      payload: { entity_id: 'space-2', entity_type: 'space' },
    });
    mockGetEntityContext.mockResolvedValue({
      name: 'Security',
      path: {
        company: { id: 'company-1', name: 'Saimor' },
        department: { id: 'dept-1', name: 'Ops' },
        space: { id: 'space-2', name: 'Security' },
        breadcrumbs: [{ id: 'space-2', name: 'Security' }],
      },
    });

    renderCenter();

    fireEvent.click(screen.getByRole('button', { name: /oeffnen|ansehen/i }));

    await waitFor(() => {
      const panes = usePaneStore.getState().panes;
      expect(panes.some((pane) => pane.id === 'finder-space-2')).toBe(true);
    });
  });

  it('surfaces a compact Mora toast for actionable suggest signals while closed', async () => {
    useNotificationStore.setState({
      notifications: [],
      isOpen: false,
      focusModeEnabled: false,
    });
    useRadarStore.getState().setNotifications([makeRadar({
      title: 'Termin braucht Status',
      body: 'Ein Dokument braucht Aufmerksamkeit.',
    })], 1);

    renderCenter();

    expect(screen.getByText('Mora sieht etwas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jetzt ansehen/i }));

    await waitFor(() => {
      const panes = usePaneStore.getState().panes;
      expect(panes.some((pane) => pane.id === 'document-node-1')).toBe(true);
    });
  });
});
