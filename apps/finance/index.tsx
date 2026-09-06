'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Coins,
  Database,
  ExternalLink,
  Eye,
  KeyRound,
  Link2,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Unplug,
  WalletCards,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CAPITAL_OPPORTUNITIES } from '@/lib/capital/opportunities';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';

const STORAGE_KEY = 'saimor.finance.xrpl.canary';

type TrustLine = {
  currency: string;
  balance: string;
  issuer: string;
  limit: string;
  noRipple: boolean;
  freeze: boolean;
  authorized: boolean | null;
};

type XrplTransaction = {
  hash: string;
  ledgerIndex: number | null;
  closeTimeIso: string | null;
  type: string;
  direction: 'in' | 'out';
  account: string;
  destination: string | null;
  amount: unknown;
  result: string;
  validated: boolean;
};

type XrplSnapshot = {
  network: 'mainnet';
  mode: 'read-only';
  address: string;
  ledgerIndex: number | null;
  xrp: number;
  drops: string;
  availableXrp: number;
  reserve: {
    baseXrp: number;
    incrementXrp: number;
    requiredXrp: number;
  };
  ownerCount: number;
  sequence: number;
  security: {
    accountFlags: number;
    masterKeyDisabled: boolean;
    regularKey: string | null;
    signerListCount: number;
  };
  trustLines: TrustLine[];
  transactions: XrplTransaction[];
  fetchedAt: string;
};

function shortAddress(value: string) {
  if (value.length < 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-7)}`;
}

function formatNumber(value: number, max = 6) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: max }).format(value);
}

function formatBalance(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return formatNumber(numeric);
}

function describeAmount(amount: unknown) {
  if (typeof amount === 'string') {
    const drops = Number(amount);
    return Number.isFinite(drops) ? `${formatNumber(drops / 1_000_000)} XRP` : amount;
  }

  if (amount && typeof amount === 'object') {
    const value = 'value' in amount ? String((amount as { value?: unknown }).value ?? '') : '';
    const currency = 'currency' in amount ? String((amount as { currency?: unknown }).currency ?? '') : '';
    if (value || currency) return `${formatBalance(value)} ${currency}`.trim();
  }

  return '—';
}

function StatePill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'safe' | 'warn' | 'neutral' }) {
  const classes = tone === 'safe'
    ? 'border-emerald-300/14 bg-emerald-400/[0.055] text-emerald-100/68'
    : tone === 'warn'
      ? 'border-amber-300/12 bg-amber-400/[0.045] text-amber-100/58'
      : 'border-white/[0.07] bg-white/[0.025] text-white/42';

  return <span className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${classes}`}>{children}</span>;
}

function opportunityStatusLabel(status: 'open' | 'available' | 'verify') {
  if (status === 'open') return 'Open now';
  if (status === 'available') return 'Available';
  return 'Re-verify';
}

function opportunityRiskLabel(risk: 'low' | 'medium' | 'high') {
  if (risk === 'low') return 'Low capital risk';
  if (risk === 'medium') return 'Medium risk';
  return 'Capital at risk';
}

