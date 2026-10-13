/**
 * Universe V2 "Raum" settings: MÔRA voice warmth and quiet hours.
 * Stored in localStorage (and synced with the account settings by the caller).
 */
export const PRESENCE_KEYS = { warmth: 'mora_voice_warmth', quietFrom: 'mora_quiet_from', quietTo: 'mora_quiet_to' } as const;

export function readVoiceWarmth(): number {
  if (typeof window === 'undefined') return 50;
  const v = Number(window.localStorage.getItem(PRESENCE_KEYS.warmth));
  return Number.isFinite(v) && window.localStorage.getItem(PRESENCE_KEYS.warmth) !== null ? Math.min(100, Math.max(0, v)) : 50;
}

/** warm = lower pitch, slower; cool = brighter, a bit faster. */
export function voiceParams(warmth: number): { pitch: number; rate: number } {
  const w = Math.min(100, Math.max(0, warmth)) / 100;
  return { pitch: +(1.15 - w * 0.35).toFixed(2), rate: +(1.08 - w * 0.16).toFixed(2) };
}

export function voiceLabel(warmth: number): string {
  return warmth >= 67 ? 'warm' : warmth <= 33 ? 'klar' : 'ruhig';
}

export function readQuietHours(): { from: number | null; to: number } {
  if (typeof window === 'undefined') return { from: null, to: 7 };
  const f = window.localStorage.getItem(PRESENCE_KEYS.quietFrom);
  const t = Number(window.localStorage.getItem(PRESENCE_KEYS.quietTo) ?? 7);
  return { from: f === null || f === '' ? null : Number(f), to: Number.isFinite(t) ? t : 7 };
}

export function isQuietNow(now: Date = new Date()): boolean {
  const { from, to } = readQuietHours();
  if (from === null) return false;
  const h = now.getHours();
  return from > to ? h >= from || h < to : h >= from && h < to;
}
