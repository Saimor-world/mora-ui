import React from 'react';
import { render, screen } from '@testing-library/react';
import CompanyOverview, { sumCash } from '@/apps/finance-v2/CompanyOverview';

const money = (value: string) => ({ value, currency: 'EUR', scale: 2 });
const rec = (id: string, classification: string, cash: string) => ({
  id, classification, scope: {} as any,
  postings: [{ id: id + 'c', account_id: 'a', ledger_code: 'cash:a', amount: money(cash) }],
}) as any;

const records = [rec('r1', 'customer_receipt', '100.00'), rec('r2', 'customer_receipt', '20.50'), rec('r3', 'operating_expense', '-25.00')];

it('sums income and expenses from cash postings', () => {
  expect(sumCash(records, new Set(['customer_receipt']), 1)[0].value).toBe('120.50');
  expect(sumCash(records, new Set(['operating_expense']), -1)[0].value).toBe('25.00');
});

it('shows company figures and placeholders, no trading line', () => {
  render(<CompanyOverview state={{ accounts: [], currency_states: [], warnings: [] } as any} records={records} hasOlderRecords={false} />);
  expect(screen.getByText('Einnahmen')).toBeInTheDocument();
  expect(screen.getByText('Ausgaben')).toBeInTheDocument();
  expect(screen.getByText(/Revolut Business/)).toBeInTheDocument();
  // Missing sources say so instead of showing 0 / empty values.
  expect(screen.getAllByText('noch nicht verbunden').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/Trading|Anlagen|Bot/i)).toBeNull();
});

it('shows "noch nicht verbunden" for an account without observed balance, not 0', () => {
  const state = { accounts: [{ id: 'x', display_name: 'XRPL Treasury', currency: 'XRP', truth_state: 'missing_observation', observed_balance: null, projected_balance: null }], currency_states: [], warnings: [] } as any;
  render(<CompanyOverview state={state} records={[]} hasOlderRecords={false} />);
  const group = screen.getByTestId('group-XRPL Treasury');
  expect(group.textContent).toContain('noch nicht verbunden');
  expect(group.textContent).not.toMatch(/\b0[,.]00\b|—/);
});
