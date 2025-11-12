import { fireEvent, render, screen } from '@testing-library/react';
import FilterBadge from '@/components/ui/FilterBadge';

const mockSetOrb = jest.fn();
const mockSetTag = jest.fn();

jest.mock('@/lib/contexts', () => ({
  useAppContext: () => ({
    orb: 'leitung',
    activeTagFilter: 'finance',
    setOrb: mockSetOrb,
    setActiveTagFilter: mockSetTag,
  }),
}));

describe('FilterBadge', () => {
  beforeEach(() => {
    mockSetOrb.mockClear();
    mockSetTag.mockClear();
  });

  it('shows orb and tag badges with clear actions', () => {
    render(<FilterBadge />);
    expect(screen.getByText(/Gefiltert: Leitung/i)).toBeInTheDocument();
    expect(screen.getByText(/#finance/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Filter entfernen'));
    expect(mockSetOrb).toHaveBeenCalledWith('all');
  });
});
