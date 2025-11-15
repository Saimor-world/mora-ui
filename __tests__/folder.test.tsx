import { fireEvent, render, screen } from '@testing-library/react';
import ListView from '@/components/canvas/FolderMode/ListView';
import { useMemoryFacts } from '@/lib/hooks/useApi';

jest.mock('@/lib/hooks/useApi', () => ({
  useMemoryFacts: jest.fn(),
}));
jest.mock('@/lib/contexts', () => ({
  useAppContext: () => ({
    setSelectedObject: jest.fn(),
    orb: 'all',
    activeTagFilter: null,
    setActiveTagFilter: jest.fn(),
  }),
}));
jest.mock('@/lib/hooks/useRole', () => ({
  useRole: () => ({ definition: { folderHint: 'Folder Hinweis' } }),
}));
jest.mock('@/components/documents/DocumentViewer', () => () => null);

const mockedUseMemoryFacts = useMemoryFacts as jest.Mock;

describe('Folder ListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders descriptive empty state when there are no objects', () => {
    mockedUseMemoryFacts.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ListView />);
    expect(
      screen.getByText((content) => content.includes('In diesem Ordner liegen aktuell keine Objekte'))
    ).toBeInTheDocument();
  });

  it('shows hover toolbar when row receives focus', () => {
    mockedUseMemoryFacts.mockReturnValue({
      data: [
        {
          id: '1',
          title: 'Demo Doc',
          type: 'file',
          ts: '2025-11-12T12:00:00Z',
          path: '/demo',
          tags: [],
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<ListView />);
    const row = screen.getByText('Demo Doc').closest('[role="button"]') as HTMLElement;
    fireEvent.focus(row);
    expect(screen.getByTitle(/Preview/i)).toBeInTheDocument();
  });

  it('sorts rows by name when selected', () => {
    mockedUseMemoryFacts.mockReturnValue({
      data: [
        {
          id: '2',
          title: 'Beta Doc',
          type: 'file',
          ts: '2025-11-13T12:00:00Z',
          path: '/beta',
          tags: [],
        },
        {
          id: '1',
          title: 'Alpha Doc',
          type: 'file',
          ts: '2025-11-12T12:00:00Z',
          path: '/alpha',
          tags: [],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<ListView />);
    let titles = screen.getAllByTestId('folder-title').map((el) => el.textContent);
    expect(titles[0]).toBe('Beta Doc');

    fireEvent.click(screen.getByRole('button', { name: /^Name$/i }));
    titles = screen.getAllByTestId('folder-title').map((el) => el.textContent);
    expect(titles[0]).toBe('Alpha Doc');
  });
});
