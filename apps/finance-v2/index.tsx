'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CircleAlert,
  Landmark,
  ReceiptText,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { financeRecordMovementSummary, formatFinanceMoney } from '@/lib/finance/format';
import FinanceEntryPanel from './FinanceEntryPanel';
import RecordDetailPanel from './RecordDetailPanel';
import XrplWatchLab from './XrplWatchLab';
import {
  financeReadErrorKind,
  financeReadErrorKind,
  type FinanceRecord,
  useFinanceFlow,
  useFinanceState,
} from '@/lib/queries/useFinanceStateFlow';
import {
  differenceFinanceMoney,
  financeRecordMovementSummary,
  formatFinanceMoney,
} from '@/lib/finance/format';
import FinanceEntryPanel from './FinanceEntryPanel';
import RecordDetailPanel from './RecordDetailPanel';
import XrplWatchLab from './XrplWatchLab';

type Section = 'state' | 'flow' | 'treasury' | 'capital';

function labelForClassification(value: string) {
  const labels: Record<string, string> = {
    founder_funding: 'Founder Capital',
    customer_receipt: 'Customer receipt',
    operating_expense: 'Operating expense',
    internal_transfer: 'Internal transfer',
    refund: 'Refund',
    adjustment: 'Adjustment',
    unclassified: 'Unclassified',
  };
  return labels[value] || value.replaceAll('_', ' ');
}

function companyName(company: any) {
  return company?.name || company?.display_name || company?.title || 'SAIMÔR';
}

function companyId(company: any): string | null {
  const value = company?.id || company?.company_id;
  return typeof value === 'string' && value ? value : null;
}

function StateBadge({ state }: { state: string }) {
  const good = ['complete', 'current', 'observed'].includes(state);
  const warn = ['partial', 'stale', 'missing_observation', 'missing', 'unknown', 'manual'].includes(state);
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] ${
      good
        ? 'border-emerald-300/15 bg-emerald-400/[0.055] text-emerald-100/70'
        : warn
          ? 'border-amber-300/15 bg-amber-400/[0.045] text-amber-100/62'
          : 'border-white/[0.08] bg-white/[0.03] text-white/44'
    }`}>
      {state.replaceAll('_', ' ')}
    </span>
  );
}

function TruthEmpty({
  title,
  copy,
  compact = false,
}: {
  title: string;
  copy: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center rounded-[28px] border border-white/[0.07] bg-black/15 px-8 text-center ${compact ? 'min-h-[170px]' : 'min-h-[260px]'}`}>
      <div className="max-w-xl">
        <ShieldCheck className="mx-auto text-emerald-200/50" size={24} />
        <h3 className="mt-4 text-xl font-medium tracking-[-0.03em] text-white/84">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/38">{copy}</p>
      </div>
    </div>
  );
}

