# SAIMOR OpenFlow Lagebild Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first visible OpenFlow-based OS Lagebild so SAIMOR feels like one coherent universe instead of disconnected apps.

**Architecture:** Add a small frontend-only OpenFlow model that normalizes existing Home, Mail, Calendar, Cloud, Feed, Activity, App Registry, and Tunnel signals into a common presentation layer. Replace the current Home emphasis with a living Lagebild while preserving MoraShell, Universe, Dock, Finder, panes, ambient layers, and all existing app entry points.

**Tech Stack:** Next.js 15, React 18, TypeScript, Zustand, TanStack Query, Jest, Testing Library, existing AppLoader/PaneManager architecture.

---

## Scope Check

The approved spec covers OS, Dashboard, Connector Core, Finder, Initiatives, Onboarding, and OpenClaw. This plan implements only Phase 1 + the visible part of Phase 2:

- shared frontend contracts
- OS presentation mapping
- Home/Lagebild component
- App Library regrouping into the new product language
- small onboarding/setup prompt inside the OS Home

This plan does not modify the standalone Larry/OpenClaw Dashboard. It does not create backend tables. It does not replace Nodes/Relations. It gives the OS a coherent product layer first.

---

## Current Findings From Inventory

Files already support the target direction:

- `components/os/shell/MoraShell.tsx` already owns ambient/cosmic layers, Dock, panes, Universe controls, realtime hooks, drop intake, and MORA overlays.
- `components/home/HomeSurface.tsx` already has briefing, recent work, departments, quick actions, communication hooks, and visitor/dossier handling.
- `apps/mail/index.tsx` already announces new mail and can send a message to MORA.
- `apps/integrations/index.tsx` already exposes Mail, Calendar, RSS, Cloud, Browser, Assistant, and Local Truth status.
- `lib/tunnel/tunnelCatalog.ts` already inventories hidden/gated/orphaned surfaces.
- `lib/apps/appRegistry.ts` and `lib/apps/AppLoader.tsx` already contain the app platform.
- `components/mora/PaneManager.tsx` already renders most app panes through `AppLoader`.

Main product gap:

- existing pieces are real, but they are not arranged as one product story.
- Home still reads too much like "Mission Control" plus panels.
- App Library is still category-based, not universe/source/agent/work oriented.
- hidden/gated surfaces are documented for developers, but not converted into product decisions.

---

## File Structure

Create:

- `lib/openflow/types.ts`  
  Owns shared contracts for signals, initiatives, connector status, flow runs, app universe groups, and OS action requests.

- `lib/openflow/presentation.ts`  
  Converts existing frontend inputs into OS-ready groups: changed, attention, next steps, initiatives, setup prompts.

- `lib/openflow/appUniverse.ts`  
  Maps `APP_REGISTRY`, `SURFACE_TIERS`, and selected tunnel entries into product groups: Work, Sources, Agents & Flows, People, Studio, System.

- `components/home/OpenFlowLagebild.tsx`  
  Renders the new Home core. It is a component because `HomeSurface.tsx` is already large.

- `__tests__/lib/openflow/presentation.test.ts`  
  Unit tests for signal and initiative derivation.

- `__tests__/lib/openflow/appUniverse.test.ts`  
  Unit tests for app grouping and hidden/gated inventory summary.

- `__tests__/components/home/OpenFlowLagebild.test.tsx`  
  Component tests for the new Home core.

Modify:

- `components/home/HomeSurface.tsx`  
  Keeps existing visitor/dossier special cases. For normal OS mode, renders `OpenFlowLagebild` in the main content area using existing hooks.

- `apps/apps/index.tsx`  
  Uses `getAppUniverseGroups()` for the App Library instead of raw legacy categories.

- `__tests__/components/home/HomeSurface.test.tsx`  
  Updates expectations from "Mission Control" to "Lagebild" while keeping existing behavior tests for quick actions, recent activity, visitor context, and logout.

---

## Task 1: Add Shared OpenFlow Types

**Files:**
- Create: `lib/openflow/types.ts`
- Test: `__tests__/lib/openflow/presentation.test.ts`

- [ ] **Step 1: Write the failing type-shape test**

Create `__tests__/lib/openflow/presentation.test.ts`:

```ts
import type {
  OpenFlowSignal,
  InitiativeSummary,
  ConnectorStatus,
  OpenFlowRun,
} from '@/lib/openflow/types';

describe('openflow types', () => {
  it('allows the core OS signal shape used by Home and Dashboard presenters', () => {
    const signal: OpenFlowSignal = {
      id: 'sig-mail-1',
      source: 'mail',
      title: 'Customer asked about launch date',
      summary: 'Related to Website Relaunch. Decision missing.',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      occurredAt: '2026-06-01T08:00:00.000Z',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [
        { id: 'reply', label: 'Antwort entwerfen', kind: 'reply' },
      ],
    };

    const initiative: InitiativeSummary = {
      id: 'initiative-website-relaunch',
      title: 'Website Relaunch',
      signalCount: 1,
      riskCount: 0,
      decisionCount: 1,
      sourceKinds: ['mail'],
      updatedAt: signal.occurredAt,
    };

    const connector: ConnectorStatus = {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: 'connected',
      detail: 'Postfach ist verbunden.',
    };

    const run: OpenFlowRun = {
      id: 'flow-1',
      title: 'Mail triage',
      status: 'waiting_for_human',
      currentStepLabel: 'Approve reply',
      relatedSignalIds: [signal.id],
    };

    expect(signal.suggestedActions[0].kind).toBe('reply');
    expect(initiative.sourceKinds).toEqual(['mail']);
    expect(connector.status).toBe('connected');
    expect(run.relatedSignalIds).toEqual(['sig-mail-1']);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts --no-coverage --runInBand
```

Expected: FAIL because `@/lib/openflow/types` does not exist.

- [ ] **Step 3: Create the types**

Create `lib/openflow/types.ts`:

