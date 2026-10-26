import { IDLE_LIVE, parseLiveEvent, planetForTarget, reduceLive, type LiveEvent } from '@/lib/mora/liveRun';

const ev = (p: Partial<LiveEvent>): LiveEvent => ({ kind: 'step.started', run: 'r1', source: 'telegram', label: '', target: null, ts: 1, ...p });
const planets = [{ id: 'd-rd', name: 'R&D', moons: [{ id: 's-lab' }] }, { id: 'd-fin', name: 'Finance', moons: [] }];

describe('MÔRA live run', () => {
  it('parses only known kinds and trims labels', () => {
    expect(parseLiveEvent('{"kind":"hack","run":"x"}')).toBeNull();
    expect(parseLiveEvent('nope')).toBeNull();
    expect(parseLiveEvent(JSON.stringify({ kind: 'task.done', run: 'r', label: 'x'.repeat(200) }))!.label).toHaveLength(80);
  });
  it('runs started → step → done and ignores stale runs', () => {
    let s = reduceLive(IDLE_LIVE, ev({ kind: 'task.started' }));
    s = reduceLive(s, ev({ label: 'Lese Nachricht …', target: { department_id: 'd-rd' } }));
    expect(s).toMatchObject({ active: true, label: 'Lese Nachricht …', target: { department_id: 'd-rd' } });
    expect(reduceLive(s, ev({ run: 'old', label: 'alt' }))).toBe(s);
    s = reduceLive(s, ev({ kind: 'task.done', label: '' }));
    expect(s).toMatchObject({ active: false, done: true, label: 'Fertig' });
  });
  it('maps targets only to real planets', () => {
    expect(planetForTarget({ department_id: 'd-fin' }, planets)).toBe('d-fin');
    expect(planetForTarget({ space_id: 's-lab' }, planets)).toBe('d-rd');
    expect(planetForTarget({ name: 'r&d' }, planets)).toBe('d-rd');
    expect(planetForTarget({ department_id: 'unknown' }, planets)).toBeNull();
    expect(planetForTarget(null, planets)).toBeNull();
  });
});
