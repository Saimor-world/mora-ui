type Point = { x: number; y: number };
type Size = { width: number; height: number };

const rendered = (size: Size, viewport: Size): Size => viewport.width < 720
  ? { width: Math.min(viewport.width, Math.max(304, viewport.width - 16)), height: Math.min(viewport.height, Math.max(360, viewport.height - 148)) }
  : { width: Math.min(size.width, viewport.width - 32), height: Math.min(size.height, viewport.height - 160) };

/** Preserve centring across viewport changes; keep a manually placed window reachable. */
export function fitPanePosition(position: Point, size: Size, viewport: Size, previousViewport?: Size): Point {
  const actual = rendered(size, viewport);
  const center = { x: Math.floor((viewport.width - actual.width) / 2), y: Math.floor((viewport.height - actual.height) / 2) };
  if (viewport.width < 720) return center;
  if (previousViewport) {
    const old = rendered(size, previousViewport);
    const wasCentered = Math.abs(position.x - (previousViewport.width - old.width) / 2) <= 2 && Math.abs(position.y - (previousViewport.height - old.height) / 2) <= 2;
    if (wasCentered) return center;
  }
  return {
    x: Math.max(16, Math.min(position.x, viewport.width - actual.width - 16)),
    y: Math.max(16, Math.min(position.y, viewport.height - actual.height - 80)),
  };
}
