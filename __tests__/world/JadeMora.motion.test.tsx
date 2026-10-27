import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { JadeMora, JadeMoraStage } from '@/components/world/JadeMora';

jest.mock('@/lib/mora/useWardrobe', () => ({
  useWardrobe: () => [{ neck: null }], useFounder: () => false,
}));
jest.mock('@/components/world/MoraSpirit', () => ({
  isNight: () => false, SPIRIT_LABEL: { idle: 'Bereit' },
}));

describe('Jade MÔRA motion preference changes', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each(['scene', 'wardrobe'] as const)('%s opens the eyes when still mode interrupts a blink', variant => {
    const figure = (reduced: boolean) => variant === 'scene'
      ? <JadeMora size={112} mood="idle" reduced={reduced} />
      : <JadeMoraStage wardrobe={{ neck: null }} reduced={reduced} />;
    const { rerender, unmount } = render(figure(false));
    const root = screen.getByTestId(variant === 'scene' ? 'mora-spirit' : 'mora-stage');
    act(() => jest.advanceTimersByTime(variant === 'scene' ? 1800 : 1600));
    expect(root).toHaveAttribute('data-blink', 'true');
    rerender(figure(true));
    expect(root).not.toHaveAttribute('data-blink');
    const eyes = root.querySelector<HTMLElement>('.jm__eyes')!;
    expect(eyes.style.getPropertyValue('--gx')).toBe('0');
    expect(eyes.style.getPropertyValue('--gy')).toBe('0');
    act(() => jest.advanceTimersByTime(8000));
    expect(root).not.toHaveAttribute('data-blink');
    rerender(figure(false));
    act(() => jest.advanceTimersByTime(variant === 'scene' ? 1800 : 1600));
    expect(root).toHaveAttribute('data-blink', 'true');
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
