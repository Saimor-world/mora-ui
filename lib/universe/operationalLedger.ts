'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isLocalDemoFallback } from '@/lib/api/http';
import {
  createOperationalLedgerEntry,
  ensureOperationalProcess,
  fetchOperationalState,
  transitionOperationalProcess,
  type OperationalStateDto,
} from '@/lib/api/operationalClient';
import { isDemoScopeActive } from '@/lib/demo/demoSourceGuard';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * Kanonischer operativer Zustand & Idempotenz-Hauptbuch (Phase 1 – Einheitliche Datenwahrheit)
 *
 * Grundregeln:
 * 1. Es existiert genau EINE Kassenwahrheit pro Scope (baseTillCents + bookedRevenueCents).
 *    Keine zweiten Schatten-Summen (kein cafeShared.extraRevenue).
 * 2. Demo-Mandant ('demo-morgenrot' / Demo-Sitzung) und echte Firma (CORE) sind strikt getrennt.
 * 3. Echte Firmen-Schreibvorgänge melden NIEMALS 'CORE-Synchron' ohne bestätigte CORE-Persistenz
 *    (HTTP 200/201 + receipt.persisted === true).
 * 4. Kanzlei Weber (und künftige Vorgänge) laufen durch eine strikte Finite State Machine ohne
 *    stille Schritt-Kaskade.
 */

export type ScopeKey = 'demo-morgenrot' | 'saimor-hq';
export type DataTruth = 'local-sim' | 'core-synced';

export type TruthStatus =
  | 'demo-simulation'
  | 'local-draft'
  | 'saving'
  | 'core-confirmed'
  | 'pending-sync'
  | 'failed';

export const TRUTH_STATUS_LABELS: Record<TruthStatus, string> = {
  'demo-simulation': 'Demo / Simulation',
  'local-draft': 'Lokaler Entwurf',
  saving: 'Speicherung läuft',
  'core-confirmed': 'Durch CORE bestätigt',
  'pending-sync': 'Synchronisation ausstehend',
  failed: 'Fehlgeschlagen',
};

export type SafetyLevel = 'routine' | 'buchung' | 'freigabe';

export type KanzleiWeberStep =
  | 'intake_open'
  | 'service_confirmed'
  | 'backstube_baked'
  | 'theke_ready'
  | 'verwaltung_settled';

export type KanzleiWeberAction =
  | 'confirm_intake'
  | 'bake_order'
  | 'prepare_pickup'
  | 'settle_invoice';

export interface KanzleiWeberState {
  processId: string;
  processKey: string;
  currentStep: KanzleiWeberStep;
  version: number;
  step1Confirmed: boolean;
  step2Baked: boolean;
  step3Served: boolean;
  step4Booked: boolean;
  oatMilkReorderPrepared: boolean;
}

export interface SharedCafeStationState {
  receiptsCount: number;
  vitrineStocked: boolean;
  ovenStatus: 'idle' | 'baking' | 'fresh';
  lastBonLabel: string;
}

export interface AuditEntry {
  id: string;
  idempotencyKey: string;
  timestamp: string;
  actor: string;
  departmentId: string;
  departmentTitle: string;
  action: string;
  result: string;
  safetyLevel: SafetyLevel;
  amountDelta: number;
  scope: ScopeKey;
  truthStatus: TruthStatus;
}

export interface ScopedOperationalState {
  scope: ScopeKey;
  companyId: string | null;
  isDemoCompany: boolean;
  truth: DataTruth;
  truthStatus: TruthStatus;
  lastError: string | null;
  baseTillCents: number;
  bookedRevenueCents: number;
  baseTillEur: number;
  bookedRevenueEur: number;
  totalTillEur: number;
  recordedKeys: string[];
  tillClosed: boolean;
  supplierOrderApproved: boolean;
  oatMilkLiters: number;
  vitrineTrays: number;
  kanzleiWeber: KanzleiWeberState;
  sharedStation: SharedCafeStationState;
  auditTrail: AuditEntry[];
}

export interface PendingRetryOperation {
  label: string;
  run: () => Promise<OperationalActionResult>;
}

