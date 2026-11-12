/**
 * Phase 1 Acceptance Suite – Einheitliche Datenwahrheit, Idempotenz, FSM-Integrität & ehrliche UI-Zustände.
 *
 * Testet die echten Verträge zwischen Werkstatt, DeskWorkstation, LiveCockpit, operationalLedger und operationalClient:
 * 1. Keine Doppelbuchung bei schnellem Doppelklick (Barista-Bon & Kanzlei Weber)
 * 2. Strikte Prozess-FSM: Übersprungene Schritte (z. B. Schritt 4 vor 1–3) werden im UI & gegen CORE blockiert
 * 3. Einheitliche Kassenwahrheit über Theke -> Verwaltung -> LiveCockpit (kein zweites cafeShared-Shadow-Ledger)
 * 4. Persistenz über Reload / Remount hinweg
 * 5. Fehlgeschlagene CORE-Buchung (HTTP 503) zeigt 'Fehlgeschlagen' + Retry-Pfad ohne falsche Erfolgsmeldung
 * 6. HTTP 403 (keine Rolle/Berechtigung) & HTTP 409 (Versionskonflikt) werden ehrlich gemeldet
 * 7. Fehlgeschlagene Dokument-Speicherung (updateNode Fehler / null) zeigt 'Fehlgeschlagen' statt 'Gespeichert ✓' + Retry
 * 8. Strikte Mandanten-/Demo-Isolation (demo-morgenrot schreibt nie in CORE und mischt sich nicht mit company-hq-live)
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreError } from '@/lib/api/http';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { OperationalStateDto } from '@/lib/api/operationalClient';

const mockFetchOperationalState = jest.fn();
const mockEnsureOperationalProcess = jest.fn();
const mockTransitionOperationalProcess = jest.fn();
const mockCreateOperationalLedgerEntry = jest.fn();
const mockUpdateNode = jest.fn();
const mockCreateNode = jest.fn();

jest.mock('@/lib/api/operationalClient', () => ({
  fetchOperationalState: (...args: unknown[]) => mockFetchOperationalState(...args),
  ensureOperationalProcess: (...args: unknown[]) => mockEnsureOperationalProcess(...args),
  transitionOperationalProcess: (...args: unknown[]) => mockTransitionOperationalProcess(...args),
  createOperationalLedgerEntry: (...args: unknown[]) => mockCreateOperationalLedgerEntry(...args),
}));

jest.mock('@/lib/api/orgClient', () => ({
  fetchNodeDetails: jest.fn(() => Promise.resolve({ id: 'n-folio', title: 'Material-Manifest', content: '# Initial' })),
  updateNode: (...args: unknown[]) => mockUpdateNode(...args),
  createNode: (...args: unknown[]) => mockCreateNode(...args),
}));

jest.mock('@/lib/queries/useTeamMembers', () => ({
  useTeamMembers: () => ({ data: [{ id: 'u-marius', name: 'Marius' }] }),
}));

jest.mock('@/lib/lea/useDayActions', () => ({
  useDayActions: () => ({
    setDone: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    addTask: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('@/lib/os/useScopedToday', () => ({
  invalidateToday: jest.fn(),
  useScopedToday: () => ({ snapshot: null, loading: false, loadError: null }),
}));

jest.mock('@/lib/queries/useNightwatchIncidents', () => ({
  useNightwatchIncidents: () => ({ data: [] }),
}));

import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { Werkstatt } from '@/features/werkstatt/ui/Werkstatt';
import { LiveCockpit } from '@/features/home/cockpit/LiveCockpit';

const TODAY = '2026-11-12';

const skyPlanets = [
  { id: 'd-kueche', title: 'Küche & Backstube' },
  { id: 'd-service', title: 'Service & Gastraum' },
  { id: 'd-theke', title: 'Theke & Schicht' },
  { id: 'd-verw', title: 'Verwaltung & Büro' },
];

function makePlanet(id: string, title: string): DemoPlanet {
  return {
    id,
    title,
    jobRoles: [],
    glass: 'sage',
    moons: [{ id: 'f-main', title: 'Unterlagen', files: [] }],
  } as unknown as DemoPlanet;
}

function makeWork(): DeptWork {
  const sampleTask: WorkTask = {
    id: 'task-1',
    title: 'Qualitätskontrolle durchführen',
    status: 'backlog',
    done: false,
    due: TODAY,
    overdue: false,
    dueToday: true,
    folderId: 'f-main',
    assignee: 'Marius',
    raw: { id: 'task-1', title: 'Qualitätskontrolle durchführen', status: 'backlog' } as never,
  };
  return {
    moons: new Map([
      ['f-main', { docs: [{ id: 'n-folio', name: 'ORIGIN // 001 Material-Manifest', meta: '' }], open: [sampleTask], done: [], overdue: 0 }],
    ]),
    loose: [],
    open: 1,
    overdue: 0,
  };
}

function makeServerState(overrides: Partial<OperationalStateDto> = {}): OperationalStateDto {
  return {
    company_id: 'company-hq-live',
    company_name: 'SAIMÔR HQ',
    is_demo: false,
    currency: 'EUR',
    base_till_cents: 0,
    booked_revenue_cents: 0,
    total_till_cents: 0,
    receipts_count: 0,
    processes: [
      {
        id: 'proc-weber-live',
        company_id: 'company-hq-live',
        process_key: 'kanzlei_weber_2026_11',
        process_type: 'kanzlei_weber_catering',
        title: 'Kanzlei Weber (12 Pers.)',
        current_step: 'intake_open',
        version: 1,
        state: {
          step1Confirmed: false,
          step2Baked: false,
          step3Served: false,
          step4Booked: false,
          oatMilkReorderPrepared: false,
        },
        created_by_user_id: 'u-marius',
        updated_by_user_id: 'u-marius',
        created_at: '2026-11-12T08:00:00Z',
        updated_at: '2026-11-12T08:00:00Z',
      },
    ],
    events: [],
    ledger_entries: [],
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Phase 1 Operative Datenwahrheit & Akzeptanztests', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    useDemoStore.setState({ demoCompanyId: 'demo-morgenrot' });
    useSessionStore.setState({
      user: {
        id: 'u-marius',
        name: 'Marius',
        email: 'marius@saimor.world',
        role: 'owner',
        tenant_id: 'tenant-hq',
        active_company_id: 'company-hq-live',
        active_company_name: 'SAIMÔR HQ',
      } as never,
    });
  });

  it('1+2+3+4: synchronisiert eine einheitliche Kasse über Theke -> Verwaltung -> LiveCockpit über Reload hinweg & blockiert übersprungene FSM-Schritte', async () => {
    // Schritt A: Unzulässiger Schritt in Verwaltung (Schritt 4 vor 1-3) wird strikt blockiert
    const verw1 = wrap(
      <Werkstatt
        planet={makePlanet('d-verw', 'Verwaltung & Büro')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="demo-morgenrot"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'demo-simulation');
    expect(screen.getByTestId('wk-scope-truth-badge')).toHaveTextContent('Demo / Simulation');

    const step4Btn = screen.getByTestId('wk-weber-step-cta');
    expect(step4Btn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(step4Btn);
    await waitFor(() =>
      expect(screen.getByTestId('wk-audit-feedback')).toHaveTextContent('Vorgang blockiert')
    );

    // Kasse darf sich NICHT geändert haben, Schritt 4 bleibt unerledigt
    expect(screen.getByTestId('wk-verwaltung-live-till')).toHaveTextContent('1842,00 €');
    expect(screen.getByTestId('wk-weber-state-4')).not.toHaveClass('is-done');
    verw1.unmount();

    // Schritt B: Barista-Theke bucht Bon einmalig (auch bei Doppelklick keine Doppelbuchung)
    const theke = wrap(
      <Werkstatt
        planet={makePlanet('d-theke', 'Theke & Schicht')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="demo-morgenrot"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    fireEvent.click(screen.getByTestId('wk-theke-pos-book'));
    fireEvent.click(screen.getByTestId('wk-theke-pos-book'));
    await waitFor(() => expect(screen.getByTestId('wk-audit-count')).toHaveTextContent('1 Einträge'));
    theke.unmount();

    // Schritt C: Browser-Reload-Simulation (komplett neuer Mount) in Verwaltung & LiveCockpit -> identischer Stand (1842 + 7,30 = 1849,30 €)
    const verwReload = wrap(
      <Werkstatt
        planet={makePlanet('d-verw', 'Verwaltung & Büro')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="demo-morgenrot"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    expect(screen.getByTestId('wk-verwaltung-live-till')).toHaveTextContent('1849,30 €');
    verwReload.unmount();

    const cockpit = wrap(<LiveCockpit navigate={jest.fn()} />);
    expect(screen.getByTestId('home-bridge-ledger-sync')).toHaveTextContent('1849,30 €');
    expect(screen.getByTestId('home-bridge-ledger-sync')).toHaveTextContent('Demo / Simulation');
    cockpit.unmount();

    // Demo darf niemals CORE-Write-APIs aufrufen
    expect(mockFetchOperationalState).not.toHaveBeenCalled();
    expect(mockTransitionOperationalProcess).not.toHaveBeenCalled();
    expect(mockCreateOperationalLedgerEntry).not.toHaveBeenCalled();
  });

  it('5+6: zeigt bei fehlgeschlagener CORE-Buchung (503) ehrlich Fehlgeschlagen + Retry ohne Fake-Eintrag und bestätigt erst nach CORE-Quittung', async () => {
    useDemoStore.setState({ demoCompanyId: null });
    mockFetchOperationalState.mockResolvedValue(makeServerState());

    const afterSuccessState = makeServerState({
      booked_revenue_cents: 1680,
      total_till_cents: 1680,
      receipts_count: 1,
      ledger_entries: [
        {
          id: 'le-1',
          company_id: 'company-hq-live',
          process_id: null,
          idempotency_key: 'theke-pos-bon-1',
          kind: 'pos_sale',
          station: 'theke',
          label: 'Barista-Bon #1049',
          amount_cents: 1680,
          currency: 'EUR',
          safety_level: 'buchung',
          reference_id: 'bon-1049',
          actor_user_id: 'u-marius',
          actor_name: 'Marius',
          actor_role: 'owner',
          meta: { result: 'Barista-Bon +16,80 € durch CORE bestätigt' },
          created_at: '2026-11-12T09:15:00Z',
        },
      ],
    });

    mockCreateOperationalLedgerEntry.mockRejectedValueOnce(
      new CoreError('CORE Datenbank nicht erreichbar', 503)
    );

    const view = wrap(
      <Werkstatt
        planet={makePlanet('d-theke', 'Theke & Schicht')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="company-hq-live"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'core-confirmed')
    );
    expect(screen.getByTestId('wk-scope-truth-badge')).toHaveTextContent('Durch CORE bestätigt');

    // Klick -> CORE lehnt mit 503 ab -> UI darf NICHT verbuchen
    fireEvent.click(screen.getByTestId('wk-theke-pos-book'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'failed')
    );
    expect(screen.getByTestId('wk-audit-error')).toHaveTextContent('CORE Datenbank nicht erreichbar');
    expect(screen.getByTestId('wk-ledger-retry-btn')).toBeInTheDocument();
    expect(screen.getByTestId('wk-audit-count')).toHaveTextContent('0 Einträge');

    // Jetzt antwortet CORE positiv -> Retry bestätigt exakt einmalig
    mockCreateOperationalLedgerEntry.mockResolvedValueOnce({
      ledger_entry: afterSuccessState.ledger_entries[0],
      state: afterSuccessState,
      receipt: { kind: 'ledger_entry', id: 'le-1', company_id: 'company-hq-live', persisted: true },
    });

    fireEvent.click(screen.getByTestId('wk-ledger-retry-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'core-confirmed')
    );
    expect(screen.getByTestId('wk-audit-count')).toHaveTextContent('1 Einträge');
    expect(screen.queryByTestId('wk-audit-error')).not.toBeInTheDocument();
    view.unmount();
  });

  it('6b: behandelt HTTP 403 / 409 bei CORE-Transition ehrlich als Fehlgeschlagen ohne Zustandsverfälschung', async () => {
    useDemoStore.setState({ demoCompanyId: null });
    mockFetchOperationalState.mockResolvedValue(
      makeServerState({
        processes: [
          {
            id: 'proc-weber-live',
            company_id: 'company-hq-live',
            process_key: 'kanzlei_weber_2026_11',
            process_type: 'kanzlei_weber_catering',
            title: 'Kanzlei Weber (12 Pers.)',
            current_step: 'theke_ready',
            version: 4,
            state: {
              step1Confirmed: true,
              step2Baked: true,
              step3Served: true,
              step4Booked: false,
              oatMilkReorderPrepared: false,
            },
            created_by_user_id: 'u-marius',
            updated_by_user_id: 'u-marius',
            created_at: '2026-11-12T08:00:00Z',
            updated_at: '2026-11-12T09:00:00Z',
          },
        ],
      })
    );

    mockTransitionOperationalProcess.mockRejectedValueOnce(
      new CoreError('Keine Berechtigung für Kassenabschluss (403)', 403)
    );

    const view = wrap(
      <Werkstatt
        planet={makePlanet('d-verw', 'Verwaltung & Büro')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="company-hq-live"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'core-confirmed')
    );

    fireEvent.click(screen.getByTestId('wk-weber-step-cta'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'failed')
    );
    expect(screen.getByTestId('wk-audit-error')).toHaveTextContent('Keine Berechtigung');
    expect(screen.getByTestId('wk-weber-state-4')).not.toHaveClass('is-done');
    expect(screen.getByTestId('wk-verwaltung-live-till')).toHaveTextContent('0,00 €');

    // Nächster Versuch erhält 409 Versionskonflikt -> ebenfalls ehrlich fehlgeschlagen
    mockTransitionOperationalProcess.mockRejectedValueOnce(
      new CoreError('Versionskonflikt (409)', 409)
    );
    fireEvent.click(screen.getByTestId('wk-ledger-retry-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-audit-error')).toHaveTextContent('Versionskonflikt')
    );
    expect(screen.getByTestId('wk-verwaltung-live-till')).toHaveTextContent('0,00 €');
    view.unmount();
  });

  it('7: meldet fehlgeschlagene Atelier-Dokument-Speicherung (updateNode Fehler) ehrlich mit Retry und NIEMALS Gespeichert ✓', async () => {
    useDemoStore.setState({ demoCompanyId: null });
    mockFetchOperationalState.mockResolvedValue(makeServerState());
    mockUpdateNode.mockRejectedValueOnce(new Error('CORE Patch fehlgeschlagen (500)'));

    const studio = wrap(
      <Werkstatt
        planet={makePlanet('dept-studio', 'Design & Studio')}
        work={makeWork()}
        planets={[{ id: 'dept-studio', title: 'Design & Studio' }]}
        companyId="company-hq-live"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('wk-hit-station'));
    fireEvent.click(screen.getByTestId('wk-studio-edit-toggle'));
    fireEvent.change(screen.getByTestId('wk-studio-editor'), {
      target: { value: '# ORIGIN // 001\n\nNeue Basalt-Spezifikation.' },
    });
    fireEvent.click(screen.getByTestId('wk-studio-save'));

    await waitFor(() => expect(screen.getByTestId('wk-studio-doc-error')).toBeInTheDocument());
    expect(screen.getByTestId('wk-studio-doc-error')).toHaveTextContent('CORE Patch fehlgeschlagen');
    expect(screen.getByTestId('wk-studio-lectern')).not.toHaveTextContent('Gespeichert ✓');
    expect(screen.getByTestId('wk-studio-editor')).toBeInTheDocument();

    // Retry gelingt nach CORE-Recovery
    mockUpdateNode.mockResolvedValueOnce({ id: 'n-folio' });
    fireEvent.click(screen.getByTestId('wk-studio-retry-btn'));
    await waitFor(() => expect(screen.queryByTestId('wk-studio-doc-error')).not.toBeInTheDocument());
    expect(screen.getByTestId('wk-studio-lectern')).toHaveTextContent('Durch CORE bestätigt');
    studio.unmount();
  });

  it('8: trennt Demo-Mandant (demo-morgenrot) und Live-Firma (company-hq-live) strikt ohne Datenleck', async () => {
    useDemoStore.setState({ demoCompanyId: 'demo-morgenrot' });
    const demoTheke = wrap(
      <Werkstatt
        planet={makePlanet('d-theke', 'Theke & Schicht')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="demo-morgenrot"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    fireEvent.click(screen.getByTestId('wk-theke-pos-book'));
    await waitFor(() => expect(screen.getByTestId('wk-audit-count')).toHaveTextContent('1 Einträge'));
    demoTheke.unmount();

    // Wechsel auf Live-Firma mit eigenem (leeren) Serverstand darf KEINE Demo-Buchungen übernehmen
    useDemoStore.setState({ demoCompanyId: null });
    mockFetchOperationalState.mockResolvedValueOnce(makeServerState({ total_till_cents: 0, ledger_entries: [] }));

    const liveKontor = wrap(
      <Werkstatt
        planet={makePlanet('d-verw', 'Verwaltung & Büro')}
        work={makeWork()}
        planets={skyPlanets}
        companyId="company-hq-live"
        today={TODAY}
        fromSpace={false}
        onExit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('wk-desk-plate'));
    await waitFor(() =>
      expect(screen.getByTestId('wk-scope-truth-badge')).toHaveAttribute('data-truth-status', 'core-confirmed')
    );
    expect(screen.getByTestId('wk-verwaltung-live-till')).toHaveTextContent('0,00 €');
    expect(screen.getByTestId('wk-audit-count')).toHaveTextContent('0 Einträge');
    liveKontor.unmount();
  });
});
