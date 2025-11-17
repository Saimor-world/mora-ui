import React from 'react';
import { render } from '@testing-library/react';
import OrbFilter from '@/components/lens/OrbFilter';

describe('OrbFilter reactivity', () => {
  it('applies breathing style when actions exist', () => {
    const { container } = render(<OrbFilter selected="all" onChange={() => {}} hasActions />);
    expect(container.firstChild?.className).toMatch(/mora-breathe/);
  });

  it('highlights risk state', () => {
    const { container } = render(<OrbFilter selected="all" onChange={() => {}} hasRisk />);
    expect(container.firstChild?.className).toMatch(/shadow-inner/);
  });
});
