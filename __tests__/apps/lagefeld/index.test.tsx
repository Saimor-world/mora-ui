import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../../test-utils';
import LagefeldApp from '@/apps/lagefeld/index';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/hooks/useLagefeldSignals', () => ({
  useLagefeldSignals: () => ({
    uiActions: [],
    openFlow: { changed: [], attention: [], nextSteps: [] },
    isLoading: false,
    hasSignals: false,
  }),
}));

jest.mock('@/lib/os/openVoiceOverlay', () => ({
  openVoiceOverlay: jest.fn(),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
    <div data-testid="glass-panel">
      <button type="button" data-testid="lagefeld-window-close" onClick={onClose}>
        close
      </button>
      {children}
    </div>
  ),
}));

describe('LagefeldApp', () => {
  beforeEach(() => {
    usePaneStore.setState({
      panes: [{
        id: 'test-pane',
        type: 'lagefeld',
        title: 'Lagefeld',
        position: { x: 100, y: 100 },
        size: { width: 1040, height: 720 },
        minimized: false,
        zIndex: 500,
      }],
      activePaneId: 'test-pane',
      nextZIndex: 501,
    } as any);
  });

  it('shows honest empty state instead of demo court data', () => {
    renderWithProviders(<LagefeldApp paneId="test-pane" />);
    expect(screen.getByTestId('glass-panel')).toBeInTheDocument();
    expect(screen.getByTestId('lagefeld-empty')).toBeInTheDocument();
    expect(screen.getByText(/noch keine signale/i)).toBeInTheDocument();
    expect(screen.queryByText(/Gericht/i)).not.toBeInTheDocument();
  });

  it('opens chat pane from Mit Mora schreiben', () => {
    renderWithProviders(<LagefeldApp paneId="test-pane" />);
    fireEvent.click(screen.getByTestId('lagefeld-open-chat'));
    expect(usePaneStore.getState().panes.some((p) => p.type === 'chat')).toBe(true);
  });

  it('can close its own pane through window chrome', () => {
    renderWithProviders(<LagefeldApp paneId="test-pane" />);
    fireEvent.click(screen.getByTestId('lagefeld-window-close'));
    expect(usePaneStore.getState().panes.some((p) => p.id === 'test-pane')).toBe(false);
  });
});
