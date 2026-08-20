import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppLibraryApp from '@/apps/apps';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <div data-testid="glass-panel">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

const mockOpenPane = jest.fn();
const mockRemovePane = jest.fn();

describe('AppLibraryApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    usePaneStore.setState({
      panes: [{
        id: 'apps-main',
        type: 'apps',
        title: 'Apps',
        position: { x: 100, y: 100 },
        size: { width: 900, height: 680 },
        zIndex: 10,
        minimized: false,
      }],
      activePaneId: 'apps-main',
      openPane: mockOpenPane,
      removePane: mockRemovePane,
      minimizePane: jest.fn(),
      focusPane: jest.fn(),
      getPane: (id: string) => usePaneStore.getState().panes.find((pane) => pane.id === id),
      updatePanePosition: jest.fn(),
      updatePaneSize: jest.fn(),
    } as any);

    useSessionStore.setState({
      user: { role: 'owner' },
    } as any);
  });

  it('renders grouped app cards with stable layout hooks', () => {
    render(<AppLibraryApp paneId="apps-main" />);

    expect(screen.getByTestId('app-library')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Arbeitsweisen' })).toBeInTheDocument();
    expect(screen.getByText('Studio · Beta')).toBeInTheDocument();
    expect(screen.getByTestId('app-library-card-finder')).toBeInTheDocument();
    expect(screen.queryByTestId('app-library-card-codex')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-library-group-work')).toBeInTheDocument();
    expect(screen.getByTestId('app-library-group-agents_flows')).toBeInTheDocument();
  });

  it('filters apps by search query', () => {
    render(<AppLibraryApp paneId="apps-main" />);

    fireEvent.change(screen.getByLabelText('Apps durchsuchen'), { target: { value: 'nightwatch' } });

    expect(screen.getByTestId('app-library-card-nightwatch')).toBeInTheDocument();
    expect(screen.queryByTestId('app-library-card-finder')).not.toBeInTheDocument();
  });

  it('filters apps by category chip', () => {
    render(<AppLibraryApp paneId="apps-main" />);

    fireEvent.click(screen.getByRole('tab', { name: /Studio/i }));

    expect(screen.getByTestId('app-library-group-studio')).toBeInTheDocument();
    expect(screen.queryByTestId('app-library-group-work')).not.toBeInTheDocument();
  });

  it('opens a selected app and closes the library pane', () => {
    render(<AppLibraryApp paneId="apps-main" />);

    fireEvent.click(screen.getByTestId('app-library-card-chat'));

    expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chat-main',
      type: 'chat',
      title: 'Chat',
    }));
    expect(mockRemovePane).toHaveBeenCalledWith('apps-main');
  });
});
