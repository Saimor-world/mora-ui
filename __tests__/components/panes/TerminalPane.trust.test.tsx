import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { coreGet, corePost, fetchFoldersByCompany, getCoreBaseUrl } from '@/lib/api/coreClient';

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
  corePost: jest.fn(),
  fetchFoldersByCompany: jest.fn(),
  getCoreBaseUrl: jest.fn(() => '/api/core'),
}));

const mockedCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;
const mockedCorePost = corePost as jest.MockedFunction<typeof corePost>;
const mockedFetchFoldersByCompany = fetchFoldersByCompany as jest.MockedFunction<typeof fetchFoldersByCompany>;
const mockedGetCoreBaseUrl = getCoreBaseUrl as jest.MockedFunction<typeof getCoreBaseUrl>;

function openTerminal() {
  usePaneStore.getState().openPane({
    id: 'terminal-main',
    type: 'terminal',
    title: 'Terminal',
    size: { width: 800, height: 500 },
  });
}

function setAuthenticatedState() {
  useMoraStore.setState({
    user: {
      id: 'u-1',
      name: 'Max',
      email: 'max@firma.de',
      role: 'admin',
    },
    activeCompanyId: 'company-1',
  });
}

describe('TerminalPane trust pass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCoreBaseUrl.mockReturnValue('/api/core');
    usePaneStore.getState().reset();
    useMoraStore.setState({
      user: null,
      activeCompanyId: null,
    });
    openTerminal();
  });

  it('locks the terminal when unauthenticated', async () => {
    mockedCoreGet.mockResolvedValue(null as never);

    render(<TerminalPane id="terminal-main" />);

    expect(await screen.findByText(/Terminal gesperrt/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows ipconfig as local browser/core diagnostics without corePost', async () => {
    setAuthenticatedState();
    mockedCoreGet.mockResolvedValue({ providers: {} } as never);

    render(<TerminalPane id="terminal-main" />);

    await screen.findByText(/Verbunden als max@firma.de/i);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ipconfig' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/BROWSER-VERBINDUNG/i)).toBeInTheDocument();
    expect(mockedCorePost).not.toHaveBeenCalled();
  });

  it('normalizes list to dir and renders accessible folders', async () => {
    setAuthenticatedState();
    mockedCoreGet.mockResolvedValue({ providers: {} } as never);
    mockedFetchFoldersByCompany.mockResolvedValue([
      { id: 'f-1', space_id: 's-1', name: 'Eingehende Rechnungen', order: 1, node_count: 12 },
      { id: 'f-2', space_id: 's-1', name: 'Vertragsvorlagen', order: 2, node_count: 8 },
    ] as never);

    render(<TerminalPane id="terminal-main" />);

    await screen.findByText(/Verbunden als max@firma.de/i);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'list' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/WORKSPACE ORDNER/i)).toBeInTheDocument();
    expect(screen.getByText(/Eingehende Rechnungen/i)).toBeInTheDocument();
    expect(screen.getByText(/Vertragsvorlagen/i)).toBeInTheDocument();
    expect(mockedFetchFoldersByCompany).toHaveBeenCalledWith('company-1');
  });

  it('keeps local commands available while offline', async () => {
    setAuthenticatedState();
    mockedCoreGet.mockResolvedValue(null as never);

    render(<TerminalPane id="terminal-main" />);

    await screen.findByText(/Core gerade nicht erreichbar/i);
    const input = screen.getByRole('textbox');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'status' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Verbindung: offline/i)).toBeInTheDocument();
    });
  });
});
