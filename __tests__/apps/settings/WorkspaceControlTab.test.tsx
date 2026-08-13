import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceControlTab } from '@/apps/settings/WorkspaceControlTab';
import { useWorkspaceAccess, useWorkspaceCatalog } from '@/lib/queries/useWorkspaceAccess';

jest.mock('@/lib/queries/useWorkspaceAccess');

const mockAccess = useWorkspaceAccess as jest.Mock;
const mockCatalog = useWorkspaceCatalog as jest.Mock;

describe('WorkspaceControlTab', () => {
  beforeEach(() => {
    mockAccess.mockReturnValue({
      data: {
        access: { products: [{ key: 'os', label: 'Saim?r OS', access: 'direct' }], capabilities: [], entitlements: [], tenant_id: 't1' },
        onboarding: { state: 'complete', completed_steps: ['company'], tenant_id: 't1', product_intent: 'os', started_at: null, completed_at: null },
        billing: { subscriptions: [{ id: 's1', product: 'os', plan_key: 'os_workspace_monthly', status: 'active', seats: 5 }] },
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockCatalog.mockReturnValue({ data: { plans: [] } });
  });

  it('renders CORE workspace truth and opens integrations', () => {
    const openIntegrations = jest.fn();
    render(<WorkspaceControlTab onOpenIntegrations={openIntegrations} />);
    expect(screen.getByText('Saim?r OS')).toBeInTheDocument();
    expect(screen.getByText('Bereit')).toBeInTheDocument();
    expect(screen.getByText('5 Pl?tze')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dienste verbinden/i }));
    expect(openIntegrations).toHaveBeenCalledTimes(1);
  });

  it('does not present missing CORE data as healthy', () => {
    mockAccess.mockReturnValue({ data: null, isLoading: false, isFetching: false, refetch: jest.fn() });
    render(<WorkspaceControlTab onOpenIntegrations={jest.fn()} />);
    expect(screen.getByText(/keine erfundenen Werte/i)).toBeInTheDocument();
  });
});
