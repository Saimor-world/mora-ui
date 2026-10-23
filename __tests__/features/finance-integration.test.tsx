import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CoreError } from '@/lib/api/http';

jest.mock('next/dynamic', () => () => {
  const Stub = (props: any) => <div data-testid="finance-v2-workspace" data-section={props.initialSection} data-hide-nav={String(Boolean(props.hideSectionNav))} />;
  return Stub;
});

const mockContracts = jest.fn();
jest.mock('@/features/finance/data/contracts', () => {
  const actual = jest.requireActual('@/features/finance/data/contracts');
  return { ...actual, useFinanceContracts: () => mockContracts() };
});

import { APP_IDS } from '@/lib/apps/AppLoader';
import { getAppManifest } from '@/lib/apps/appRegistry';
import FinanceSurface, { blockingContract, FINANCE_TABS } from '@/features/finance';
import { contractStateFrom, type FinanceContract, type ContractState } from '@/features/finance/data/contracts';

function contracts(state: Partial<Record<FinanceContract['id'], ContractState>>): FinanceContract[] {
  return [
    { id: 'state', path: '/v3/finance/state', label: 'Finanzstatus & Cashflow', state: state.state || 'available' },
    { id: 'profit-center', path: '/v3/finance/profit-center', label: 'Profit Center', state: state['profit-center'] || 'available' },
    { id: 'capital-policy', path: '/v3/finance/capital-policy', label: 'Capital Policy', state: state['capital-policy'] || 'available' },
  ];
}

describe('Finance v2 wiring', () => {
  it('finance-v2 is registered in AppLoader next to the untouched legacy finance', () => {
    expect(APP_IDS).toEqual(expect.arrayContaining(['finance', 'finance-v2']));
    expect(getAppManifest('finance-v2')?.launcherHidden).toBe(true);
  });

  it('apps/finance-v2 exports the pane-independent workspace', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = jest.requireActual('@/apps/finance-v2');
    expect(typeof mod.FinanceV2Workspace).toBe('function');
    expect(typeof mod.default).toBe('function');
  });
});

describe('Finance contract adapter', () => {
  const base = { isSuccess: false, isError: false, error: null, isFetching: false };
  it('maps CORE 404 to contract_missing, never to available', () => {
    expect(contractStateFrom({ ...base, isError: true, error: new CoreError('nf', 404) }, { hasSession: true, companyId: 'c' })).toBe('contract_missing');
  });
  it('maps network/no-answer to offline and auth to unauthenticated/denied', () => {
    expect(contractStateFrom({ ...base, isError: true, error: new Error('Finance state is unavailable') }, { hasSession: true, companyId: 'c' })).toBe('offline');
    expect(contractStateFrom({ ...base, isError: true, error: new CoreError('x', 401) }, { hasSession: true, companyId: 'c' })).toBe('unauthenticated');
    expect(contractStateFrom({ ...base, isError: true, error: new CoreError('x', 403) }, { hasSession: true, companyId: 'c' })).toBe('denied');
  });
  it('does not probe without session or company', () => {
    expect(contractStateFrom({ ...base, isSuccess: true }, { hasSession: false, companyId: 'c' })).toBe('no_session');
    expect(contractStateFrom({ ...base, isSuccess: true }, { hasSession: true, companyId: null })).toBe('no_company');
  });
  it('Profit Center tab is blocked when profit-center or capital-policy is missing', () => {
    expect(blockingContract('profit', contracts({ 'profit-center': 'contract_missing' }))?.id).toBe('profit-center');
    expect(blockingContract('overview', contracts({ 'profit-center': 'contract_missing' }))).toBeNull();
    expect(FINANCE_TABS.map((t) => t.label)).toEqual(['Überblick', 'Cashflow', 'Profit Center', 'Treasury & Quellen', 'Capital · XRPL (read-only)']);
  });
});

describe('FinanceSurface', () => {
  it('embeds Finance v2 without its own section nav when contracts are available', () => {
    mockContracts.mockReturnValue({ contracts: contracts({}), hasSession: true, companyId: 'c' });
    render(<FinanceSurface navigate={jest.fn()} preview={false} />);
    const ws = screen.getByTestId('finance-v2-workspace');
    expect(ws.getAttribute('data-section')).toBe('state');
    expect(ws.getAttribute('data-hide-nav')).toBe('true');
    expect(screen.getAllByText('verfügbar').length).toBe(3);
  });

  it('shows an honest unavailable state for a missing CORE contract and never claims "Verbunden"', () => {
    mockContracts.mockReturnValue({ contracts: contracts({ 'profit-center': 'contract_missing', 'capital-policy': 'contract_missing' }), hasSession: true, companyId: 'c' });
    render(<FinanceSurface navigate={jest.fn()} preview={false} />);
    act(() => { fireEvent.click(screen.getByRole('tab', { name: 'Profit Center' })); });
    expect(screen.getByText('Profit Center: im laufenden CORE nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByTestId('finance-v2-workspace')).toBeNull();
    expect(screen.getAllByText('fehlt im laufenden CORE (404)').length).toBe(2);
    expect(document.body.textContent).not.toMatch(/Verbunden/);
  });

  it('without a session shows no numbers, not even sample numbers', () => {
    mockContracts.mockReturnValue({ contracts: contracts({ state: 'no_session', 'profit-center': 'no_session', 'capital-policy': 'no_session' }), hasSession: false, companyId: null });
    render(<FinanceSurface navigate={jest.fn()} preview />);
    expect(screen.getByText('Keine CORE-Sitzung')).toBeInTheDocument();
    expect(screen.queryByTestId('finance-v2-workspace')).toBeNull();
    expect(document.body.textContent).not.toMatch(/€/);
  });
});
