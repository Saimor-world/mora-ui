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

const mockPane = {
  id: 'doc-1', type: 'document', title: 'Dokument',
  position: { x: 0, y: 0 }, zIndex: 1, minimized: false, data: {},
};
jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const store = {
      openPane: jest.fn(),
      getPane: jest.fn().mockReturnValue(mockPane),
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
});
