import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import FinanceEntryPanel from '@/apps/finance-v2/FinanceEntryPanel';
import { corePost } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return {
    ...actual,
    corePost: jest.fn(),
  };
});

const mockCorePost = corePost as jest.Mock;

const accounts = [
  {
    id: 'account-a',
    display_name: 'Treasury A',
    currency: 'EUR',
    source_kind: 'manual',
    truth_state: 'observed',
    observed_balance: { value: '100.00', currency: 'EUR', scale: 2 },
    projected_balance: { value: '100.00', currency: 'EUR', scale: 2 },
  },
  {
    id: 'account-b',
    display_name: 'Treasury B',
    currency: 'EUR',
    source_kind: 'manual',
    truth_state: 'observed',
    observed_balance: { value: '50.00', currency: 'EUR', scale: 2 },
    projected_balance: { value: '50.00', currency: 'EUR', scale: 2 },
  },
] as any;

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
});

it('reviews an account before persisting it and renders the persistence-only receipt', async () => {
  mockCorePost.mockResolvedValue({
    data: {
      id: 'account-new',
      scope: { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' },
      display_name: 'Treasury Cash Account',
      currency: 'EUR',
      source_kind: 'manual',
      status: 'active',
      truth_state: 'missing_observation',
    },
    receipt: {
      kind: 'finance_account_created',
      id: 'receipt-account-1',
      company_id: 'company-fin',
      persisted: true,
      financial_action_executed: false,
    },
  });

  renderWithProviders(<FinanceEntryPanel companyId="company-fin" accounts={[]} />);

  fireEvent.click(screen.getByRole('button', { name: /Prüfen/i }));
  expect(screen.getByTestId('finance-entry-review')).toBeInTheDocument();
  expect(screen.getByText('Treasury Cash Account')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^Speichern$/i }));

  await waitFor(() => expect(screen.getByTestId('finance-entry-receipt')).toBeInTheDocument());
  expect(screen.getByText(/receipt-account-1/)).toBeInTheDocument();
  expect(screen.getByText(/Finanzaktion ausgeführt:/)).toHaveTextContent('nein');
  expect(mockCorePost).toHaveBeenCalledWith(
    '/v3/finance/accounts',
    {
      company_id: 'company-fin',
      display_name: 'Treasury Cash Account',
      currency: 'EUR',
      account_type: 'cash',
    },
    { preserveEnvelope: true, throwAuthErrors: true },
  );
});

it('keeps the review visible and shows a real write failure instead of a success state', async () => {
  mockCorePost.mockRejectedValue(new Error('Finance write unavailable'));

  renderWithProviders(<FinanceEntryPanel companyId="company-fin" accounts={[]} />);

  fireEvent.click(screen.getByRole('button', { name: /Prüfen/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Speichern$/i }));

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Finance write unavailable'));
  expect(screen.getByTestId('finance-entry-review')).toBeInTheDocument();
  expect(screen.queryByTestId('finance-entry-receipt')).not.toBeInTheDocument();
});

it('reviews and persists an internal transfer with both account sides explicit', async () => {
  mockCorePost.mockResolvedValue({
    data: {
      id: 'record-transfer',
      scope: { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' },
      classification: 'internal_transfer',
      source_kind: 'manual',
      postings: [],
    },
    receipt: {
      kind: 'finance_record_created',
      id: 'receipt-transfer-1',
      company_id: 'company-fin',
      persisted: true,
      financial_action_executed: false,
    },
  });

  renderWithProviders(<FinanceEntryPanel companyId="company-fin" accounts={accounts} />);

  fireEvent.click(screen.getByRole('tab', { name: 'Bewegung' }));
  fireEvent.change(screen.getByLabelText('Art der Bewegung'), { target: { value: 'internal_transfer' } });
  fireEvent.change(screen.getByLabelText('Betrag EUR'), { target: { value: '12,34' } });
  fireEvent.change(screen.getByLabelText('Zielkonto'), { target: { value: 'account-b' } });
  fireEvent.change(screen.getByLabelText('Belegreferenz'), { target: { value: 'transfer-proof-1' } });

  fireEvent.click(screen.getByRole('button', { name: /Prüfen/i }));
  expect(screen.getByTestId('finance-entry-review')).toHaveTextContent('Treasury A');
  expect(screen.getByTestId('finance-entry-review')).toHaveTextContent('Treasury B');
  expect(screen.getByTestId('finance-entry-review')).toHaveTextContent('12.34 EUR');

  fireEvent.click(screen.getByRole('button', { name: /^Speichern$/i }));
  await waitFor(() => expect(screen.getByTestId('finance-entry-receipt')).toBeInTheDocument());

  const [, payload] = mockCorePost.mock.calls[0];
  expect(payload).toEqual(expect.objectContaining({
    company_id: 'company-fin',
    account_id: 'account-a',
    destination_account_id: 'account-b',
    classification: 'internal_transfer',
    amount: { value: '12.34', currency: 'EUR', scale: 2 },
  }));
});
