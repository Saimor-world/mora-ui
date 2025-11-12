import { render, screen } from '@testing-library/react';
import HomePage from '@/app/home/page';

jest.mock('@/lib/connectors', () => ({
  getConnectors: jest.fn(() => []),
  saveConnector: jest.fn(),
  testConnection: jest.fn(() => Promise.resolve(true)),
  syncConnector: jest.fn(() => Promise.resolve({ objectCount: 0 })),
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

const sessionState = {
  introSeen: true,
  setIntroSeen: jest.fn(),
  setLastViewedNode: jest.fn(),
  setActiveOrb: jest.fn(),
  setLastSnapshotId: jest.fn(),
  recentEvents: [],
  appendRecentEvent: jest.fn(),
  clearRecentEvents: jest.fn(),
};

jest.mock('@/store/session', () => ({
  useSessionStore: (selector?: (state: typeof sessionState) => any) => {
    if (typeof selector === 'function') {
      return selector(sessionState);
    }
    return sessionState;
  },
}));

describe('HomePage', () => {
  it('renders hero heading and CTA', () => {
    render(<HomePage />);
    expect(screen.getByText(/Willkommen bei Môra/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Beginne mit deinen ersten Daten/i })).toBeInTheDocument();
  });

  it('shows connector placeholder when no connectors are available', () => {
    render(<HomePage />);
    expect(screen.getByTestId('connector-placeholder')).toBeInTheDocument();
  });
});
