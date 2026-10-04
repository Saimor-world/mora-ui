import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import FinanceV2App from '@/apps/finance-v2';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { createTestQueryClient, renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children, title }: any) => (
    <div data-testid="glass-panel">
      <div>{title}</div>
      {children}
    </div>
  ),
}));

const scope = { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' as const };
const identityKey = 'user-finance:owner:g1';

beforeEach(() => {
  resetAllStores();
  usePaneStore.getState().reset();
  useSessionStore.setState({
    user: {
      id: 'user-finance',
      name: 'Finance Owner',
      role: 'owner',
      tenant_id: 'tenant-fin',
      active_company_id: 'company-fin',
      active_company_name: 'SAIMÔR',
    },
    sessionGeneration: 1,
  } as any);

  usePaneStore.setState({
    panes: [{
      id: 'finance-test',
      type: 'finance',
      title: 'Finance',
      position: { x: 20, y: 40 },
      size: { width: 1120, height: 760 },
      minimized: false,
      zIndex: 500,
    }],
    activePaneId: 'finance-test',
    nextZIndex: 501,
  } as any);
});

it('composes State, manual entry, paginated Flow and record detail in one native Finance pane', async () => {
  const queryClient = createTestQueryClient();

  queryClient.setQueryData([...queryKeys.companies(), false], [
    { id: 'company-fin', name: 'SAIMÔR' },
  ]);

  queryClient.setQueryData(
    queryKeys.financeState('tenant-fin', identityKey, 'company-fin'),
    {
      scope,
      as_of: '2026-09-18T12:00:00Z',
      truth_state: 'partial',
      accounts: [{
        id: 'account-a',
        display_name: 'Treasury A',
        account_type: 'cash',
        currency: 'EUR',
        source_kind: 'manual',
        truth_state: 'observed',
        observed_balance: { value: '100.00', currency: 'EUR', scale: 2 },
        projected_balance: { value: '125.00', currency: 'EUR', scale: 2 },
        movement_after_observation: { value: '25.00', currency: 'EUR', scale: 2 },
        as_of: '2026-09-18T12:00:00Z',
        freshness: 'current',
        coverage: 'partial',
        evidence: { reference: 'opening-proof' },
      }],
      currency_states: [{
        currency: 'EUR',
        coverage: 'partial',
        included_accounts: 1,
        omitted_accounts: 0,
        observed_total: { value: '100.00', currency: 'EUR', scale: 2 },
        projected_total: { value: '125.00', currency: 'EUR', scale: 2 },
        aggregate_is_partial: true,
      }],
      warnings: ['partial_observation_coverage'],
      notes: [],
    },
  );

  const flowKey = [
    ...queryKeys.financeRecords('tenant-fin', identityKey, 'company-fin', 25),
    'infinite',
  ];
  const record = {
    id: 'record-1',
    scope,
    classification: 'operating_expense',
    effective_at: '2026-09-18T13:00:00Z',
    source_kind: 'manual',
    memo: 'Hosting',
    evidence: { reference: 'hosting-proof', label: 'Hosting receipt' },
    postings: [
      {
        id: 'posting-cash',
        account_id: 'account-a',
        ledger_code: 'cash:account-a',
        amount: { value: '-25.00', currency: 'EUR', scale: 2 },
      },
      {
        id: 'posting-expense',
        account_id: null,
        ledger_code: 'expense:operating',
        amount: { value: '25.00', currency: 'EUR', scale: 2 },
      },
    ],
    corrections: [],
  };

  queryClient.setQueryData(flowKey, {
    pages: [{ scope, records: [record], next_cursor: 'older|record-0' }],
    pageParams: [null],
  });
  renderWithProviders(<FinanceV2App paneId="finance-test" />, { queryClient });

  expect(await screen.findByText('Finanzstatus')).toBeInTheDocument();
  expect(screen.getAllByText('100,00 €').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('125,00 €')).toBeInTheDocument();
  expect(screen.getByTestId('finance-entry-panel')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Flow' }));

  expect(await screen.findByText('Bewegungen')).toBeInTheDocument();
  expect(screen.getByText('Operating expense')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ältere laden' })).toBeInTheDocument();

  // This query is not observed until the detail opens. The test QueryClient uses
  // gcTime: 0, so seed it immediately before mounting the detail observer.
  queryClient.setQueryData(
    queryKeys.financeRecord('tenant-fin', identityKey, 'company-fin', 'record-1'),
    record,
  );
  fireEvent.click(screen.getByRole('button', { name: /Operating expense öffnen/i }));

  await waitFor(() => expect(screen.getByTestId('finance-record-detail')).toBeInTheDocument());
  expect(screen.getByText('cash:account-a')).toBeInTheDocument();
  expect(screen.getByText('Hosting receipt')).toBeInTheDocument();

  const flowButtons = screen.getAllByRole('button', { name: /Flow/i });
  fireEvent.click(flowButtons[flowButtons.length - 1]);
  expect(await screen.findByText('Bewegungen')).toBeInTheDocument();
});
