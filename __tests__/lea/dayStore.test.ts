import { CoreError } from '@/lib/api/http';

const coreGet = jest.fn();
const corePut = jest.fn();
jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return { ...actual, coreRequest: (...a: unknown[]) => coreGet(...a), corePut: (...a: unknown[]) => corePut(...a) };
});

import { useSessionStore } from '@/lib/store/sessionStore';
import { useDayStore } from '@/lib/lea/dayStore';

const st = () => useDayStore.getState();

beforeEach(() => {
  coreGet.mockReset();
  corePut.mockReset();
  useSessionStore.setState({ user: { id: 'owner', tenant_id: 'tenant' } as never, sessionGeneration: 1 });
  useDayStore.setState({ companyId: null, identity: null, phases: {}, versions: {}, since: {}, pending: {}, sync: 'idle' });
});

describe('dayStore ↔ CORE', () => {
  it('loads status from CORE and saves with the known version', async () => {
    coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'laeuft', version: 2 }] });
    await st().loadCompany('c1');
    expect(st().phases.e1).toBe('laeuft');
    corePut.mockResolvedValue({ event_id: 'e1', phase: 'erledigt', version: 3 });
    await st().setPhase('e1', 'erledigt');
    expect(corePut).toHaveBeenCalledWith(expect.stringContaining('/v3/appointments/e1/status?company_id=c1'), { phase: 'erledigt', expected_version: 2 }, { throwAuthErrors: true });
    expect(st().versions.e1).toBe(3);
    expect(st().sync).toBe('core');
  });

  it('undo writes the previous phase with the new version', async () => {
    coreGet.mockResolvedValue({ items: [] });
    await st().loadCompany('c1');
    corePut.mockResolvedValueOnce({ event_id: 'e1', phase: 'laeuft', version: 1 });
    await st().setPhase('e1', 'laeuft');
    corePut.mockResolvedValueOnce({ event_id: 'e1', phase: 'geplant', version: 2 });
    await st().setPhase('e1', 'geplant');
    expect(corePut).toHaveBeenLastCalledWith(expect.any(String), { phase: 'geplant', expected_version: 1 }, { throwAuthErrors: true });
    expect(st().phases.e1).toBe('geplant');
  });

  it('keeps only the confirmed state when saving fails', async () => {
    coreGet.mockResolvedValue({ items: [] });
    await st().loadCompany('c1');
    corePut.mockRejectedValue(new CoreError('down', 503));
    expect((await st().setPhase('e1', 'laeuft')).saved).toBe(false);
    expect(st().phases.e1).toBeUndefined();
    expect(st().sync).toBe('local');
  });

  it('does not trust old browser data when CORE is unreachable', async () => {
    localStorage.setItem('saimor-day-phases-v2', JSON.stringify({ state: { cache: { c1: { e9: 'erledigt' } } } }));
    coreGet.mockResolvedValue(null);
    await st().loadCompany('c1');
    expect(st().phases.e9).toBeUndefined();
    expect(st().sync).toBe('local');
  });

  it('takes the server state on a 409 from another device', async () => {
    coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'laeuft', version: 1 }] });
    await st().loadCompany('c1');
    corePut.mockRejectedValue(new CoreError('veraltet', 409, { message: 'veraltet', current: { event_id: 'e1', phase: 'erledigt', version: 4 } }));
    await st().setPhase('e1', 'geplant');
    expect(st().phases.e1).toBe('erledigt');
    expect(st().versions.e1).toBe(4);
  });

  it('never shows another company after a session switch', async () => {
    coreGet.mockResolvedValueOnce({ items: [{ event_id: 'e1', phase: 'laeuft', version: 1 }] });
    await st().loadCompany('c1');
    let resolve!: (v: unknown) => void;
    coreGet.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const pending = st().loadCompany('c2');
    expect(st().phases).toEqual({});
    await st().loadCompany(null);
    resolve({ items: [{ event_id: 'x', phase: 'erledigt', version: 1 }] });
    await pending;
    expect(st().companyId).toBeNull();
    expect(st().phases).toEqual({});
  });

  it('reports the adopted CORE state on a 409', async () => {
    coreGet.mockResolvedValue({ items: [] });
    await st().loadCompany('c1');
    corePut.mockRejectedValue(new CoreError('veraltet', 409, { current: { event_id: 'e1', phase: 'erledigt', version: 4 } }));
    await expect(st().setPhase('e1', 'laeuft')).resolves.toEqual({ phase: 'erledigt', conflict: true, saved: false, version: 4 });
    expect(st().phases.e1).toBe('erledigt');
    expect(st().since.e1).toBeUndefined();
  });

  it('uses the real check-in time (checked_in_at, else updated_at), not the planned start', async () => {
    coreGet.mockResolvedValue({ items: [
      { event_id: 'a', phase: 'laeuft', version: 1, updated_at: '2026-10-24T12:28:00Z' },
      { event_id: 'b', phase: 'laeuft', version: 1, updated_at: '2026-10-24T12:40:00Z', checked_in_at: '2026-10-24T12:05:00Z' },
    ] });
    await st().loadCompany('c1');
    expect(st().since).toEqual({ a: '2026-10-24T12:28:00Z', b: '2026-10-24T12:05:00Z' });
    corePut.mockResolvedValue({ event_id: 'c', phase: 'laeuft', version: 1, updated_at: '2026-10-24T12:30:00Z' });
    await expect(st().setPhase('c', 'laeuft')).resolves.toMatchObject({ phase: 'laeuft', conflict: false, saved: true, version: 1, scope: expect.any(String) });
    expect(st().since.c).toBe('2026-10-24T12:30:00Z');
  });
});

