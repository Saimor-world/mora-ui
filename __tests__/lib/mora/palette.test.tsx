import { renderHook } from '@testing-library/react';
import { usePalette } from '@/lib/mora/palette';

describe('usePalette', () => {
  beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/'); });
  it('defaults to Polarlicht-Dämmerung (2)', () => {
    const { result } = renderHook(() => usePalette());
    expect(result.current).toBe('2');
    expect(document.documentElement.dataset.palette).toBe('2');
  });
  it('?palette=1 still switches to Klare Nacht', () => {
    window.history.replaceState(null, '', '/?palette=1');
    const { result } = renderHook(() => usePalette());
    expect(result.current).toBe('1');
  });
});