export interface OperationalActionResult {
  ok: boolean;
  alreadyRecorded: boolean;
  truthStatus: TruthStatus;
  blockedReason?: string;
  entry?: AuditEntry;
  state: ScopedOperationalState;
}

const STORAGE_PREFIX = 'mora.operational.ledger.v3';

export function resolveScopeKey(companyId?: string | null, planetId?: string | null): ScopeKey {
  if (companyId === 'demo-morgenrot' || companyId?.startsWith('demo-')) return 'demo-morgenrot';
  if (companyId && companyId !== 'company-local-demo') return 'saimor-hq';
  if (planetId && /^(d-|dept-)?(kueche|service|theke|verwaltung)/i.test(planetId)) return 'demo-morgenrot';
  return 'saimor-hq';
}

export function isAuthoritativeCoreScope(scope: ScopeKey, companyId?: string | null): boolean {
  if (scope === 'demo-morgenrot') return false;
  if (!companyId || companyId === 'company-local-demo' || companyId.startsWith('demo-')) return false;
  if (process.env.NODE_ENV !== 'test' && (isDemoScopeActive() || isLocalDemoFallback())) return false;
  return true;
}

export function resolveOperationalActor(scope: ScopeKey): string {
  const user = useSessionStore.getState().user;
  const sessionName = (user?.name || user?.email || '').trim();
  if (sessionName) {
    return scope === 'demo-morgenrot' ? `${sessionName} (Demo)` : sessionName;
  }
  return scope === 'demo-morgenrot' ? 'Demo-Schicht (Sandbox)' : 'Unangemeldete Sitzung (Lokal)';
}

function centsToEur(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

function defaultState(scope: ScopeKey, companyId: string | null = null): ScopedOperationalState {
  const isDemo = scope === 'demo-morgenrot';
  const baseTillCents = isDemo ? 184200 : 0;
  const live = isAuthoritativeCoreScope(scope, companyId);
  return {
    scope,
    companyId,
    isDemoCompany: isDemo,
    truth: live ? 'core-synced' : 'local-sim',
    truthStatus: isDemo ? 'demo-simulation' : live ? 'pending-sync' : 'local-draft',
    lastError: null,
    baseTillCents,
    bookedRevenueCents: 0,
    baseTillEur: centsToEur(baseTillCents),
    bookedRevenueEur: 0,
    totalTillEur: centsToEur(baseTillCents),
    recordedKeys: [],
    tillClosed: false,
    supplierOrderApproved: false,
    oatMilkLiters: isDemo ? 24 : 0,
    vitrineTrays: 0,
    kanzleiWeber: {
      processId: 'proc-local-kanzlei-weber',
      processKey: 'kanzlei-weber-catering-1',
      currentStep: 'intake_open',
      version: 1,
      step1Confirmed: false,
      step2Baked: false,
      step3Served: false,
      step4Booked: false,
      oatMilkReorderPrepared: false,
    },
    sharedStation: {
      receiptsCount: isDemo ? 42 : 0,
      vitrineStocked: false,
      ovenStatus: 'idle',
      lastBonLabel: isDemo ? '2× Flat White · 1× Zimtschnecke (11,20 €)' : 'Noch kein Bon verbucht',
    },
    auditTrail: [],
  };
}

function storageKey(scope: ScopeKey, companyId?: string | null): string {
  const tenantSegment = scope === 'demo-morgenrot' ? 'demo-morgenrot' : companyId || 'hq-default';
  return `${STORAGE_PREFIX}.${scope}.${tenantSegment}`;
}

function hydrateDerivedTotals(state: ScopedOperationalState): ScopedOperationalState {
  return {
    ...state,
    baseTillEur: centsToEur(state.baseTillCents),
    bookedRevenueEur: centsToEur(state.bookedRevenueCents),
    totalTillEur: centsToEur(state.baseTillCents + state.bookedRevenueCents),
  };
}

export function readOperationalState(scope: ScopeKey, companyId: string | null = null): ScopedOperationalState {
  const fallback = defaultState(scope, companyId);
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(scope, companyId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ScopedOperationalState>;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return hydrateDerivedTotals({
      ...fallback,
      ...parsed,
      scope,
      companyId: companyId ?? parsed.companyId ?? fallback.companyId,
      isDemoCompany: Boolean(parsed.isDemoCompany ?? (scope === 'demo-morgenrot')),
      recordedKeys: Array.isArray(parsed.recordedKeys) ? parsed.recordedKeys : [],
      auditTrail: Array.isArray(parsed.auditTrail) ? parsed.auditTrail : [],
      kanzleiWeber: { ...fallback.kanzleiWeber, ...(parsed.kanzleiWeber ?? {}) },
      sharedStation: { ...fallback.sharedStation, ...(parsed.sharedStation ?? {}) },
    });
  } catch {
    return fallback;
  }
}

export function writeOperationalState(
  scope: ScopeKey,
  next: ScopedOperationalState,
  companyId: string | null = next.companyId
): ScopedOperationalState {
  const normalized = hydrateDerivedTotals(next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey(scope, companyId), JSON.stringify(normalized));
    } catch {
      /* ignore quota / private mode */
    }
  }
  notifySubscribers(scope, normalized);
  return normalized;
}

