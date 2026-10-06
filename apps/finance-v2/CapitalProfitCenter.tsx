'use client';

import React, { useMemo } from 'react';
import {
  BadgeEuro,
  CircleGauge,
  Landmark,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { formatFinanceMoney } from '@/lib/finance/format';
import {
  buildMonthlyProfitCenter,
  DEFAULT_CAPITAL_POLICY,
} from '@/lib/finance/profitCenter';
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

export default function CapitalProfitCenter({
  records,
  hasOlderRecords,
}: {
  records: FinanceRecord[];
  hasOlderRecords: boolean;
}) {
  const snapshot = useMemo(
    () => buildMonthlyProfitCenter(records, { hasOlderRecords }),
    [records, hasOlderRecords],
  );

  const budgetReleased = snapshot.draftTradingBudget !== null;
  const policy = DEFAULT_CAPITAL_POLICY;

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
              Dieser Stand rechnet nur belegte Cash-Bewegungen aus CORE. Customer receipts sind noch kein
              buchhalterisch anerkannter Umsatz. Founder Funding und interne Transfers werden nicht als
              operative Performance ausgegeben.
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] ${snapshot.coverage === 'complete'
            ? 'border-emerald-300/15 bg-emerald-400/[0.055] text-emerald-100/68'
            : 'border-amber-300/15 bg-amber-400/[0.045] text-amber-100/62'}`}>
            {snapshot.period} · {snapshot.coverage}
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Monatlicher Operating Cash">
        <Metric
          label="Customer cash in"
          value={formatFinanceMoney(snapshot.customerReceipts)}
          note="Cash receipts, noch nicht Revenue Recognition."
        />
        <Metric
          label="Operating cash out"
          value={formatFinanceMoney(snapshot.operatingExpenses)}
          note="Netto nach geladenen Korrekturen."
        />
        <Metric
          label="Operating cash result"
          value={formatFinanceMoney(snapshot.operatingCashResult)}
          accent
          note="Cash-Ergebnis, ausdrücklich kein Jahresabschluss-Gewinn."
        />
        <Metric
          label="Founder funding"
          value={formatFinanceMoney(snapshot.founderFunding)}
          note="Kapitalzufuhr, nicht als Performance gezählt."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[26px] border border-violet-300/[0.08] bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.07),transparent_34%),rgba(0,0,0,0.14)] p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-violet-100/38">
            <WalletCards size={11} /> Capital mandate
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MandateCard
              title="Operating Cash"
              status="Protect"
              copy="Laufende Verpflichtungen, Steuern und Reserve zuerst. Dieses Kapital finanziert keinen Trade."
            />
            <MandateCard
              title="XRP Sovereign Treasury"
              status="Reserve"
              copy="Strategischer Firmenbestand. Treasury ist nicht automatisch Trading-Inventar und bleibt getrennt vom Hot Minter."
            />
            <MandateCard
              title="XRPL Yield / Liquidity"
              status="Research"
              copy="AMM, Liquidity und Spread-Strategien werden erst nach eigener Risiko- und Ertragsmessung Kapital zugeteilt."
            />
            <MandateCard
              title="Trading Desk"
              status={budgetReleased ? 'Draft budget' : 'Not released'}
              copy="Aktives Risiko erhält ein eigenes Monatsbudget. Jede Ausführung bleibt außerhalb dieser read-only Finance-Schicht."
            />
          </div>
        </div>

        <div className="rounded-[26px] border border-white/[0.07] bg-black/14 p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/32">
            <ShieldCheck size={11} /> Draft risk policy
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Trading budget</span>
              <span className="text-sm font-medium text-white/76">
                {snapshot.draftTradingBudget ? formatFinanceMoney(snapshot.draftTradingBudget) : 'Nicht freigegeben'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Budget share</span>
              <span className="text-sm font-medium text-white/64">{policy.tradingBudgetShareBps / 100}% positiver Cash-Überschuss</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Monthly loss stop</span>
              <span className="text-sm font-medium text-white/64">
                {snapshot.draftMonthlyLossStop ? formatFinanceMoney(snapshot.draftMonthlyLossStop) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3">
              <span className="text-[10px] text-white/36">Risk / trade</span>
              <span className="text-sm font-medium text-white/64">
                {snapshot.draftPerTradeRisk ? formatFinanceMoney(snapshot.draftPerTradeRisk) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white/36">Execution</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-100/58">Manual approval · no leverage</span>
            </div>
          </div>
          {snapshot.coverage !== 'complete' && (
            <div className="mt-4 rounded-xl border border-amber-300/[0.09] bg-amber-400/[0.025] p-3 text-[9px] leading-relaxed text-amber-50/48">
              Ältere Flow-Daten sind noch vorhanden. Deshalb wird aus diesem Ausschnitt bewusst kein Trading-Budget freigegeben.
            </div>
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
            CORE kann Cash-Flows belegen, aber noch nicht sauber markieren, welcher Gewinn durch Finance selbst erzeugt wurde.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/[0.07] bg-black/14 p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
            <Landmark size={11} /> Excluded capital
          </div>
          <div className="mt-2 text-lg font-medium text-white/68">{formatFinanceMoney(snapshot.excludedAdjustments)}</div>
          <p className="mt-1 text-[9px] leading-relaxed text-white/26">
            Unklassifizierte/sonstige Adjustments werden nicht stillschweigend zur Performance gerechnet.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/[0.07] bg-black/14 p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
            <TrendingUp size={11} /> Next contract
          </div>
          <div className="mt-2 text-lg font-medium text-white/68">P&L Attribution</div>
          <p className="mt-1 text-[9px] leading-relaxed text-white/26">
            Trading, Liquidity, Treasury und Revenue brauchen eigene realisierte P&L-Quellen in CORE.
          </p>
        </div>
      </section>
    </div>
  );
}
