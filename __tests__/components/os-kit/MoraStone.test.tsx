import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoraStone } from '@/components/os-kit';

describe('MoraStone', () => {
  it('renders the real stone asset with halo', () => {
    const { container } = render(<MoraStone size={24} />);
    const stone = screen.getByTestId('mora-stone');
    expect(stone).toHaveClass('os-mora-stone--halo');
    expect(stone).toHaveAttribute('data-thinking', 'false');
    expect(container.querySelector('img')).toHaveAttribute('src', '/brand/mora-stone-v1.png');
  });
  it('shows the thinking state', () => {
    render(<MoraStone thinking label="MÔRA denkt" />);
    const stone = screen.getByRole('img', { name: 'MÔRA denkt' });
    expect(stone).toHaveClass('os-mora-stone--thinking');
    expect(stone).toHaveAttribute('data-thinking', 'true');
  });
});
