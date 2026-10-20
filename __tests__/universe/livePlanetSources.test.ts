import { overlayLivePlanet, overlayTruth, PLANET_SOURCE_TRUTH } from '@/lib/universe/livePlanetSources';
import type { ModelPlanet } from '@/lib/universe/planetModel';

const planet = (cap: string, counts: Record<string, number> = {}): ModelPlanet => ({
  key: `sys:${cap}`,
  kind: 'system',
  capability: cap,
  label: cap,
  state: 'active',
  size: 'M',
  brightness: 1,
  score: 1,
  ring: 1,
  look: { archetype: 'ocean', hue: 1, glyph: 'mail', seed: 1 },
  moons: [],
  more_moons: 0,
  counts,
  sources: [],
});

describe('Live planet sources', () => {
  it('lists which planets are live vs still modelled', () => {
    expect(PLANET_SOURCE_TRUTH.post.truth).toBe('live');
    expect(PLANET_SOURCE_TRUTH.wache.truth).toBe('live');
    expect(PLANET_SOURCE_TRUTH.werkstatt.truth).toBe('live');
    expect(PLANET_SOURCE_TRUTH.finanzen.truth).toBe('model');
    expect(PLANET_SOURCE_TRUTH.rd.truth).toBe('model');
  });

  it('lets live mail win over the universe model', () => {
    const over = overlayLivePlanet(planet('post', { mails: 4 }), { mailCount: 7, mailStatus: 'ok' });
    expect(over.counts.mails).toBe(7);
    expect(overlayTruth(over)).toBe('live');
  });

  it('does not invent mail when the connector is down', () => {
    const over = overlayLivePlanet(planet('post', { mails: 4 }), { mailCount: 0, mailStatus: 'unavailable' });
    expect(over.counts.mails).toBe(4);
    expect(overlayTruth(over)).toBe('disconnected');
  });

  it('wires wache incidents and werkstatt tasks from today', () => {
    expect(overlayLivePlanet(planet('wache', { open_incidents: 0 }), { openIncidents: 2, nightwatchStatus: 'ok' }).counts.open_incidents).toBe(2);
    expect(overlayLivePlanet(planet('werkstatt', { open_tasks: 9 }), { openTasks: 3, tasksStatus: 'ok' }).counts.open_tasks).toBe(3);
  });
});