it('waits for confirmation, blocks double writes and protects undo with its captured version', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  let resolve!: (value: unknown) => void;
  corePut.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const pending = st().setPhase('e1', 'laeuft');
  expect(st().phases.e1).toBeUndefined();
  expect((await st().setPhase('e1', 'laeuft')).saved).toBe(false);
  expect(corePut).toHaveBeenCalledTimes(1);
  resolve({ event_id: 'e1', phase: 'laeuft', version: 1 });
  const result = await pending;
  coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'erledigt', version: 2 }] });
  await st().loadCompany('c1');
  corePut.mockRejectedValueOnce(new CoreError('conflict', 409, { current: { event_id: 'e1', phase: 'erledigt', version: 2 } }));
  expect((await st().setPhase('e1', 'geplant', result.version)).conflict).toBe(true);
  expect(corePut).toHaveBeenLastCalledWith(expect.any(String), { phase: 'geplant', expected_version: 1 }, { throwAuthErrors: true });
});

it('rejects an unconfirmed response and never applies another principal’s late response', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  corePut.mockResolvedValueOnce(null);
  expect((await st().setPhase('e1', 'laeuft')).saved).toBe(false);
  let resolve!: (value: unknown) => void;
  corePut.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const pending = st().setPhase('e1', 'laeuft');
  useSessionStore.setState({ user: { id: 'other', tenant_id: 'another-tenant' } as never, sessionGeneration: 2 });
  await st().loadCompany('c1');
  resolve({ event_id: 'e1', phase: 'laeuft', version: 1 });
  expect((await pending).saved).toBe(false);
  expect(st().phases).toEqual({});
});

it('does not replace a confirmed write with an older in-flight read', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  let resolve!: (value: unknown) => void;
  coreGet.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const read = st().loadCompany('c1');
  corePut.mockResolvedValueOnce({ event_id: 'e1', phase: 'erledigt', version: 1 });
  await st().setPhase('e1', 'erledigt');
  resolve({ items: [] }); await read;
  expect(st().phases.e1).toBe('erledigt');
});

it('does not accept an old response after switching company A → B → A', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  let oldResolve!: (value: unknown) => void;
  corePut.mockReturnValueOnce(new Promise(r => { oldResolve = r; }));
  const old = st().setPhase('e1', 'laeuft');
  await st().loadCompany('c2');
  coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'erledigt', version: 4 }] });
  await st().loadCompany('c1');
  let newResolve!: (value: unknown) => void;
  corePut.mockReturnValueOnce(new Promise(r => { newResolve = r; }));
  const newer = st().setPhase('e1', 'geplant');
  oldResolve({ event_id: 'e1', phase: 'laeuft', version: 1 });
  expect((await old).saved).toBe(false);
  expect(st().phases.e1).toBe('erledigt');
  expect(st().pending.e1).toBe(true);
  newResolve({ event_id: 'e1', phase: 'geplant', version: 5 });
  expect((await newer).saved).toBe(true);
});

it('binds undo to the original company/session even when event IDs and versions match', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  corePut.mockResolvedValueOnce({ event_id: 'same-id', phase: 'erledigt', version: 1 });
  const saved = await st().setPhase('same-id', 'erledigt');
  coreGet.mockResolvedValue({ items: [{ event_id: 'same-id', phase: 'laeuft', version: 1 }] });
  await st().loadCompany('c2');
  expect((await st().setPhase('same-id', 'geplant', saved.version, saved.scope)).saved).toBe(false);
  expect(corePut).toHaveBeenCalledTimes(1);
  expect(st().phases['same-id']).toBe('laeuft');
});

it('preserves a newer refresh when an older acknowledged PUT arrives late', async () => {
  coreGet.mockResolvedValue({ items: [] });
  await st().loadCompany('c1');
  let resolve!: (value: unknown) => void;
  corePut.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const pending = st().setPhase('e1', 'laeuft');
  coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'erledigt', version: 2 }] });
  await st().loadCompany('c1');
  resolve({ event_id: 'e1', phase: 'laeuft', version: 1 });
  expect((await pending).conflict).toBe(true);
  expect(st().phases.e1).toBe('erledigt');
  expect(st().versions.e1).toBe(2);
});
