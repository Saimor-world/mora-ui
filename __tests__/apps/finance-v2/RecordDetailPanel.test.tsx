import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import RecordDetailPanel from '@/apps/finance-v2/RecordDetailPanel';
import { coreGet, corePost } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return {
    ...actual,
    coreGet: jest.fn(),
    corePost: jest.fn(),
  };
});

const mockCoreGet = coreGet as jest.Mock;
const mockCorePost = corePost as jest.Mock;

const scope = { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' as const };

const record = {
  id: 'record-1',
  scope,
  classification: 'operating_expense',
  effective_at: '2026-09-18T12:00:00Z',
  source_kind: 'manual',
  memo: 'Hosting September',
  evidence: {
    id: 'evidence-1',
    source_kind: 'manual',
    reference: 'invoice-2026-09',
    label: 'Hosting invoice',
  },
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

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  useSessionStore.setState({
    user: {
      id: 'user-finance',
      name: 'Finance Owner',
      role: 'owner',
      tenant_id: 'tenant-fin',
      active_company_id: 'company-fin',
    },
    sessionGeneration: 1,
  } as any);

  mockCoreGet.mockImplementation(async (path: string) => {
    if (path.startsWith('/v3/finance/records/record-1')) return record;
    if (path.startsWith('/v3/finance/evidence/evidence-1')) {
      return {
        scope,
        evidence: {
          ...record.evidence,
          kind: 'core_node',
          has_resolved_resource: true,
        },
        resource: {
          kind: 'core_node',
          id: 'node-invoice-1',
          title: 'Hosting Rechnung September',
          type: 'document',
          open_target: { type: 'node', id: 'node-invoice-1' },
        },
      };
    }
    return null;
  });
});

it('drills from a record through postings to an authorized evidence resource', async () => {
  const onOpenNode = jest.fn();

  renderWithProviders(
    <RecordDetailPanel
      companyId="company-fin"
      recordId="record-1"
      accounts={[
        {
          id: 'account-a',
          display_name: 'Treasury Cash',
          currency: 'EUR',
          truth_state: 'observed',
          observed_balance: null,
          projected_balance: null,
        },
      ] as any}
      onClose={jest.fn()}
      onOpenNode={onOpenNode}
    />,
  );

  await waitFor(() => expect(screen.getByTestId('finance-record-detail')).toBeInTheDocument());
  expect(screen.getByText('cash:account-a')).toBeInTheDocument();
  expect(screen.getByText('-25,00 €')).toBeInTheDocument();
  expect(screen.getByText('Hosting invoice')).toBeInTheDocument();

  const resourceButton = await screen.findByRole('button', { name: /Hosting Rechnung September/i });
  fireEvent.click(resourceButton);
  expect(onOpenNode).toHaveBeenCalledWith('node-invoice-1');
});

it('reviews and persists one linked full correction without mutating the original', async () => {
  mockCorePost.mockResolvedValue({
    data: {
      ...record,
      id: 'record-correction-1',
      correction_of_record_id: 'record-1',
      postings: record.postings.map((posting) => ({
        ...posting,
        id: `reversal-${posting.id}`,
        ledger_code: `reversal:${posting.ledger_code}`,
        amount: {
          ...posting.amount,
          value: posting.amount.value.startsWith('-')
            ? posting.amount.value.slice(1)
            : `-${posting.amount.value}`,
        },
      })),
    },
    receipt: {
      kind: 'finance_record_correction',
      id: 'receipt-correction-1',
      company_id: 'company-fin',
      persisted: true,
      financial_action_executed: false,
    },
  });

  renderWithProviders(
    <RecordDetailPanel
      companyId="company-fin"
      recordId="record-1"
      accounts={[]}
      onClose={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByRole('button', { name: /Vollständig korrigieren/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Vollständig korrigieren/i }));

  fireEvent.change(screen.getByLabelText('Grund'), { target: { value: 'Falscher Beleg' } });
  fireEvent.change(screen.getByLabelText('Belegreferenz'), { target: { value: 'correction-proof-1' } });
  fireEvent.click(screen.getByRole('button', { name: /Korrektur prüfen/i }));

  expect(screen.getByTestId('finance-correction-review')).toHaveTextContent('Falscher Beleg');
  fireEvent.click(screen.getByRole('button', { name: /Gegenbuchung speichern/i }));

  await waitFor(() => expect(screen.getByTestId('finance-correction-receipt')).toBeInTheDocument());
  expect(mockCorePost).toHaveBeenCalledWith(
    '/v3/finance/records/record-1/corrections',
    expect.objectContaining({
      company_id: 'company-fin',
      reason: 'Falscher Beleg',
      evidence: expect.objectContaining({
        source_kind: 'manual',
        reference: 'correction-proof-1',
      }),
    }),
    { preserveEnvelope: true, throwAuthErrors: true },
  );
});
