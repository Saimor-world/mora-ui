import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceControlTab, getWorkspaceConnections } from '@/apps/settings/WorkspaceControlTab';
import { useWorkspaceAccess, useWorkspaceCatalog } from '@/lib/queries/useWorkspaceAccess';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { createWorkspaceCheckoutIntent } from '@/lib/api/workspaceClient';
import { isPaddleCheckoutConfigured, openWorkspaceCheckout } from '@/lib/billing/paddleCheckout';

jest.mock('@/lib/queries/useWorkspaceAccess');
jest.mock('@/lib/hooks/useCommunicationSurface');
jest.mock('@/lib/api/workspaceClient', () => ({ createWorkspaceCheckoutIntent: jest.fn() }));
jest.mock('@/lib/billing/paddleCheckout', () => ({ isPaddleCheckoutConfigured: jest.fn(), openWorkspaceCheckout: jest.fn() }));

const mockAccess = useWorkspaceAccess as jest.Mock;
const mockCatalog = useWorkspaceCatalog as jest.Mock;
const mockCommunication = useCommunicationSurface as jest.Mock;
const mockCreateCheckout = createWorkspaceCheckoutIntent as jest.Mock;
const mockCheckoutConfigured = isPaddleCheckoutConfigured as jest.Mock;
const mockOpenCheckout = openWorkspaceCheckout as jest.Mock;

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
    mockCatalog.mockReturnValue({ data: { plans: [{ key: 'os_workspace_monthly', product: 'os', label: 'Saim?r OS Workspace', interval: 'month', price: { amount_minor: 19900, currency: 'EUR' }, included_seats: 5, trial_days: 14, checkout_ready: true }] } });
    mockCheckoutConfigured.mockReturnValue(true);
    mockCreateCheckout.mockResolvedValue({ id: 'checkout-1', product: 'desk', plan_key: 'desk_control_monthly', seats: 3, expires_at: 'later', paddle_checkout: { items: [{ priceId: 'pri_1', quantity: 1 }], custom_data: { saimor_tenant_id: 't1' } } });
    mockOpenCheckout.mockResolvedValue(true);
    mockCommunication.mockReturnValue({
      summary: { mailConfigured: true, mailLocalMode: false, calendarConfigured: false },
      overview: { cloud_storage: { configured: true }, rss: { configured: false }, capabilities: { assistant_available: true }, runtime: { local_truth: { services: { core: { reachable: true } } } } },
    });
  });

  it('renders CORE workspace truth and opens integrations', () => {
    const openIntegrations = jest.fn();
    render(<WorkspaceControlTab onOpenIntegrations={openIntegrations} />);
    expect(screen.getAllByText('Saim?r OS')).toHaveLength(2);
    expect(screen.getByText('Bereit')).toBeInTheDocument();
    expect(screen.getByText('5 Pl?tze')).toBeInTheDocument();
    expect(screen.getByText('3/5 verbunden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kalender einrichten/i })).toBeInTheDocument();
    expect(screen.getByText('3 von 4 Ebenen bereit')).toBeInTheDocument();
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

  it('creates a tenant-bound checkout intent before opening Paddle', async () => {
    mockAccess.mockReturnValue({
      data: { access: { products: [], capabilities: [], entitlements: [], tenant_id: 't1' }, onboarding: { state: 'complete', completed_steps: [], tenant_id: 't1' }, billing: { subscriptions: [] } },
      isLoading: false, isFetching: false, refetch: jest.fn(),
    });
    mockCatalog.mockReturnValue({ data: { plans: [{ key: 'desk_control_monthly', product: 'desk', label: 'Saim?r Desk Control', interval: 'month', price: { amount_minor: 7900, currency: 'EUR' }, included_seats: 3, trial_days: 14, checkout_ready: true }] } });
    render(<WorkspaceControlTab onOpenIntegrations={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ausw?hlen' }));
    expect(mockCreateCheckout).toHaveBeenCalledWith({ plan_key: 'desk_control_monthly', seats: 3 });
    await screen.findByRole('button', { name: 'Ausw?hlen' });
    expect(mockOpenCheckout).toHaveBeenCalledWith(expect.objectContaining({ id: 'checkout-1' }));
  });
});
