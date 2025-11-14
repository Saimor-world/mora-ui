import { act, fireEvent, render, screen } from '@testing-library/react';
import HomePage from '@/app/home/page';
import { ROLE_DEFINITIONS } from '@/lib/roles';

jest.mock('@/lib/connectors', () => ({
  getConnectors: jest.fn(() => []),
  saveConnector: jest.fn(),
  saveConnectorList: jest.fn(),
  applyMockSnapshot: jest.fn((list) => list),
  testConnection: jest.fn(),
  syncConnector: jest.fn(),
}));

jest.mock('@/lib/mockConnectors', () => ({
  mockConnectors: [],
  mockActivity: [],
}));

jest.mock('@/lib/mora/listener', () => ({
  useMoraAwareness: jest.fn(() => ({ events: [], lastEvent: null, emit: jest.fn(), clear: jest.fn() })),
  emitMoraEvent: jest.fn(),
  getMoraEvents: jest.fn(() => []),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

const sessionState = {
  introSeen: true,
  setIntroSeen: jest.fn(),
  setLastViewedNode: jest.fn(),
  setActiveOrb: jest.fn(),
  activeRole: 'owner',
  setActiveRole: jest.fn(),
  setLastSnapshotId: jest.fn(),
  recentEvents: [],
  appendRecentEvent: jest.fn(),
  clearRecentEvents: jest.fn(),
  dismissedSuggestionIds: [],
  setSuggestionDismissed: jest.fn(),
  suggestionsCollapsed: false,
  setSuggestionsCollapsed: jest.fn(),
  addFavorite: jest.fn(),
};

jest.mock('@/store/session', () => ({
  useSessionStore: (selector?: (state: typeof sessionState) => any) => {
    if (typeof selector === 'function') {
      return selector(sessionState);
    }
    return sessionState;
  },
}));

const connectorsModule = jest.requireMock('@/lib/connectors') as jest.Mocked<
  typeof import('@/lib/connectors')
>;

beforeEach(() => {
  connectorsModule.getConnectors.mockReturnValue([]);
  connectorsModule.applyMockSnapshot.mockImplementation((list) => list);
  connectorsModule.syncConnector.mockResolvedValue({
    id: 'seed',
    type: 'email',
    label: 'Seed',
    mode: 'mock',
    state: 'connected',
    lastSyncAt: '2025-01-01T00:00:00.000Z',
    objectCount: 2,
  });
  connectorsModule.testConnection.mockResolvedValue({
    id: 'seed',
    type: 'email',
    label: 'Seed',
    mode: 'mock',
    state: 'connected',
    lastSyncAt: '2025-01-01T00:00:00.000Z',
    objectCount: 1,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('HomePage', () => {
  it('renders hero heading and CTA', () => {
    render(<HomePage />);
    expect(screen.getByText(/Willkommen bei/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Beginne mit deinen ersten Daten/i })).toBeInTheDocument();
  });

  it('shows connector placeholder when no connectors are available', () => {
    render(<HomePage />);
    expect(screen.getByTestId('connector-placeholder')).toBeInTheDocument();
  });

  it('renders awareness fallback when no events exist', () => {
    render(<HomePage />);
    const fallbackMessages = screen.getAllByText(ROLE_DEFINITIONS.owner.homeEmpty);
    expect(fallbackMessages.length).toBeGreaterThan(0);
  });

  it('allows running mock connector simulation', async () => {
    jest.useFakeTimers();
    const seedConnector = {
      id: 'mock-email',
      type: 'email' as const,
      label: 'Work Mail',
      mode: 'mock' as const,
      state: 'disconnected' as const,
      lastSyncAt: null,
      objectCount: null,
    };
    connectorsModule.getConnectors.mockReturnValue([seedConnector]);
    connectorsModule.applyMockSnapshot.mockImplementation((list) =>
      list.map((entry) => ({
        ...entry,
        state: 'connected' as const,
        lastSyncAt: '2025-01-01T00:00:00.000Z',
        objectCount: 12,
      }))
    );

    render(<HomePage />);
    const mockButton = await screen.findByRole('button', { name: /Mock-Modus/i });
    fireEvent.click(mockButton);
    expect(mockButton).toHaveTextContent(/Simulation/i);

    await act(async () => {
      jest.advanceTimersByTime(1600);
});

    expect(connectorsModule.applyMockSnapshot).toHaveBeenCalled();
    expect(screen.getByText(/Verbunden/)).toBeInTheDocument();
    expect(screen.getByText('Objekte:')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('transitions connector state while syncing', async () => {
    const seedConnector = {
      id: 'mock-email',
      type: 'email' as const,
      label: 'Work Mail',
      mode: 'mock' as const,
      state: 'connected' as const,
      lastSyncAt: '2025-01-01T00:00:00.000Z',
      objectCount: 5,
    };
    connectorsModule.getConnectors.mockReturnValue([seedConnector]);
    let resolveSync: (() => void) | null = null;
    connectorsModule.syncConnector.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () =>
            resolve({
              ...seedConnector,
              state: 'connected' as const,
              lastSyncAt: '2025-01-02T00:00:00.000Z',
              objectCount: 8,
            });
        })
    );

    render(<HomePage />);
    const syncButton = await screen.findByRole('button', { name: /Synchronisieren/ });
    fireEvent.click(syncButton);

    expect(connectorsModule.syncConnector).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'syncing' })
    );
    await act(async () => {
      resolveSync?.();
    });

    expect(connectorsModule.syncConnector).toHaveBeenCalledTimes(1);
    await screen.findByRole('button', { name: /Synchronisieren/ });
    expect(screen.getByText('Objekte:')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
