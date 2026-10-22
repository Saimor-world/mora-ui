import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoraStone } from '@/components/os-kit';

// The os-kit export is the stylebook stone (components/mora/MoraStone); the old
// PNG asset with halo glow was replaced on 22.10.2026.
describe('MoraStone (os-kit export)', () => {
  it('renders the stylebook stone, not the old PNG', () => {
    const { container } = render(<MoraStone size={24} />);
    const stone = screen.getByTestId('mora-stone');
    expect(stone.tagName.toLowerCase()).toBe('svg');
    expect(stone).toHaveAttribute('data-thinking', 'false');
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps the thinking and halo props of the os-kit contract', () => {
    render(<MoraStone thinking halo label="MÔRA denkt" />);
    const stone = screen.getByRole('img', { name: 'MÔRA denkt' });
    expect(stone).toHaveAttribute('data-thinking', 'true');
    expect(stone).toHaveAttribute('data-selected', 'true');
  });
});
