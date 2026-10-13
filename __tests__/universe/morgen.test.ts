import { routeIntent, isUniverseV2Enabled } from '@/lib/universe/morgen';

describe('Universe v2 – Der Morgen', () => {
  it('Flag ist standardmäßig aus', () => {
    delete process.env.NEXT_PUBLIC_UNIVERSE_V2;
    expect(isUniverseV2Enabled()).toBe(false);
  });
  it('Absichtszeile reist zum richtigen Ort', () => {
    expect(routeIntent('Wie geht es dem Server?')).toBe('body');
    expect(routeIntent('MÔRA, was ist heute wichtig?')).toBe('today');
    expect(routeIntent('Rückblick bitte')).toBe('evening');
    expect(routeIntent('hallo')).toBe('home');
  });
});
