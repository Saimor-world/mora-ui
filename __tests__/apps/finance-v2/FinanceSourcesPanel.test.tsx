import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FinanceSourcesPanel from '@/apps/finance-v2/FinanceSourcesPanel';
import * as queries from '@/lib/queries/useFinanceSources';

jest.mock('@/lib/queries/useFinanceSources', () => ({
  useFinanceSources: jest.fn(), useFinanceConnections: jest.fn(),
  useConnectCompanyBitvavo: jest.fn(), useOpenBankingInstitutions: jest.fn(),
  useStartCompanyOpenBanking: jest.fn(), useSyncFinanceConnection: jest.fn(),
}));

const pending = { id: 'bank-a', provider: 'gocardless_bank_data', status: 'pending',
  label: 'Bank A', account_count: 0, authorization_url: 'https://bank.example/consent' };

beforeEach(() => {
  jest.clearAllMocks();
  (queries.useFinanceSources as jest.Mock).mockReturnValue({ data: { sources: [
    { id: 'gocardless_bank_data', label: 'Bank', mode: 'open_banking' },
  ] } });
  (queries.useFinanceConnections as jest.Mock).mockReturnValue({ data: { connections: [pending] }, refetch: jest.fn() });
  (queries.useConnectCompanyBitvavo as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (queries.useOpenBankingInstitutions as jest.Mock).mockReturnValue({ data: { institutions: [] } });
  (queries.useStartCompanyOpenBanking as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (queries.useSyncFinanceConnection as jest.Mock).mockReturnValue({ mutate: jest.fn() });
});

it('resumes persisted consent after remount and keeps the renewal form available', () => {
  const view = render(<FinanceSourcesPanel companyId="company-a" />);
  expect(screen.getByRole('link', { name: 'Bankfreigabe fortsetzen' })).toHaveAttribute('href', pending.authorization_url);
  view.unmount();
  render(<FinanceSourcesPanel companyId="company-a" />);
  expect(screen.getByRole('link', { name: 'Bankfreigabe fortsetzen' })).toHaveAttribute('href', pending.authorization_url);
  expect(screen.getByRole('button', { name: 'Bankfreigabe starten' })).toBeInTheDocument();
});

it('renders each bank connection and synchronizes the selected one', () => {
  const mutate = jest.fn();
  (queries.useFinanceConnections as jest.Mock).mockReturnValue({ data: { connections: [pending,
    { ...pending, id: 'bank-b', label: 'Bank B', status: 'connected' },
  ] }, refetch: jest.fn() });
  (queries.useSyncFinanceConnection as jest.Mock).mockReturnValue({ mutate });
  render(<FinanceSourcesPanel companyId="company-a" />);
  expect(screen.getByText('Bank A')).toBeInTheDocument();
  expect(screen.getByText('Bank B')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Bankstatus synchronisieren' })[1]);
  expect(mutate).toHaveBeenCalledWith('bank-b');
});

it('offers retry on institution failure and explains retained balances after sync failure', () => {
  const refetch = jest.fn();
  (queries.useOpenBankingInstitutions as jest.Mock).mockReturnValue({ isError: true, error: new Error('Service unavailable'), refetch });
  (queries.useSyncFinanceConnection as jest.Mock).mockReturnValue({ error: new Error('Timeout') });
  render(<FinanceSourcesPanel companyId="company-a" />);
  expect(screen.getByText(/Der letzte bekannte Stand bleibt erhalten/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