const subscribers = new Map<ScopeKey, Set<(s: ScopedOperationalState) => void>>();

function subscribe(scope: ScopeKey, listener: (s: ScopedOperationalState) => void): () => void {
  const set = subscribers.get(scope) ?? new Set<(s: ScopedOperationalState) => void>();
  set.add(listener);
  subscribers.set(scope, set);
  return () => {
    set.delete(listener);
  };
}

function notifySubscribers(scope: ScopeKey, state: ScopedOperationalState): void {
  const set = subscribers.get(scope);
  if (!set) return;
  set.forEach((fn) => fn(state));
}

function nowTimeHHMM(): string {
  try {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '12:00';
  }
}

export interface OperationalCommitInput {
  scope: ScopeKey;
  companyId?: string | null;
  idempotencyKey: string;
  actor?: string;
  departmentId: string;
  departmentTitle: string;
  action: string;
  result: string;
  safetyLevel: SafetyLevel;
  kind?: string;
  referenceId?: string | null;
  amountDelta?: number;
  mutate?: (draft: ScopedOperationalState) => void;
}

const FSM_RULES: Record<
  KanzleiWeberAction,
  {
    requiredStep: KanzleiWeberStep;
    nextStep: KanzleiWeberStep;
    allowedStations: string[];
    idempotencyKey: string;
    blockedMessage: string;
  }
> = {
  confirm_intake: {
    requiredStep: 'intake_open',
    nextStep: 'service_confirmed',
    allowedStations: ['service-station'],
    idempotencyKey: 'kanzlei-weber-step-1-gastraum',
    blockedMessage: 'Schritt 1 (Gastraum) ist nur bei offenem Eingang zulässig.',
  },
  bake_order: {
    requiredStep: 'service_confirmed',
    nextStep: 'backstube_baked',
    allowedStations: ['kueche-station'],
    idempotencyKey: 'kanzlei-weber-step-2-backstube',
    blockedMessage: 'Vorgang blockiert: Erst Schritt 1 im Gastraum bestätigen, bevor gebacken werden kann.',
  },
  prepare_pickup: {
    requiredStep: 'backstube_baked',
    nextStep: 'theke_ready',
    allowedStations: ['theke-station'],
    idempotencyKey: 'kanzlei-weber-step-3-theke',
    blockedMessage: 'Vorgang blockiert: Backstube (Schritt 2) muss zuerst die Charge fertig melden.',
  },
  settle_invoice: {
    requiredStep: 'theke_ready',
    nextStep: 'verwaltung_settled',
    allowedStations: ['verwaltung-station'],
    idempotencyKey: 'kanzlei-weber-step-4-kasse',
    blockedMessage: 'Vorgang blockiert: Alle vorherigen Stationen (Gastraum → Backstube → Theke) müssen abgeschlossen sein.',
  },
};

