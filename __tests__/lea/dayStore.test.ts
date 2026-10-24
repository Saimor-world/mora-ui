import { CoreError } from '@/lib/api/http';

const coreGet = jest.fn();
const corePut = jest.fn();
jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return { ...actual, coreGet: (...a: unknown[]) => coreGet(...a), corePut: (...a: unknown[]) => corePut(...a) };
});

import { useDayStore } from '@/lib/lea/dayStore';

const st = () => useDayStore.getState();

beforeEach(() => {
  coreGet.mockReset();
  corePut.mockReset();
  useDayStore.setState({ companyId: null, phases: {}, versions: {}, cache: {}, sync: 'idle' });
});

describe('dayStore ↔ CORE', () => {
  it('loads status from CORE and saves with the known version', async () => {
    coreGet.mockResolvedValue({ items: [{ event_id: 'e1', phase: 'laeuft', version: 2 }] });
    await st().loadCompany('c1');
    expect(st().phases.e1).toBe('laeuft');
    corePut.mockResolvedValue({ event_id: 'e1', phase: 'erledigt', version: 3 });
    await st().setPhase('e1', 'erledigt');
    expect(corePut).toHaveBeenCalledWith(expect.stringContaining('/v3/appointments/e1/status?company_id=c1'), { phase: 'erledigt', expected_version: 2 });
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
    expect(corePut).toHaveBeenLastCalledWith(expect.any(String), { phase: 'geplant', expected_version: 1 });
    expect(st().phases.e1).toBe('geplant');
  });

  it('keeps the change locally when saving fails', async () => {
    coreGet.mockResolvedValue({ items: [] });
    await st().loadCompany('c1');
    corePut.mockRejectedValue(new CoreError('down', 503));
    await st().setPhase('e1', 'laeuft');
    expect(st().phases.e1).toBe('laeuft');
    expect(st().cache.c1.e1).toBe('laeuft');
    expect(st().sync).toBe('local');
  });

  it('falls back to the local cache when CORE is unreachable', async () => {
    useDayStore.setState({ cache: { c1: { e9: 'erledigt' } } });
    coreGet.mockResolvedValue(null);
    await st().loadCompany('c1');
    expect(st().phases.e9).toBe('erledigt');
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
});
