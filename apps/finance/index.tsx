'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Database, Link2, RefreshCcw, ShieldCheck, WalletCards } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';

const STORAGE_KEY = 'saimor.finance.xrpl.canary';

type TrustLine = {
  currency: string;
  balance: string;
  issuer: string;
  limit: string;
  noRipple: boolean;
};

type XrplSnapshot = {
  network: 'mainnet';
  mode: 'read-only';
  address: string;
  ledgerIndex: number | null;
  xrp: number;
  drops: string;
  ownerCount: number;
  sequence: number;
  signerListCount: number;
  trustLines: TrustLine[];
  fetchedAt: string;
};

function shortAddress(value: string) {
  if (value.length < 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-7)}`;
}

function formatBalance(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(numeric);
}

export default function FinanceApp({ paneId, initialData }: AppProps) {
  const pane = usePaneStore((s) => s.getPane(paneId));
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const removePane = usePaneStore((s) => s.removePane);
  const minimizePane = usePaneStore((s) => s.minimizePane);
  const focusPane = usePaneStore((s) => s.focusPane);
  const updatePanePosition = usePaneStore((s) => s.updatePanePosition);
  const updatePaneSize = usePaneStore((s) => s.updatePaneSize);

  const configuredAddress = typeof initialData?.address === 'string' ? initialData.address : '';
  const [address, setAddress] = useState(configuredAddress);
  const [draftAddress, setDraftAddress] = useState(configuredAddress);
  const [snapshot, setSnapshot] = useState<XrplSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (configuredAddress) return;
    const envAddress = process.env.NEXT_PUBLIC_SAIMOR_CANARY_XRPL_ADDRESS || '';
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '' : '';
    const resolved = envAddress || stored;
    if (resolved) {
      setAddress(resolved);
      setDraftAddress(resolved);
    }
  }, [configuredAddress]);

  const load = useCallback(async (target: string) => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/xrpl?address=${encodeURIComponent(target)}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Wallet konnte nicht gelesen werden.');
      setSnapshot(body);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : 'Wallet konnte nicht gelesen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) load(address);
  }, [address, load]);

  const saveAddress = useCallback(() => {
    const next = draftAddress.trim();
    if (!next) return;
    localStorage.setItem(STORAGE_KEY, next);
    setAddress(next);
  }, [draftAddress]);

  const positiveTokens = useMemo(
    () => (snapshot?.trustLines || []).filter((line) => Number(line.balance) > 0),
    [snapshot],
  );

  if (!pane) return null;

  return (
    <GlassPanel
      title={(
        <span className="flex items-center gap-2">
          <WalletCards size={14} className="text-emerald-300/80" />
          <span>Capital</span>
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
      dimOpacity={0.3}
      blurIntensity={24}
      opacity={0.4}
    >
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1 text-white">
        <section className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-emerald-200/55">
                <ShieldCheck size={12} /> Read only · XRPL Mainnet
              </div>
              <h2 className="mt-2 text-xl font-medium text-white/92">Canary Wallet</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/42">
                Saimôr beobachtet dieses Wallet. Diese App besitzt keine Seed Phrase, keinen Private Key und keinen Signaturpfad.
              </p>
            </div>
            <button
              type="button"
              onClick={() => address && load(address)}
              disabled={!address || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/62 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
            >
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>
        </section>

        {!address && (
          <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-medium text-white/85">Öffentliche XRPL-Adresse verbinden</div>
            <p className="mt-1 text-xs text-white/40">Nur eine r…-Adresse. Niemals Seed, Secret oder Private Key.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={draftAddress}
                onChange={(event) => setDraftAddress(event.target.value)}
                placeholder="r…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 font-mono text-xs text-white/82 outline-none focus:border-emerald-300/30"
              />
              <button
                type="button"
                onClick={saveAddress}
                className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-100/85 hover:bg-emerald-400/15"
              >
                Verbinden
              </button>
            </div>
          </section>
        )}

        {address && (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35"><Coins size={12} /> XRP</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-white/92">
                  {snapshot ? snapshot.xrp.toLocaleString('de-DE', { maximumFractionDigits: 6 }) : '—'}
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/30">{shortAddress(address)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35"><Database size={12} /> Ledger objects</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-white/92">{snapshot?.ownerCount ?? '—'}</div>
                <div className="mt-1 text-[10px] text-white/30">Trustlines, Offers, Escrows etc.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35"><Link2 size={12} /> Tokens</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-white/92">{snapshot ? positiveTokens.length : '—'}</div>
                <div className="mt-1 text-[10px] text-white/30">Positive issued balances</div>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-red-300/16 bg-red-500/[0.06] px-4 py-3 text-xs text-red-200/75">{error}</div>
            )}

            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/82">On-chain assets</div>
                  <div className="mt-1 text-[10px] text-white/32">
                    {snapshot?.ledgerIndex ? `Validated ledger ${snapshot.ledgerIndex}` : 'Warte auf Ledger-Daten'}
                  </div>
                </div>
                {snapshot?.fetchedAt && <div className="text-[10px] text-white/25">{new Date(snapshot.fetchedAt).toLocaleTimeString('de-DE')}</div>}
              </div>

              <div className="mt-3 divide-y divide-white/[0.06]">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-white/80">XRP</div>
                    <div className="text-[10px] text-white/30">Native asset</div>
                  </div>
                  <div className="font-mono text-sm text-white/80">{snapshot ? snapshot.xrp.toLocaleString('de-DE', { maximumFractionDigits: 6 }) : '—'}</div>
                </div>
                {positiveTokens.map((line) => (
                  <div key={`${line.currency}-${line.issuer}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/80">{line.currency}</div>
                      <div className="truncate font-mono text-[10px] text-white/28">Issuer {shortAddress(line.issuer)}</div>
                    </div>
                    <div className="shrink-0 font-mono text-sm text-white/80">{formatBalance(line.balance)}</div>
                  </div>
                ))}
                {snapshot && positiveTokens.length === 0 && (
                  <div className="py-5 text-xs text-white/32">Keine positiven issued-token balances gefunden.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.025] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Next rail</div>
              <div className="mt-1 text-sm text-white/76">Opportunity Engine kommt hier hinein — nicht als separate Website.</div>
              <p className="mt-1 text-xs leading-relaxed text-white/36">AMMs, Lending, Vaults, tokenisierte Assets und Rewards werden später als beobachtbare Möglichkeiten gegen deine Policies bewertet. Transaktionen bleiben getrennt.</p>
            </section>
          </>
        )}
      </div>
    </GlassPanel>
  );
}