```ts
export type OpenFlowSourceKind =
  | 'mail'
  | 'calendar'
  | 'cloud'
  | 'feed'
  | 'crm'
  | 'erp'
  | 'server'
  | 'git'
  | 'manual'
  | 'os';

export type OpenFlowPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OpenFlowSignalStatus = 'new' | 'seen' | 'triaged' | 'linked' | 'resolved' | 'dismissed';
export type OpenFlowTrustScope = 'personal' | 'department' | 'organization';

export type OpenFlowActionKind =
  | 'reply'
  | 'create_decision'
  | 'open_flow'
  | 'assign_task'
  | 'archive'
  | 'ask_user'
  | 'open_pane'
  | 'connect_source';

export interface OpenFlowSuggestedAction {
  id: string;
  label: string;
  kind: OpenFlowActionKind;
  paneType?: string;
  paneData?: Record<string, unknown>;
}

export interface OpenFlowSignal {
  id: string;
  source: OpenFlowSourceKind;
  title: string;
  summary: string;
  priority: OpenFlowPriority;
  status: OpenFlowSignalStatus;
  trustScope: OpenFlowTrustScope;
  occurredAt?: string;
  relatedInitiativeId?: string;
  relatedNodeIds: string[];
  relatedRelationIds: string[];
  suggestedActions: OpenFlowSuggestedAction[];
}

export interface InitiativeSummary {
  id: string;
  title: string;
  signalCount: number;
  riskCount: number;
  decisionCount: number;
  sourceKinds: OpenFlowSourceKind[];
  updatedAt?: string;
}

export type ConnectorHealth = 'connected' | 'local' | 'needs_setup' | 'degraded' | 'offline';

export interface ConnectorStatus {
  id: string;
  label: string;
  source: OpenFlowSourceKind;
  status: ConnectorHealth;
  detail: string;
  actionLabel?: string;
}

export type OpenFlowRunStatus = 'running' | 'waiting_for_human' | 'completed' | 'failed';

export interface OpenFlowRun {
  id: string;
  title: string;
  status: OpenFlowRunStatus;
  currentStepLabel: string;
  relatedSignalIds: string[];
}

export interface OpenFlowLagebild {
  changed: OpenFlowSignal[];
  attention: OpenFlowSignal[];
  nextSteps: OpenFlowSignal[];
  initiatives: InitiativeSummary[];
  connectors: ConnectorStatus[];
}

export type AppUniverseGroupId =
  | 'work'
  | 'sources'
  | 'agents_flows'
  | 'people'
  | 'studio'
  | 'system';

export interface AppUniverseGroup {
  id: AppUniverseGroupId;
  label: string;
  description: string;
  appIds: string[];
}
```

- [ ] **Step 4: Verify the type-shape test passes**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/openflow/types.ts __tests__/lib/openflow/presentation.test.ts
git commit -m "feat(os): add openflow presentation contracts"
```

---

## Task 2: Build the OS Presentation Adapter

**Files:**
- Modify: `__tests__/lib/openflow/presentation.test.ts`
- Create: `lib/openflow/presentation.ts`

- [ ] **Step 1: Extend the failing tests**

Append to `__tests__/lib/openflow/presentation.test.ts`:

```ts
import {
  buildConnectorStatuses,
  buildOpenFlowLagebild,
  deriveInitiativesFromSignals,
} from '@/lib/openflow/presentation';

