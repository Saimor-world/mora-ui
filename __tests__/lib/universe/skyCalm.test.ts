import { skyLayout } from '@/lib/universe/skyLayout';

describe('Himmel bleibt ruhig', () => {
  it.each([[1200, 680], [1440, 560], [1024, 520]])('%ix%i: kleine Planeten, nichts überlappt', (w, h) => {
    const s = skyLayout([3, 2, 2.5, 0, 1, 0.2], w, h);
    s.forEach((a) => expect(a.size).toBeLessThanOrEqual(Math.max(44, h * 0.16)));
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const d = Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y);
      expect(d).toBeGreaterThan((s[i].size + s[j].size) / 2 + 40);
    }
  });
});
