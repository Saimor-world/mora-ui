'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCcw, ShieldCheck, WalletCards } from 'lucide-react';

type XrplWatchSnapshot = {
  network: 'mainnet';
  mode: 'read-only';
  address: string;
  ledgerIndex: number | null;
  xrp: number;
  availableXrp: number;
  reserve: { requiredXrp: number };
  ownerCount: number;
  trustLines: Array<{ currency: string; balance: string; issuer: string }>;
  transactions: Array<{
    hash: string;
    ledgerIndex: number | null;
    type: string;
    direction: 'in' | 'out';
    validated: boolean;
    result: string;
  }>;
  fetchedAt: string;
};

function compact(value: string) {
  if (value.length <= 20) return value;
  return `${value.slice(0, 9)}…${value.slice(-7)}`;
}

function displayNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(value);
}

export default function XrplWatchLab() {
  const configuredWatch = process.env.NEXT_PUBLIC_SAIMOR_CANARY_XRPL_ADDRESS || '';
  const [draftAddress, setDraftAddress] = useState(configuredWatch);
  const [address, setAddress] = useState(configuredWatch);
  const [snapshot, setSnapshot] = useState<XrplWatchSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (target: string) => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/xrpl?address=${encodeURIComponent(target)}`, {
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'XRPL-Adresse konnte nicht gelesen werden.');
      setSnapshot(body);
    } catch (cause) {
      setSnapshot(null);
      setError(cause instanceof Error ? cause.message : 'XRPL-Adresse konnte nicht gelesen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) void load(address);
  }, [address, load]);

  const observe = () => {
    const next = draftAddress.trim();
    if (!next) return;
    setAddress(next);
  };

  return (
    <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5" data-testid="finance-xrpl-watch-lab">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-100/38">
            <Eye size={11} /> XRPL Watch Lab · read only
          </div>
          <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-white/82">
            Ledger beobachten, ohne Eigentum zu behaupten.
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/34">
            Eine öffentliche Adresse ist nur eine Beobachtung. Sie wird nicht als SAIMÔR-Vermögen gezählt,
            nicht mit Company State verrechnet und gibt dem OS keine Signing-Berechtigung.
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
          className="rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/74"
        >
          Beobachten
        </button>
        <button
          type="button"
          onClick={() => address && void load(address)}
          disabled={!address || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs text-white/46 disabled:opacity-35"
        >
          <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-300/14 bg-red-500/[0.05] px-3 py-2.5 text-xs text-red-100/72">
          {error}
        </div>
      )}

      {address && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Watch address</div>
            <div className="mt-2 font-mono text-xs text-white/62">{compact(address)}</div>
            <div className="mt-2 text-[9px] text-amber-100/48">Ownership unassigned</div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/28">
              <WalletCards size={10} /> ledger balance
            </div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">
              {displayNumber(snapshot?.xrp)} XRP
            </div>
            <div className="mt-1 text-[9px] text-white/24">not company total</div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Required reserve</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">
              {displayNumber(snapshot?.reserve?.requiredXrp)} XRP
            </div>
            <div className="mt-1 text-[9px] text-white/24">{snapshot?.ownerCount ?? '—'} owner objects</div>
          </div>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">Validated ledger</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.04em] text-white/78">{snapshot?.ledgerIndex ?? '—'}</div>
            <div className="mt-1 text-[9px] text-white/24">
              {snapshot?.fetchedAt ? new Date(snapshot.fetchedAt).toLocaleTimeString('de-DE') : 'not loaded'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
