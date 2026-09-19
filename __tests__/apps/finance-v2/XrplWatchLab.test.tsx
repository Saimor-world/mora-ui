import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import XrplWatchLab from '@/apps/finance-v2/XrplWatchLab';
import { useConnectCompanyXrpl, useObserveXrpl } from '@/lib/queries/useFinanceSources';

jest.mock('@/lib/queries/useFinanceSources', () => ({
  useObserveXrpl: jest.fn(),
  useConnectCompanyXrpl: jest.fn(),
}));

const observe = useObserveXrpl as jest.Mock;
const connect = useConnectCompanyXrpl as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

it('keeps a live ledger observation outside company truth until ownership is explicitly attested', () => {
  const observeMutate = jest.fn();
  const connectMutate = jest.fn();
  observe.mockReturnValue({
    mutate: observeMutate,
    data: {
      source: 'xrpl',
      network: 'mainnet',
      address: 'rExamplePublicAddress123456789ABCDEFG',
      ledger_index: 99112233,
      balance_drops: '125500000',
      balance_xrp: '125.500000',
      owner_count: 4,
      trust_lines: [],
      observed_at: '2026-09-19T12:00:00Z',
      signing_available: false,
      proof_hash: 'a'.repeat(64),
    },
    isPending: false,
    isSuccess: true,
    error: null,
  });
  connect.mockReturnValue({
    mutate: connectMutate,
    isPending: false,
    isSuccess: false,
    error: null,
  });

  render(<XrplWatchLab companyId="company-1" />);

  fireEvent.change(screen.getByLabelText('XRPL Watch-Adresse'), {
    target: { value: 'rExamplePublicAddress123456789ABCDEFG' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Beobachten' }));

  expect(observeMutate).toHaveBeenCalledWith('rExamplePublicAddress123456789ABCDEFG');
  expect(screen.getByText('125,5 XRP')).toBeInTheDocument();
  expect(screen.getByText('Ownership unassigned')).toBeInTheDocument();
  expect(screen.getByText('not company total')).toBeInTheDocument();
  expect(screen.getByText(/signing disabled/i)).toBeInTheDocument();

  const connectButton = screen.getByRole('button', { name: /Als SAIMÔR-Eigentum verbinden/i });
  expect(connectButton).toBeDisabled();

  fireEvent.click(screen.getByRole('checkbox'));
  expect(connectButton).toBeEnabled();
  fireEvent.click(connectButton);

  expect(connectMutate).toHaveBeenCalledWith({
    address: 'rExamplePublicAddress123456789ABCDEFG',
    label: 'SAIMÔR XRPL',
  });
});

it('surfaces CORE ledger failures without inventing a zero balance', () => {
  observe.mockReturnValue({
    mutate: jest.fn(),
    data: null,
    isPending: false,
    isSuccess: false,
    error: new Error('XRPL ledger source unavailable'),
  });
  connect.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  });

  render(<XrplWatchLab companyId="company-1" />);

  fireEvent.change(screen.getByLabelText('XRPL Watch-Adresse'), {
    target: { value: 'rExamplePublicAddress123456789ABCDEFG' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Beobachten' }));

  expect(screen.getByRole('alert')).toHaveTextContent('XRPL ledger source unavailable');
  expect(screen.getByText('Ownership unassigned')).toBeInTheDocument();
  expect(screen.getByText('— XRP')).toBeInTheDocument();
});
