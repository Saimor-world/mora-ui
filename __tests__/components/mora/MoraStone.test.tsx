import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoraStone, clampMoraSize } from '@/components/mora/MoraStone';
import { stylebook } from '@/lib/design/tokens';

describe('MoraStone', () => {
  it('is a round jade stone with the stylebook gradient, light top left', () => {
    const { container } = render(<MoraStone size={64} />);
    const gradient = container.querySelector('radialGradient')!;
    expect(gradient).toHaveAttribute('cx', '38%');
    expect(gradient).toHaveAttribute('cy', '32%');
    const stops = Array.from(gradient.querySelectorAll('stop')).map((stop) => stop.getAttribute('stop-color'));
    expect(stops).toEqual([stylebook.mora.light, stylebook.mora.mid, stylebook.mora.deep]);
    const body = container.querySelector('circle')!;
    expect(body.getAttribute('fill')).toBe(`url(#${gradient.id})`);
  });

  it('has exactly two oval dark eyes and no mouth or other shapes', () => {
    const { container } = render(<MoraStone size={64} />);
    const eyes = container.querySelectorAll('ellipse.sb-mora__eye');
    expect(eyes).toHaveLength(2);
    eyes.forEach((eye) => {
      expect(Number(eye.getAttribute('ry'))).toBeGreaterThan(Number(eye.getAttribute('rx')));
      expect(eye.getAttribute('fill')).toBe(stylebook.mora.eye);
    });
    expect(container.querySelectorAll('path, line, polyline, img')).toHaveLength(0);
  });

  it('clamps the size to 24–96 px', () => {
    expect(clampMoraSize(10)).toBe(24);
    expect(clampMoraSize(56)).toBe(56);
    expect(clampMoraSize(176)).toBe(96);
    expect(clampMoraSize(undefined)).toBe(40);
    render(<MoraStone size={200} />);
    expect(screen.getByTestId('mora-stone')).toHaveAttribute('width', '96');
  });

  it('is decorative without a label and an image with one', () => {
    const { rerender } = render(<MoraStone />);
    expect(screen.getByTestId('mora-stone')).toHaveAttribute('aria-hidden', 'true');
    rerender(<MoraStone label="MÔRA" />);
    expect(screen.getByRole('img', { name: 'MÔRA' })).toBeInTheDocument();
  });

  it('gives every stone its own gradient id so several can share a page', () => {
    const { container } = render(<><MoraStone /><MoraStone /></>);
    const ids = Array.from(container.querySelectorAll('radialGradient')).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('can be still, for dense lists', () => {
    render(<MoraStone still />);
    expect(screen.getByTestId('mora-stone')).toHaveStyle({ animation: 'none' });
  });
});
