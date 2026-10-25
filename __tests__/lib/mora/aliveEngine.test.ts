import { actionInput, executionInput, initialCharacter, reduceCharacter, resolveCharacter } from '@/lib/mora/alive/engine';
const now = 1000000;
const connected = () => reduceCharacter(initialCharacter, { type: 'connection', connected: true });
describe('MÔRA Alive product truth', () => {
  it('starts offline and never manufactures a completion on disconnect', () => {
    let e = reduceCharacter(connected(), { type: 'job', id: 'one', state: 'working', at: now });
    e = reduceCharacter(e, { type: 'connection', connected: false });
    expect(resolveCharacter(e, now).state).toBe('offline');
    e = reduceCharacter(e, { type: 'connection', connected: true });
    expect(resolveCharacter(e, now).state).toBe('idle');
  });
  it('keeps working while another concurrent job finishes', () => {
    let e = connected();
    for (const id of ['one', 'two']) e = reduceCharacter(e, { type: 'job', id, state: 'working', at: now });
    e = reduceCharacter(e, { type: 'job', id: 'one', state: 'done', at: now + 1 });
    expect(resolveCharacter(e, now + 2).state).toBe('working');
  });
  it('prioritizes approval and preserves it when another job completes', () => {
    let e = reduceCharacter(connected(), { type: 'job', id: 'one', state: 'approval', at: now });
    e = reduceCharacter(e, { type: 'job', id: 'two', state: 'done', at: now });
    expect(resolveCharacter(e, now).state).toBe('approval');
  });
  it('does not revive a completed execution with late progress', () => {
    const done = reduceCharacter(connected(), { type: 'job', id: 'one', state: 'done', at: now });
    expect(reduceCharacter(done, { type: 'job', id: 'one', state: 'working', at: now + 10 })).toBe(done);
  });
  it('expires activity to idle, never to success', () => {
    const e = reduceCharacter(connected(), { type: 'job', id: 'one', state: 'working', at: now });
    expect(resolveCharacter(e, now + 120001).state).toBe('idle');
  });
  it('rests at night only without active work', () => {
    expect(resolveCharacter(connected(), now, true).state).toBe('night-rest');
    const e = reduceCharacter(connected(), { type: 'job', id: 'one', state: 'working', at: now });
    expect(resolveCharacter(e, now, true).state).toBe('working');
  });
  it('requires explicit ok and journal identity for execution success', () => {
    expect(executionInput('mora.execution.done', { journal_id: 'x' }, now)).toBeNull();
    expect(executionInput('mora.execution.done', { ok: true }, now)).toBeNull();
    expect(executionInput('mora.execution.done', { journal_id: 'x', ok: true }, now)).toMatchObject({ state: 'done' });
    expect(executionInput('mora.execution.failed', { journal_id: 'x', ok: false }, now)).toMatchObject({ state: 'error' });
  });
  it('rejects malformed, stale and future actions', () => {
    for (const data of [null, {}, { action_id: ' ', status: 'done' }, { action_id: 'a', status: 'done', timestamp: 'invalid' }, { action_id: 'a', status: 'done', timestamp: new Date(now - 200000).toISOString() }, { action_id: 'a', status: 'done', timestamp: new Date(now + 200000).toISOString() }]) expect(actionInput(data, now)).toBeNull();
  });
  it('maps real confirmation events without executing the action', () => {
    expect(actionInput({ action_id: 'a', status: 'pending_confirmation' }, now)).toMatchObject({ state: 'approval' });
  });
  it('bounds retained execution identities', () => {
    let e = connected();
    for (let i = 0; i < 300; i++) e = reduceCharacter(e, { type: 'job', id: String(i), state: 'working', at: now });
    expect(Object.keys(e.jobs).length).toBeLessThanOrEqual(128);
  });
});