export function validateLocalWeberTransition(
  current: ScopedOperationalState,
  action: KanzleiWeberAction,
  station: string
): { allowed: true; rule: (typeof FSM_RULES)[KanzleiWeberAction] } | { allowed: false; alreadyDone: boolean; reason: string } {
  const rule = FSM_RULES[action];
  if (!rule.allowedStations.includes(station)) {
    return { allowed: false, alreadyDone: false, reason: `Station '${station}' darf Schritt '${action}' nicht auslösen.` };
  }
  if (current.recordedKeys.includes(rule.idempotencyKey)) {
    return { allowed: false, alreadyDone: true, reason: `Schritt '${action}' bereits einmalig verbucht.` };
  }
  if (current.kanzleiWeber.currentStep !== rule.requiredStep) {
    const order: KanzleiWeberStep[] = [
      'intake_open',
      'service_confirmed',
      'backstube_baked',
      'theke_ready',
      'verwaltung_settled',
    ];
    if (order.indexOf(current.kanzleiWeber.currentStep) > order.indexOf(rule.requiredStep)) {
      return { allowed: false, alreadyDone: true, reason: `Schritt '${action}' wurde bereits durchlaufen.` };
    }
    return { allowed: false, alreadyDone: false, reason: rule.blockedMessage };
  }
  return { allowed: true, rule };
}

export function applyWeberStepPatch(draft: ScopedOperationalState, action: KanzleiWeberAction): void {
  const rule = FSM_RULES[action];
  draft.kanzleiWeber.currentStep = rule.nextStep;
  draft.kanzleiWeber.version += 1;
  if (action === 'confirm_intake') {
    draft.kanzleiWeber.step1Confirmed = true;
  } else if (action === 'bake_order') {
    draft.kanzleiWeber.step2Baked = true;
    draft.vitrineTrays = 2;
    draft.oatMilkLiters = 16;
    draft.sharedStation.ovenStatus = 'fresh';
    draft.sharedStation.vitrineStocked = true;
  } else if (action === 'prepare_pickup') {
    draft.kanzleiWeber.step3Served = true;
    draft.sharedStation.vitrineStocked = true;
  } else if (action === 'settle_invoice') {
    draft.kanzleiWeber.step4Booked = true;
    draft.tillClosed = true;
  }
}

