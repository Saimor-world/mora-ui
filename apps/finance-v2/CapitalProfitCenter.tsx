'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeEuro,
  CircleGauge,
  Landmark,
  Save,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { formatFinanceMoney } from '@/lib/finance/format';
import {
  buildMonthlyProfitCenter,
  DEFAULT_CAPITAL_POLICY,
} from '@/lib/finance/profitCenter';
import {
  useFinanceCapitalPolicy,
  useFinanceProfitCenter,
  useSetFinanceCapitalPolicy,
} from '@/lib/queries/useFinanceProfitCenter';
import type { FinanceRecord } from '@/lib/queries/useFinanceStateFlow';

function Metric({
  label,
  value,
  accent = false,
  note,
}: {
  label: string;
  value: string;
  accent?: boolean;
  note?: string;
}) {
  return (
    <div className={`rounded-[22px] border p-4 ${accent
      ? 'border-emerald-300/[0.11] bg-emerald-400/[0.03]'
      : 'border-white/[0.07] bg-black/14'}`}>
      <div className="text-[9px] uppercase tracking-[0.17em] text-white/28">{label}</div>
      <div className={`mt-2 text-xl font-medium tracking-[-0.035em] ${accent ? 'text-emerald-50/86' : 'text-white/82'}`}>
        {value}
      </div>
      {note && <div className="mt-1 text-[9px] leading-relaxed text-white/26">{note}</div>}
    </div>
  );
}

function MandateCard({
  title,
  status,
  copy,
}: {
  title: string;
  status: string;
  copy: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.018] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-medium text-white/70">{title}</div>
        <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-white/34">
          {status}
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-white/30">{copy}</p>
    </div>
  );
}

function PolicyNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  suffix: string;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.14em] text-white/28">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white/76 outline-none"
        />
        <span className="text-[10px] text-white/26">{suffix}</span>
      </div>
    </label>
  );
}

