import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppLoader, APP_IDS } from '@/lib/apps/AppLoader';
import { useSessionStore } from '@/lib/store/sessionStore';
import { resetAllStores } from '../../test-utils';

// Mock all dynamic imports to avoid loading full app bundles in tests
jest.mock('next/dynamic', () => (fn: () => Promise<unknown>, opts?: unknown) => {
  // Return a stub component that shows the app id
  const Stub = ({ paneId }: { paneId: string }) => (
    <div data-testid="app-stub" data-pane-id={paneId}>app loaded</div>
  );
  Stub.displayName = 'DynamicStub';
  return Stub;
});

describe('AppLoader', () => {
  beforeEach(() => {
    resetAllStores();
    useSessionStore.setState({
      user: {
        id: 'system-owner',
        name: 'System Owner',
        email: 'owner@saimor.test',
        role: 'system_owner',
        tenant_id: 'tenant-hq',
      },
    });
  });

  it('renders the dynamic component for a known appId', () => {
    render(<AppLoader appId="finder" paneId="pane-1" />);
    expect(screen.getByTestId('app-stub')).toBeInTheDocument();
  });

  it('passes paneId to the app component', () => {
    render(<AppLoader appId="chat" paneId="chat-99" />);
    expect(screen.getByTestId('app-stub')).toHaveAttribute('data-pane-id', 'chat-99');
  });

  it('renders error message for unknown appId', () => {
    render(<AppLoader appId="nonexistent" paneId="x" />);
    expect(screen.getByText(/App "nonexistent" not found/)).toBeInTheDocument();
  });

  it('renders a stub for every registered app id (live from APP_IDS)', () => {
    for (const id of APP_IDS) {
      const { unmount } = render(<AppLoader appId={id} paneId="test" />);
      expect(screen.getByTestId('app-stub')).toBeInTheDocument();
      unmount();
    }
  });

  it('blocks protected system apps for unauthorized roles', () => {
    useSessionStore.setState({
      user: {
        id: 'member',
        name: 'Member',
        role: 'member',
        tenant_id: 'tenant-hq',
      },
    });

    render(<AppLoader appId="terminal" paneId="terminal-1" />);

    expect(screen.getByTestId('app-access-denied-terminal')).toBeInTheDocument();
    expect(screen.queryByTestId('app-stub')).not.toBeInTheDocument();
  });
});