function ReadError({
  title,
  copy,
  denied = false,
  onRetry,
}: {
  title: string;
  copy: string;
  denied?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className={`rounded-[28px] border p-6 ${
        denied
          ? 'border-red-300/[0.12] bg-red-500/[0.035]'
          : 'border-amber-300/[0.10] bg-amber-400/[0.025]'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-white/72">
        <ShieldAlert size={15} className={denied ? 'text-red-200/70' : 'text-amber-100/62'} />
        {title}
      </div>
      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/38">{copy}</p>
      {onRetry && !denied && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/48"
        >
          <RefreshCcw size={12} /> Erneut versuchen
        </button>
      )}
    </div>
  );
}

function RecordRow({
  record,
  onOpen,
}: {
  record: FinanceRecord;
  onOpen: () => void;
}) {
  const movement = financeRecordMovementSummary(record);
  const movementLabel = movement.kind === 'transfer'
    ? 'Umbuchung · netto neutral'
    : movement.kind === 'reversal'
      ? 'Gegenbuchung'
      : movement.direction === 'in'
        ? 'Zufluss'
        : movement.direction === 'out'
          ? 'Abfluss'
          : 'Bewegung';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full gap-4 border-b border-white/[0.055] px-1 py-4 text-left last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
      aria-label={`${labelForClassification(record.classification)} öffnen`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white/78">{labelForClassification(record.classification)}</span>
          {record.correction_of_record_id && <StateBadge state="correction" />}
          {record.source_kind && <StateBadge state={record.source_kind} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30">
          <span>{record.effective_at ? new Date(record.effective_at).toLocaleString('de-DE') : 'Zeitpunkt nicht belegt'}</span>
          <span>•</span>
          <span>{record.evidence?.label || record.evidence?.reference || 'Beleg nicht verfügbar'}</span>
        </div>
        {record.memo && <p className="mt-2 truncate text-[11px] text-white/38">{record.memo}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="text-right">
          <div className="text-sm font-medium tabular-nums text-white/84">{formatFinanceMoney(movement.amount)}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.15em] text-white/24">{movementLabel}</div>
        </div>
        <ArrowRight size={14} className="text-white/18 transition group-hover:text-emerald-200/58" />
      </div>
    </button>
  );
}

export default function FinanceV2App({ paneId }: AppProps) {
  const pane = usePaneStore((state) => state.getPane(paneId));
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const openPane = usePaneStore((state) => state.openPane);
  const removePane = usePaneStore((state) => state.removePane);
  const minimizePane = usePaneStore((state) => state.minimizePane);
  const focusPane = usePaneStore((state) => state.focusPane);
  const updatePanePosition = usePaneStore((state) => state.updatePanePosition);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const activeCompanyId = useSessionStore((state) => state.user?.active_company_id || null);
  const activeCompanyName = useSessionStore((state) => state.user?.active_company_name || null);
  const [section, setSection] = useState<Section>('state');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const companiesQuery = useCompanies({ includeDemo: false });
  const companies = Array.isArray(companiesQuery.data) ? companiesQuery.data : [];
  const singleCompanyId = companies.length === 1 ? companyId(companies[0]) : null;
  const selectedCompanyId = activeCompanyId || singleCompanyId;
  const company = selectedCompanyId
    ? companies.find((candidate) => companyId(candidate) === selectedCompanyId) || null
    : null;
  const resolvedCompanyName = company ? companyName(company) : activeCompanyName || null;

  const stateQuery = useFinanceState(selectedCompanyId, Boolean(selectedCompanyId));
  const recordsQuery = useFinanceRecords(selectedCompanyId, 50, Boolean(selectedCompanyId));

  const stateErrorKind = financeReadErrorKind(stateQuery.error);
  const recordsErrorKind = financeReadErrorKind(recordsQuery.error);
  const stateDenied = stateQuery.isError
    && ['unauthenticated', 'denied', 'scope_mismatch'].includes(stateErrorKind);
  const recordsDenied = recordsQuery.isError
    && ['unauthenticated', 'denied', 'scope_mismatch'].includes(recordsErrorKind);

  const state = stateDenied ? null : stateQuery.data;
  const records = useMemo(
    () => recordsDenied ? [] : financeRecordItems(recordsQuery.data, selectedCompanyId),
    [recordsDenied, recordsQuery.data, selectedCompanyId],
  );

  useEffect(() => {
    setSelectedRecordId(null);
  }, [selectedCompanyId]);

  if (!pane) return null;

  const sections: Array<{ id: Section; label: string }> = [
    { id: 'state', label: 'State' },
    { id: 'flow', label: 'Flow' },
    { id: 'treasury', label: 'Treasury' },
    { id: 'capital', label: 'Capital' },
  ];

  const primaryCurrency = state?.currency_states?.[0] || null;
  const movementSinceCheckpoint = differenceFinanceMoney(
    primaryCurrency?.projected_total,
    primaryCurrency?.observed_total,
  );
  const hasObservedState = Boolean(state?.accounts?.some((account) => account.truth_state === 'observed'));
  const stateLastKnown = Boolean(state && stateQuery.isError && stateErrorKind === 'unavailable');
  const flowLastKnown = Boolean(recordsQuery.data && recordsQuery.isError && recordsErrorKind === 'unavailable');

  const openEvidenceNode = (nodeId: string) => {
    openPane({
      id: `node-${nodeId}`,
      type: 'document',
      title: 'Finance-Beleg',
      size: { width: 800, height: 600 },
      data: { nodeId, companyId: selectedCompanyId },
    });
  };

  return (
    <GlassPanel
      title={(
        <span className="flex items-center gap-2">
          <Landmark size={14} className="text-emerald-200/80" />
          <span>Finance</span>
        </span>
      )}
      width={pane.size.width}
      height={pane.size.height}
      initialX={pane.position.x}
      initialY={pane.position.y}
      onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
      onResize={(w, h) => updatePaneSize(paneId, w, h)}
      onClose={() => removePane(paneId)}
      onMinimize={() => minimizePane(paneId)}
      onFocus={() => focusPane(paneId)}
      isActive={activePaneId === paneId}
      zIndex={pane.zIndex}
      showCloseButton
      showMinimizeButton
      draggable
      resizable
      paneId={paneId}
      dimBackground
      dimOpacity={0.28}
      blurIntensity={26}
      opacity={0.42}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="border-b border-white/[0.055] px-1 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-emerald-100/42">
                <Building2 size={11} /> {resolvedCompanyName || 'Unternehmen nicht ausgewählt'}
              </div>
              <h1 className="mt-3 text-[30px] font-medium tracking-[-0.05em] text-white/92">Finanzstatus</h1>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/34">
                Belegte Unternehmenswerte, Bewegungen und offene Datenlücken. Manuelle Angaben bleiben als manuell erfasst gekennzeichnet.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {state?.truth_state && <StateBadge state={state.truth_state} />}
              {stateLastKnown && <StateBadge state="stale" />}
              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-white/34">
                Unternehmen
              </span>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Finance sections">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  if (item.id !== 'flow') setSelectedRecordId(null);
                }}
                className={`rounded-full border px-3.5 py-2 text-[10px] transition ${
                  section === item.id
                    ? 'border-emerald-200/18 bg-emerald-300/[0.075] text-emerald-50/86'
                    : 'border-white/[0.06] bg-white/[0.018] text-white/34 hover:text-white/62'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto py-5 pr-1">
          {companiesQuery.isError && (
            <ReadError
              title="Unternehmenskontext nicht verfügbar"
              copy="Die für Finance freigegebenen Unternehmen konnten nicht geladen werden. Es werden keine Finanzdaten aus einem geratenen Kontext angezeigt."
              onRetry={() => void companiesQuery.refetch()}
            />
          )}

          {!companiesQuery.isError && !selectedCompanyId && (
            <TruthEmpty
              title="Kein eindeutiges Unternehmen ausgewählt"
              copy="Wähle ein aktives Unternehmen. Bei mehreren verfügbaren Unternehmen lädt Finance ohne eindeutigen Kontext keine Daten."
            />
          )}

          {selectedCompanyId && stateDenied && (
            <ReadError
              denied
              title={stateErrorKind === 'unauthenticated' ? 'Sitzung nicht autorisiert' : 'Zugriff auf Finanzstatus verweigert'}
              copy="Zwischengespeicherte Finanzwerte werden für diesen Zugriff bewusst nicht angezeigt."
            />
          )}

          {selectedCompanyId && !stateDenied && stateQuery.isLoading && !state && (
            <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-white/[0.06] bg-black/10">
              <div className="text-center">
                <Activity className="mx-auto animate-pulse text-emerald-200/50" size={24} />
                <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">Finanzstatus wird geladen</div>
              </div>
            </div>
          )}

          {selectedCompanyId && !stateDenied && stateQuery.isError && !state && (
            <ReadError
              title="Finanzstatus momentan nicht erreichbar"
              copy="Es wird kein leerer oder 0-€-Zustand daraus abgeleitet."
              onRetry={() => void stateQuery.refetch()}
            />
          )}

          {selectedCompanyId && state && stateLastKnown && (
            <div className="mb-4 rounded-xl border border-amber-300/[0.10] bg-amber-400/[0.025] px-3 py-2 text-[10px] text-amber-50/52">
              Letzter geladener Stand. Die Aktualisierung ist fehlgeschlagen; Werte werden nicht als aktuell ausgegeben.
            </div>
          )}

          {selectedCompanyId && state && section === 'state' && (
            <div className="space-y-4">
              <section className="grid gap-3 md:grid-cols-3" aria-label="Finanzielle Entwicklung">
                <div className="rounded-[24px] border border-white/[0.07] bg-black/14 p-5">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">Letzter Checkpoint</div>
                  <div className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">
                    {formatFinanceMoney(primaryCurrency?.observed_total)}
                  </div>
                  <div className="mt-2 text-[9px] text-white/26">
                    {state.as_of ? new Date(state.as_of).toLocaleString('de-DE') : 'Kein gemeinsamer Zeitpunkt belegt'}
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/[0.07] bg-black/14 p-5">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">Bewegungen danach</div>
                  <div className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">
                    {formatFinanceMoney(movementSinceCheckpoint)}
                  </div>
                  <div className="mt-2 text-[9px] text-white/26">Nur journalisierte Bewegungen seit dem Checkpoint.</div>
                </div>
                <div className="rounded-[24px] border border-emerald-300/[0.09] bg-emerald-400/[0.025] p-5">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-emerald-100/34">Aktuelle Projektion</div>
                  <div className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/90">
                    {formatFinanceMoney(primaryCurrency?.projected_total)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StateBadge state={primaryCurrency?.coverage || 'unknown'} />
                    {primaryCurrency?.aggregate_is_partial && <StateBadge state="partial" />}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-white/76">Konten</div>
                    <div className="mt-1 text-[10px] text-white/28">Nur explizit dem Unternehmen zugeordnete Konten.</div>
                  </div>
                  <WalletCards size={16} className="text-white/22" />
                </div>

                {state.accounts.length === 0 ? (
                  <div className="border-t border-white/[0.05] py-4 text-[11px] text-white/34">
                    Noch kein Unternehmenskonto erfasst.
                  </div>
                ) : (
                  state.accounts.map((account) => (
                    <div key={account.id} className="grid gap-3 border-t border-white/[0.05] py-4 first:border-t-0 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-white/72">{account.display_name}</span>
                          <StateBadge state={account.truth_state} />
                          {account.coverage && <StateBadge state={account.coverage} />}
                          {account.freshness && <StateBadge state={account.freshness} />}
                        </div>
                        <div className="mt-1 text-[10px] text-white/28">
                          {account.account_type || 'Konto'} · {account.source_kind === 'manual' ? 'manuell erfasst' : account.source_kind || 'Quelle unbekannt'}
                        </div>
                        <div className="mt-1 text-[9px] text-white/20">
                          {account.as_of ? `Stand vom ${new Date(account.as_of).toLocaleString('de-DE')}` : 'Noch kein Checkpoint'}
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-sm tabular-nums text-white/80">{formatFinanceMoney(account.observed_balance)}</div>
                        <div className="mt-1 text-[9px] text-white/24">Projektion {formatFinanceMoney(account.projected_balance)}</div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {(state.warnings?.length || state.notes?.length) ? (
                <section className="rounded-[28px] border border-amber-300/[0.08] bg-amber-400/[0.02] p-5">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-white/58">
                    <CircleAlert size={12} /> Offene Datenpunkte
                  </div>
                  <div className="mt-3 space-y-2">
                    {[...(state.warnings || []), ...(state.notes || [])].map((item) => (
                      <div key={item} className="text-[10px] leading-relaxed text-white/38">{item.replaceAll('_', ' ')}</div>
                    ))}
                  </div>
                </section>
              ) : null}

              <FinanceEntryPanel companyId={selectedCompanyId} accounts={state.accounts} />
            </div>
          )}

          {selectedCompanyId && state && section === 'flow' && selectedRecordId && (
            <RecordDetailPanel
              companyId={selectedCompanyId}
              recordId={selectedRecordId}
              accounts={state.accounts}
              onClose={() => setSelectedRecordId(null)}
              onOpenNode={openEvidenceNode}
            />
          )}

          {selectedCompanyId && state && section === 'flow' && !selectedRecordId && (
            <div className="space-y-4">
              {recordsDenied ? (
                <ReadError
                  denied
                  title="Zugriff auf Bewegungen verweigert"
                  copy="Zwischengespeicherte Bewegungen werden für diesen Zugriff nicht angezeigt."
                />
              ) : recordsQuery.isLoading && !recordsQuery.data ? (
                <div className="grid min-h-[180px] place-items-center rounded-[28px] border border-white/[0.06] bg-black/10">
                  <Activity className="animate-pulse text-emerald-200/50" size={22} />
                </div>
              ) : recordsQuery.isError && !recordsQuery.data ? (
                <ReadError
                  title="Bewegungen momentan nicht erreichbar"
                  copy="Der Finanzstatus oben bleibt davon getrennt. Ein fehlgeschlagener Flow-Read wird nicht als leerer Verlauf dargestellt."
                  onRetry={() => void recordsQuery.refetch()}
                />
              ) : records.length ? (
                <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium text-white/76">Bewegungen</div>
                      <div className="mt-1 text-[10px] text-white/28">
                        Letzte bis zu 50 journalisierte Vorgänge. Jeder Vorgang lässt sich bis zu Buchungszeilen und Beleg öffnen.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {flowLastKnown && <StateBadge state="stale" />}
                      <ReceiptText size={16} className="text-white/22" />
                    </div>
                  </div>
                  {flowLastKnown && (
                    <div className="my-3 rounded-xl border border-amber-300/[0.10] bg-amber-400/[0.025] px-3 py-2 text-[10px] text-amber-50/52">
                      Letzter geladener Verlauf; Aktualisierung fehlgeschlagen.
                    </div>
                  )}
                  {records.map((record) => (
                    <RecordRow key={record.id} record={record} onOpen={() => setSelectedRecordId(record.id)} />
                  ))}
                  <div className="mt-4 border-t border-white/[0.05] pt-3 text-[9px] text-white/28">
                    {recordsQuery.data?.next_cursor
                      ? 'Weitere ältere Vorgänge sind vorhanden; diese Ansicht zeigt bewusst nur den aktuellen Ausschnitt.'
                      : 'Für den aktuellen Filter sind keine weiteren älteren Vorgänge angekündigt.'}
                  </div>
                </section>
              ) : (
                <TruthEmpty
                  compact
                  title="Noch keine Bewegung erfasst"
                  copy="Ein leerer Verlauf bedeutet nicht 0 € Umsatz oder 0 € Kosten. Erfasse eine Bewegung im State-Bereich, wenn ein belegbarer Vorgang vorliegt."
                />
              )}
            </div>
          )}

          {selectedCompanyId && state && section === 'treasury' && (
            hasObservedState ? (
              <section className="rounded-[30px] border border-white/[0.07] bg-black/14 p-6">
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/28">Treasury</div>
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">Liquidität beginnt beim belegten Kontostand.</h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/34">
                  Kontostände und journalisierte Bewegungen sind sichtbar. Runway und Reserven werden erst berechnet, wenn wiederkehrende Kosten und Verpflichtungen ausreichend erfasst sind.
                </p>
              </section>
            ) : (
              <TruthEmpty title="Treasury wartet auf einen Checkpoint" copy="Ohne beobachteten Kontostand werden weder Runway noch Reserve geschätzt." />
            )
          )}

          {selectedCompanyId && section === 'capital' && !stateDenied && (
            <div className="space-y-4">
              <section className="rounded-[30px] border border-white/[0.07] bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.07),transparent_36%),rgba(0,0,0,0.14)] p-6">
                <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-100/34">Capital · XRPL Lab</div>
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">Öffentliche Ledger-Daten beobachten, ohne Eigentum zu behaupten.</h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/34">
                  Watch-Adressen bleiben außerhalb der Unternehmenssumme, bis Eigentum ausdrücklich belegt und zugeordnet ist. Signieren bleibt außerhalb dieser Ansicht.
                </p>
              </section>
              <XrplWatchLab />
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
