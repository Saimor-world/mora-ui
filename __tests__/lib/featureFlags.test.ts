import { isMoraPerceiveV1Enabled, getMoraFeatureFlags } from '@/lib/featureFlags';

describe('featureFlags', () => {
  const originalEnv = process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1;
    else process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = originalEnv;
  });

  it('isMoraPerceiveV1Enabled returns true when env is "true"', () => {
    process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'true';
    expect(isMoraPerceiveV1Enabled()).toBe(true);
  });

  it('isMoraPerceiveV1Enabled returns false when env is "false"', () => {
    process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'false';
    expect(isMoraPerceiveV1Enabled()).toBe(false);
  });

  it('isMoraPerceiveV1Enabled returns false when env is undefined', () => {
    delete process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1;
    expect(isMoraPerceiveV1Enabled()).toBe(false);
  });

  it('getMoraFeatureFlags returns object with current flag values', () => {
    process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'true';
    const flags = getMoraFeatureFlags();
    expect(flags.perceiveV1).toBe(true);
    expect(flags).toHaveProperty('dialogueV1');
    expect(flags).toHaveProperty('liveV1');
  });
});
