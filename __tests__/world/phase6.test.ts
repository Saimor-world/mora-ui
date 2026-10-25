import { useUniverseFocus } from '@/lib/lea/universeFocus';
import { daySentence } from '@/lib/lea/day';

describe('Phase 6', () => {
  it('Wissen → Universe: Ziel wird genau einmal übernommen', () => {
    useUniverseFocus.getState().show({ planetId: 'p1', moonId: 'm1', starId: 's1' });
    expect(useUniverseFocus.getState().take()).toEqual({ planetId: 'p1', moonId: 'm1', starId: 's1' });
    expect(useUniverseFocus.getState().take()).toBeNull();
  });
  it('Tagessatz: korrekte Grammatik bei einem vorbeien Termin', () => {
    const now = new Date('2026-10-23T20:00:00');
    const day = { today: [{ id: 'e', title: 'Michelle', date: '2026-10-23', time: '10:00', duration: 60 }], next: null, minutesToNext: null, onlyToday: [] } as any;
    expect(daySentence(day, now)).toBe('Dein Termin heute ist vorbei.');
    expect(daySentence({ ...day, today: [day.today[0], { ...day.today[0], id: 'f' }] }, now)).toBe('Alle 2 Termine von heute sind vorbei.');
  });
});
