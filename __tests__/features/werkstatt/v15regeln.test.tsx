/**
 * v15-Regeln in der Werkstatt: kein schwarzes Void, keine Overlay-Leisten,
 * visuelles spricht (keine Etiketten/Sprechblasen/Versalien), ruhige Raumnamen, Fenster je Bild.
 * Jeder Fall fällt auf origin/main durch und wird von grok/os-v15-regeln grün.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeptWork } from '@/lib/universe/deptWork';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { Werkstatt, roomSky, closeSky } from '@/features/werkstatt/ui/Werkstatt';
import { getDepartmentRoomContext } from '@/lib/universe/shipDepartments';

jest.mock('@/lib/api/orgClient', () => ({ fetchNodeDetails: jest.fn(), createNode: jest.fn() }));
jest.mock('@/lib/queries/useNodes', () => ({ useUpdateNode: () => ({ mutate: jest.fn() }) }));
jest.mock('@/lib/queries/useTeamMembers', () => ({ useTeamMembers: () => ({ data: [] }) }));
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone: jest.fn(), update: jest.fn(), addTask: jest.fn() }) }));
jest.mock('@/lib/api/http', () => ({ corePost: jest.fn() }));
jest.mock('@/lib/os/useScopedToday', () => ({ invalidateToday: jest.fn() }));

const TODAY = '2026-11-10';
const planet = { id: 'dept-laden', title: 'Laden', jobRoles: [], glass: 'sage', moons: [{ id: 'f-plan', title: 'Planung', files: [] }] } as unknown as DemoPlanet;
const work: DeptWork = { moons: new Map([['f-plan', { docs: [], open: [], done: [], overdue: 0 }]]), loose: [], open: 0, overdue: 0 };
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce'), media: q,
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    addListener: jest.fn(), removeListener: jest.fn(),
  }));
});

const cssPath = path.join(__dirname, '../../../features/werkstatt/ui/werkstatt.css');
const css = () => fs.readFileSync(cssPath, 'utf8');

describe('1 kein schwarzes Void', () => {
  it('lässt hinter dem gelandeten Raum kein Fast-Schwarz stehen – das Universum bleibt sichtbar', () => {
    wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    const root = document.querySelector('.wk-root[data-landed="1"]');
    expect(root).toBeTruthy();
    expect(screen.getByTestId('wk-window-universe')).toBeInTheDocument();
    expect(css()).not.toMatch(/\[data-landed=['"]1['"]\][^{]*\{[^}]*background:\s*#070d11/);
    expect(css()).not.toMatch(/\.wk-root\[data-landed=['"]1['"]\]\s*\{\s*background:\s*#0[0-7]/);
  });
});

describe('2 Schreibtisch-Nahsicht ohne Overlay-Chrom', () => {
  it('öffnet die Station als Zoom in den Schreibtisch, ohne Scope-Leiste und ohne Glas-Blur', () => {
    wrap(<Werkstatt planet={{ ...planet, id: 'd-service', title: 'Service & Gastraum' }} work={work} planets={[]} companyId="demo-morgenrot" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    fireEvent.click(screen.getByTestId('wk-hit-station'));
    const station = screen.getByTestId('wk-workstation');
    expect(station.closest('[data-testid="wk-close-station"]')).toBeTruthy();
    expect(screen.getByTestId('wk-ledger-bar')).toBeInTheDocument();
    expect(station.textContent).not.toMatch(/Scope:|Isolierte Demo-Sandbox|Idempotente Buchung|Dokumentenspur:/);
    expect(screen.queryByText(/Vorgang Kanzlei Weber \(12 Pers/)).toBeNull();
    expect(css()).not.toMatch(/\.wk-studio-panel[\s\S]{0,400}backdrop-filter:\s*blur/);
    // Die Arbeitsfläche liegt als Blatt auf dem Tisch, nicht als schwebende dunkle Leiste.
    expect(css()).toMatch(/\.wk-ledger-bar\s*\{[^}]*background-color:\s*var\(--paper\)/);
    expect(css()).not.toMatch(/\.wk-workstation\s*\{[^}]*backdrop-filter:\s*blur/);
  });
});

describe('3 Text schweigt', () => {
  it('zeigt keine Kontext-Pille, kein „Räume:“, kein Wochenmappe-Schild und keine MÔRA-Sprechblase; aria-labels bleiben', () => {
    const sky = [
      { id: 'd-service', title: 'Service & Gastraum' },
      { id: 'd-theke', title: 'Theke & Schicht' },
    ];
    wrap(<Werkstatt planet={{ ...planet, id: 'd-service', title: 'Service & Gastraum' }} work={work} planets={sky} companyId="demo-morgenrot" today={TODAY} fromSpace={false} onSwitchPlanet={jest.fn()} onExit={jest.fn()} />);
    expect(screen.queryByTestId('wk-workflow-pill')).toBeNull();
    expect(screen.queryByText('Räume:')).toBeNull();
    expect(screen.queryByText('Wochenmappe')).toBeNull();
    expect(screen.queryByTestId('wk-mora-bubble')).toBeNull();
    expect(screen.queryByTestId('wk-plate--sub')).toBeNull();
    const corridor = screen.getByTestId('wk-corridor');
    expect(corridor).toHaveAttribute('aria-label', 'Nachbarräume im Korridor');
    expect(css()).not.toMatch(/\.wk-corridor__label[\s\S]{0,200}text-transform:\s*uppercase/);
  });
});

describe('4 ruhige Raumnamen statt Sci-Fi', () => {
  it('nennt Kommando, Betrieb und Technik beim Abteilungsnamen, nicht Kommandobrücke oder Maschinenraum', () => {
    const kommando = getDepartmentRoomContext('dept-leitung', 'Kommando & Strategie');
    expect(kommando.roomName).toBe('Kommando & Strategie');
    expect(`${kommando.roomName} ${kommando.roomTag} ${kommando.enterLabel}`).not.toMatch(/Kommandobrücke|Strategie-Kanzel|Obsidian/);
    expect(getDepartmentRoomContext('dept-betrieb', 'Betrieb & Kunden').roomName).toBe('Betrieb & Kunden');
    expect(getDepartmentRoomContext('dept-technik', 'Produkt & Technik').roomName).toBe('Produkt & Technik');
    expect(getDepartmentRoomContext('dept-technik', 'Produkt & Technik').roomName).not.toMatch(/Maschinenraum|Maschinenlabor/);

    const { unmount } = wrap(<Werkstatt planet={{ ...planet, id: 'dept-leitung', title: 'Kommando & Strategie' }} work={work} planets={[]} companyId="company-local-demo" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    expect(screen.getByTestId('wk-room-sign').textContent).toBe('Kommando & Strategie');
    expect(document.querySelector('.wk-root')?.textContent).not.toMatch(/Kommandobrücke|Raumschiff|Maschinenraum/);
    unmount();
  });
});

describe('5 Fensterrechteck je Raumbild', () => {
  it('setzt für Atelier, Bar und Kontor eigene Fenster, nicht das Werkstatt-Rechteck', () => {
    const werk = roomSky('werkstatt');
    expect(werk).toEqual({ x: 1000, y: 84, w: 826, h: 572 });
    expect(roomSky('studio')).toEqual({ x: 1034, y: 116, w: 750, h: 509 });
    expect(roomSky('bar')).toEqual({ x: 1034, y: 114, w: 753, h: 511 });
    expect(roomSky('kontor')).toEqual({ x: 1034, y: 112, w: 751, h: 513 });
    expect(roomSky('bridge')).toEqual(roomSky('kontor'));
    expect(roomSky('studio')).not.toEqual(werk);
    expect(closeSky('station', 'studio')).toEqual({ x: 183, y: 0, w: 1572, h: 71 });
    expect(closeSky('station', 'werkstatt')).toEqual({ x: 0, y: 0, w: 1920, h: 150 });
  });
});