describe('openflow presentation', () => {
  it('turns communication previews into changed, attention, and next-step signals', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [
        {
          id: 'mail-1',
          from: 'kunde@example.com',
          subject: 'Launch Termin?',
          snippet: 'Wann geht die neue Website live?',
          date: '2026-06-01T08:00:00.000Z',
        },
      ],
      calendarPreview: [
        {
          id: 'cal-1',
          title: 'Launch Sync',
          date: '2026-06-02',
          time: '10:00',
        },
      ],
      feedPreview: [],
      cloudPreview: [
        {
          connectorId: 'drive',
          connectorLabel: 'Drive',
          provider: 'google',
          itemId: 'doc-1',
          itemName: 'Website Briefing.pdf',
          itemKind: 'file',
          itemPath: '/Website',
        },
      ],
      homeView: null,
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        mailStatusLabel: 'Mail verbunden',
        calendarStatusLabel: 'Kalender verbunden',
        browserStatusLabel: 'Browser bereit',
        localTruthStatusLabel: 'Local Truth bereit',
        mailStatusDetail: 'Postfach ist verbunden.',
        calendarStatusDetail: 'Kalender ist verbunden.',
      },
    });

    expect(view.changed.map((item) => item.source)).toEqual(['mail', 'calendar', 'cloud']);
    expect(view.attention[0].priority).toBe('high');
    expect(view.nextSteps[0].suggestedActions[0].kind).toBe('reply');
  });

  it('derives initiatives from signal titles and relation hints without creating a new backend entity', () => {
    const initiatives = deriveInitiativesFromSignals([
      {
        id: 'sig-1',
        source: 'mail',
        title: 'Website Relaunch: Kunde fragt nach Launch Termin',
        summary: 'Termin fehlt.',
        priority: 'high',
        status: 'new',
        trustScope: 'personal',
        relatedNodeIds: [],
        relatedRelationIds: [],
        suggestedActions: [],
      },
      {
        id: 'sig-2',
        source: 'cloud',
        title: 'Website Relaunch Briefing aktualisiert',
        summary: 'Neue Datei.',
        priority: 'normal',
        status: 'linked',
        trustScope: 'personal',
        relatedNodeIds: [],
        relatedRelationIds: [],
        suggestedActions: [],
      },
    ]);

    expect(initiatives).toEqual([
      expect.objectContaining({
        id: 'initiative-website-relaunch',
        title: 'Website Relaunch',
        signalCount: 2,
        sourceKinds: ['mail', 'cloud'],
      }),
    ]);
  });

  it('maps setup state into connector statuses', () => {
    const connectors = buildConnectorStatuses({
      mailConfigured: false,
      calendarConfigured: true,
      browserPermission: 'default',
      mailStatusLabel: 'Mail nicht eingerichtet',
      calendarStatusLabel: 'Kalender verbunden',
      browserStatusLabel: 'Browser freigeben',
      localTruthStatusLabel: 'Desktop Bridge getrennt',
      mailStatusDetail: 'Setze Mail Zugangsdaten.',
      calendarStatusDetail: 'Kalender ist verbunden.',
    });

    expect(connectors).toEqual([
      expect.objectContaining({ id: 'mail', status: 'needs_setup' }),
      expect.objectContaining({ id: 'calendar', status: 'connected' }),
      expect.objectContaining({ id: 'browser', status: 'needs_setup' }),
      expect.objectContaining({ id: 'local-truth', status: 'offline' }),
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts --no-coverage --runInBand
```

Expected: FAIL because `presentation.ts` does not exist.

- [ ] **Step 3: Create the adapter**

Create `lib/openflow/presentation.ts`:

```ts
import type {
  ConnectorHealth,
  ConnectorStatus,
  InitiativeSummary,
  OpenFlowLagebild,
  OpenFlowSignal,
  OpenFlowSourceKind,
} from '@/lib/openflow/types';

interface MailPreviewItem {
  id: string;
  subject: string;
  from: string;
  snippet?: string;
  date?: string;
}

interface CalendarPreviewItem {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

interface FeedPreviewItem {
  id: string;
  sourceTitle: string;
  title: string;
  summary?: string;
  published?: string;
}

interface CloudPreviewItem {
  connectorId: string;
  connectorLabel: string;
  provider: string;
  itemId: string;
  itemName: string;
  itemKind: string;
  itemPath?: string;
}

interface CommunicationSummaryLike {
  mailConfigured?: boolean;
  calendarConfigured?: boolean;
  browserPermission?: string;
  mailStatusLabel?: string;
  calendarStatusLabel?: string;
  browserStatusLabel?: string;
  localTruthStatusLabel?: string;
  mailStatusDetail?: string;
  calendarStatusDetail?: string;
}

interface HomeViewLike {
  changes?: Array<{ id: string | number; title: string; scope?: string | null; occurred_at?: string; severity?: number | null }>;
  attention?: Array<{ id: string | number; title: string; category?: string; scope?: string | null; severity?: number | null }>;
  next_steps?: Array<{ id: string; title: string; source?: string }>;
}

interface BuildOpenFlowLagebildInput {
  mailPreview: MailPreviewItem[];
  calendarPreview: CalendarPreviewItem[];
  feedPreview: FeedPreviewItem[];
  cloudPreview: CloudPreviewItem[];
  homeView: HomeViewLike | null;
  communicationSummary: CommunicationSummaryLike;
}

const INITIATIVE_PATTERNS = [
  { id: 'initiative-website-relaunch', title: 'Website Relaunch', match: /website|relaunch|launch/i },
  { id: 'initiative-ki-einfuehrung', title: 'KI Einfuehrung', match: /\bki\b|ai|automation|agent/i },
  { id: 'initiative-security-check', title: 'Security Check', match: /security|audit|ssl|risk|risiko/i },
  { id: 'initiative-kundenprojekt', title: 'Kundenprojekt', match: /kunde|customer|client|projekt/i },
];

function priorityFromSeverity(severity?: number | null) {
  if (typeof severity !== 'number') return 'normal' as const;
  if (severity >= 0.86) return 'urgent' as const;
  if (severity >= 0.66) return 'high' as const;
  if (severity >= 0.33) return 'normal' as const;
  return 'low' as const;
}

function buildSignalId(prefix: string, value: string | number) {
  return `${prefix}-${String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`;
}

function inferInitiativeId(title: string): string | undefined {
  return INITIATIVE_PATTERNS.find((pattern) => pattern.match.test(title))?.id;
}

function signal(
  input: Omit<OpenFlowSignal, 'relatedNodeIds' | 'relatedRelationIds' | 'suggestedActions'> &
    Partial<Pick<OpenFlowSignal, 'relatedNodeIds' | 'relatedRelationIds' | 'suggestedActions'>>
): OpenFlowSignal {
  return {
    relatedNodeIds: [],
    relatedRelationIds: [],
    suggestedActions: [],
    ...input,
  };
}

function uniqueSourceKinds(values: OpenFlowSourceKind[]): OpenFlowSourceKind[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function deriveInitiativesFromSignals(signals: OpenFlowSignal[]): InitiativeSummary[] {
  const buckets = new Map<string, InitiativeSummary>();

  signals.forEach((item) => {
    const pattern = INITIATIVE_PATTERNS.find((entry) => entry.id === item.relatedInitiativeId)
      ?? INITIATIVE_PATTERNS.find((entry) => entry.match.test(`${item.title} ${item.summary}`));
    if (!pattern) return;

    const existing = buckets.get(pattern.id);
    if (!existing) {
      buckets.set(pattern.id, {
        id: pattern.id,
        title: pattern.title,
        signalCount: 1,
        riskCount: item.priority === 'high' || item.priority === 'urgent' ? 1 : 0,
        decisionCount: /decision|entscheidung|termin|owner/i.test(`${item.title} ${item.summary}`) ? 1 : 0,
        sourceKinds: [item.source],
        updatedAt: item.occurredAt,
      });
      return;
    }

    existing.signalCount += 1;
    existing.riskCount += item.priority === 'high' || item.priority === 'urgent' ? 1 : 0;
    existing.decisionCount += /decision|entscheidung|termin|owner/i.test(`${item.title} ${item.summary}`) ? 1 : 0;
    existing.sourceKinds = uniqueSourceKinds([...existing.sourceKinds, item.source]);
    existing.updatedAt = item.occurredAt || existing.updatedAt;
  });

  return Array.from(buckets.values()).sort((a, b) => b.signalCount - a.signalCount);
}

export function buildConnectorStatuses(summary: CommunicationSummaryLike): ConnectorStatus[] {
  const browserStatus: ConnectorHealth =
    summary.browserPermission === 'granted' ? 'connected' :
      summary.browserPermission === 'denied' ? 'degraded' :
        'needs_setup';

  const localTruthStatus: ConnectorHealth =
    /bereit/i.test(summary.localTruthStatusLabel || '') ? 'connected' :
      /lokal/i.test(summary.localTruthStatusLabel || '') ? 'local' :
        'offline';

  return [
    {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: summary.mailConfigured ? 'connected' : 'needs_setup',
      detail: summary.mailStatusDetail || summary.mailStatusLabel || 'Mail ist noch nicht verbunden.',
      actionLabel: summary.mailConfigured ? 'Postfach oeffnen' : 'Mail verbinden',
    },
    {
      id: 'calendar',
      label: 'Kalender',
      source: 'calendar',
      status: summary.calendarConfigured ? 'connected' : 'needs_setup',
      detail: summary.calendarStatusDetail || summary.calendarStatusLabel || 'Kalender ist noch nicht verbunden.',
      actionLabel: summary.calendarConfigured ? 'Kalender oeffnen' : 'Kalender verbinden',
    },
    {
      id: 'browser',
      label: 'Browser',
      source: 'os',
      status: browserStatus,
      detail: summary.browserStatusLabel || 'Browser-Signale sind noch nicht freigegeben.',
      actionLabel: browserStatus === 'connected' ? 'Bereit' : 'Freigeben',
    },
    {
      id: 'local-truth',
      label: 'Local Truth',
      source: 'os',
      status: localTruthStatus,
      detail: summary.localTruthStatusLabel || 'Desktop Bridge ist nicht verbunden.',
      actionLabel: localTruthStatus === 'offline' ? 'Setup pruefen' : 'Oeffnen',
    },
  ];
}

export function buildOpenFlowLagebild(input: BuildOpenFlowLagebildInput): OpenFlowLagebild {
  const homeChanges = (input.homeView?.changes || []).map((item) =>
    signal({
      id: buildSignalId('home-change', item.id),
      source: 'os',
      title: item.title,
      summary: item.scope || 'Aenderung im Organisationskontext.',
      priority: priorityFromSeverity(item.severity),
      status: 'new',
      trustScope: 'organization',
      occurredAt: item.occurred_at,
      relatedInitiativeId: inferInitiativeId(`${item.title} ${item.scope || ''}`),
    })
  );

  const mailSignals = input.mailPreview.map((item) =>
    signal({
      id: buildSignalId('mail', item.id),
      source: 'mail',
      title: item.subject || 'Neue Mail',
      summary: [item.from, item.snippet].filter(Boolean).join(' - '),
      priority: /dringend|urgent|termin|deadline|launch|problem|risiko/i.test(`${item.subject} ${item.snippet}`) ? 'high' : 'normal',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.date,
      relatedInitiativeId: inferInitiativeId(`${item.subject} ${item.snippet || ''}`),
      suggestedActions: [
        { id: `${item.id}-reply`, label: 'Antwort entwerfen', kind: 'reply', paneType: 'mail', paneData: { messageId: item.id } },
        { id: `${item.id}-flow`, label: 'Als Flow oeffnen', kind: 'open_flow' },
      ],
    })
  );

  const calendarSignals = input.calendarPreview.map((item) =>
    signal({
      id: buildSignalId('calendar', item.id),
      source: 'calendar',
      title: item.title || 'Termin',
      summary: [item.date, item.time, item.location].filter(Boolean).join(' - '),
      priority: 'normal',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.date,
      relatedInitiativeId: inferInitiativeId(item.title || ''),
      suggestedActions: [
        { id: `${item.id}-open-calendar`, label: 'Kalender oeffnen', kind: 'open_pane', paneType: 'calendar' },
      ],
    })
  );

  const feedSignals = input.feedPreview.map((item) =>
    signal({
      id: buildSignalId('feed', item.id),
      source: 'feed',
      title: item.title || 'Feed-Signal',
      summary: [item.sourceTitle, item.summary].filter(Boolean).join(' - '),
      priority: 'low',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.published,
      relatedInitiativeId: inferInitiativeId(`${item.title} ${item.summary || ''}`),
    })
  );

  const cloudSignals = input.cloudPreview.map((item) =>
    signal({
      id: buildSignalId('cloud', `${item.connectorId}-${item.itemId}`),
      source: 'cloud',
      title: item.itemName,
      summary: [item.connectorLabel, item.itemPath].filter(Boolean).join(' - '),
      priority: /briefing|vertrag|contract|proposal|angebot/i.test(item.itemName) ? 'normal' : 'low',
      status: 'linked',
      trustScope: 'personal',
      relatedInitiativeId: inferInitiativeId(`${item.itemName} ${item.itemPath || ''}`),
      suggestedActions: [
        { id: `${item.itemId}-open-cloud`, label: 'Quelle pruefen', kind: 'open_pane', paneType: 'meine-dateien' },
      ],
    })
  );

  const homeAttention = (input.homeView?.attention || []).map((item) =>
    signal({
      id: buildSignalId('home-attention', item.id),
      source: 'os',
      title: item.title,
      summary: item.scope || item.category || 'Braucht Aufmerksamkeit.',
      priority: priorityFromSeverity(item.severity),
      status: 'new',
      trustScope: 'organization',
      relatedInitiativeId: inferInitiativeId(`${item.title} ${item.scope || ''}`),
      suggestedActions: [
        { id: `${item.id}-ask`, label: 'MORA fragen', kind: 'ask_user', paneType: 'chat' },
      ],
    })
  );

  const homeNextSteps = (input.homeView?.next_steps || []).map((item) =>
    signal({
      id: buildSignalId('home-next', item.id),
      source: 'os',
      title: item.title,
      summary: item.source || 'Vorgeschlagener naechster Schritt.',
      priority: 'normal',
      status: 'new',
      trustScope: 'organization',
      relatedInitiativeId: inferInitiativeId(`${item.title} ${item.source || ''}`),
      suggestedActions: [
        { id: `${item.id}-open`, label: 'Oeffnen', kind: 'open_flow' },
      ],
    })
  );

  const changed = [...homeChanges, ...mailSignals, ...calendarSignals, ...feedSignals, ...cloudSignals].slice(0, 8);
  const attention = [...homeAttention, ...changed.filter((item) => item.priority === 'urgent' || item.priority === 'high')].slice(0, 5);
  const nextSteps = [...homeNextSteps, ...changed.filter((item) => item.suggestedActions.length > 0)].slice(0, 5);

  return {
    changed,
    attention,
    nextSteps,
    initiatives: deriveInitiativesFromSignals([...changed, ...attention, ...nextSteps]).slice(0, 4),
    connectors: buildConnectorStatuses(input.communicationSummary),
  };
}
```

- [ ] **Step 4: Verify adapter tests pass**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/openflow/presentation.ts __tests__/lib/openflow/presentation.test.ts
git commit -m "feat(os): derive openflow lagebild from existing signals"
```

---

## Task 3: Add App Universe Grouping

**Files:**
- Create: `lib/openflow/appUniverse.ts`
- Create: `__tests__/lib/openflow/appUniverse.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/openflow/appUniverse.test.ts`:

```ts
import { getAppUniverseGroups, summarizeHiddenSurfaces } from '@/lib/openflow/appUniverse';

describe('appUniverse', () => {
  it('groups existing apps into product-language constellations', () => {
    const groups = getAppUniverseGroups();

    expect(groups.map((group) => group.id)).toEqual([
      'work',
      'sources',
      'agents_flows',
      'people',
      'studio',
      'system',
    ]);
    expect(groups.find((group) => group.id === 'work')?.appIds).toEqual(
      expect.arrayContaining(['finder', 'notes', 'tasks', 'calendar'])
    );
    expect(groups.find((group) => group.id === 'sources')?.appIds).toEqual(
      expect.arrayContaining(['mail', 'integrations', 'meine-dateien'])
    );
    expect(groups.find((group) => group.id === 'agents_flows')?.appIds).toEqual(
      expect.arrayContaining(['chat', 'action-center', 'work-session'])
    );
  });

  it('summarizes hidden surfaces from the tunnel catalog as product decisions', () => {
    const summary = summarizeHiddenSurfaces();

    expect(summary.gatedCount).toBeGreaterThan(0);
    expect(summary.keepVisualIds).toEqual(expect.arrayContaining(['resonance-room', 'memory-sidebar']));
    expect(summary.productIssueIds).toEqual(expect.arrayContaining(['mora-memory-chat', 'feature-flags']));
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/lib/openflow/appUniverse.test.ts --no-coverage --runInBand
```

Expected: FAIL because `appUniverse.ts` does not exist.

- [ ] **Step 3: Implement app grouping**

Create `lib/openflow/appUniverse.ts`:

```ts
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { buildTunnelCatalog, TUNNEL_PRODUCT_ISSUES } from '@/lib/tunnel/tunnelCatalog';
import type { AppUniverseGroup } from '@/lib/openflow/types';

const GROUPS: AppUniverseGroup[] = [
  {
    id: 'work',
    label: 'Arbeit',
    description: 'Finder, Aufgaben, Kalender, Notizen und konkrete Arbeitsfenster.',
    appIds: ['finder', 'document', 'notes', 'tasks', 'calendar', 'grid', 'timeline'],
  },
  {
    id: 'sources',
    label: 'Quellen',
    description: 'Mail, Cloud, Integrationen, Dossiers und verbundene Datenquellen.',
    appIds: ['mail', 'integrations', 'meine-dateien', 'website-dossier', 'search'],
  },
  {
    id: 'agents_flows',
    label: 'Agenten & Flows',
    description: 'MORA, Scanner, Action Center und Arbeitssitzungen.',
    appIds: ['chat', 'scanner', 'action-center', 'work-session'],
  },
  {
    id: 'people',
    label: 'Menschen',
    description: 'Team, Benutzer und Verantwortlichkeiten.',
    appIds: ['team', 'users'],
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Canvas und kreative Arbeitsflaechen.',
    appIds: ['canvas'],
  },
  {
    id: 'system',
    label: 'System',
    description: 'Einstellungen, Apps, Terminal und technische Kontrolle.',
    appIds: ['settings', 'apps', 'terminal'],
  },
];

export function getAppUniverseGroups(): AppUniverseGroup[] {
  const existingIds = new Set(APP_REGISTRY.map((app) => app.id));

  return GROUPS
    .map((group) => ({
      ...group,
      appIds: group.appIds.filter((appId) => existingIds.has(appId)),
    }))
    .filter((group) => group.appIds.length > 0);
}

export function getAppUniverseGroupForApp(appId: string): AppUniverseGroup | undefined {
  return getAppUniverseGroups().find((group) => group.appIds.includes(appId));
}

export function summarizeHiddenSurfaces() {
  const entries = buildTunnelCatalog();
  const gated = entries.filter((entry) => entry.status === 'gated');
  const orphan = entries.filter((entry) => entry.status === 'orphan' || entry.status === 'broken-wire');
  const keepVisual = entries.filter((entry) => entry.keepVisual);

  return {
    gatedCount: gated.length,
    orphanCount: orphan.length,
    keepVisualIds: keepVisual.map((entry) => entry.id),
    productIssueIds: TUNNEL_PRODUCT_ISSUES.map((entry) => entry.id),
  };
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm test -- __tests__/lib/openflow/appUniverse.test.ts --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/openflow/appUniverse.ts __tests__/lib/openflow/appUniverse.test.ts
git commit -m "feat(os): group apps into universe constellations"
```

---

## Task 4: Render OpenFlowLagebild as the New OS Home Core

**Files:**
- Create: `components/home/OpenFlowLagebild.tsx`
- Create: `__tests__/components/home/OpenFlowLagebild.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `__tests__/components/home/OpenFlowLagebild.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OpenFlowLagebild } from '@/components/home/OpenFlowLagebild';
import type { OpenFlowLagebild as Lagebild } from '@/lib/openflow/types';

const view: Lagebild = {
  changed: [
    {
      id: 'sig-mail-1',
      source: 'mail',
      title: 'Launch Termin?',
      summary: 'kunde@example.com - Wann geht die Website live?',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'reply', label: 'Antwort entwerfen', kind: 'reply', paneType: 'mail' }],
    },
  ],
  attention: [
    {
      id: 'sig-risk-1',
      source: 'os',
      title: 'Owner fehlt',
      summary: 'Website Relaunch braucht eine Entscheidung.',
      priority: 'high',
      status: 'new',
      trustScope: 'organization',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'ask', label: 'MORA fragen', kind: 'ask_user', paneType: 'chat' }],
    },
  ],
  nextSteps: [
    {
      id: 'sig-next-1',
      source: 'os',
      title: 'Entscheidung sichern',
      summary: 'Launch-Termin als Entscheidung anlegen.',
      priority: 'normal',
      status: 'new',
      trustScope: 'organization',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'flow', label: 'Als Flow oeffnen', kind: 'open_flow' }],
    },
  ],
  initiatives: [
    {
      id: 'initiative-website-relaunch',
      title: 'Website Relaunch',
      signalCount: 2,
      riskCount: 1,
      decisionCount: 1,
      sourceKinds: ['mail', 'os'],
    },
  ],
  connectors: [
    {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: 'connected',
      detail: 'Postfach ist verbunden.',
      actionLabel: 'Postfach oeffnen',
    },
  ],
};

