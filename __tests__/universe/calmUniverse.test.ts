import { summarizeTitles } from '@/lib/lea/live';
import { isNoiseMail } from '@/lib/lea/useHorizonSources';
import { matteTone, SAIMOR_PALETTE } from '@/lib/universe/matteTone';

describe('calm universe (24.10.2026)', () => {
  it('dedupes identical task titles in the MÔRA line', () => {
    expect(summarizeTitles(['Mora-Sprechprobe live', 'Mora-Sprechprobe live', 'mora-sprechprobe live'])).toEqual(['Mora-Sprechprobe live (3×)']);
    expect(summarizeTitles(['A', 'B', 'C', 'D', 'E'])).toEqual(['A', 'B', 'C', '2 weitere']);
  });
  it('keeps GitHub and noreply notifications out of the Horizont', () => {
    expect(isNoiseMail({ subject: '[saimor/mora-ui] PR #158 merged', from: 'Marius <notifications@github.com>' })).toBe(true);
    expect(isNoiseMail({ subject: 'Re: [saimor/core] Issue', from: 'x@y.de' })).toBe(true);
    expect(isNoiseMail({ subject: 'Newsletter', from: 'noreply@shop.de' })).toBe(true);
    expect(isNoiseMail({ subject: 'Termin morgen?', from: 'Lea <lea@nagelstudio.de>' })).toBe(false);
  });
  it('gives neighbouring planets different tones from one Saimôr palette', () => {
    const tones = ['Intelligence', 'Inbox', 'Marketing', 'Vertrieb', 'Kalender', 'Finanzen'].map((n, i) => matteTone(n, {}, i).vars['--p-base']);
    expect(new Set(tones).size).toBe(6);
    expect(SAIMOR_PALETTE.length).toBe(6);
  });
});
