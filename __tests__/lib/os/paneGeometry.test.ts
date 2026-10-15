import { fitPanePosition } from '@/lib/os/paneGeometry';

it('keeps a centred window centred when the viewport shrinks below its requested size', () => {
  expect(fitPanePosition({ x: 200, y: 120 }, { width: 1040, height: 720 }, { width: 900, height: 700 }, { width: 1440, height: 960 })).toEqual({ x: 16, y: 80 });
});

it('keeps a dragged window reachable without resetting its placement to the centre', () => {
  expect(fitPanePosition({ x: 650, y: 300 }, { width: 400, height: 400 }, { width: 1000, height: 700 }, { width: 1440, height: 960 })).toEqual({ x: 584, y: 220 });
});

it('restores a previously centred maximized window into a larger viewport', () => {
  expect(fitPanePosition({ x: 200, y: 120 }, { width: 1040, height: 720 }, { width: 1600, height: 1000 }, { width: 1440, height: 960 })).toEqual({ x: 280, y: 140 });
});

it('centres the compact panel using its actual mobile dimensions', () => {
  expect(fitPanePosition({ x: 650, y: 300 }, { width: 1040, height: 720 }, { width: 390, height: 844 })).toEqual({ x: 8, y: 74 });
});
