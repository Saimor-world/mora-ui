'use client';

import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, Building2, CircleAlert, Landmark, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import {
  financeRecordItems,
  type FinanceMoney,
  type FinanceRecord,
  useFinanceRecords,
  useFinanceState,
} from '@/lib/queries/useFinanceStateFlow';

type Section = 'state' | 'flow' | 'treasury' | 'capital';

function money(value: FinanceMoney | null | undefined) {
  if (!value) return '—';
  const numeric = Number(value.value);
  if (!Number.isFinite(numeric)) return `${value.value} ${value.currency}`;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: value.currency || 'EUR',
    minimumFractionDigits: Math.min(value.scale ?? 2, 6),
    maximumFractionDigits: Math.min(value.scale ?? 2, 6),
  }).format(numeric);
}

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
  const good = ['complete', 'current', 'verified'].includes(state);
  const warn = ['partial', 'stale', 'missing_observation', 'unknown'].includes(state);
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

function TruthEmpty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/[0.07] bg-black/15 px-8 text-center">
      <div className="max-w-xl">
        <ShieldCheck className="mx-auto text-emerald-200/50" size={24} />
        <h3 className="mt-4 text-xl font-medium tracking-[-0.03em] text-white/84">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/38">{copy}</p>
      </div>
    </div>
  );
}

