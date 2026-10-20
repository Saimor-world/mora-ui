import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MoraLook } from '@/components/universe/MoraLook';
import { resetAllStores } from '../test-utils';

describe('MÔRA look', () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.dataset.uv2Theme = 'dark';
  });

  it('uses the stone with eyes in dark mode, not a recoloured crystal', () => {
    render(<MoraLook look="dark" size={96} />);
    expect(screen.getByTestId('uv2-mora-stone')).toHaveAttribute('src', '/brand/mora-stone-v1.png');
    expect(document.querySelector('.mora-face')).toBeTruthy();
    expect(document.querySelector('.mora-face__leak')).toBeNull();
    expect(document.querySelector('.uv2-mora-stone-matte')).toBeTruthy();
    expect(document.querySelector('.uv2-mora-crystal__body')).toBeNull();
  });

  it('keeps the jade crystal for light mode', () => {
    render(<MoraLook look="light" size={96} />);
    expect(screen.queryByTestId('uv2-mora-stone')).toBeNull();
    expect(document.querySelector('.uv2-mora-crystal__body')).toBeTruthy();
  });
});
