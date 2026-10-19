'use client';

/**
 * Saimôr Finance · Überblick — company figures only (read-only).
 * Income, expenses and account balances from CORE /v3/finance/state + /flow.
 * Deliberately no trading/bot line (decision Marius, 19.10.2026).
 */
import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, WalletCards } from 'lucide-react';
import { formatFinanceMoney } from '@/lib/finance/format';
import type { FinanceAccountState, FinanceMoney, FinanceRecord, FinanceState } from '@/lib/queries/useFinanceStateFlow';

const INCOME = new Set(['customer_receipt']);
const EXPENSE = new Set(['operating_expense']);

function toAtomic(m: FinanceMoney): bigint | null {
  const raw = (m.value || '').trim();
  const match = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) return null;
  const frac = (match[3] || '').padEnd(m.scale, '0').slice(0, m.scale);
  const v = BigInt((match[2] || '0') + frac || '0');
  return match[1] === '-' ? -v : v;
}

function fromAtomic(v: bigint, currency: string, scale: number): FinanceMoney {
  const neg = v < BigInt(0);
  const s = (neg ? -v : v).toString().padStart(scale + 1, '0');
  const whole = scale ? s.slice(0, -scale) : s;
  const frac = scale ? s.slice(-scale) : '';
  return { value: `${neg ? '-' : ''}${whole}${scale ? '.' + frac : ''}`, currency, scale };
}

/** Sum cash postings of the given classifications, per currency. */
export function sumCash(records: FinanceRecord[], classes: Set<string>, sign: 1 | -1): FinanceMoney[] {
  const acc = new Map<string, { v: bigint; scale: number }>();
  for (const r of records) {
    if (!classes.has(r.classification)) continue;
    for (const p of r.postings || []) {
      if (!p.ledger_code?.startsWith('cash:') || !p.amount) continue;
      const a = toAtomic(p.amount);
      if (a == null || (sign > 0 ? a <= BigInt(0) : a >= BigInt(0))) continue;
      const key = `${p.amount.currency}:${p.amount.scale}`;
      const cur = acc.get(key) || { v: BigInt(0), scale: p.amount.scale };
      cur.v += sign > 0 ? a : -a;
      acc.set(key, cur);
    }
  }
  return Array.from(acc.entries()).map(([k, { v, scale }]) => fromAtomic(v, k.split(':')[0], scale));
}

const isRevolut = (a: FinanceAccountState) => /revolut/i.test(`${a.display_name} ${a.source_kind || ''} ${a.account_type || ''}`);
const isXrpl = (a: FinanceAccountState) => /xrpl|xrp|ledger/i.test(`${a.display_name} ${a.source_kind || ''} ${a.account_type || ''} ${a.currency}`);

function MoneyList({ values, empty }: { values: FinanceMoney[]; empty: string }) {
  if (!values.length) return <div className="mt-3 text-[11px] text-white/34">{empty}</div>;
  return (
    <div className="mt-3 space-y-1">
      {values.map((m) => (
        <div key={m.currency} className="text-2xl font-medium tabular-nums tracking-[-0.04em] text-white/86">{formatFinanceMoney(m)}</div>
      ))}
    </div>
  );
}

function AccountGroup({ title, hint, accounts }: { title: string; hint: string; accounts: FinanceAccountState[] }) {
  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.018] p-4" data-testid={`group-${title}`}>
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">{title}</div>
      {accounts.length === 0 ? (
        <div className="mt-2 text-[11px] text-white/34">{hint}</div>
      ) : (
        accounts.map((a) => (
          <div key={a.id} className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-xs text-white/66">{a.display_name}</span>
            <span className="text-sm tabular-nums text-white/82">{formatFinanceMoney(a.observed_balance)}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function CompanyOverview({ state, records, hasOlderRecords }: {
  state: FinanceState | null | undefined;
  records: FinanceRecord[];
  hasOlderRecords: boolean;
}) {
  const income = sumCash(records, INCOME, 1);
  const expenses = sumCash(records, EXPENSE, -1);
  const accounts = state?.accounts || [];
  const revolut = accounts.filter(isRevolut);
  const xrpl = accounts.filter((a) => !isRevolut(a) && isXrpl(a));
  const other = accounts.filter((a) => !isRevolut(a) && !isXrpl(a));

  return (
    <div className="space-y-4" data-testid="finance-company-overview">
      <section className="grid gap-3 md:grid-cols-2" aria-label="Einnahmen und Ausgaben">
        <div className="rounded-[24px] border border-emerald-300/[0.09] bg-emerald-400/[0.025] p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-emerald-100/40"><ArrowDownLeft size={11} /> Einnahmen</div>
          <MoneyList values={income} empty="Noch keine Kundenzahlungen erfasst." />
        </div>
        <div className="rounded-[24px] border border-white/[0.07] bg-black/14 p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/30"><ArrowUpRight size={11} /> Ausgaben</div>
          <MoneyList values={expenses} empty="Noch keine Betriebsausgaben erfasst." />
        </div>
      </section>
      <p className="px-1 text-[9px] text-white/24">
        Aus den geladenen Buchungen{hasOlderRecords ? ' (ältere Einträge im Flow nachladen)' : ''}. Nur journalisierte Unternehmensbewegungen.
      </p>

      <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-medium text-white/76">Kontostände</div>
          <WalletCards size={16} className="text-white/22" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <AccountGroup title="Revolut Business" hint="Noch nicht verbunden – Datenquelle fehlt." accounts={revolut} />
          <AccountGroup title="XRPL Treasury" hint="Noch keine Treasury-Adresse zugeordnet." accounts={xrpl} />
          <AccountGroup title="Weitere Konten" hint="Keine weiteren Konten." accounts={other} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/26">
          <Landmark size={10} /> nur lesend · Quelle CORE /v3/finance
        </div>
      </section>
    </div>
  );
}
