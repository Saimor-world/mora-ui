import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { BusinessWorkflows } from '@/components/os/BusinessWorkflows';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { coreGet } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
}));

const mockCoreGet = coreGet as jest.Mock;

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  useNavStore.setState({ activeCompanyId: 'company-real' } as any);
  useSessionStore.setState({
    user: {
      id: 'user-real',
      name: 'Alexander',
      role: 'owner',
      tenant_id: 'tenant-real',
    },
  } as any);
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

it('shows tenant-scoped business and financial evidence and opens the selected workflow', async () => {
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
  queryClient.setQueryData(queryKeys.financialPulse('tenant-real'), {
    scope: 'tenant',
    revenue: {
      scope: 'tenant',
      monthly: 12500,
      annualRunRate: 150000,
      period: '2026-08',
      currency: 'EUR',
      source: 'paddle',
      warnings: [],
    },
    banking: {
      scope: 'tenant',
      status: 'connected',
      provider: 'revolut_business',
      balancesByCurrency: { EUR: 8432.1 },
      accountCount: 2,
      recentTransactionCount: 5,
      lastSyncedAt: '2026-08-20T10:30:00Z',
      consentExpiresAt: null,
      warnings: [],
    },
    infrastructure: {
      scope: 'system',
      monthly: 320,
      kind: 'actual',
      period: '2026-08',
      currency: 'EUR',
      source: 'hetzner-invoice',
      observedAt: '2026-08-18T10:00:00Z',
    },
  });
  const onOpen = jest.fn();
  const onOpenDesk = jest.fn();

  renderWithProviders(
    <BusinessWorkflows onOpen={onOpen} onOpenDesk={onOpenDesk} />,
    { queryClient },
  );

  await waitFor(() => expect(screen.getByText('Kundenvertrag prüfen')).toBeInTheDocument());
  expect(screen.getByText('Angebot freigeben')).toBeInTheDocument();
  expect(screen.getByText('Angebot fertigstellen')).toBeInTheDocument();
  expect(screen.getByText('1 indexierte Inhalte im Organisationsbaum')).toBeInTheDocument();
  expect(screen.getByText('API nicht erreichbar')).toBeInTheDocument();
  expect(screen.getByText(/12\.500/)).toBeInTheDocument();
  expect(screen.getByText('Systemweit · Rechnung')).toBeInTheDocument();
  expect(screen.getByText(/8\.432/)).toBeInTheDocument();
  expect(screen.getAllByText('Revolut Business').length).toBeGreaterThan(0);
  expect(screen.getByText('Echter beobachteter Kontostand')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Freigaben & Entscheidungen'));
  expect(onOpen).toHaveBeenCalledWith('action-center', 'Entscheidungen', { width: 940, height: 720 });

  fireEvent.click(screen.getByText('Finanzen & Liquidität'));
  expect(onOpenDesk).toHaveBeenCalledTimes(1);
});

it('does not request or expose finance values for a member role', () => {
  useSessionStore.setState({
    user: {
      id: 'member-real',
      name: 'Team',
      role: 'member',
      tenant_id: 'tenant-real',
    },
  } as any);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.tasks('company-real'), []);
  queryClient.setQueryData(queryKeys.tree('company-real'), []);
  queryClient.setQueryData(queryKeys.nightwatchIncidents(false), []);

  renderWithProviders(<BusinessWorkflows onOpen={jest.fn()} />, { queryClient });

  expect(screen.getByText('Finanzlage ist nur für Owner und Admin sichtbar')).toBeInTheDocument();
  expect(screen.queryByText(/12\.500/)).not.toBeInTheDocument();
});