function RecordRow({ record }: { record: FinanceRecord }) {
  const cashPosting = record.postings?.find((posting) => posting.account_id && posting.ledger_code.startsWith('cash:'));
  return (
    <div className="group grid gap-4 border-b border-white/[0.055] px-1 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white/78">{labelForClassification(record.classification)}</span>
          {record.correction_of_record_id && <StateBadge state="correction" />}
          {record.source_kind && <StateBadge state={record.source_kind} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30">
          <span>{record.effective_at ? new Date(record.effective_at).toLocaleString('de-DE') : 'Zeitpunkt nicht belegt'}</span>
          <span>•</span>
          <span>{record.evidence?.label || record.evidence?.reference || 'Evidence nicht verfügbar'}</span>
        </div>
        {record.memo && <p className="mt-2 truncate text-[11px] text-white/38">{record.memo}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="text-right">
          <div className="text-sm font-medium tabular-nums text-white/84">{money(cashPosting?.amount)}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.15em] text-white/24">traceable flow</div>
        </div>
        <ArrowRight size={14} className="text-white/18 transition group-hover:text-emerald-200/58" />
      </div>
    </div>
  );
}

export default function FinanceV2App({ paneId }: AppProps) {
  const pane = usePaneStore((state) => state.getPane(paneId));
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const removePane = usePaneStore((state) => state.removePane);
  const minimizePane = usePaneStore((state) => state.minimizePane);
  const focusPane = usePaneStore((state) => state.focusPane);
  const updatePanePosition = usePaneStore((state) => state.updatePanePosition);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const [section, setSection] = useState<Section>('state');

  const companiesQuery = useCompanies({ includeDemo: false });
  const companies = Array.isArray(companiesQuery.data) ? companiesQuery.data : [];
  const company = companies[0] || null;
  const selectedCompanyId = companyId(company);

  const stateQuery = useFinanceState(selectedCompanyId, Boolean(selectedCompanyId));
  const recordsQuery = useFinanceRecords(selectedCompanyId, 50, Boolean(selectedCompanyId));
  const records = useMemo(() => financeRecordItems(recordsQuery.data), [recordsQuery.data]);
  const state = stateQuery.data;

  if (!pane) return null;

  const sections: Array<{ id: Section; label: string }> = [
    { id: 'state', label: 'State' },
    { id: 'flow', label: 'Flow' },
    { id: 'treasury', label: 'Treasury' },
    { id: 'capital', label: 'Capital' },
  ];

  const primaryCurrency = state?.currency_states?.[0] || null;
  const hasVerifiedState = Boolean(state && state.accounts?.length > 0);

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
                <Building2 size={11} /> {company ? companyName(company) : 'Company scope unresolved'}
              </div>
              <h1 className="mt-3 text-[30px] font-medium tracking-[-0.05em] text-white/92">Financial State</h1>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/34">
                Belegte Unternehmenswahrheit aus CORE. Fehlende Daten bleiben unbekannt; persönliche Vermögenswerte erscheinen hier nicht.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {state?.truth_state && <StateBadge state={state.truth_state} />}
              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-white/34">company only</span>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Finance sections">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
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
          {!selectedCompanyId && (
            <TruthEmpty
              title="Kein Unternehmenskontext belegt"
              copy="Finance zeigt erst dann Zahlen, wenn CORE eine autorisierte Company liefert. Es wird kein privater oder Demo-Kontext eingesetzt."
            />
          )}

          {selectedCompanyId && (stateQuery.isLoading || recordsQuery.isLoading) && (
            <div className="grid min-h-[280px] place-items-center rounded-[28px] border border-white/[0.06] bg-black/10">
              <div className="text-center">
                <Activity className="mx-auto animate-pulse text-emerald-200/50" size={24} />
                <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">CORE truth wird geladen</div>
              </div>
            </div>
          )}

          {selectedCompanyId && !stateQuery.isLoading && !state && (
            <TruthEmpty
              title="Noch kein belegter Finance State"
              copy="CORE hat für diese Company noch keinen kanonischen Finanzzustand geliefert. Das ist bewusst kein 0-€-Zustand. Der erste evidenzbasierte Opening State wird später hier sichtbar."
            />
          )}

          {selectedCompanyId && state && section === 'state' && (
            <div className="space-y-4">
              <section className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[30px] border border-emerald-300/[0.09] bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.10),transparent_38%),rgba(0,0,0,0.16)] p-6">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-100/38">Observed company capital</div>
                  <div className="mt-4 text-[42px] font-medium tracking-[-0.055em] text-white/92">{money(primaryCurrency?.observed_total)}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StateBadge state={primaryCurrency?.coverage || 'unknown'} />
                    <span className="text-[10px] text-white/28">Projected {money(primaryCurrency?.projected_total)}</span>
                  </div>
                  <p className="mt-7 max-w-xl text-[11px] leading-relaxed text-white/34">
                    Der Hauptwert stammt nur aus belegten Balance-Observations. Neue Flows verändern die Projektion, bis ein neuer belegter Stand den Zustand wieder verankert.
                  </p>
                </div>

                <div className="rounded-[30px] border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/30"><CircleAlert size={11} /> Truth coverage</div>
                  <div className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white/84">{state.accounts.length}</div>
                  <div className="mt-1 text-[10px] text-white/28">company-owned account{state.accounts.length === 1 ? '' : 's'}</div>
                  <div className="mt-5 space-y-2">
                    {(state.warnings || []).slice(0, 4).map((warning) => (
                      <div key={warning} className="rounded-xl border border-amber-300/[0.09] bg-amber-400/[0.025] px-3 py-2 text-[10px] text-amber-50/48">{warning.replaceAll('_', ' ')}</div>
                    ))}
                    {!state.warnings?.length && <div className="text-[10px] text-white/28">Keine CORE-Warnungen.</div>}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-white/76">Accounts</div>
                    <div className="mt-1 text-[10px] text-white/28">Nur explizit als Company-Eigentum geführte Quellen.</div>
                  </div>
                  <WalletCards size={16} className="text-white/22" />
                </div>
                <div>
                  {state.accounts.map((account) => (
                    <div key={account.id} className="grid gap-3 border-t border-white/[0.05] py-4 first:border-t-0 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-white/72">{account.display_name}</span>
                          <StateBadge state={account.truth_state} />
                        </div>
                        <div className="mt-1 text-[10px] text-white/28">{account.account_type || 'account'} · {account.source_kind || 'source unknown'}</div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-sm tabular-nums text-white/80">{money(account.observed_balance)}</div>
                        <div className="mt-1 text-[9px] text-white/24">projected {money(account.projected_balance)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {selectedCompanyId && state && section === 'flow' && (
            records.length ? (
              <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-white/76">Capital Flow</div>
                    <div className="mt-1 text-[10px] text-white/28">Jeder Vorgang bleibt bis zu seiner Evidence nachvollziehbar.</div>
                  </div>
                  <ReceiptText size={16} className="text-white/22" />
                </div>
                {records.map((record) => <RecordRow key={record.id} record={record} />)}
              </section>
            ) : (
              <TruthEmpty title="Noch kein belegter Kapitalfluss" copy="Keine Records werden als 0 oder leerer Umsatz interpretiert. Sobald CORE einen evidenzbasierten Vorgang enthält, erscheint er hier mit Klassifikation und Beleg." />
            )
          )}

          {selectedCompanyId && state && section === 'treasury' && (
            hasVerifiedState ? (
              <section className="rounded-[30px] border border-white/[0.07] bg-black/14 p-6">
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/28">Treasury</div>
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">Cash truth before runway theatre.</h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/34">Treasury zeigt zunächst belegte Konten, Observations und Commitments. Runway wird erst berechnet, wenn wiederkehrende Kosten und Reserve-Regeln als Company-Truth vorliegen.</p>
              </section>
            ) : (
              <TruthEmpty title="Treasury wartet auf belegte Konten" copy="Runway und Reserve werden nicht aus Schätzungen erfunden. Erst ein bestätigter Company-State aktiviert diese Ebene." />
            )
          )}

          {selectedCompanyId && state && section === 'capital' && (
            <section className="rounded-[30px] border border-white/[0.07] bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.07),transparent_36%),rgba(0,0,0,0.14)] p-6">
              <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-100/34">Capital · next layer</div>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/86">Investments and XRPL research join here — after ownership.</h2>
              <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/34">Der bisherige XRPL/Capital-Bestand wird selektiv hierher migriert. Eine öffentliche Wallet oder Watch-Adresse gilt dabei nicht automatisch als SAIMÔR-Eigentum. Signing bleibt außerhalb des OS.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StateBadge state="read_only" />
                <StateBadge state="ownership_required" />
                <StateBadge state="external_signing" />
              </div>
            </section>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