export default function FinanceApp({ paneId, initialData }: AppProps) {
  const pane = usePaneStore((s) => s.getPane(paneId));
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const removePane = usePaneStore((s) => s.removePane);
  const minimizePane = usePaneStore((s) => s.minimizePane);
  const focusPane = usePaneStore((s) => s.focusPane);
  const updatePanePosition = usePaneStore((s) => s.updatePanePosition);
  const updatePaneSize = usePaneStore((s) => s.updatePaneSize);

  const managedTreasuryAddress = process.env.NEXT_PUBLIC_SAIMOR_CANARY_XRPL_ADDRESS || '';
  const configuredAddress = typeof initialData?.address === 'string' ? initialData.address : '';
  const initialAddress = configuredAddress || managedTreasuryAddress;
  const [address, setAddress] = useState(initialAddress);
  const [draftAddress, setDraftAddress] = useState(initialAddress);
  const [snapshot, setSnapshot] = useState<XrplSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (configuredAddress || managedTreasuryAddress) return;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '' : '';
    if (stored) {
      setAddress(stored);
      setDraftAddress(stored);
    }
  }, [configuredAddress, managedTreasuryAddress]);

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

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAddress('');
    setDraftAddress('');
    setSnapshot(null);
    setError(null);
  }, []);

  const positiveTokens = useMemo(
    () => (snapshot?.trustLines || []).filter((line) => Number(line.balance) > 0),
    [snapshot],
  );

  const reserveShare = snapshot && snapshot.xrp > 0
    ? Math.min(100, (snapshot.reserve.requiredXrp / snapshot.xrp) * 100)
    : 0;

  const successfulRecent = useMemo(
    () => (snapshot?.transactions || []).filter((tx) => tx.validated && (!tx.result || tx.result === 'tesSUCCESS')).length,
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
        <section className="rounded-[24px] border border-emerald-300/12 bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,0.09),transparent_34%),rgba(0,0,0,0.14)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-emerald-200/48">
                <Eye size={11} /> XRPL Mainnet observation
              </div>
              <h2 className="mt-3 text-[26px] font-medium tracking-[-0.04em] text-white/90">Treasury Wallet</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/36">
                Die Ledger-kontrollierte XRPL-Adresse ist im OS nur sichtbar. MÔRA darf Bestand, Aktivität und Risiken verstehen; Signieren und Schlüssel bleiben vollständig außerhalb von Saimôr.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatePill tone="safe">Read only</StatePill>
                <StatePill>Self custody</StatePill>
                <StatePill>Ledger external</StatePill>
                <StatePill tone="warn">Signing disabled</StatePill>
              </div>
            </div>

            <div className="flex gap-2">
              {address && !managedTreasuryAddress && (
                <button
                  type="button"
                  onClick={disconnect}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] text-white/36 hover:text-white/62"
                >
                  <Unplug size={12} /> Trennen
                </button>
              )}
              <button
                type="button"
                onClick={() => address && load(address)}
                disabled={!address || loading}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] text-white/52 transition-colors hover:bg-white/[0.06] disabled:opacity-35"
              >
                <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Aktualisieren
              </button>
            </div>
          </div>
        </section>

        {!address && (
          <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-5">
            <div className="text-sm font-medium text-white/82">XRPL-Adresse beobachten</div>
            <p className="mt-1 text-[11px] text-white/34">
              Fallback für eine zusätzliche öffentliche Watch-Adresse. Keine Seed Phrase, kein Private Key und kein Signing-Pfad werden gespeichert.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={draftAddress}
                onChange={(event) => setDraftAddress(event.target.value)}
                placeholder="r…"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 font-mono text-xs text-white/78 outline-none focus:border-emerald-300/24"
              />
              <button
                type="button"
                onClick={saveAddress}
                className="rounded-xl border border-emerald-300/16 bg-emerald-400/[0.07] px-4 py-2 text-xs font-medium text-emerald-100/76 hover:bg-emerald-400/[0.11]"
              >
                Beobachten
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-xl border border-red-300/16 bg-red-500/[0.06] px-4 py-3 text-xs text-red-200/75">{error}</div>
        )}

        {address && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/32"><Coins size={11} /> XRP balance</div>
                <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-white/88">{snapshot ? formatNumber(snapshot.xrp) : '—'}</div>
                <div className="mt-1 font-mono text-[9px] text-white/24">{shortAddress(address)}</div>
              </div>
              <div className="rounded-[20px] border border-emerald-300/[0.09] bg-emerald-400/[0.02] p-4">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-emerald-100/34"><WalletCards size={11} /> Spendable</div>
                <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-white/88">{snapshot ? formatNumber(snapshot.availableXrp) : '—'}</div>
                <div className="mt-1 text-[9px] text-white/24">nach aktueller Ledger-Reserve</div>
              </div>
              <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/32"><LockKeyhole size={11} /> Reserve</div>
                <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-white/88">{snapshot ? formatNumber(snapshot.reserve.requiredXrp) : '—'}</div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full rounded-full bg-white/20" style={{ width: `${reserveShare}%` }} />
                </div>
              </div>
              <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/32"><Link2 size={11} /> Issued assets</div>
                <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-white/88">{snapshot ? positiveTokens.length : '—'}</div>
                <div className="mt-1 text-[9px] text-white/24">{snapshot ? `${snapshot.trustLines.length} Trustlines gesamt` : 'Trustlines'}</div>
              </div>
            </section>

            <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-white/76">Assets on ledger</div>
                    <div className="mt-1 text-[9px] text-white/28">
                      {snapshot?.ledgerIndex ? `Validated ledger ${snapshot.ledgerIndex}` : 'Warte auf Ledger-Daten'}
                    </div>
                  </div>
                  {snapshot?.fetchedAt && <div className="text-[9px] text-white/20">{new Date(snapshot.fetchedAt).toLocaleTimeString('de-DE')}</div>}
                </div>

                <div className="mt-3 divide-y divide-white/[0.05]">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-[12px] font-medium text-white/72">XRP</div>
                      <div className="text-[9px] text-white/26">Native asset</div>
                    </div>
                    <div className="font-mono text-[12px] text-white/68">{snapshot ? formatNumber(snapshot.xrp) : '—'}</div>
                  </div>
                  {positiveTokens.map((line) => (
                    <div key={`${line.currency}-${line.issuer}`} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-[12px] font-medium text-white/72">{line.currency}</div>
                          {line.freeze && <StatePill tone="warn">Frozen</StatePill>}
                        </div>
                        <div className="truncate font-mono text-[9px] text-white/24">Issuer {shortAddress(line.issuer)}</div>
                      </div>
                      <div className="shrink-0 font-mono text-[12px] text-white/68">{formatBalance(line.balance)}</div>
                    </div>
                  ))}
                  {snapshot && positiveTokens.length === 0 && (
                    <div className="py-5 text-[10px] text-white/28">Keine positiven issued-token balances gefunden.</div>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/76">
                  <KeyRound size={13} className="text-emerald-200/48" /> Account security
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 border-b border-white/[0.045] pb-3">
                    <span className="text-[10px] text-white/32">OS signing path</span>
                    <StatePill tone="safe">Disabled</StatePill>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/[0.045] pb-3">
                    <span className="text-[10px] text-white/32">Master key</span>
                    <span className="text-[10px] text-white/58">{snapshot ? (snapshot.security.masterKeyDisabled ? 'Disabled on ledger' : 'Enabled on ledger') : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/[0.045] pb-3">
                    <span className="text-[10px] text-white/32">Regular key</span>
                    <span className="font-mono text-[9px] text-white/50">{snapshot ? (snapshot.security.regularKey ? shortAddress(snapshot.security.regularKey) : 'None') : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/[0.045] pb-3">
                    <span className="text-[10px] text-white/32">Signer lists</span>
                    <span className="text-[10px] text-white/58">{snapshot?.security.signerListCount ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-white/32">Sequence</span>
                    <span className="font-mono text-[10px] text-white/58">{snapshot?.sequence ?? '—'}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-white/76">Recent ledger activity</div>
                  <div className="mt-1 text-[9px] text-white/28">{snapshot ? `${successfulRecent} validierte erfolgreiche Einträge im geladenen Fenster` : 'Nur Beobachtung'}</div>
                </div>
                <Database size={13} className="text-white/20" />
              </div>

              <div className="mt-3 divide-y divide-white/[0.05]">
                {(snapshot?.transactions || []).slice(0, 6).map((tx) => {
                  const DirectionIcon = tx.direction === 'in' ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <div key={`${tx.hash}-${tx.ledgerIndex}`} className="flex items-center gap-3 py-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] ${tx.direction === 'in' ? 'text-emerald-200/60' : 'text-amber-200/55'}`}>
                        <DirectionIcon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-white/66">{tx.type}</span>
                          <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">{tx.direction}</span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[8px] text-white/20">
                          {tx.hash ? `${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}` : `Ledger ${tx.ledgerIndex ?? '—'}`}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[10px] text-white/52">{describeAmount(tx.amount)}</div>
                        <div className="mt-0.5 text-[8px] text-white/18">{tx.closeTimeIso ? new Date(tx.closeTimeIso).toLocaleDateString('de-DE') : tx.result || 'validated'}</div>
                      </div>
                    </div>
                  );
                })}
                {snapshot && snapshot.transactions.length === 0 && (
                  <div className="py-5 text-[10px] text-white/28">Keine letzten Transaktionen zurückgegeben.</div>
                )}
              </div>
            </section>
          </>
        )}

        <section className="rounded-[24px] border border-violet-300/[0.09] bg-[radial-gradient(circle_at_90%_0%,rgba(139,92,246,0.08),transparent_30%),rgba(0,0,0,0.14)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-violet-200/42">
                <BadgeCheck size={11} /> Verified opportunity radar
              </div>
              <h3 className="mt-2 text-[18px] font-medium tracking-[-0.03em] text-white/82">Möglichkeiten, die einen echten Grund haben.</h3>
              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-white/30">
                Keine Airdrop-Lotterie. Nur offizielle Quellen, ein Verifizierungsdatum und eine klare Trennung zwischen Förderung, Builder-Umsatz und Kapitalrisiko.
              </p>
            </div>
            <StatePill tone="safe">No auto-execution</StatePill>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {CAPITAL_OPPORTUNITIES.map((opportunity) => {
              const statusTone = opportunity.status === 'open' ? 'safe' : opportunity.status === 'verify' ? 'warn' : 'neutral';
              const riskTone = opportunity.risk === 'high' ? 'warn' : opportunity.risk === 'low' ? 'safe' : 'neutral';

              return (
                <a
                  key={opportunity.id}
                  href={opportunity.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[20px] border border-white/[0.065] bg-white/[0.018] p-4 transition-colors hover:border-white/[0.11] hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-white/25">{opportunity.provider} · {opportunity.kind}</div>
                      <div className="mt-1 text-[13px] font-medium text-white/72">{opportunity.title}</div>
                    </div>
                    <ExternalLink size={12} className="shrink-0 text-white/18 transition-colors group-hover:text-white/50" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatePill tone={statusTone}>{opportunityStatusLabel(opportunity.status)}</StatePill>
                    <StatePill tone={riskTone}>{opportunityRiskLabel(opportunity.risk)}</StatePill>
                    {opportunity.requiresSigning && <StatePill tone="warn">External signing</StatePill>}
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-white/34">{opportunity.summary}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/48">{opportunity.whyItFits}</p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.045] pt-3">
                    <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">verified {opportunity.verifiedAt}</span>
                    <span className="text-[9px] text-violet-100/48">{opportunity.actionLabel} →</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="rounded-[22px] border border-cyan-300/[0.08] bg-cyan-400/[0.018] p-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-cyan-200/38">
            <ShieldCheck size={11} /> MÔRA capital policy
          </div>
          <div className="mt-2 text-[13px] text-white/68">Observe → understand → propose. Never sign.</div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
            Chancen werden als Intents bewertet. Förderung kann vorbereitet werden; kapitalwirksame Aktionen bleiben getrennt und brauchen einen externen Signer.
          </p>
        </section>
      </div>
    </GlassPanel>
  );
}
