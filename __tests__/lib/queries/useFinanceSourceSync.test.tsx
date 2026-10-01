import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { corePost } from '@/lib/api/http';
import { useSyncFinanceConnection } from '@/lib/queries/useFinanceSources';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { createTestQueryClient, renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/http', () => ({ ...jest.requireActual('@/lib/api/http'), corePost: jest.fn() }));

function Probe() {
  const sync = useSyncFinanceConnection('company-fin');
  return <button onClick={() => sync.mutate('bank-a')}>{sync.error ? 'failed' : 'sync'}</button>;
}

it('invalidates connection and balance truth after a failed provider sync', async () => {
  resetAllStores();
  useSessionStore.setState({ user: { id: 'owner-a', role: 'owner', tenant_id: 'tenant-fin' }, sessionGeneration: 3 } as any);
  (corePost as jest.Mock).mockRejectedValue(new Error('provider unavailable'));
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  renderWithProviders(<Probe />, { queryClient: client });
  fireEvent.click(screen.getByRole('button', { name: 'sync' }));
  await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('failed'));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.financeConnections('tenant-fin', 'owner-a:owner:g3', 'company', 'company-fin') });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.financeState('tenant-fin', 'owner-a:owner:g3', 'company-fin') });
});
