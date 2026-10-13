import { assignToPlanets, phaseForHour } from '@/components/universe/MorgenOverlay';

describe('Universe v2 – Overlay auf dem echten Universe', () => {
  it('Tagesphase aus der Stunde', () => {
    expect(phaseForHour(7)).toBe('morgen');
    expect(phaseForHour(13)).toBe('tag');
    expect(phaseForHour(19)).toBe('abend');
    expect(phaseForHour(2)).toBe('nacht');
  });
  it('Sternbilder hängen am passenden echten Planeten', () => {
    const planets = ['Finanzen', 'Wissen', 'Werkstatt', 'Post & Termine', 'Wache'];
    const items = [
      { title: 'Rechnung offen', source: 'Buchhaltung · Offene Posten' },
      { title: 'Bankgespräch 10:00', source: 'Kalender · heute', area: 'Post & Termine' },
      { title: 'Update wartet', source: 'Werkstatt · Freigaben' },
      { title: 'Irgendwas', source: 'unbekannt' },
    ];
    expect(assignToPlanets(items, planets)).toEqual([0, 3, 2, 1]);
  });
});
