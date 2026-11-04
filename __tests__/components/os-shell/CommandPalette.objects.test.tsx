import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPalette } from '@/components/os-shell/CommandPalette';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';

jest.mock('@/lib/lea/useWorld', () => ({ useWorld: () => ({ finder: [], day: { open: [{ task: { id: 'task-id-1', title: 'Exact task' }, meta: '' }] }, events: [{ id: 'event-id-2', title: 'Exact event', date: '2026-11-04' }], tasksPlanetId: null }) }));
jest.mock('@/lib/api/searchClient', () => ({ searchGlobal: jest.fn() }));
beforeEach(() => {
  useSessionStore.setState({ user: { id: 'user-test', tenant_id: 'tenant-test', active_company_id: 'company-test' } as never, sessionGeneration: 0 });
  useDemoStore.getState().setDemoCompany(null);
  useOsShellStore.setState({ objectTarget: null });
});
afterEach(cleanup);
function setup() {
  const navigate = jest.fn();
  render(<QueryClientProvider client={new QueryClient()}><CommandPalette open onClose={jest.fn()} features={[]} navigate={navigate} askMora={jest.fn()} searchEnabled={false} /></QueryClientProvider>);
  return navigate;
}
it.each([['Exact task', 'task', 'task-id-1'], ['Exact event', 'event', 'event-id-2']])('preserves %s ID instead of opening a generic surface', (title, kind, id) => {
  const navigate = setup();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: title } });
  fireEvent.click(screen.getByText(title, { exact: true }));
  expect(useOsShellStore.getState().objectTarget).toMatchObject({ kind, id });
  expect(navigate).toHaveBeenCalledWith('today');
});
it('refuses a result clicked after its originating company changed', () => {
  const navigate = setup();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Exact task' } });
  const result = screen.getByText('Exact task', { exact: true });
  act(() => useSessionStore.setState({ user: { id: 'user-test', tenant_id: 'tenant-test', active_company_id: 'other-company' } as never }));
  fireEvent.click(result);
  expect(navigate).not.toHaveBeenCalled();
  expect(useOsShellStore.getState().objectTarget).toBeNull();
});
