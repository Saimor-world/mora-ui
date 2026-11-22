import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { TENANT_HQ } from '@/lib/constants/tenants';
import { useShowsDemoChrome, useWorkScope } from '@/lib/hooks/useIsSaimorInternal';
import { resolveStationKind } from '@/features/werkstatt/ui/DeskWorkstation';
import { getDepartmentRoomContext } from '@/lib/universe/shipDepartments';
import { Werkstatt } from '@/features/werkstatt/ui/Werkstatt';

// Kundenräume zeigen nur, was aus CORE kommt: kein ORIGIN-Atelier, keine Beispiel-Crew, kein Demo-Schalter.

jest.mock('@/lib/api/orgClient', () => ({ fetchNodeDetails: jest.fn(), createNode: jest.fn(), fetchCompanies: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/queries/useNodes', () => ({ useUpdateNode: () => ({ mutate: jest.fn() }) }));
jest.mock('@/lib/queries/useTeamMembers', () => ({ useTeamMembers: () => ({ data: [] }) }));
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone: jest.fn().mockResolvedValue(true), update: jest.fn(), addTask: jest.fn().mockResolvedValue(true) }) }));
jest.mock('@/lib/api/http', () => ({ corePost: jest.fn() }));
jest.mock('@/lib/os/useScopedToday', () => ({ invalidateToday: jest.fn() }));

const customer = { id: 'u-head', email: 'head.test@saimor-test.invalid', role: 'member', tenant_id: 'tenant-test-head' };
const hq = { id: 'u-hq', email: 'hq@saimor.world', role: 'member', tenant_id: TENANT_HQ };
const login = (u: object | null) => useSessionStore.setState({ user: u as never });

const t: WorkTask = { id: 't1', title: 'TEST: Mira wegen Termin zurückrufen', status: 'backlog', done: false, due: null, overdue: false, dueToday: false, folderId: null, assignee: null, raw: { id: 't1', title: 'x', status: 'backlog' } as never };
const planet = { id: 'dept-mira', title: 'Mira Studio', jobRoles: [], glass: 'sage', moons: [] } as unknown as DemoPlanet;
const work: DeptWork = { moons: new Map(), loose: [t], open: 1, overdue: 0 };

beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() }));
    useDemoStore.getState().setDemoCompany(null);
});

describe('Welt der Sitzung', () => {
    it('Kunde, SAIMÔR intern, Café-Demo, ohne Sitzung', () => {
        login(customer);
        expect(renderHook(() => useWorkScope()).result.current).toBe('customer');
        expect(renderHook(() => useShowsDemoChrome()).result.current).toBe(false);
        login(hq);
        expect(renderHook(() => useWorkScope()).result.current).toBe('hq');
        expect(renderHook(() => useShowsDemoChrome()).result.current).toBe(true);
        useDemoStore.getState().setDemoCompany('demo-morgenrot');
        expect(renderHook(() => useWorkScope()).result.current).toBe('demo');
        login(null);
        useDemoStore.getState().setDemoCompany(null);
        expect(renderHook(() => useWorkScope()).result.current).toBe('customer');
    });
});

describe('Kundenraum', () => {
    it('ein „Studio“ beim Kunden wird kein ORIGIN-Atelier', () => {
        expect(resolveStationKind('dept-mira', 'Mira Studio', 'studio', 'customer').kind).toBe('raum-station');
        const ctx = getDepartmentRoomContext('dept-mira', 'Mira Studio', 'customer');
        expect(ctx.archetype).toBe('werkstatt');
        expect(JSON.stringify(ctx)).not.toMatch(/ORIGIN|Atelier|Basalt|Captain|Phase 01/);
        expect(resolveStationKind('dept-leitung', 'Leitung', 'bridge', 'customer').kind).toBe('raum-station');
    });

    it('der Raum zeigt Name und Einträge aus CORE, sonst nichts Erfundenes', () => {
        login(customer);
        render(<QueryClientProvider client={new QueryClient()}><Werkstatt planet={planet} work={work} planets={[]} companyId="c-mira" today="2026-11-22" fromSpace={false} onExit={jest.fn()} /></QueryClientProvider>);
        expect(screen.getByTestId('wk-room-sign').textContent).toBe('Mira Studio');
        expect(screen.getByTestId('wk-room').querySelector('.wk-stage__img')?.getAttribute('src')).toContain('room-werkstatt');
        expect(screen.queryByTestId('wk-fixture-plate')).toBeNull();
        fireEvent.click(screen.getByTestId('wk-hit-station'));
        const station = screen.getByTestId('wk-station-raum-station');
        expect(station).toHaveTextContent('TEST: Mira wegen Termin zurückrufen');
        expect(document.body.textContent).not.toMatch(/ORIGIN|Seed 1001|SHA-256|Kanonisch|XRPL|Captain/);
        expect(screen.queryByTestId('wk-scope-truth-badge')).toBeNull();
    });
});
