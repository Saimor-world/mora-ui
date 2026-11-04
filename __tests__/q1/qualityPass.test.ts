import { skyLayout } from '@/lib/universe/skyLayout';
import { stageCard, senderName } from '@/lib/mora/bridgeData';

describe('q1 quality pass', () => {
  it('sky is organic: uneven spacing, still no overlap', () => {
    const s = skyLayout([0, 1, 2, 0.5, 1.5, 0, 2], 1440, 520);
    const gaps = s.slice(1).map((p, i) => p.x - s[i].x);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(8);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++)
      expect(Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y)).toBeGreaterThan((s[i].size + s[j].size) / 2);
  });
  it('sender names', () => {
    expect(senderName('"Anna Berg" <anna@x.de>')).toBe('Anna Berg');
    expect(senderName('max.muster@x.de')).toBe('Max Muster');
  });
  it('mail card carries the real senders', () => {
    const snap: any = { mail: { status: 'ok', complete: true, items: [{ from_addr: 'Anna Berg <a@x.de>', subject: 'Freigabe Angebot', read: false }, { from_addr: 'Newsletter <n@x.de>', subject: 'News', read: false }, { from_addr: 'Lieferant GmbH <l@x.de>', subject: 'Rechnung 42', read: false }] } };
    const c = stageCard(snap, Date.now());
    expect(c?.kind).toBe('mail');
    expect(c?.facts).toEqual(['Anna Berg', 'Lieferant GmbH']);
  });
});
