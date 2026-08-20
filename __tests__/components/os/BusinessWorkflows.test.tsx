import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { BusinessWorkflows } from '@/components/os/BusinessWorkflows';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { coreGet } from '@/lib/api/coreClient';
import { useActionEventStore } from '@/lib/hooks/useActionEvents';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
}));

const mockCoreGet = coreGet as jest.Mock;

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  useNavStore.setState({ activeCompanyId: 'company-real' } as any);
  mockCoreGet.mockImplementation(async (path: string) => {
    if (path.startsWith('/v3/mail/messages')) {
      return { messages: [{ id: 'mail-1', subject: 'Kundenvertrag prüfen', from: 'kunde@example.de' }] };
    }
    if (path.startsWith('/v3/calendar/events')) {
      return { events: [{ id: 'event-1', title: 'Kundentermin', date: '2026-08-21' }] };
    }
    if (path.startsWith('/v3/actions/events')) {
      return { events: [{ action_id: 'action-1', status: 'pending_confirmation', message: 'Angebot freigeben', error: null, payload: {}, timestamp: '2026-08-20T10:00:00Z' }] };
    }
    if (path.startsWith('/v3/integrations/rss/items')) return { items: [] };
    if (path === '/v3/users/me/content') return {};
    return null;
  });
});

it('shows tenant-scoped business evidence and opens the selected workflow', async () => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.tasks('company-real'), [
    { id: 'task-1', title: 'Angebot fertigstellen', status: 'in_progress' },
  ]);
  queryClient.setQueryData(queryKeys.tree('company-real'), [
    { id: 'dept-1', type: 'department', name: 'Vertrieb', children: [{ id: 'node-1', type: 'node', name: 'Angebot' }] },
  ]);
  queryClient.setQueryData(queryKeys.nightwatchIncidents(false), [
    { id: 'incident-1', title: 'API nicht erreichbar', status: 'open' },
  ]);
  const onOpen = jest.fn();

  renderWithProviders(<BusinessWorkflows onOpen={onOpen} />, { queryClient });

  await waitFor(() => expect(screen.getByText('Kundenvertrag prüfen')).toBeInTheDocument());
  expect(screen.getByText('Angebot freigeben')).toBeInTheDocument();
  expect(screen.getByText('Angebot fertigstellen')).toBeInTheDocument();
  expect(screen.getByText('1 indexierte Inhalte im Organisationsbaum')).toBeInTheDocument();
  expect(screen.getByText('API nicht erreichbar')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Freigaben & Entscheidungen'));
  expect(onOpen).toHaveBeenCalledWith('action-center', 'Entscheidungen', { width: 940, height: 720 });
});