describe('OpenFlowLagebild', () => {
  it('renders the three OS questions', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByText('Was hat sich veraendert?')).toBeInTheDocument();
    expect(screen.getByText('Was braucht Aufmerksamkeit?')).toBeInTheDocument();
    expect(screen.getByText('Naechster sinnvoller Schritt')).toBeInTheDocument();
    expect(screen.getByText('Launch Termin?')).toBeInTheDocument();
  });

  it('renders initiatives as gravity centers', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByText('Initiativen')).toBeInTheDocument();
    expect(screen.getByText('Website Relaunch')).toBeInTheDocument();
    expect(screen.getByText('2 Signale')).toBeInTheDocument();
  });

  it('opens the suggested pane for signal actions', () => {
    const onOpenPane = jest.fn();
    render(<OpenFlowLagebild view={view} onOpenPane={onOpenPane} onGoExplore={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Antwort entwerfen' }));

    expect(onOpenPane).toHaveBeenCalledWith({
      id: 'mail-main',
      type: 'mail',
      title: 'Mail',
      size: { width: 960, height: 680 },
      data: {},
    });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/components/home/OpenFlowLagebild.test.tsx --no-coverage --runInBand
```

Expected: FAIL because `OpenFlowLagebild.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `components/home/OpenFlowLagebild.tsx`:

```tsx
'use client';

import React from 'react';
import { Activity, AlertTriangle, ArrowRight, FolderOpen, Mail, Network, Plug, Sparkles } from 'lucide-react';
import type { PaneOpenRequest } from '@/lib/store/paneStore';
import type { ConnectorStatus, OpenFlowLagebild as Lagebild, OpenFlowSignal } from '@/lib/openflow/types';

interface OpenFlowLagebildProps {
  view: Lagebild;
  onOpenPane: (request: PaneOpenRequest) => void;
  onGoExplore: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  mail: 'Mail',
  calendar: 'Kalender',
  cloud: 'Cloud',
  feed: 'Feed',
  crm: 'CRM',
  erp: 'ERP',
  server: 'Server',
  git: 'Git',
  manual: 'Manuell',
  os: 'OS',
};

function paneTitle(type: string) {
  switch (type) {
    case 'mail': return 'Mail';
    case 'calendar': return 'Kalender';
    case 'chat': return 'Mora';
    case 'meine-dateien': return 'Meine Dateien';
    case 'integrations': return 'Integrationen';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function paneSize(type: string) {
  switch (type) {
    case 'mail': return { width: 960, height: 680 };
    case 'calendar': return { width: 840, height: 620 };
    case 'chat': return { width: 860, height: 680 };
    case 'meine-dateien': return { width: 680, height: 560 };
    case 'integrations': return { width: 860, height: 680 };
    default: return { width: 860, height: 640 };
  }
}

function SignalCard({ signal, onOpenPane }: { signal: OpenFlowSignal; onOpenPane: (request: PaneOpenRequest) => void }) {
  const action = signal.suggestedActions[0];

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
            <span>{SOURCE_LABEL[signal.source] || signal.source}</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>{signal.trustScope}</span>
          </div>
          <h3 className="text-sm font-medium text-white/90">{signal.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/52">{signal.summary}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
          signal.priority === 'urgent' || signal.priority === 'high'
            ? 'border border-amber-300/25 bg-amber-400/10 text-amber-100'
            : 'border border-white/10 bg-white/[0.04] text-white/48'
        }`}>
          {signal.priority}
        </span>
      </div>
      {action && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-2 text-xs text-emerald-50/78 transition-colors hover:bg-emerald-400/[0.14]"
          onClick={() => {
            if (!action.paneType) return;
            onOpenPane({
              id: `${action.paneType}-main`,
              type: action.paneType as PaneOpenRequest['type'],
              title: paneTitle(action.paneType),
              size: paneSize(action.paneType),
              data: action.paneData || {},
            });
          }}
        >
          {action.label}
          <ArrowRight size={13} />
        </button>
      )}
    </article>
  );
}

