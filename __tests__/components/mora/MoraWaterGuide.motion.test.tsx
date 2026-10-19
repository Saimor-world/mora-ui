import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import MoraWaterGuide from '@/components/mora/MoraWaterGuide';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/mora/MoraOsFace', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/store/orbStore', () => ({
  useOrbStore: (select: (state: unknown) => unknown) => select({ moraPresence: { state: 'calm' } }),
}));

let callbacks: Map<number, FrameRequestCallback>;
let sequence: number;
let hidden: boolean;
const width = window.innerWidth;
const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');

beforeEach(() => {
  callbacks = new Map(); sequence = 0; hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    callbacks.set(++sequence, callback); return sequence;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
});
afterEach(() => {
  cleanup(); jest.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
  else Reflect.deleteProperty(document, 'hidden');
});

function tick() {
  act(() => {
    const pending = [...callbacks.values()]; callbacks.clear();
    pending.forEach(callback => callback(performance.now() + 16));
  });
}
function guide(still: boolean) {
  return <MoraWaterGuide chapter={-1} still={still} label="MÔRA öffnen"
    onActivate={jest.fn()} buttonRef={createRef<HTMLButtonElement>()} />;
}

it('stops frame scheduling while hidden and resumes one loop when visible', () => {
  const { unmount } = render(guide(false));
  tick(); expect(callbacks.size).toBe(1);
  act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  expect(callbacks.size).toBe(0);
  act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  expect(callbacks.size).toBe(1);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(callbacks.size).toBe(1);
  unmount(); expect(callbacks.size).toBe(0);
});

it('renders reduced motion once, repositions on resize, and restarts when motion is enabled', () => {
  const { container, rerender } = render(guide(true));
  tick(); expect(callbacks.size).toBe(0);
  const position = container.querySelector('span[style]') as HTMLSpanElement;
  const before = position.style.transform;
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    window.dispatchEvent(new Event('resize'));
  });
  tick(); expect(position.style.transform).not.toBe(before);
  expect(callbacks.size).toBe(0);
  rerender(guide(false)); tick(); expect(callbacks.size).toBe(1);
  rerender(guide(true)); tick(); expect(callbacks.size).toBe(0);
});
