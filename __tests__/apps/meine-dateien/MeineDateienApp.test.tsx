import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockOpenPane = jest.fn();
const mockPane = {
  id: 'files-1',
  type: 'meine-dateien',
  title: 'Meine Dateien',
  position: { x: 0, y: 0 },
  size: { width: 920, height: 620 },
  zIndex: 1,
  minimized: false,
  data: {},
};

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <div data-testid="glass-panel">
      <div>{title}</div>
      {children}
    </div>
  ),
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const store = {
      openPane: mockOpenPane,
      removePane: jest.fn(),
      minimizePane: jest.fn(),
      focusPane: jest.fn(),
      getPane: jest.fn().mockReturnValue(mockPane),
      updatePanePosition: jest.fn(),
      updatePaneSize: jest.fn(),
      activePaneId: 'files-1',
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@/lib/store/navStore', () => ({
  useNavStore: (selector?: any) => {
    const store = { activeCompanyId: 'company-1' };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@/lib/api/contentClient', () => ({
  fetchMyContent: jest.fn().mockResolvedValue({
    counts: { files: 1, documents: 1 },
    cloud_storage: { connectors: [{ id: 'c1', provider: 'nextcloud', label: 'Nextcloud' }] },
  }),
}));

jest.mock('@/lib/api/filesClient', () => ({
  listCompanyFiles: jest.fn().mockResolvedValue([
    {
      id: 'file-1',
      filename: 'vertrag.pdf',
      mime: 'application/pdf',
      size: 2048,
      created_at: '2026-05-05T10:00:00Z',
      linked_node_id: 'node-1',
      source_available: true,
    },
  ]),
  uploadCompanyFile: jest.fn(),
  requestCreateNodeFromFile: jest.fn(),
  getFileNode: jest.fn(),
  downloadCompanyFile: jest.fn(),
  deleteCompanyFile: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import MeineDateienApp from '@/apps/meine-dateien';

describe('MeineDateienApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders CORE files and the local-first workspace controls', async () => {
    render(<MeineDateienApp paneId="files-1" initialData={{}} />);

    expect((await screen.findAllByText('vertrag.pdf')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CORE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lokal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cloud').length).toBeGreaterThan(0);
  });

  it('creates a local editable note', async () => {
    render(<MeineDateienApp paneId="files-1" initialData={{}} />);
    await screen.findAllByText('vertrag.pdf');

    fireEvent.click(screen.getByRole('button', { name: /Notiz/i }));

    expect(await screen.findByDisplayValue(/# Neue Notiz/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('saimor_local_files_v1')).toContain('Neue Notiz.md');
  });

  it('opens linked CORE files as document panes', async () => {
    render(<MeineDateienApp paneId="files-1" initialData={{}} />);
    await screen.findAllByText('vertrag.pdf');

    fireEvent.click(screen.getByRole('button', { name: /Oeffnen/i }));

    await waitFor(() => {
      expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({
        type: 'document',
        data: expect.objectContaining({ nodeId: 'node-1' }),
      }));
    });
  });
});
