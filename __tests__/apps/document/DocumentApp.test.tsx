import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api/coreClient', () => ({
  fetchNodeDetails: jest.fn().mockResolvedValue(null),
  fetchNodeRelations: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/filesClient', () => ({
  getCompanyFileUrl: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/utils/contentOpen', () => ({
  getNodeSourceFileId: jest.fn().mockReturnValue(null),
  getNodeSourceFileName: jest.fn().mockReturnValue(''),
  openSourceFileForNode: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/lib/utils/searchOpen', () => ({
  openNavigationOutcome: jest.fn(),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="glass-panel">{children}</div>,
}));

const mockPane = {
  id: 'doc-1', type: 'document', title: 'Dokument',
  position: { x: 0, y: 0 }, size: { width: 720, height: 560 },
  zIndex: 1, minimized: false, data: {},
};
jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const store = {
      openPane: jest.fn(),
      removePane: jest.fn(),
      minimizePane: jest.fn(),
      focusPane: jest.fn(),
      getPane: jest.fn().mockReturnValue(mockPane),
      updatePanePosition: jest.fn(),
      updatePaneSize: jest.fn(),
      activePaneId: 'doc-1',
    };
    return selector ? selector(store) : store;
  },
}));

import DocumentApp from '@/apps/document/index';

describe('DocumentApp', () => {
  it('renders loading state when nodeId is absent', async () => {
    render(<DocumentApp paneId="doc-1" initialData={{}} />);
    // No nodeId → skips fetch, goes straight to empty-document state
    expect(await screen.findByText(/Dieser Eintrag hat noch keinen Textinhalt/i)).toBeInTheDocument();
  });

  it('renders inside a GlassPanel wrapper', async () => {
    render(<DocumentApp paneId="doc-1" initialData={{}} />);
    expect(await screen.findByTestId('glass-panel')).toBeInTheDocument();
  });
});
