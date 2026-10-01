import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { coreGet } from '@/lib/api/http';
import { useFinanceState } from '@/lib/queries/useFinanceStateFlow';
import { useSessionStore } from '@/lib/store/sessionStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return {
    ...actual,
    coreGet: jest.fn(),
  };
});

const mockCoreGet = coreGet as jest.Mock;

function Probe() {
  const query = useFinanceState('company-fin', true);
  return <div data-testid="probe">{query.data?.scope?.tenant_id || (query.isLoading ? 'loading' : 'empty')}</div>;
}

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  mockCoreGet.mockResolvedValue({
    scope: { tenant_id: 'tenant-fin', company_id: 'company-fin', owner_kind: 'company' },
    truth_state: 'missing',
    accounts: [],
    currency_states: [],
    warnings: [],
  });
});

it('refetches the same company when the authorized identity changes', async () => {
  useSessionStore.setState({
    user: {
      id: 'user-a',
      name: 'A',
      role: 'owner',
      tenant_id: 'tenant-fin',
      active_company_id: 'company-fin',
    },
    sessionGeneration: 3,
  } as any);

  renderWithProviders(<Probe />);
  await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('tenant-fin'));
  expect(mockCoreGet).toHaveBeenCalledTimes(1);

  act(() => {
    useSessionStore.setState({
      user: {
        id: 'user-b',
        name: 'B',
        role: 'owner',
        tenant_id: 'tenant-fin',
        active_company_id: 'company-fin',
      },
      sessionGeneration: 4,
    } as any);
  });

  await waitFor(() => expect(mockCoreGet).toHaveBeenCalledTimes(2));
  expect(mockCoreGet.mock.calls[0][0]).toContain('company-fin');
  expect(mockCoreGet.mock.calls[1][0]).toContain('company-fin');
});
