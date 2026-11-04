import { renderHook, waitFor } from '@testing-library/react';

const fetchTodaySnapshot = jest.fn();
jest.mock('@/lib/api/todayClient', () => ({
  ...jest.requireActual('@/lib/api/todayClient'),
  fetchTodaySnapshot: (...a: unknown[]) => fetchTodaySnapshot(...a),
}));

import { CoreError } from '@/lib/api/http';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore, demoCompanyName } from '@/lib/demo/demoStore';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';

const real = () => ({ ...demoTodaySnapshot('c-hq', 'u-marius', 'tenant-saimor-hq'), marker: 'echt' });

describe('Kacheln werden nie leer', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchTodaySnapshot.mockReset();
    useSessionStore.setState({ user: { id: 'u-marius', tenant_id: 'tenant-saimor-hq', company_id: 'c-hq' } as never, activeCompanyId: 'c-hq' } as never);
  });
  afterEach(() => useDemoStore.getState().setDemoCompany(null));

  it('CORE nicht erreichbar: letzter echter Stand bleibt sichtbar', async () => {
    fetchTodaySnapshot.mockResolvedValueOnce(real());
    const a = renderHook(() => useScopedToday());
    await waitFor(() => expect(a.result.current.snapshot).not.toBeNull());
    a.unmount();
    fetchTodaySnapshot.mockRejectedValue(new Error('netz'));
    const b = renderHook(() => useScopedToday());
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    expect((b.result.current.snapshot as unknown as { marker?: string })?.marker).toBe('echt');
  });

  it('403: kein Zwischenstand aus dem Speicher', async () => {
    fetchTodaySnapshot.mockResolvedValueOnce(real());
    const a = renderHook(() => useScopedToday());
    await waitFor(() => expect(a.result.current.snapshot).not.toBeNull());
    a.unmount();
    fetchTodaySnapshot.mockRejectedValue(new CoreError('nein', 403));
    const b = renderHook(() => useScopedToday());
    await waitFor(() => expect(b.result.current.loadError).toBe('forbidden'));
    expect(b.result.current.snapshot).toBeNull();
  });

  it('Demo-Firma: fiktiver Tag statt leerer Kacheln', async () => {
    useDemoStore.getState().setDemoCompany('demo-morgenrot');
    fetchTodaySnapshot.mockResolvedValue(null);
    const r = renderHook(() => useScopedToday());
    await waitFor(() => expect(r.result.current.snapshot).not.toBeNull());
    expect(r.result.current.snapshot!.mail.items.length).toBeGreaterThan(0);
    expect(r.result.current.snapshot!.calendar.events.length).toBeGreaterThan(0);
    expect(demoCompanyName('demo-morgenrot')).toBe('Café Morgenrot');
  });
});
