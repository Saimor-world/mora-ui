import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CompanyOptions } from '@/components/os-shell/ContextCapsule';
import { useDemoStore } from '@/lib/demo/demoStore';

jest.mock('@/lib/hooks/useIsSaimorInternal', () => ({
  useIsSaimorHq: () => true,
  useDemoCompanies: () => [{ id: 'demo-firm', name: 'Example Firm' }],
}));

beforeEach(() => { useDemoStore.getState().setDemoCompany(null); });
afterEach(() => jest.restoreAllMocks());

it('keeps the working company when the user cancels a switch in Grok’s new menu', () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<CompanyOptions />);
  fireEvent.click(screen.getByRole('menuitemradio', { name: /Example Firm/ }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lokale Entwürfe'));
  expect(useDemoStore.getState().demoCompanyId).toBeNull();
});

it('uses the same context boundary after a confirmed menu switch', () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<CompanyOptions />);
  fireEvent.click(screen.getByRole('menuitemradio', { name: /Example Firm/ }));
  expect(useDemoStore.getState().demoCompanyId).toBe('demo-firm');
  expect(screen.getByRole('menuitemradio', { name: /Example Firm/ })).toHaveAttribute('aria-checked', 'true');
});
