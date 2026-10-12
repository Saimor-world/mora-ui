// Universe v2 – „Der Morgen“: Flag, Glocke, Absichts-Routing.
export function isUniverseV2Enabled(): boolean {
  const v = process.env.NEXT_PUBLIC_UNIVERSE_V2;
  return v === 'true' || v === '1';
}

export type Intent = 'body' | 'today' | 'evening' | 'home';

export function routeIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/(server|körper|koerper|wache|vital|disk|speicher|fieber)/.test(s)) return 'body';
  if (/(abend|rückblick|rueckblick|war heute)/.test(s)) return 'evening';
  if (/(wichtig|heute|priorit|was steht)/.test(s)) return 'today';
  return 'home';
}

const MUTE_KEY = 'saimor_universe_bell_muted';
export const isBellMuted = () => typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === '1';
export const setBellMuted = (m: boolean) => window.localStorage.setItem(MUTE_KEY, m ? '1' : '0');

/** „Mor“ – eine leise, tiefe Glocke (Grundton + zwei Teiltöne, 4 s Ausklang). */
export function ringBell(): void {
  if (typeof window === 'undefined' || isBellMuted()) return;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const t = ctx.currentTime;
    [[196, 0.05], [392 * 1.01, 0.018], [587, 0.008]].forEach(([f, g]) => {
      const o = ctx.createOscillator(); const v = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.02);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(v).connect(ctx.destination); o.start(t); o.stop(t + 4.1);
    });
    setTimeout(() => ctx.close?.(), 4500);
  } catch { /* Ton ist Zierde, nie Pflicht */ }
}
