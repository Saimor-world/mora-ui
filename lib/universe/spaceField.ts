/** GPU space-field knobs. Keep the loop cheap: capped DPR, paused when hidden. */
export const SPACE_DPR_CAP = 1.25;
export const SPACE_COUNTS = { far: 380, mid: 160, near: 70, dust: 110 } as const;

export function spaceLoopAllowed(hidden: boolean, reducedMotion: boolean): boolean {
  return !hidden && !reducedMotion;
}

export function capDevicePixelRatio(raw: number, cap = SPACE_DPR_CAP): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(cap, raw);
}

export function recordFpsSample(prev: number, dtMs: number): number {
  if (!(dtMs > 0) || dtMs > 1000) return prev;
  const inst = 1000 / dtMs;
  if (!Number.isFinite(prev) || prev <= 0) return inst;
  return prev * 0.9 + inst * 0.1;
}
