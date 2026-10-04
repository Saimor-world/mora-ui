import React from 'react';
import { screen } from '@testing-library/react';
import CoreTreasuryPanel from '@/apps/finance-v2/CoreTreasuryPanel';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { createTestQueryClient, renderWithProviders, resetAllStores } from '../../test-utils';

const identityKey = 'user-finance:owner:g1';
const scope = { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' as const };

beforeEach(() => {
  resetAllStores();
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
});

it('shows CORE treasury classification, hot-minter activity and ORIGIN listing without counting the listing as wealth', async () => {
  const queryClient = createTestQueryClient();
  const key = [...queryKeys.financeRoot('tenant-fin', identityKey, 'company-fin'), 'mora-context'];

  queryClient.setQueryData(key, {
    scope,
    as_of: '2026-10-04T21:00:00Z',
    read_only: true,
    comparison_status: 'compared',
    recent_changes: [
      {
        kind: 'balance_changed',
        account_id: 'treasury',
        role: 'SAIMOR_SOVEREIGN_TREASURY',
        delta: { value: '2.000020', currency: 'XRP', scale: 6 },
      },
    ],
    sovereign_treasury: {
      id: 'treasury',
      address_or_ref: 'rG3P7J5iWPon74PFxVuPemJzoGSz4XnWUB',
      display_name: 'SAIMÔR Sovereign Treasury',
      currency: 'XRP',
      role: 'SAIMOR_SOVEREIGN_TREASURY',
      status: 'active',
      observed_balance: { value: '113.000020', currency: 'XRP', scale: 6 },
      available_balance_xrp: '112.000020',
      reserved_xrp: '1.000000',
      wallet_classification: {
        target_allocation_xrp: '111.000000',
        founder_funding_xrp: '113.000000',
        top_up_funding_xrp: '2.000000',
        external_dust_xrp: '0.000020',
        ledger_balance_xrp: '113.000020',
        reserved_xrp: '1.000000',
        available_balance_xrp: '112.000020',
      },
      open_listings: [],
      activity: [],
      observation_count: 2,
      delta_since_previous: { value: '2.000020', currency: 'XRP', scale: 6 },
    },
    hot_minter: {
      id: 'hot-minter',
      address_or_ref: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
      display_name: 'SAIMÔR ORIGIN Hot-Minter',
      currency: 'XRP',
      role: 'SAIMOR_ORIGIN_HOT_MINTER',
      status: 'active',
      observed_balance: { value: '4.999990', currency: 'XRP', scale: 6 },
      available_balance_xrp: '3.599990',
      reserved_xrp: '1.400000',
      wallet_classification: {
        founder_funding_xrp: '5.000000',
        total_fees_xrp: '0.000020',
        realized_sales_xrp: '0.000000',
        ledger_balance_xrp: '4.999990',
      },
      open_listings: [
        {
          offer_index: 'BE21901CB7F8C16365DD8BF440A56145F3FB9CBBCAEBED89A2E44C4BFF0FFE61',
          nftoken_id: '001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87',
          owner: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
          amount_xrp: '111.000000',
          classification: 'open_listing',
          counts_as_wealth: false,
          counts_as_treasury: false,
          counts_as_revenue: false,
        },
      ],
      activity: [
        {
          hash: 'E9155F769684A32BD141F330DA27B0F0EE82675DFC6D9234162A0807D5D9DF11',
          booking_date: '2026-10-04T20:00:00Z',
          classification: 'nft_create_offer',
          description: 'NFTokenCreateOffer (111.000000 XRP listing)',
          is_revenue: false,
        },
      ],
      observation_count: 1,
      delta_since_previous: null,
    },
    accounts: [],
    disconnected_sources: [
      { id: 'revolut_business', label: 'Revolut Business', mode: 'read', status: 'not_connected' },
    ],
  });

  renderWithProviders(<CoreTreasuryPanel companyId="company-fin" />, { queryClient });

  expect(await screen.findByTestId('core-treasury-card')).toBeInTheDocument();
  expect(screen.getByTestId('core-hot-minter-card')).toBeInTheDocument();
  expect(screen.getByText('111 XRP')).toBeInTheDocument();
  expect(screen.getByText('113 XRP')).toBeInTheDocument();
  expect(screen.getByText('0,00002 XRP')).toBeInTheDocument();
  expect(screen.getByText('SAIMÔR // ORIGIN #111')).toBeInTheDocument();
  expect(screen.getByText('offenes Listing · kein Vermögen')).toBeInTheDocument();
  expect(screen.getByText('Realisierte Sales')).toBeInTheDocument();
  expect(screen.getByText('0 XRP')).toBeInTheDocument();
  expect(screen.getByText('Revolut Business')).toBeInTheDocument();
});