function ConnectorPill({ connector }: { connector: ConnectorStatus }) {
  const good = connector.status === 'connected' || connector.status === 'local';
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/18 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/75">{connector.label}</span>
        <span className={`h-2 w-2 rounded-full ${good ? 'bg-emerald-300' : 'bg-amber-300'}`} />
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{connector.detail}</p>
    </div>
  );
}

export function OpenFlowLagebild({ view, onOpenPane, onGoExplore }: OpenFlowLagebildProps) {
  const changed = view.changed.slice(0, 3);
  const attention = view.attention.slice(0, 2);
  const nextSteps = view.nextSteps.slice(0, 2);

  return (
    <section data-testid="openflow-lagebild" className="relative mx-auto flex h-full w-full max-w-[1500px] flex-col gap-5 px-6 pb-28 pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-emerald-50/58">
            <Sparkles size={12} />
            SAIMOR OpenFlow
          </div>
          <h1 className="max-w-3xl text-3xl font-light tracking-[-0.01em] text-white">
            Lagebild
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/54">
            Veraenderungen, Quellen, Initiativen und naechste Schritte entstehen aus demselben Organisationsgedaechtnis.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplore}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.07] px-4 py-3 text-sm text-cyan-50/75 hover:bg-cyan-300/[0.12]"
        >
          <Network size={16} />
          Karte oeffnen
        </button>
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
            <Activity size={16} className="text-cyan-200/70" />
            Was hat sich veraendert?
          </div>
          <div className="grid gap-3">
            {changed.length > 0 ? changed.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/42">
                Noch keine neuen Signale. Verbinde Mail, Cloud oder Kalender, damit die Karte wachsen kann.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <AlertTriangle size={16} className="text-amber-200/70" />
              Was braucht Aufmerksamkeit?
            </div>
            <div className="grid gap-3">
              {attention.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <ArrowRight size={16} className="text-emerald-200/70" />
              Naechster sinnvoller Schritt
            </div>
            <div className="grid gap-3">
              {nextSteps.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <FolderOpen size={16} className="text-violet-200/70" />
              Initiativen
            </div>
            <div className="grid gap-3">
              {view.initiatives.length > 0 ? view.initiatives.map((initiative) => (
                <div key={initiative.id} className="rounded-2xl border border-violet-200/10 bg-violet-300/[0.06] p-4">
                  <h3 className="text-sm font-medium text-white/86">{initiative.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/46">
                    <span>{initiative.signalCount} Signale</span>
                    <span>{initiative.riskCount} Risiken</span>
                    <span>{initiative.decisionCount} Entscheidungen</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/42">
                  Initiativen entstehen, sobald Quellen und Arbeit zusammenhaengen.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <Plug size={16} className="text-emerald-200/70" />
              Quellen
            </div>
            <div className="grid gap-2">
              {view.connectors.map((connector) => <ConnectorPill key={connector.id} connector={connector} />)}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify component tests pass**

Run:

```bash
npm test -- __tests__/components/home/OpenFlowLagebild.test.tsx --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/home/OpenFlowLagebild.tsx __tests__/components/home/OpenFlowLagebild.test.tsx
git commit -m "feat(home): add openflow lagebild surface"
```

---

## Task 5: Wire Lagebild Into HomeSurface

**Files:**
- Modify: `components/home/HomeSurface.tsx`
- Modify: `__tests__/components/home/HomeSurface.test.tsx`

- [ ] **Step 1: Add a failing HomeSurface test for the new surface**

In `__tests__/components/home/HomeSurface.test.tsx`, add:

```tsx
it('renders OpenFlow Lagebild for normal OS home', async () => {
    renderWithDepts();
    await waitFor(() => {
        expect(screen.getByTestId('openflow-lagebild')).toBeInTheDocument();
        expect(screen.getByText('Lagebild')).toBeInTheDocument();
    });
});
```

Update the older "Mission Control" test:

```tsx
it('frames Home as immersive OpenFlow Lagebild', () => {
    renderWithDepts();
    expect(screen.getByTestId('openflow-lagebild')).toBeInTheDocument();
    expect(screen.getByText('Lagebild')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/components/home/HomeSurface.test.tsx --no-coverage --runInBand
```

Expected: FAIL until `HomeSurface` renders `OpenFlowLagebild`.

- [ ] **Step 3: Wire imports**

In `components/home/HomeSurface.tsx`, add imports:

```ts
import { OpenFlowLagebild } from '@/components/home/OpenFlowLagebild';
import { buildOpenFlowLagebild } from '@/lib/openflow/presentation';
```

- [ ] **Step 4: Build Lagebild view inside `HomeSurface`**

Inside `HomeSurface`, after `useCommunicationLiveData()` and the communication surface hook are available, add:

```ts
const openFlowView = useMemo(() => buildOpenFlowLagebild({
    mailPreview,
    calendarPreview,
    feedPreview,
    cloudPreview,
    homeView: homeView ?? null,
    communicationSummary: communicationSurface.summary,
}), [
    mailPreview,
    calendarPreview,
    feedPreview,
    cloudPreview,
    homeView,
    communicationSurface.summary,
]);
```

Use the existing variable name for the communication surface. If the file currently destructures `summary` directly, pass that value as `communicationSummary: summary`.

- [ ] **Step 5: Replace only the normal OS Home main body**

Keep the website entry/dossier branches intact. In the normal home return path, render:

```tsx
<OpenFlowLagebild
    view={openFlowView}
    onOpenPane={openPane}
    onGoExplore={() => setCoreMode('explore')}
/>
```

Do not remove visitor/dossier logic. Do not remove logout handling. Do not remove `HomeViewHighlights` until tests confirm it is no longer rendered in normal mode.

- [ ] **Step 6: Fix existing hook mock shape**

In `HomeSurface.test.tsx`, update the `useCommunicationLiveData` mock so it includes all arrays:

```ts
jest.mock('@/lib/hooks/useCommunicationLiveData', () => ({
    useCommunicationLiveData: () => ({
        mailPreview: [],
        calendarPreview: [],
        feedPreview: [],
        cloudPreview: [],
        isLoading: false,
        refresh: jest.fn(),
    }),
}));
```

Update the `useIntegrationsOverview` and `useLocalTruthBridge` mocks only if `useCommunicationSurface` now reads fields not present in the current mock. Keep the same no-network behavior.

- [ ] **Step 7: Verify HomeSurface tests pass**

Run:

```bash
npm test -- __tests__/components/home/HomeSurface.test.tsx __tests__/components/home/OpenFlowLagebild.test.tsx --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/home/HomeSurface.tsx __tests__/components/home/HomeSurface.test.tsx
git commit -m "feat(home): make openflow lagebild the os home"
```

---

## Task 6: Regroup App Library Into Universe Constellations

**Files:**
- Modify: `apps/apps/index.tsx`
- Modify or create: `__tests__/lib/apps/appRegistry.test.ts`

- [ ] **Step 1: Add grouping expectations**

In `__tests__/lib/apps/appRegistry.test.ts`, add:

```ts
import { getAppUniverseGroups } from '@/lib/openflow/appUniverse';

describe('app universe groups', () => {
  it('does not reference missing app ids', () => {
    const appIds = new Set(APP_REGISTRY.map((app) => app.id));
    const groupedIds = getAppUniverseGroups().flatMap((group) => group.appIds);

    groupedIds.forEach((id) => {
      expect(appIds.has(id)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run and verify the grouping test**

Run:

```bash
npm test -- __tests__/lib/apps/appRegistry.test.ts __tests__/lib/openflow/appUniverse.test.ts --no-coverage --runInBand
```

Expected: PASS if Task 3 is complete.

- [ ] **Step 3: Update App Library imports**

In `apps/apps/index.tsx`, add:

```ts
import { getAppUniverseGroups } from '@/lib/openflow/appUniverse';
```

- [ ] **Step 4: Replace category constants with universe groups**

Remove the usage of `CATEGORY_ORDER` and `CATEGORY_LABELS` in the render loop. Keep `COLOR_CLASS`, `ICON_MAP`, `LAUNCHER_EXCLUDE`, role filtering, and `isPaneEnabled()`.

Add this inside the component after `visibleApps`:

```ts
const universeGroups = getAppUniverseGroups()
    .map((group) => ({
        ...group,
        apps: group.appIds
            .map((appId) => visibleApps.find((app) => app.id === appId))
            .filter(Boolean) as typeof visibleApps,
    }))
    .filter((group) => group.apps.length > 0);
```

Replace the render loop with:

```tsx
{universeGroups.map(group => (
    <div key={group.id}>
        <div className="pb-2.5 pl-0.5">
            <p className="text-[10px] uppercase tracking-widest text-white/30">
                {group.label}
            </p>
            <p className="mt-1 text-[11px] text-white/36">
                {group.description}
            </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
            {group.apps.map(app => {
                const IconComp = ICON_MAP[app.icon] ?? Grid;
                const colors = COLOR_CLASS[app.color] ?? COLOR_CLASS.slate;
                return (
                    <button
                        key={app.id}
                        type="button"
                        onClick={() => handleAppClick(app.id, app.name, app.defaultSize)}
                        title={app.description}
                        className="relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 pb-3 pt-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.07] group cursor-pointer"
                    >
                        {app.isNew && (
                            <span className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-emerald-300">
                                Neu
                            </span>
                        )}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${colors.bg} ${colors.border}`}>
                            <IconComp size={22} className={colors.icon} />
                        </div>
                        <span className="text-center text-[11px] font-medium leading-tight text-white/65 transition-colors group-hover:text-white/90">
                            {app.name}
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
))}
```

- [ ] **Step 5: Run App Library related tests**

Run:

```bash
npm test -- __tests__/lib/apps/appRegistry.test.ts __tests__/lib/apps/registry-consistency.test.ts __tests__/lib/openflow/appUniverse.test.ts --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/apps/index.tsx __tests__/lib/apps/appRegistry.test.ts
git commit -m "feat(apps): organize app library as universe constellations"
```

---

## Task 7: Add Setup Prompts as First-Run OS Learning

**Files:**
- Modify: `lib/openflow/presentation.ts`
- Modify: `__tests__/lib/openflow/presentation.test.ts`
- Modify: `components/home/OpenFlowLagebild.tsx`
- Modify: `__tests__/components/home/OpenFlowLagebild.test.tsx`

- [ ] **Step 1: Add test for connector-driven setup prompts**

Append to `__tests__/lib/openflow/presentation.test.ts`:

```ts
it('promotes missing connectors into next steps so MORA can learn the user', () => {
  const view = buildOpenFlowLagebild({
    mailPreview: [],
    calendarPreview: [],
    feedPreview: [],
    cloudPreview: [],
    homeView: null,
    communicationSummary: {
      mailConfigured: false,
      calendarConfigured: false,
      browserPermission: 'default',
      mailStatusLabel: 'Mail nicht eingerichtet',
      calendarStatusLabel: 'Kalender nicht eingerichtet',
      browserStatusLabel: 'Browser freigeben',
      localTruthStatusLabel: 'Desktop Bridge getrennt',
    },
  });

  expect(view.nextSteps.map((item) => item.title)).toEqual(
    expect.arrayContaining(['Mail verbinden', 'Kalender verbinden'])
  );
  expect(view.nextSteps[0].suggestedActions[0]).toEqual(
    expect.objectContaining({ kind: 'connect_source', paneType: 'integrations' })
  );
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts --no-coverage --runInBand
```

Expected: FAIL because missing connectors are not added to `nextSteps`.

- [ ] **Step 3: Add connector setup signals**

In `lib/openflow/presentation.ts`, add:

```ts
function buildConnectorSetupSignals(connectors: ConnectorStatus[]): OpenFlowSignal[] {
  return connectors
    .filter((connector) => connector.status === 'needs_setup' || connector.status === 'offline' || connector.status === 'degraded')
    .slice(0, 3)
    .map((connector) => signal({
      id: `setup-${connector.id}`,
      source: connector.source,
      title: `${connector.label} verbinden`,
      summary: connector.detail,
      priority: connector.id === 'mail' ? 'high' : 'normal',
      status: 'new',
      trustScope: 'personal',
      suggestedActions: [
        {
          id: `${connector.id}-connect`,
          label: connector.actionLabel || 'Setup oeffnen',
          kind: 'connect_source',
          paneType: 'integrations',
          paneData: { focus: connector.id },
        },
      ],
    }));
}
```

Inside `buildOpenFlowLagebild`, assign connectors once:

```ts
const connectors = buildConnectorStatuses(input.communicationSummary);
const setupSignals = buildConnectorSetupSignals(connectors);
```

Then update `nextSteps`:

```ts
const nextSteps = [...homeNextSteps, ...setupSignals, ...changed.filter((item) => item.suggestedActions.length > 0)].slice(0, 5);
```

Return `connectors` instead of rebuilding:

```ts
connectors,
```

- [ ] **Step 4: Update component test for setup action**

In `OpenFlowLagebild.test.tsx`, add a connector setup signal to `nextSteps`:

```ts
{
  id: 'setup-mail',
  source: 'mail',
  title: 'Mail verbinden',
  summary: 'Mail ist noch nicht verbunden.',
  priority: 'high',
  status: 'new',
  trustScope: 'personal',
  relatedNodeIds: [],
  relatedRelationIds: [],
  suggestedActions: [{ id: 'mail-connect', label: 'Mail verbinden', kind: 'connect_source', paneType: 'integrations', paneData: { focus: 'mail' } }],
}
```

Add test:

```tsx
it('opens integrations for connector setup prompts', () => {
  const onOpenPane = jest.fn();
  render(<OpenFlowLagebild view={view} onOpenPane={onOpenPane} onGoExplore={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Mail verbinden' }));

  expect(onOpenPane).toHaveBeenCalledWith({
    id: 'integrations-main',
    type: 'integrations',
    title: 'Integrationen',
    size: { width: 860, height: 680 },
    data: { focus: 'mail' },
  });
});
```

- [ ] **Step 5: Verify tests**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts __tests__/components/home/OpenFlowLagebild.test.tsx --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/openflow/presentation.ts __tests__/lib/openflow/presentation.test.ts components/home/OpenFlowLagebild.tsx __tests__/components/home/OpenFlowLagebild.test.tsx
git commit -m "feat(home): surface connector setup as os learning"
```

---

## Task 8: Verification Pass

**Files:**
- No new files unless a verification failure requires a focused fix.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/lib/openflow/presentation.test.ts __tests__/lib/openflow/appUniverse.test.ts __tests__/components/home/OpenFlowLagebild.test.tsx __tests__/components/home/HomeSurface.test.tsx __tests__/lib/apps/appRegistry.test.ts __tests__/lib/apps/registry-consistency.test.ts --no-coverage --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run type verification**

Run:

```bash
npm run verify:types
```

Expected: TypeScript exits successfully.

- [ ] **Step 3: Run OS smoke if baseline allows**

Run:

```bash
npm run verify:os:smoke
```

Expected: PASS. If it fails because of a pre-existing test unrelated to OpenFlow Home, record the failing test name in the implementation report and do not hide it.

- [ ] **Step 4: Browser visual check**

Start or reuse the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/home
```

Verify manually:

- ambient/cosmic layers are still visible
- Home shows "Lagebild"
- the three questions are visible
- source connectors appear on the right side
- "Karte oeffnen" switches to Universe/explore mode
- action buttons open the correct OS panes
- App Library groups read as Arbeit, Quellen, Agenten & Flows, Menschen, Studio, System
- no text overlaps at 1440px, 1280px, and mobile-width fallback

- [ ] **Step 5: Final commit if fixes were needed**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix(home): polish openflow lagebild verification"
```

If no fixes were needed, do not create an empty commit.

---

## Execution Notes

- Preserve all unrelated dirty files in the working tree.
- Do not revert Website/Visitor/Wall changes.
- Keep visitor/public playground behavior separate from normal OS Home.
- Keep Dashboard work out of this phase.
- Keep all new files small and focused.
- Prefer existing `openPane` flow over creating a new navigation system.
- Use ASCII in new code and copy unless touching existing localized strings.

---

## Success Criteria

After this plan:

- SAIMOR OS opens into a living Lagebild instead of a generic panel dashboard.
- Mail, Calendar, Cloud, Feed, HomeView, and setup state speak one OpenFlow language.
- Apps are presented as one universe of work, sources, agents/flows, people, studio, and system.
- Existing ambient Universe identity remains intact.
- Existing Finder, Dock, panes, visitor dossier, and app platform keep working.
- The next plan can focus on Finder + Initiative context without first inventing shared contracts.
