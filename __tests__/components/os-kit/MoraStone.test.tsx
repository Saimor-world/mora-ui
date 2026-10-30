import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoraStone } from '@/components/os-kit';

describe('MoraStone', () => {
  it('shows the current pixel MÔRA with halo, never the retired stone', () => {
    const { container } = render(<MoraStone size={24} />);
    const stone = screen.getByTestId('mora-stone');
    expect(stone).toHaveClass('os-mora-stone--halo');
    expect(stone).toHaveAttribute('data-thinking', 'false');
    expect(container.querySelector('img[src="/mora/pixel/body.png"]')).not.toBeNull();
    expect(container.querySelector('img[src*="mora-stone"]')).toBeNull();
  });
  it('shows the thinking state', () => {
    render(<MoraStone thinking label="MÔRA denkt" />);
    const stone = screen.getByRole('img', { name: 'MÔRA denkt' });
    expect(stone).toHaveClass('os-mora-stone--thinking');
    expect(stone).toHaveAttribute('data-thinking', 'true');
  });
});
