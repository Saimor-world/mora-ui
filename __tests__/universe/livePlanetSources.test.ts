import { buildLivePlanetInput, overlayLivePlanet, overlayTruth, PLANET_SOURCE_TRUTH } from '@/lib/universe/livePlanetSources';
import type { ModelPlanet } from '@/lib/universe/planetModel';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const today = (mail: { complete: boolean; inbox_loaded: number | null }) => ({
  mail: { status: 'ok', ...mail },
  calendar: { status: 'ok', count: 2 },
  tasks: { status: 'ok', counts: { open: 5 } },
  nightwatch: { status: 'ok', open_incidents: 1 },
}) as unknown as TodaySnapshot;

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

describe('Live planet input', () => {
  it('reads nothing as live without a Today snapshot, so no all-clear is invented', () => {
    const input = buildLivePlanetInput({ today: null, mailStatus: 'ok' });
    expect(input.openIncidents).toBeNull();
    expect(input.nightwatchStatus).toBeNull();
    expect(input.mailCount).toBeNull();
    expect(overlayLivePlanet(planet('wache', { open_incidents: 3 }), input).counts.open_incidents).toBe(3);
  });

  it('uses only the server mail total, never the loaded sample', () => {
    expect(buildLivePlanetInput({ today: today({ complete: false, inbox_loaded: 25 }) }).mailCount).toBeNull();
    expect(buildLivePlanetInput({ today: today({ complete: true, inbox_loaded: 25 }) }).mailCount).toBeNull();
    expect(buildLivePlanetInput({ today: { ...today({ complete: true, inbox_loaded: 5 }), mail: { status: 'ok', complete: true, inbox_loaded: 5, total: 25 } } as unknown as TodaySnapshot }).mailCount).toBe(25);
    const partial = buildLivePlanetInput({ today: today({ complete: false, inbox_loaded: 25 }) });
    expect(overlayLivePlanet(planet('post', { mails: 40 }), partial).counts.mails).toBe(40);
  });

  it('takes tasks and incidents from the snapshot', () => {
    const input = buildLivePlanetInput({ today: today({ complete: true, inbox_loaded: 0 }) });
    expect(input.openTasks).toBe(5);
    expect(input.openIncidents).toBe(1);
    expect(input.calendarCount).toBe(2);
  });

  it('marks a disconnected mailbox even without a snapshot', () => {
    const input = buildLivePlanetInput({ today: null, mailStatus: 'unavailable' });
    expect(overlayTruth(overlayLivePlanet(planet('post', { mails: 4 }), input))).toBe('disconnected');
  });

  it('counts only documents that were read live, not derived ones', () => {
    const input = buildLivePlanetInput({
      today: null,
      metrics: { wissen: { nodes: 12, source: 'live' }, vertrieb: { nodes: 7, source: 'derived' } },
    });
    expect(input.docsByCapability).toEqual({ wissen: 12 });
  });

  it('treats zero active tenants as unknown, not as a live zero', () => {
    expect(buildLivePlanetInput({ today: null, activeTenants: 0 }).tenantCount).toBeNull();
  });
});
