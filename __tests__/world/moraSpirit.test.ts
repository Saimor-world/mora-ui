import { isNight, SPIRIT_LABEL } from '@/components/world/MoraSpirit';

describe('MoraSpirit', () => {
  it('ruht nachts nach lokaler Uhrzeit', () => {
    expect(isNight(new Date(2026, 9, 25, 23, 0))).toBe(true);
    expect(isNight(new Date(2026, 9, 25, 5, 59))).toBe(true);
    expect(isNight(new Date(2026, 9, 25, 15, 0))).toBe(false);
  });
  it('hat für jeden Zustand einen deutschen Screenreader-Text', () => {
    for (const k of ['idle', 'listening', 'thinking', 'speaking', 'flying', 'waiting', 'done', 'error', 'night'] as const) expect(SPIRIT_LABEL[k]).toMatch(/MÔRA/);
  });
});
