/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { useAmbientCapability } from '@/lib/hooks/useAmbientCapability';

function setMatchMedia(matches: Record<string, boolean>) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: Boolean(matches[query]),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

describe('useAmbientCapability', () => {
  const originalDeviceMemory = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory');
  const originalConcurrency = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency');

  afterEach(() => {
    jest.useRealTimers();
    if (originalDeviceMemory) {
      Object.defineProperty(Navigator.prototype, 'deviceMemory', originalDeviceMemory);
    } else {
      // @ts-expect-error cleanup test override
      delete Navigator.prototype.deviceMemory;
    }
    if (originalConcurrency) {
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', originalConcurrency);
    }
  });

  it('disables heavy ambient when prefers-reduced-motion is set', () => {
    setMatchMedia({
      '(prefers-reduced-motion: reduce)': true,
      '(pointer: coarse)': false,
    });

    const { result } = renderHook(() => useAmbientCapability(50));

    expect(result.current.enableHeavy).toBe(false);
    expect(result.current.density).toBe('off');
    expect(result.current.heavyReady).toBe(false);
  });

  it('uses low density on coarse pointer and becomes ready after idle timeout', async () => {
    jest.useFakeTimers();
    setMatchMedia({
      '(prefers-reduced-motion: reduce)': false,
      '(pointer: coarse)': true,
    });
    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
      configurable: true,
      get: () => 8,
    });
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      configurable: true,
      get: () => 8,
    });
    // Force setTimeout path (no requestIdleCallback)
    // @ts-expect-error test override
    window.requestIdleCallback = undefined;

    const { result } = renderHook(() => useAmbientCapability(1200));

    expect(result.current.enableHeavy).toBe(true);
    expect(result.current.density).toBe('low');
    expect(result.current.heavyReady).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    expect(result.current.heavyReady).toBe(true);
  });
});