function mapCoreStateToLocal(
  coreState: OperationalStateDto,
  scope: ScopeKey,
  prev?: ScopedOperationalState
): ScopedOperationalState {
  const isDemoCompany = scope === 'demo-morgenrot' || Boolean(coreState.is_demo);
  const kwProc = isDemoCompany
    ? coreState.processes.find((p) => p.process_type === 'kanzlei_weber_catering')
    : undefined;
  const step = (kwProc?.current_step ?? 'intake_open') as KanzleiWeberStep;
  const pState = kwProc?.state ?? {};
  const recordedKeys = Array.from(
    new Set([
      ...coreState.events.map((e) => e.idempotency_key),
      ...coreState.ledger_entries.map((e) => e.idempotency_key),
    ])
  );
  const auditTrail: AuditEntry[] = coreState.ledger_entries.map((entry) => ({
    id: entry.id,
    idempotencyKey: entry.idempotency_key,
    timestamp: new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    actor: entry.actor_name,
    departmentId: entry.station,
    departmentTitle: entry.station,
    action: entry.label,
    result: `Durch CORE bestätigt (${entry.amount_cents ? `${(entry.amount_cents / 100).toFixed(2).replace('.', ',')} €` : entry.kind})`,
    safetyLevel: entry.safety_level,
    amountDelta: centsToEur(entry.amount_cents),
    scope,
    truthStatus: 'core-confirmed',
  }));

  const stepOrder: KanzleiWeberStep[] = [
    'intake_open',
    'service_confirmed',
    'backstube_baked',
    'theke_ready',
    'verwaltung_settled',
  ];
  const stepIdx = Math.max(0, stepOrder.indexOf(step));
  const lastEntry = coreState.ledger_entries[0];

  return hydrateDerivedTotals({
    ...(prev ?? defaultState(scope, coreState.company_id)),
    scope,
    companyId: coreState.company_id,
    isDemoCompany,
    truth: 'core-synced',
    truthStatus: 'core-confirmed',
    lastError: null,
    baseTillCents: coreState.base_till_cents,
    bookedRevenueCents: coreState.booked_revenue_cents,
    baseTillEur: centsToEur(coreState.base_till_cents),
    bookedRevenueEur: centsToEur(coreState.booked_revenue_cents),
    totalTillEur: centsToEur(coreState.total_till_cents),
    recordedKeys,
    tillClosed: Boolean(pState.till_closed ?? (isDemoCompany && stepIdx >= 4)),
    supplierOrderApproved: recordedKeys.includes('verwaltung-supplier-order-do'),
    kanzleiWeber: isDemoCompany
      ? {
          processId: kwProc?.id ?? prev?.kanzleiWeber.processId ?? 'proc-pending',
          processKey: kwProc?.process_key ?? 'kanzlei-weber-catering-1',
          currentStep: step,
          version: kwProc?.version ?? 1,
          step1Confirmed: stepIdx >= 1,
          step2Baked: stepIdx >= 2,
          step3Served: stepIdx >= 3,
          step4Booked: stepIdx >= 4,
          oatMilkReorderPrepared: recordedKeys.includes('mora-oatmilk-reorder-prep'),
        }
      : {
          processId: 'proc-disabled-live',
          processKey: 'kanzlei-weber-disabled',
          currentStep: 'intake_open',
          version: 1,
          step1Confirmed: false,
          step2Baked: false,
          step3Served: false,
          step4Booked: false,
          oatMilkReorderPrepared: recordedKeys.includes('mora-oatmilk-reorder-prep'),
        },
    sharedStation: {
      receiptsCount: coreState.receipts_count,
      vitrineStocked: Boolean(pState.vitrine_stocked ?? stepIdx >= 2),
      ovenStatus: (pState.oven_status as 'idle' | 'baking' | 'fresh') ?? (stepIdx >= 2 ? 'fresh' : 'idle'),
      lastBonLabel: lastEntry
        ? `${lastEntry.label} (${centsToEur(lastEntry.amount_cents).toFixed(2).replace('.', ',')} €)`
        : 'Noch kein Bon verbucht',
    },
    auditTrail,
  });
}

export function recordOperationalAction(input: OperationalCommitInput): OperationalActionResult {
  const current = readOperationalState(input.scope, input.companyId ?? null);
  const ts: TruthStatus = input.scope === 'demo-morgenrot' ? 'demo-simulation' : 'local-draft';
  if (current.recordedKeys.includes(input.idempotencyKey)) {
    const existing = current.auditTrail.find((e) => e.idempotencyKey === input.idempotencyKey);
    return { ok: true, alreadyRecorded: true, truthStatus: current.truthStatus, entry: existing, state: current };
  }

  const deltaCents = eurToCents(input.amountDelta ?? 0);
  const entry: AuditEntry = {
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    idempotencyKey: input.idempotencyKey,
    timestamp: nowTimeHHMM(),
    actor: input.actor || resolveOperationalActor(input.scope),
    departmentId: input.departmentId,
    departmentTitle: input.departmentTitle,
    action: input.action,
    result: input.result,
    safetyLevel: input.safetyLevel,
    amountDelta: centsToEur(deltaCents),
    scope: input.scope,
    truthStatus: ts,
  };

  const draft: ScopedOperationalState = {
    ...current,
    truth: 'local-sim',
    truthStatus: ts,
    lastError: null,
    bookedRevenueCents: current.bookedRevenueCents + deltaCents,
    recordedKeys: [...current.recordedKeys, input.idempotencyKey],
    kanzleiWeber: { ...current.kanzleiWeber },
    sharedStation: {
      ...current.sharedStation,
      receiptsCount: deltaCents > 0 ? current.sharedStation.receiptsCount + 1 : current.sharedStation.receiptsCount,
      lastBonLabel: deltaCents > 0 ? `${input.action} (${centsToEur(deltaCents).toFixed(2).replace('.', ',')} €)` : current.sharedStation.lastBonLabel,
    },
    auditTrail: [entry, ...current.auditTrail],
  };
  input.mutate?.(draft);
  const saved = writeOperationalState(input.scope, draft, input.companyId ?? null);
  return { ok: true, alreadyRecorded: false, truthStatus: saved.truthStatus, entry, state: saved };
}

