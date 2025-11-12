import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestionsPanel from '@/components/home/SuggestionsPanel';
import type { MoraEvent } from '@/lib/mora/listener';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/mora/listener', () => ({
  useMoraAwareness: () => ({ lastEvent: null, events: [], emit: jest.fn(), clear: jest.fn() }),
  registerSessionRecorder: jest.fn(),
}));

jest.mock('@/store/session', () => {
  const store = {
    dismissedSuggestionIds: [] as string[],
    setSuggestionDismissed: jest.fn(),
    suggestionsCollapsed: false,
    setSuggestionsCollapsed: jest.fn(),
    addFavorite: jest.fn(),
  };
  return {
    useSessionStore: (selector: (state: typeof store) => any) => selector(store),
  };
});

describe('SuggestionsPanel', () => {
  it('renders suggestion for node_click and dismiss persists', async () => {
    const event: MoraEvent = {
      action: 'node_click',
      ts: Date.now(),
      payload: {
        id: 'node-finance',
        title: 'Finance Deck',
        path: '/Finance/Q4',
        tags: ['finance'],
      },
    };

    const user = userEvent.setup();
    const { rerender } = render(<SuggestionsPanel testEvent={event} />);

    expect(screen.getByText(/Finanz-Pfad vormerken/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Als Favorit pinnen/i }));
    expect(screen.queryByText(/Finanz-Pfad vormerken/i)).not.toBeInTheDocument();

    rerender(<SuggestionsPanel testEvent={event} />);
    expect(screen.queryByText(/Finanz-Pfad vormerken/i)).not.toBeInTheDocument();
  });
});
