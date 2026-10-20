import { capDevicePixelRatio, recordFpsSample, SPACE_DPR_CAP, SPACE_DRIFT, spaceLoopAllowed } from '@/lib/universe/spaceField';

describe('Universe space field', () => {
  it('caps device pixel ratio for the GPU loop', () => {
    expect(capDevicePixelRatio(3)).toBe(SPACE_DPR_CAP);
    expect(capDevicePixelRatio(1)).toBe(1);
  });

  it('pauses when hidden or when motion is reduced', () => {
    expect(spaceLoopAllowed(true, false)).toBe(false);
    expect(spaceLoopAllowed(false, true)).toBe(false);
    expect(spaceLoopAllowed(false, false)).toBe(true);
  });

  it('drifts stars instead of holding a still field', () => {
    expect(SPACE_DRIFT.near).toBeGreaterThan(20);
    expect(SPACE_DRIFT.dust).toBeGreaterThan(10);
  });

  it('smooths FPS samples', () => {
    const a = recordFpsSample(0, 16.6);
    expect(a).toBeGreaterThan(50);
    const b = recordFpsSample(a, 16.6);
    expect(b).toBeGreaterThan(50);
  });
});
