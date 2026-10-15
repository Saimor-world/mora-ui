import {
  dockPoint, dockTarget, isPrimaryStation, orbitPositions, planetPositions, recommendStation, SCENE, sortStations, translateCoreError,
} from '@/lib/os-prototype/sourceDock';

const planets = [
  { id: 'm', name: 'Management', color: '#fff' },
  { id: 'v', name: 'Vertrieb', color: '#fff' },
  { id: 'f', name: 'Finanzen', color: '#fff' },
];

describe('V1.7 Andockstation', () => {
  it('recommends the most important ready station, never admin cases', () => {
    const list = [
      { id: 'notion', group: 'creator', status: 'available' },
      { id: 'drive', group: 'cloud', status: 'setup_required' },
      { id: 'mail', group: 'mail', status: 'available' },
      { id: 'gcal', group: 'calendar', status: 'connected' },
    ];
    expect(recommendStation(list)?.id).toBe('mail');
    expect(recommendStation([{ id: 'x', group: 'cloud', status: 'setup_required' }])).toBeNull();
  });

  it('shows core stations first and hides admin set-up behind disclosure', () => {
    expect(isPrimaryStation({ group: 'calendar', status: 'available' })).toBe(true);
    expect(isPrimaryStation({ group: 'payments', status: 'available' })).toBe(false);
    expect(isPrimaryStation({ group: 'payments', status: 'connected' })).toBe(true);
    expect(isPrimaryStation({ group: 'cloud', status: 'setup_required' })).toBe(false);
    expect(sortStations([{ group: 'payments', status: 'available' }, { group: 'mail', status: 'connected' }, { group: 'calendar', status: 'available' }]).map((s) => s.group))
      .toEqual(['mail', 'calendar', 'payments']);
  });

  it('docks onto the planet a source feeds, else onto the company core', () => {
    expect(dockTarget('calendar', planets)?.id).toBe('m');
    expect(dockTarget('mail', planets)?.id).toBe('v');
    expect(dockTarget('payments', planets)?.id).toBe('f');
    expect(dockTarget('creator', planets)).toBeNull();
  });

  it('translates raw CORE errors into one next step', () => {
    expect(translateCoreError('Notion rejected the token')).toMatch(/Zugangsdaten wurden abgelehnt/);
    expect(translateCoreError('Google Calendar OAuth not configured')).toMatch(/Admin/);
    expect(translateCoreError('connect ECONNREFUSED')).toMatch(/nicht erreichbar/);
    expect(translateCoreError('???')).toBe('Das Andocken hat nicht geklappt.');
  });

  it('keeps every station and planet inside the scene', () => {
    for (const compact of [false, true]) {
      const pts = [...planetPositions(6, compact), ...orbitPositions(7, compact), dockPoint(planetPositions(6, compact)[0], 2), dockPoint(null, 1)];
      for (const p of pts) {
        expect(p.x).toBeGreaterThan(40); expect(p.x).toBeLessThan(SCENE.w - 40);
        expect(p.y).toBeGreaterThan(20); expect(p.y).toBeLessThan(SCENE.h - 20);
      }
    }
  });
});
