import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { UniverseLandscape } from '@/features/universe/ui/UniverseLandscape';
import { buildLandscape } from '@/features/universe/data/landscape';
import { sampleLandscapeInput } from '@/features/universe/data/sample';

const landscape = buildLandscape({ ...sampleLandscapeInput(), finance: { kind: 'state', label: 'nicht geprüft' }, labs: { count: 3, names: ['A'] } });

describe('UniverseLandscape', () => {
  it('renders planets around the MÔRA core, orbits and strands', () => {
    const { container } = render(<UniverseLandscape landscape={landscape} sample onOpenArea={jest.fn()} onAskMora={jest.fn()} />);
    expect(screen.getByTestId('universe-core')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-planet]')).toHaveLength(7);
    expect(container.querySelectorAll('ellipse')).toHaveLength(2);
    expect(container.querySelector('[data-strand="post-finance"]')).toHaveAttribute('data-evidence', 'inferred');
    expect(screen.getByTestId('universe-attention')).toHaveTextContent('Heute');
  });
  it('focus → glass detail panel with moons → open area', () => {
    const onOpenArea = jest.fn();
    const { container } = render(<UniverseLandscape landscape={landscape} sample onOpenArea={onOpenArea} onAskMora={jest.fn()} />);
    fireEvent.click(container.querySelector('[data-planet="post"]')!);
    const panel = screen.getByTestId('universe-detail');
    expect(within(panel).getByText('Post')).toBeInTheDocument();
    expect(within(panel).getAllByText('Beispiel').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Beispiel: Rechnung Oktober')).toBeInTheDocument();
    expect(screen.getByTestId('universe-landscape')).toHaveAttribute('data-focus', 'post');
    expect(screen.getByTestId('universe-landscape')).toHaveAttribute('data-motion', 'still');
    fireEvent.click(screen.getByTestId('universe-open-area'));
    expect(onOpenArea).toHaveBeenCalledWith('post');
  });
  it('Escape returns to the overview; MÔRA core asks MÔRA', () => {
    const onAskMora = jest.fn();
    const { container } = render(<UniverseLandscape landscape={landscape} sample onOpenArea={jest.fn()} onAskMora={onAskMora} />);
    fireEvent.click(container.querySelector('[data-planet="finance"]')!);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('universe-detail')).toBeNull();
    fireEvent.click(screen.getByTestId('universe-core'));
    expect(onAskMora).toHaveBeenCalled();
  });
  it('respects prefers-reduced-motion (no orbit)', () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as any;
    render(<UniverseLandscape landscape={landscape} sample onOpenArea={jest.fn()} onAskMora={jest.fn()} />);
    expect(screen.getByTestId('universe-landscape')).toHaveAttribute('data-motion', 'still');
    window.matchMedia = orig;
  });
});
