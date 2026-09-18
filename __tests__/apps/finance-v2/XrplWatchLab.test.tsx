import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import XrplWatchLab from '@/apps/finance-v2/XrplWatchLab';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

it('shows a public XRPL address as read-only observation, never as company ownership', async () => {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      network: 'mainnet',
      mode: 'read-only',
      address: 'rExamplePublicAddress123456789ABCDEFG',
      ledgerIndex: 99112233,
      xrp: 125.5,
      availableXrp: 115.5,
      reserve: { requiredXrp: 10 },
      ownerCount: 4,
      trustLines: [],
      transactions: [],
      fetchedAt: '2026-09-18T18:00:00Z',
      commerce: {
        recognizedPayments: 2,
        recognizedRevenueXrp: 999,
      },
    }),
  });
  global.fetch = mockFetch as any;

  render(<XrplWatchLab />);

  const input = screen.getByLabelText('XRPL Watch-Adresse');
  fireEvent.change(input, { target: { value: 'rExamplePublicAddress123456789ABCDEFG' } });
  fireEvent.click(screen.getByRole('button', { name: 'Beobachten' }));

  await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
    '/api/finance/xrpl?address=rExamplePublicAddress123456789ABCDEFG',
    { cache: 'no-store' },
  ));

  expect(await screen.findByText('125,5 XRP')).toBeInTheDocument();
  expect(screen.getByText('Ownership unassigned')).toBeInTheDocument();
  expect(screen.getByText('not company total')).toBeInTheDocument();
  expect(screen.getByText(/signing disabled/i)).toBeInTheDocument();

  // Legacy/experimental commerce fields from the endpoint are intentionally not
  // rendered as recognized accounting revenue in native Finance.
  expect(screen.queryByText(/999/)).not.toBeInTheDocument();
  expect(screen.queryByText(/recognized revenue/i)).not.toBeInTheDocument();
});

it('surfaces XRPL read failures without inventing an empty ledger state', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'XRPL upstream unavailable' }),
  }) as any;

  render(<XrplWatchLab />);

  fireEvent.change(screen.getByLabelText('XRPL Watch-Adresse'), {
    target: { value: 'rExamplePublicAddress123456789ABCDEFG' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Beobachten' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('XRPL upstream unavailable');
  expect(screen.getByText('Ownership unassigned')).toBeInTheDocument();
  expect(screen.getByText('— XRP')).toBeInTheDocument();
});
