import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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

describe('LagefeldApp', () => {
  beforeEach(() => {
    usePaneStore.setState({ panes: [], activePaneId: null } as any);
  });

  it('shows honest empty state instead of demo court data', () => {
    render(<LagefeldApp paneId="test-pane" />);
    expect(screen.getByTestId('lagefeld-empty')).toBeInTheDocument();
    expect(screen.getByText(/noch keine signale/i)).toBeInTheDocument();
    expect(screen.queryByText(/Gericht/i)).not.toBeInTheDocument();
  });

  it('opens chat pane from Mit Mora schreiben', () => {
    render(<LagefeldApp paneId="test-pane" />);
    fireEvent.click(screen.getByTestId('lagefeld-open-chat'));
    expect(usePaneStore.getState().panes.some((p) => p.type === 'chat')).toBe(true);
  });
});
