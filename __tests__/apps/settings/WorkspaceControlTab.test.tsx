import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceControlTab, getWorkspaceConnections } from '@/apps/settings/WorkspaceControlTab';
import { useWorkspaceAccess, useWorkspaceCatalog } from '@/lib/queries/useWorkspaceAccess';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';

jest.mock('@/lib/queries/useWorkspaceAccess');
jest.mock('@/lib/hooks/useCommunicationSurface');

const mockAccess = useWorkspaceAccess as jest.Mock;
const mockCatalog = useWorkspaceCatalog as jest.Mock;
const mockCommunication = useCommunicationSurface as jest.Mock;

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
    mockCommunication.mockReturnValue({
      summary: { mailConfigured: true, mailLocalMode: false, calendarConfigured: false },
      overview: { cloud_storage: { configured: true }, rss: { configured: false }, capabilities: { assistant_available: true } },
    });
  });

  it('renders CORE workspace truth and opens integrations', () => {
    const openIntegrations = jest.fn();
    render(<WorkspaceControlTab onOpenIntegrations={openIntegrations} />);
    expect(screen.getByText('Saim?r OS')).toBeInTheDocument();
    expect(screen.getByText('Bereit')).toBeInTheDocument();
    expect(screen.getByText('5 Pl?tze')).toBeInTheDocument();
    expect(screen.getByText('3/5 verbunden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kalender einrichten/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dienste verbinden/i }));
    expect(openIntegrations).toHaveBeenCalledTimes(1);
  });

  it('does not present missing CORE data as healthy', () => {
    mockAccess.mockReturnValue({ data: null, isLoading: false, isFetching: false, refetch: jest.fn() });
    render(<WorkspaceControlTab onOpenIntegrations={jest.fn()} />);
    expect(screen.getByText(/keine erfundenen Werte/i)).toBeInTheDocument();
  });

  it('derives readiness from the shared integration truth', () => {
    expect(getWorkspaceConnections(
      { mailConfigured: true, mailLocalMode: false, calendarConfigured: false },
      { cloud_storage: { configured: true }, rss: { configured: false }, capabilities: { assistant_available: true } },
    )).toEqual([
      { label: 'Mail', ready: true },
      { label: 'Kalender', ready: false },
      { label: 'Cloud', ready: true },
      { label: 'Feeds', ready: false },
      { label: 'Assistant', ready: true },
    ]);
  });
});
