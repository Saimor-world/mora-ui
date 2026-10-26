import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import Administration from '@/features/administration';
import { ownerConsoleClient } from '@/lib/api/ownerConsoleClient';

jest.mock('@/lib/api/ownerConsoleClient', () => ({ ownerConsoleClient: { users: jest.fn(), companies: jest.fn(), updateUser: jest.fn() } }));
const client = ownerConsoleClient as jest.Mocked<typeof ownerConsoleClient>;
const ACCOUNT = { id: 'member-1', email: 'member@example.test', full_name: 'Example Member', tenant_id: 'tenant-a', role: 'member' as const, is_active: true, email_verified: true, default_company_id: 'company-a', default_company_name: 'Example Firm', last_login_at: null };

function show() {
  const query = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={query}><Administration /></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.getState().setUser({ id: 'system-owner', role: 'system_owner', tenant_id: 'hq' } as any);
  client.users.mockResolvedValue([ACCOUNT]);
  client.companies.mockResolvedValue([
    { id: 'company-a', tenant_id: 'tenant-a', name: 'Example Firm', is_demo: false },
    { id: 'foreign', tenant_id: 'tenant-b', name: 'Foreign Firm', is_demo: true },
  ]);
});

it.each(['owner', 'admin', 'member', 'demo'])('does not request global accounts for the %s role', (role) => {
  useSessionStore.getState().setUser({ id: 'someone', role, tenant_id: 'hq' } as any);
  show();
  expect(client.users).not.toHaveBeenCalled();
  expect(client.companies).not.toHaveBeenCalled();
});

it('does not load global administration while the system owner is in a demo', () => {
  useDemoStore.getState().setDemoCompany('demo'); show();
  expect(client.users).not.toHaveBeenCalled();
});

it('loads real CORE metadata and only saves the concrete reviewed change after confirmation', async () => {
  client.updateUser.mockResolvedValue({ ...ACCOUNT, role: 'manager' });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Account member@example.test verwalten' }));
  expect(screen.queryByRole('option', { name: 'Foreign Firm · Demo' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Rolle'), { target: { value: 'manager' } });
  fireEvent.click(screen.getByRole('button', { name: 'Änderung prüfen' }));
  expect(client.updateUser).not.toHaveBeenCalled();
  expect(screen.getByRole('group', { name: 'Änderung bestätigen' })).toHaveTextContent('Rolle Leitung');
  fireEvent.click(screen.getByRole('button', { name: 'Jetzt speichern' }));
  await waitFor(() => expect(client.updateUser).toHaveBeenCalledWith('member-1', { full_name: 'Example Member', role: 'manager', is_active: true, default_company_id: 'company-a' }));
  expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Von CORE gespeichert.');
});

it('does not report a failed update as saved', async () => {
  client.updateUser.mockRejectedValue(new Error('denied'));
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Account member@example.test verwalten' }));
  fireEvent.click(screen.getByRole('button', { name: 'Änderung prüfen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Jetzt speichern' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('nicht bestätigt');
  expect(screen.queryByText('Von CORE gespeichert.')).toBeNull();
});
