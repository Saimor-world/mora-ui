'use client';

import React, { useState } from 'react';
import { Eye, Link2, RefreshCcw, ShieldCheck, WalletCards } from 'lucide-react';
import { useConnectCompanyXrpl, useObserveXrpl } from '@/lib/queries/useFinanceSources';

function compact(value: string) {
  if (value.length <= 20) return value;
  return value.slice(0, 9) + '…' + value.slice(-7);
}

function displayXrp(value?: string | null) {
  if (!value) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(parsed);
}

export default function XrplWatchLab({ companyId }: { companyId: string }) {
  const [draftAddress, setDraftAddress] = useState('');
  const [address, setAddress] = useState('');
  const [ownershipAttested, setOwnershipAttested] = useState(false);
  const observeMutation = useObserveXrpl();
  const connectMutation = useConnectCompanyXrpl(companyId);
  const snapshot = observeMutation.data;

  const observe = () => {
    const next = draftAddress.trim();
    if (!next) return;
    setAddress(next);
    setOwnershipAttested(false);
    observeMutation.mutate(next);
  };

  const connect = () => {
    if (!address || !ownershipAttested || !snapshot) return;
    connectMutation.mutate({ address, label: 'SAIMÔR XRPL' });
  };

  const error = observeMutation.error || connectMutation.error;

  return (
    <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5" data-testid="finance-xrpl-watch-lab">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-100/38">
            <Eye size={11} /> XRPL · CORE ledger read
          </div>
          <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-white/82">
            Erst beobachten. Dann Eigentum ausdrücklich zuordnen.
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/34">
            CORE liest den validierten Mainnet-Ledger direkt. Eine Watch-Adresse bleibt außerhalb des
            Unternehmensvermögens, bis du die Eigentumszuordnung ausdrücklich bestätigst.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.035] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-emerald-100/56">
          <ShieldCheck size={11} /> signing disabled
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={draftAddress}
          onChange={(event) => setDraftAddress(event.target.value)}
          placeholder="r… öffentliche XRPL-Adresse"
          aria-label="XRPL Watch-Adresse"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 font-mono text-xs text-white/76 outline-none focus:border-emerald-300/24"
        />
        <button
          type="button"
          onClick={observe}
          disabled={observeMutation.isPending}
          className="rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/74 disabled:opacity-35"
        >
          {observeMutation.isPending ? 'Liest Ledger…' : 'Beobachten'}
        </button>
        <button
          type="button"
          onClick={() => address && observeMutation.mutate(address)}
          disabled={!address || observeMutation.isPending}
          aria-label="XRPL erneut lesen"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs text-white/46 disabled:opacity-35"
        >
          <RefreshCcw size={12} className={observeMutation.isPending ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-300/14 bg-red-500/[0.05] px-3 py-2.5 text-xs text-red-100/72">
          {error.message}
        </div>
      )}

      {address && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Watch address</div>
            <div className="mt-2 font-mono text-xs text-white/62">{compact(address)}</div>
            <div className="mt-2 text-[9px] text-amber-100/48">
              {connectMutation.isSuccess ? 'Company ownership persisted' : 'Ownership unassigned'}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/28">
              <WalletCards size={10} /> ledger balance
            </div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">
              {displayXrp(snapshot?.balance_xrp)} XRP
            </div>
            <div className="mt-1 text-[9px] text-white/24">
              {connectMutation.isSuccess ? 'canonical company observation' : 'not company total'}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Owner objects</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">{snapshot?.owner_count ?? '—'}</div>
            <div className="mt-1 text-[9px] text-white/24">{snapshot?.trust_lines?.length ?? '—'} trust lines</div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Validated ledger</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">{snapshot?.ledger_index ?? '—'}</div>
            <div className="mt-1 text-[9px] text-white/24">
              {snapshot?.observed_at ? new Date(snapshot.observed_at).toLocaleTimeString('de-DE') : 'not loaded'}
            </div>
          </div>
        </div>
      )}

      {snapshot && !connectMutation.isSuccess && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
          <label className="flex items-start gap-3 text-[10px] leading-relaxed text-white/46">
            <input
              type="checkbox"
              checked={ownershipAttested}
              onChange={(event) => setOwnershipAttested(event.target.checked)}
              className="mt-0.5"
            />
            <span>Ich bestätige, dass diese öffentliche Adresse dem ausgewählten SAIMÔR-Unternehmen gehört. Erst dann darf der Ledger-Saldo als Company State gespeichert werden.</span>
          </label>
          <button
            type="button"
            onClick={connect}
            disabled={!ownershipAttested || connectMutation.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/74 disabled:opacity-35"
          >
            <Link2 size={12} /> {connectMutation.isPending ? 'Verbindet…' : 'Als SAIMÔR-Eigentum verbinden'}
          </button>
        </div>
      )}
    </section>
  );
}
