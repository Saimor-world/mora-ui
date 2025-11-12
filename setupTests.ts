import '@testing-library/jest-dom';

Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;
  },
});
