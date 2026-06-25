import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AmbientRoomOverlay, AMBIENT_ROOM_Z_INDEX } from '@/components/ambient/AmbientRoomOverlay';
import { useNavStore } from '@/lib/store/navStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, initial, animate, exit, transition, ...props }: any, ref: React.Ref<any>) =>
      React.createElement(tag, { ref, ...props }, children),
    );

  return {
    motion: { div: passthrough('div') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('@/components/ambient/AmbientRoom', () => ({
  AmbientRoom: () => <div data-testid="ambient-room-stub" />,
}));

describe('AmbientRoomOverlay', () => {
  beforeEach(() => {
    resetAllStores();
    useNavStore.setState({
      viewLevel: 'core',
      coreMode: 'home',
      voiceOverlayOpen: false,
    });
  });

  it('renders above pane stack when voice overlay is open', () => {
    useNavStore.setState({ voiceOverlayOpen: true });
    renderWithProviders(<AmbientRoomOverlay />);

    const overlay = screen.getByTestId('ambient-room-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ zIndex: String(AMBIENT_ROOM_Z_INDEX) });
    expect(AMBIENT_ROOM_Z_INDEX).toBeGreaterThan(850);
    expect(screen.getByTestId('ambient-room-stub')).toBeInTheDocument();
  });

  it('does not render when voice overlay is closed', () => {
    renderWithProviders(<AmbientRoomOverlay />);
    expect(screen.queryByTestId('ambient-room-overlay')).not.toBeInTheDocument();
  });

  it('keeps viewLevel unchanged while voice is open', () => {
    useNavStore.setState({
      viewLevel: 'core',
      coreMode: 'explore',
      voiceOverlayOpen: true,
    });
    renderWithProviders(<AmbientRoomOverlay />);

    const state = useNavStore.getState();
    expect(state.viewLevel).toBe('core');
    expect(state.coreMode).toBe('explore');
    expect(state.voiceOverlayOpen).toBe(true);
  });
});