export default function CapitalProfitCenter({
  companyId,
  records,
  hasOlderRecords,
}: {
  companyId: string;
  records: FinanceRecord[];
  hasOlderRecords: boolean;
}) {
  const localSnapshot = useMemo(
    () => buildMonthlyProfitCenter(records, { hasOlderRecords }),
    [records, hasOlderRecords],
  );
  const coreSnapshotQuery = useFinanceProfitCenter(companyId);
  const policyQuery = useFinanceCapitalPolicy(companyId);
  const savePolicy = useSetFinanceCapitalPolicy(companyId);

  const persistedPolicy = policyQuery.data?.policy ?? null;
  const [budgetShare, setBudgetShare] = useState(String(DEFAULT_CAPITAL_POLICY.tradingBudgetShareBps / 100));
  const [lossStop, setLossStop] = useState(String(DEFAULT_CAPITAL_POLICY.monthlyLossStopBps / 100));
  const [riskPerTrade, setRiskPerTrade] = useState(String(DEFAULT_CAPITAL_POLICY.perTradeRiskBps / 100));
  const [maxBudget, setMaxBudget] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!persistedPolicy) return;
    setBudgetShare(String(persistedPolicy.trading_budget_share_bps / 100));
    setLossStop(String(persistedPolicy.monthly_loss_stop_bps / 100));
    setRiskPerTrade(String(persistedPolicy.per_trade_risk_bps / 100));
    setMaxBudget(persistedPolicy.max_monthly_trading_budget?.value ?? '');
  }, [
    persistedPolicy?.trading_budget_share_bps,
    persistedPolicy?.monthly_loss_stop_bps,
    persistedPolicy?.per_trade_risk_bps,
    persistedPolicy?.max_monthly_trading_budget?.value,
  ]);

  const coreSnapshot = coreSnapshotQuery.data ?? null;
  const coreAvailable = Boolean(coreSnapshot && policyQuery.data);
  const period = coreSnapshot?.period ?? localSnapshot.period;
  const truthState = coreSnapshot?.truth_state ?? localSnapshot.coverage;
  const customerReceipts = coreSnapshot?.operating_cash.customer_receipts ?? localSnapshot.customerReceipts;
  const operatingExpenses = coreSnapshot?.operating_cash.operating_expenses ?? localSnapshot.operatingExpenses;
  const operatingResult = coreSnapshot?.operating_cash.result ?? localSnapshot.operatingCashResult;
  const founderFunding = coreSnapshot?.operating_cash.founder_funding ?? localSnapshot.founderFunding;
  const excludedAdjustments = coreSnapshot?.operating_cash.excluded_adjustments ?? localSnapshot.excludedAdjustments;
  const tradingBudget = coreSnapshot?.trading_budget.amount ?? localSnapshot.draftTradingBudget;
  const monthlyLossStop = coreSnapshot?.trading_budget.monthly_loss_stop ?? localSnapshot.draftMonthlyLossStop;
  const perTradeRisk = coreSnapshot?.trading_budget.per_trade_risk ?? localSnapshot.draftPerTradeRisk;
  const budgetState = coreSnapshot?.trading_budget.state
    ?? (localSnapshot.draftTradingBudget ? 'local_draft' : 'not_released');
  const budgetReleased = tradingBudget !== null;
  const warnings = coreSnapshot?.coverage.warnings ?? [];

  const parsePercentToBps = (value: string) => Math.round(Number(value) * 100);

  const persistPolicy = async () => {
    setSaveMessage(null);
    const shareBps = parsePercentToBps(budgetShare);
    const lossBps = parsePercentToBps(lossStop);
    const riskBps = parsePercentToBps(riskPerTrade);
    const max = maxBudget.trim();

    if (
      !Number.isFinite(shareBps)
      || !Number.isFinite(lossBps)
      || !Number.isFinite(riskBps)
      || shareBps < 0
      || shareBps > 2000
      || lossBps < 0
      || lossBps > 1000
      || riskBps < 0
      || riskBps > 500
      || riskBps > lossBps
    ) {
      setSaveMessage('Policy-Werte liegen außerhalb der sicheren V1-Grenzen.');
      return;
    }

    try {
      await savePolicy.mutateAsync({
        company_id: companyId,
        enabled: true,
        currency: 'EUR',
        reporting_timezone: 'Europe/Berlin',
        trading_budget_share_bps: shareBps,
        monthly_loss_stop_bps: lossBps,
        per_trade_risk_bps: riskBps,
        max_monthly_trading_budget: max
          ? { value: Number(max).toFixed(2), currency: 'EUR', scale: 2 }
          : null,
        execution_mode: 'manual_approval',
        leverage_allowed: false,
      });
      setSaveMessage('Capital Mandate in CORE gespeichert.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Capital Mandate konnte nicht gespeichert werden.');
    }
  };

  return (
    <div className="space-y-4" data-testid="capital-profit-center">
      <section className="rounded-[30px] border border-emerald-300/[0.09] bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.09),transparent_38%),rgba(0,0,0,0.16)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-emerald-100/40">
              <CircleGauge size={11} /> Finance · Profit Center V1
            </div>
            <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/88">
              Kapital schützen, verstehen und kontrolliert produktiv machen.
            </h2>
            <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-white/34">
              Customer receipts bleiben Cash-Eingänge, bis Revenue Recognition in CORE existiert.
              Founder Funding und interne Transfers zählen nicht als operative Performance.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] ${coreAvailable
              ? 'border-cyan-300/15 bg-cyan-400/[0.055] text-cyan-100/68'
              : 'border-amber-300/15 bg-amber-400/[0.045] text-amber-100/62'}`}>
              {coreAvailable ? 'CORE canonical' : 'Local fallback'}
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] ${truthState === 'complete'
              ? 'border-emerald-300/15 bg-emerald-400/[0.055] text-emerald-100/68'
              : 'border-amber-300/15 bg-amber-400/[0.045] text-amber-100/62'}`}>
              {period} · {truthState}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Monatlicher Operating Cash">
        <Metric label="Customer cash in" value={formatFinanceMoney(customerReceipts)} note="Cash receipt, nicht automatisch Revenue." />
        <Metric label="Operating cash out" value={formatFinanceMoney(operatingExpenses)} note="Belegte operative Cash-Abflüsse." />
        <Metric label="Operating cash result" value={formatFinanceMoney(operatingResult)} accent note="Cash-Ergebnis, kein Jahresabschluss-Gewinn." />
        <Metric label="Founder funding" value={formatFinanceMoney(founderFunding)} note="Kapitalzufuhr, nicht als Performance gezählt." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[26px] border border-violet-300/[0.08] bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.07),transparent_34%),rgba(0,0,0,0.14)] p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-violet-100/38">
            <WalletCards size={11} /> Capital mandate
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MandateCard title="Operating Cash" status="Protect" copy="Laufende Verpflichtungen, Steuern und Reserve zuerst. Dieses Kapital finanziert keinen Trade." />
            <MandateCard title="XRP Sovereign Treasury" status="Reserve" copy="Strategischer Firmenbestand. Treasury ist nicht automatisch Trading-Inventar und bleibt getrennt vom Hot Minter." />
            <MandateCard title="XRPL Yield / Liquidity" status="Research" copy="AMM, Liquidity und Spread-Strategien erhalten erst nach eigener Netto-P&L-Messung Kapital." />
            <MandateCard title="Trading Desk" status={budgetReleased ? 'Budget candidate' : 'Not released'} copy="Aktives Risiko erhält ein eigenes Monatsbudget. Jede Ausführung bleibt außerhalb der Finance-Policy." />
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-300/[0.09] bg-amber-400/[0.025] p-3">
              <div className="text-[9px] uppercase tracking-[0.14em] text-amber-100/44">Budget blockiert durch CORE</div>
              <div className="mt-1 text-[10px] leading-relaxed text-amber-50/48">{warnings.join(' · ')}</div>
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-white/[0.07] bg-black/14 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/32">
              <ShieldCheck size={11} /> Monthly risk mandate
            </div>
            <span className="text-[8px] uppercase tracking-[0.14em] text-white/24">{budgetState.replaceAll('_', ' ')}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <PolicyNumber label="Budget share" value={budgetShare} onChange={setBudgetShare} min={0} max={20} suffix="%" />
            <PolicyNumber label="Monthly loss stop" value={lossStop} onChange={setLossStop} min={0} max={10} suffix="%" />
            <PolicyNumber label="Risk / trade" value={riskPerTrade} onChange={setRiskPerTrade} min={0} max={5} suffix="%" />
            <PolicyNumber label="Absolute cap" value={maxBudget} onChange={setMaxBudget} min={0} max={1000000} step={1} suffix="€" />
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Trading budget candidate</span>
              <span className="text-sm font-medium text-white/76">{formatFinanceMoney(tradingBudget)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Monthly loss stop</span>
              <span className="text-sm font-medium text-white/64">{formatFinanceMoney(monthlyLossStop)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Risk / trade</span>
              <span className="text-sm font-medium text-white/64">{formatFinanceMoney(perTradeRisk)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white/36">Execution</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-100/58">Manual approval · no leverage</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!coreAvailable || savePolicy.isPending}
            onClick={() => void persistPolicy()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/12 bg-emerald-400/[0.045] px-4 py-2.5 text-[10px] font-medium text-emerald-50/66 transition hover:bg-emerald-400/[0.07] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Save size={12} />
            {savePolicy.isPending ? 'Speichert…' : 'Capital Mandate in CORE speichern'}
          </button>
          {!coreAvailable && (
            <p className="mt-2 text-[9px] leading-relaxed text-amber-50/42">
              CORE Profit Engine ist auf dieser Umgebung noch nicht erreichbar. Bis dahin bleibt die Ansicht read-only im lokalen Fallback.
            </p>
          )}
          {saveMessage && (
            <p className="mt-2 text-[9px] leading-relaxed text-white/38">{saveMessage}</p>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/[0.07] bg-black/14 p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
            <BadgeEuro size={11} /> Finance-generated profit
          </div>
          <div className="mt-2 text-lg font-medium text-white/58">Noch nicht attribuierbar</div>
          <p className="mt-1 text-[9px] leading-relaxed text-white/26">
            Trading, Liquidity und Treasury brauchen eigene realisierte P&L-Quellen in CORE.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/[0.07] bg-black/14 p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
            <Landmark size={11} /> Excluded capital
          </div>
          <div className="mt-2 text-lg font-medium text-white/68">{formatFinanceMoney(excludedAdjustments)}</div>
          <p className="mt-1 text-[9px] leading-relaxed text-white/26">
            Unklassifizierte/sonstige Adjustments werden nicht stillschweigend zur Performance gerechnet.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/[0.07] bg-black/14 p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
            <TrendingUp size={11} /> Next contract
          </div>
          <div className="mt-2 text-lg font-medium text-white/68">Realized P&L Attribution</div>
          <p className="mt-1 text-[9px] leading-relaxed text-white/26">
            Nächster CORE-Vertrag: Trading, AMM/Liquidity, Treasury und Asset Sales separat messen.
          </p>
        </div>
      </section>
    </div>
  );
}
