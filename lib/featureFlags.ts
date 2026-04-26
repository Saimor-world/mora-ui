/**
 * Real Mora feature flags.
 * See: docs/superpowers/specs/2026-04-25-real-mora-design.md §8.1
 *
 * Defaults: all OFF. Flip flags via env vars (NEXT_PUBLIC_MORA_*) once a
 * phase has been verified in production.
 */

function readBool(envVar: string): boolean {
  const v = process.env[envVar];
  return v === 'true' || v === '1';
}

export function isMoraPerceiveV1Enabled(): boolean {
  return readBool('NEXT_PUBLIC_MORA_PERCEIVE_V1');
}

export function isMoraDialogueV1Enabled(): boolean {
  return readBool('NEXT_PUBLIC_MORA_DIALOGUE_V1');
}

export function isMoraLiveV1Enabled(): boolean {
  return readBool('NEXT_PUBLIC_MORA_LIVE_V1');
}

export interface MoraFeatureFlags {
  perceiveV1: boolean;
  dialogueV1: boolean;
  liveV1: boolean;
}

export function getMoraFeatureFlags(): MoraFeatureFlags {
  return {
    perceiveV1: isMoraPerceiveV1Enabled(),
    dialogueV1: isMoraDialogueV1Enabled(),
    liveV1: isMoraLiveV1Enabled(),
  };
}
