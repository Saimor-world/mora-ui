import React from 'react';
import { render } from '@testing-library/react';
import OrbFilter from '@/components/lens/OrbFilter';

describe('OrbFilter reactivity', () => {
  it('applies breathing style when actions exist', () => {
    const { container } = render(<OrbFilter selected="all" onChange={() => {}} hasActions />);
    expect(container.firstChild?.className).toMatch(/animate-\[pulse_3\.4s/);
    expect(container.firstChild?.className).toMatch(/bg-primary\/5/);
  });

  it('highlights risk state', () => {
    const { container } = render(<OrbFilter selected="all" onChange={() => {}} hasRisk />);
    expect(container.firstChild?.className).toMatch(/ring-amber-400/);
    expect(container.firstChild?.className).toMatch(/animate-\[pulse_1\.3s/);
  });
});
