import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListView from '@/components/canvas/FolderMode/ListView';

const sampleObjects = [
  { id: 'alpha', title: 'Alpha Doc', type: 'file', ts: new Date().toISOString(), path: '/Work/Alpha', tags: ['work'] },
  { id: 'beta', title: 'Beta Doc', type: 'file', ts: new Date().toISOString(), path: '/Work/Beta', tags: ['finance'] },
] as any;

jest.mock('@/lib/hooks/useApi', () => ({
  useMemoryFacts: () => ({ data: sampleObjects, isLoading: false, error: null }),
}));

jest.mock('@/lib/contexts', () => ({
  useAppContext: () => ({
    setSelectedObject: jest.fn(),
    orb: 'all',
    activeTagFilter: null,
    setActiveTagFilter: jest.fn(),
  }),
}));

jest.mock('@/components/documents/DocumentViewer', () => () => null);

describe('Folder ListView bulk actions', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('shows bulk bar and marks reviewed', async () => {
    const user = userEvent.setup();
    render(<ListView />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    expect(screen.getByText(/2 ausgewaehlt/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mark reviewed/i }));
    const stored = localStorage.getItem('mora_reviewed_objects');
    expect(stored).toContain('alpha');
    expect(stored).toContain('beta');
  });
});
