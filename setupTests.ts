import '@testing-library/jest-dom';

if (typeof global.requestAnimationFrame === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).requestAnimationFrame = (callback: FrameRequestCallback) =>
    Number(setTimeout(() => callback(Date.now()), 16));
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as NodeJS.Timeout);
}

if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    Number(setTimeout(() => callback(Date.now()), 16));
}

if (typeof window.cancelAnimationFrame === 'undefined') {
  window.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as NodeJS.Timeout);
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  unobserve() {}
}

class MockResizeObserver implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = MockIntersectionObserver;
}

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = MockResizeObserver;
}

Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
      beginPath: () => {},
      arc: () => {},
      quadraticCurveTo: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      moveTo: () => {},
      lineTo: () => {},
      setLineDash: () => {},
      lineDashOffset: 0,
      globalCompositeOperation: 'source-over',
      stroke: () => {},
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;
  },
});