export function formatAuditMarkdownLine(entry: AuditEntry): string {
  const tag = entry.safetyLevel.toUpperCase();
  const statusTag = TRUTH_STATUS_LABELS[entry.truthStatus];
  const amount = entry.amountDelta !== 0 ? ` (+${entry.amountDelta.toFixed(2).replace('.', ',')} €)` : '';
  return `- ${entry.timestamp} Uhr · [${tag}] · [${statusTag}] ${entry.departmentTitle} (${entry.actor}): ${entry.action} → ${entry.result}${amount} [Ref: ${entry.idempotencyKey}]`;
}

export function useOperationalLedger(scope: ScopeKey, companyId: string | null = null) {
  const authoritative = isAuthoritativeCoreScope(scope, companyId);
  const [state, setState] = useState<ScopedOperationalState>(() => readOperationalState(scope, companyId));
  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingRetryRef = useRef<PendingRetryOperation | null>(null);
  const [hasPendingRetry, setHasPendingRetry] = useState(false);

  const syncFromCore = useCallback(async () => {
    if (!authoritative || !companyId) return;
    try {
      const dto = await fetchOperationalState(companyId);
      const mapped = mapCoreStateToLocal(dto, scope, stateRef.current);
      setState(mapped);
      notifySubscribers(scope, mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CORE-Abruf fehlgeschlagen';
      setState((prev) => ({
        ...prev,
        truthStatus: 'failed',
        lastError: msg,
      }));
    }
  }, [authoritative, companyId, scope]);

  useEffect(() => {
    setState(readOperationalState(scope, companyId));
    const unsub = subscribe(scope, (next) => setState(next));
    if (authoritative && companyId) {
      void syncFromCore();
    }
    return unsub;
  }, [scope, companyId, authoritative, syncFromCore]);

  const record = useCallback(
    async (input: Omit<OperationalCommitInput, 'scope' | 'companyId'>): Promise<OperationalActionResult> => {
      if (!authoritative || !companyId) {
        return recordOperationalAction({ ...input, scope, companyId });
      }

      const execute = async (): Promise<OperationalActionResult> => {
        setState((prev) => ({ ...prev, truthStatus: 'saving', lastError: null }));
        try {
          const res = await createOperationalLedgerEntry({
            company_id: companyId,
            idempotency_key: input.idempotencyKey,
            kind: input.kind || 'routine_action',
            station: input.departmentId,
            label: input.action,
            amount_cents: eurToCents(input.amountDelta ?? 0),
            safety_level: input.safetyLevel,
            reference_id: input.referenceId ?? null,
            meta: { departmentTitle: input.departmentTitle, resultText: input.result },
          });
          pendingRetryRef.current = null;
          setHasPendingRetry(false);
          const next = mapCoreStateToLocal(res.state, scope, stateRef.current);
          notifySubscribers(scope, next);
          setState(next);
          return {
            ok: true,
            alreadyRecorded: Boolean(res.receipt.replayed),
            truthStatus: 'core-confirmed',
            entry: next.auditTrail[0],
            state: next,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'CORE-Buchung fehlgeschlagen';
          pendingRetryRef.current = { label: input.action, run: execute };
          setHasPendingRetry(true);
          const failedState: ScopedOperationalState = {
            ...stateRef.current,
            truthStatus: 'failed',
            lastError: message,
          };
          setState(failedState);
          return {
            ok: false,
            alreadyRecorded: false,
            truthStatus: 'failed',
            blockedReason: message,
            state: failedState,
          };
        }
      };

      return execute();
    },
    [authoritative, companyId, scope]
  );

  const transitionWeber = useCallback(
    async (params: {
      action: KanzleiWeberAction;
      station: string;
      departmentTitle: string;
      actionLabel: string;
      resultLabel: string;
    }): Promise<OperationalActionResult> => {
      const current = authoritative ? stateRef.current : readOperationalState(scope, companyId);
      const isDemoContext = scope === 'demo-morgenrot' || Boolean(current.isDemoCompany);
      if (authoritative && !isDemoContext) {
        return {
          ok: false,
          alreadyRecorded: false,
          truthStatus: current.truthStatus,
          blockedReason: 'Fiktiver Demo-Vorgang (Kanzlei Weber) ist im produktiven HQ deaktiviert.',
          state: current,
        };
      }
      const check = validateLocalWeberTransition(current, params.action, params.station);
      if (!check.allowed) {
        if (check.alreadyDone) {
          return {
            ok: true,
            alreadyRecorded: true,
            truthStatus: current.truthStatus,
            state: current,
          };
        }
        return {
          ok: false,
          alreadyRecorded: false,
          truthStatus: current.truthStatus,
          blockedReason: check.reason,
          state: current,
        };
      }

      if (!authoritative || !companyId) {
        return recordOperationalAction({
          scope,
          companyId,
          idempotencyKey: check.rule.idempotencyKey,
          departmentId: params.station,
          departmentTitle: params.departmentTitle,
          action: params.actionLabel,
          result: params.resultLabel,
          safetyLevel: params.action === 'settle_invoice' ? 'buchung' : 'routine',
          kind: params.action === 'settle_invoice' ? 'invoice_settlement' : 'process_step',
          amountDelta: params.action === 'settle_invoice' ? 142.0 : 0,
          mutate: (draft) => {
            applyWeberStepPatch(draft, params.action);
          },
        });
      }

      const executeTransition = async (): Promise<OperationalActionResult> => {
        setState((prev) => ({ ...prev, truthStatus: 'saving', lastError: null }));
        try {
          let procId = current.kanzleiWeber.processId;
          let expectedVersion = current.kanzleiWeber.version;
          if (!procId || procId.startsWith('proc-local')) {
            const ensured = await ensureOperationalProcess({
              company_id: companyId,
              process_key: current.kanzleiWeber.processKey,
              process_type: 'kanzlei_weber_catering',
              title: 'Kanzlei Weber (12 Pers. · 142,00 €)',
            });
            procId = ensured.process.id;
            expectedVersion = ensured.process.version;
          }

          const res = await transitionOperationalProcess(procId, {
            company_id: companyId,
            action: params.action,
            station: params.station,
            expected_version: expectedVersion,
            idempotency_key: check.rule.idempotencyKey,
            amount_cents: params.action === 'settle_invoice' ? 14200 : undefined,
          });
          pendingRetryRef.current = null;
          setHasPendingRetry(false);
          const next = mapCoreStateToLocal(res.state, scope, current);
          notifySubscribers(scope, next);
          setState(next);
          return {
            ok: true,
            alreadyRecorded: Boolean(res.receipt.replayed),
            truthStatus: 'core-confirmed',
            entry: next.auditTrail[0],
            state: next,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'CORE-Transition fehlgeschlagen';
          pendingRetryRef.current = { label: params.actionLabel, run: executeTransition };
          setHasPendingRetry(true);
          const failedState: ScopedOperationalState = {
            ...current,
            truthStatus: 'failed',
            lastError: message,
          };
          setState(failedState);
          return {
            ok: false,
            alreadyRecorded: false,
            truthStatus: 'failed',
            blockedReason: message,
            state: failedState,
          };
        }
      };

      return executeTransition();
    },
    [authoritative, companyId, scope, state]
  );

  const updateSharedStation = useCallback(
    (patch: Partial<SharedCafeStationState>) => {
      if (authoritative) {
        const cur = stateRef.current;
        const next = { ...cur, sharedStation: { ...cur.sharedStation, ...patch } };
        setState(next);
        notifySubscribers(scope, next);
        return;
      }
      const cur = readOperationalState(scope, companyId);
      const next = writeOperationalState(
        scope,
        { ...cur, sharedStation: { ...cur.sharedStation, ...patch } },
        companyId
      );
      setState(next);
    },
    [authoritative, companyId, scope]
  );

  const retryLastFailed = useCallback(async () => {
    if (!pendingRetryRef.current) {
      await syncFromCore();
      return null;
    }
    return pendingRetryRef.current.run();
  }, [syncFromCore]);

  return {
    state,
    authoritative,
    hasPendingRetry,
    record,
    transitionWeber,
    updateSharedStation,
    syncFromCore,
    retryLastFailed,
  };
}

export interface ShelfTemplateItem {
  id: string;
  title: string;
  body: string;
}

export function getShelfTemplatesForDepartment(planetId: string, planetTitle: string): ShelfTemplateItem[] {
  const key = `${planetId} ${planetTitle}`.toLowerCase();
  if (/kueche|küche|backstube|ofen/.test(key)) {
    return [
      { id: 'tpl-haccp', title: 'HACCP Tages-Checkliste', body: '# HACCP Kühlhaus- & Hygieneprotokoll\n\n- Soll Kühlhaus <= 4 °C\n- Nachbacken Charge 09:00 / 12:00' },
      { id: 'tpl-rezept', title: 'Rezept-Skalierung (24/36/48 Stk.)', body: '# Standard-Rezeptur Zimtschnecken\n\n- 1,0 kg Weizenmehl 550 · 500 ml Hafermilch' },
    ];
  }
  if (/service|gast|reserv/.test(key)) {
    return [
      { id: 'tpl-empfang', title: 'Gruppen-Reservierungsbogen (ab 8 Pers.)', body: '# Gruppenbuchung Gastraum\n\n- Anzahl Personen, Menüvorbestellung, Rechnungsanschrift' },
      { id: 'tpl-beschwerde', title: 'Gäste-Feedback Leitfaden', body: '# Gästestimmen & Sofortreaktion\n\n- Persönlich entschuldigen, Kulanz dokumentieren' },
    ];
  }
  if (/theke|barista|kasse/.test(key)) {
    return [
      { id: 'tpl-schicht', title: 'Theken-Übergabe (Früh -> Spät)', body: '# Siebträger & Kassenübergabe\n\n- Brühgruppe gereinigt, Vitrinenbestand gezählt' },
      { id: 'tpl-bon', title: 'Storno- & Korrekturbeleg', body: '# Kassenkorrektur\n\n- Bon-Nummer, Betrag, Freigabe durch Schichtleitung' },
    ];
  }
  if (/verwalt|buero|büro|kontor/.test(key)) {
    return [
      { id: 'tpl-kasse', title: 'Tageskassen-Prüfprotokoll', body: '# Z-Abschlag & Kassenbuch\n\n- Soll-/Ist-Abgleich ohne Abweichung' },
      { id: 'tpl-bestellung', title: 'Lieferanten-Freigabeprotokoll', body: '# Wareneingang & Rechnungskontrolle\n\n- Mengenabgleich gegen Bestellbogen' },
    ];
  }
  if (/atelier|design|origin|studio/.test(key)) {
    return [
      { id: 'tpl-origin', title: 'ORIGIN // 001 Prüfprotokoll (Seed 1001)', body: '# Kanonisches Master-Protokoll\n\n- Basalt, Quarz-Brechung, AgX Render-Abnahme' },
      { id: 'tpl-ma', title: 'Gestaltungsprinzipien (Ma)', body: '# Räumliche Zurückhaltung\n\n- Fokus über Leere, Streiflicht und physische Materialität' },
    ];
  }
  return [
    { id: 'tpl-meeting', title: 'Entscheidungs-Protokoll', body: `# Entscheidungsvorlage (${planetTitle})\n\n- Kontext, Optionen, Freigabe-Verantwortliche` },
    { id: 'tpl-briefing', title: 'Wochenfokus & Kennzahlen', body: `# Wochenfokus (${planetTitle})\n\n- Ziele, Blocker, offene Zusagen` },
  ];
}
