import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FinanceSourcesPanel from '@/apps/finance-v2/FinanceSourcesPanel';
import * as queries from '@/lib/queries/useFinanceSources';

jest.mock('@/lib/queries/useFinanceSources', () => ({
  useFinanceSources: jest.fn(), useFinanceConnections: jest.fn(),
  useConnectCompanyBitvavo: jest.fn(), useOpenBankingInstitutions: jest.fn(),
  useStartCompanyOpenBanking: jest.fn(), useStartCompanyRevolut: jest.fn(), useSyncFinanceConnection: jest.fn(),
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
  (queries.useStartCompanyRevolut as jest.Mock).mockReturnValue({ mutate: jest.fn() });
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


it('shows a Revolut READ setup without rendering private-key contents', () => {
  (queries.useFinanceSources as jest.Mock).mockReturnValue({ data: { sources: [
    { id: 'revolut_business', label: 'Revolut Business', mode: 'api' },
  ] } });
  (queries.useFinanceConnections as jest.Mock).mockReturnValue({ data: { connections: [] }, refetch: jest.fn() });

  render(<FinanceSourcesPanel companyId="company-a" />);
  expect(screen.getByTestId('revolut-business-setup')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Revolut READ-Consent starten' })).toBeDisabled();
  expect(screen.getByText(/ausschließlich den READ-Scope/)).toBeInTheDocument();
  expect(screen.queryByText(/BEGIN PRIVATE KEY/)).not.toBeInTheDocument();
});

it('stores only the pending Revolut connection identity in session storage before leaving for consent', () => {
  const mutate = jest.fn((_input, options) => options.onSuccess({
    data: {
      connection_id: 'revolut-connection',
      authorization_url: 'https://business.revolut.com/app-confirm?scope=READ',
    },
  }));
  (queries.useFinanceSources as jest.Mock).mockReturnValue({ data: { sources: [
    { id: 'revolut_business', label: 'Revolut Business', mode: 'api' },
  ] } });
  (queries.useFinanceConnections as jest.Mock).mockReturnValue({ data: { connections: [] }, refetch: jest.fn() });
  (queries.useStartCompanyRevolut as jest.Mock).mockReturnValue({
    mutate,
    data: {
      data: {
        connection_id: 'revolut-connection',
        authorization_url: 'https://business.revolut.com/app-confirm?scope=READ',
      },
    },
  });

  render(<FinanceSourcesPanel companyId="company-a" />);
  const link = screen.getByRole('link', { name: 'Bei Revolut freigeben' });
  fireEvent.click(link);

  expect(window.sessionStorage.getItem('saimor_revolut_connection_id')).toBe('revolut-connection');
  expect(window.sessionStorage.getItem('saimor_revolut_company_id')).toBe('company-a');
  expect(window.sessionStorage.length).toBe(2);
});
