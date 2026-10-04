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
  HardDrive,
  KeyRound,
  Link2,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Unplug,
  WalletCards,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CAPITAL_OPPORTUNITIES } from '@/lib/capital/opportunities';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { KNOWN_ACCOUNTS, ORIGIN_NFT, MINTING_STATUS } from '@/lib/finance/types';

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

type AccountSnapshot = {
  address: string;
  role: { type: string; label: string; description: string };
  xrp: number | null;
  availableXrp: number | null;
  reserve: { baseXrp: number; incrementXrp: number; requiredXrp: number };
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
  evidence: { source: string; fetchedAt: string; ledgerIndex: number | null; confidence: string };
  error: string | null;
};

type OriginNftSnapshot = {
  nftokenId: string;
  name: string;
  issuer: string;
  owner: string | null;
  flags: number;
  flagsDescription: { onlyXrp: boolean; transferable: boolean; mutable: boolean };
  transferFee: number;
  transferFeePercent: number;
  artIpfs: string;
  metadataIpfs: string;
  status: string;
  verified: boolean;
  evidence: { source: string; fetchedAt: string; confidence: string } | null;
};

type CompanyFinanceSnapshot = {
  mode: 'company';
  network: string;
  accessMode: string;
  reserve: { baseXrp: number; incrementXrp: number };
  validatedLedger: number;
  treasury: AccountSnapshot | null;
  hotMinter: AccountSnapshot | null;
  originNft: OriginNftSnapshot;
  mintingStatus: { range: string; status: string; note: string };
  totals: {
    companyXrp: number;
    treasuryXrp: number | null;
    hotMinterXrp: number | null;
    note: string;
  };
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

function StatePill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'safe' | 'warn' | 'neutral' | 'info' }) {
  const classes = tone === 'safe'
    ? 'border-emerald-300/14 bg-emerald-400/[0.055] text-emerald-100/68'
    : tone === 'warn'
      ? 'border-amber-300/12 bg-amber-400/[0.045] text-amber-100/58'
      : tone === 'info'
        ? 'border-violet-300/12 bg-violet-400/[0.045] text-violet-100/58'
        : 'border-white/[0.07] bg-white/[0.025] text-white/42';

  return <span className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${classes}`}>{children}</span>;
}

function AccountCard({ account, title, description }: { account: AccountSnapshot | null; title: string; description: string }) {
  if (!account) {
    return (
      <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="text-[11px] font-medium text-white/52">{title}</div>
        <div className="mt-1 text-[9px] text-white/28">{description}</div>
        <div className="mt-3 text-[10px] text-amber-200/60">Not available</div>
      </div>
    );
  }

  const hasError = account.error !== null;
  const xrp = account.xrp ?? 0;
  const availableXrp = account.availableXrp ?? 0;

  return (
    <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-white/72">{title}</div>
          <div className="mt-0.5 font-mono text-[9px] text-white/28">{shortAddress(account.address)}</div>
        </div>
        {hasError ? (
          <StatePill tone="warn">Error</StatePill>
        ) : account.evidence.confidence === 'live' ? (
          <StatePill tone="safe">Live</StatePill>
        ) : (
          <StatePill tone="warn">Stale</StatePill>
        )}
      </div>

      {hasError ? (
        <div className="mt-3 text-[10px] text-amber-200/60">{account.error}</div>
      ) : (
        <>
          <div className="mt-3 text-[26px] font-medium tracking-[-0.04em] text-white/88">
            {formatNumber(xrp)} <span className="text-[14px] text-white/40">XRP</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[9px] text-white/32">
            <span>Available: {formatNumber(availableXrp)} XRP</span>
            <span>Reserve: {formatNumber(account.reserve.requiredXrp)} XRP</span>
          </div>
          <div className="mt-2 text-[8px] text-white/20">
            Owner count: {account.ownerCount} · Ledger: {account.evidence.ledgerIndex ?? '—'}
          </div>
        </>
      )}
    </div>
  );
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

  const [companySnapshot, setCompanySnapshot] = useState<CompanyFinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanyData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/finance/xrpl?mode=company', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Konnte Company Finance nicht laden.');
      setCompanySnapshot(body);
    } catch (err) {
      setCompanySnapshot(null);
      setError(err instanceof Error ? err.message : 'Konnte Company Finance nicht laden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const successfulRecentTreasury = useMemo(
    () => (companySnapshot?.treasury?.transactions || []).filter((tx) => tx.validated && (!tx.result || tx.result === 'tesSUCCESS')).length,
    [companySnapshot],
  );

  if (!pane) return null;

  const treasury = companySnapshot?.treasury;
  const hotMinter = companySnapshot?.hotMinter;
  const originNft = companySnapshot?.originNft;
  const totals = companySnapshot?.totals;

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
                <Eye size={11} /> XRPL Mainnet · Saimôr company capital
              </div>
              <h2 className="mt-3 text-[26px] font-medium tracking-[-0.04em] text-white/90">Saimôr Finance</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/36">
                Company-owned XRPL accounts. MÔRA darf Bestand, Aktivität und Risiken verstehen; Signieren und Schlüssel bleiben auf dem Ledger und vollständig außerhalb des OS.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatePill tone="safe">Read only</StatePill>
                <StatePill>Company owned</StatePill>
                <StatePill>Ledger self custody</StatePill>
                <StatePill tone="warn">External signing</StatePill>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadCompanyData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] text-white/52 transition-colors hover:bg-white/[0.06] disabled:opacity-35"
            >
              <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Aktualisieren
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-300/16 bg-red-500/[0.06] px-4 py-3 text-xs text-red-200/75">{error}</div>
        )}

        {companySnapshot && (
          <>
            <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-white/76">
                <HardDrive size={14} className="text-emerald-200/60" /> Company Accounts
              </div>
              <p className="mt-1 text-[9px] text-white/28">
                Treasury ≠ Hot Minter. Hot Minter ist operativ für NFT-Minting, nicht die Treasury.
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <AccountCard
                  account={treasury ?? null}
                  title="SAIMÔR · 111 Treasury"
                  description="Sovereign treasury, read-only"
                />
                <AccountCard
                  account={hotMinter ?? null}
                  title="Origin Hot Minter"
                  description="Operational wallet, NOT treasury"
                />
              </div>

              {totals && (
                <div className="mt-4 rounded-xl border border-emerald-300/[0.08] bg-emerald-400/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-emerald-100/34">Total Company XRP</div>
                      <div className="mt-1 text-[22px] font-medium tracking-[-0.04em] text-white/82">
                        {formatNumber(totals.companyXrp)} <span className="text-[12px] text-white/36">XRP</span>
                      </div>
                    </div>
                    <div className="text-right text-[9px] text-white/24">
                      <div>Treasury: {totals.treasuryXrp !== null ? formatNumber(totals.treasuryXrp) : '—'}</div>
                      <div>Hot Minter: {totals.hotMinterXrp !== null ? formatNumber(totals.hotMinterXrp) : '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {originNft && (
              <section className="rounded-[22px] border border-violet-300/[0.09] bg-[radial-gradient(circle_at_90%_0%,rgba(139,92,246,0.06),transparent_30%),rgba(0,0,0,0.14)] p-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/76">
                  <Sparkles size={14} className="text-violet-200/60" /> ORIGIN NFT #111
                </div>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-medium text-white/72">{originNft.name}</div>
                    <div className="mt-1 font-mono text-[8px] text-white/24 break-all">{originNft.nftokenId}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatePill tone={originNft.status === 'LIVE_GENESIS_MAINNET_PROOF' ? 'safe' : 'warn'}>
                      {originNft.status.replace(/_/g, ' ')}
                    </StatePill>
                    {originNft.verified && <StatePill tone="safe">Verified</StatePill>}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-[10px] text-white/42 sm:grid-cols-2">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/24">Issuer</div>
                    <div className="mt-0.5 font-mono text-white/52">{shortAddress(originNft.issuer)}</div>
                    <div className="text-[8px] text-white/20">(Hot Minter, NOT Treasury)</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/24">Flags (XLS-20)</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {originNft.flagsDescription.onlyXrp && <StatePill>OnlyXRP</StatePill>}
                      {originNft.flagsDescription.transferable && <StatePill>Transferable</StatePill>}
                      {originNft.flagsDescription.mutable && <StatePill>Mutable</StatePill>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/24">Transfer Fee</div>
                    <div className="mt-0.5 text-white/52">{originNft.transferFeePercent}%</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/24">Art IPFS</div>
                    <div className="mt-0.5 font-mono text-[8px] text-white/36 truncate">{originNft.artIpfs}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-amber-300/[0.08] bg-amber-400/[0.02] p-3">
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-amber-200/48">
                    <LockKeyhole size={10} /> Minting Status: {companySnapshot.mintingStatus.range}
                  </div>
                  <div className="mt-1 text-[10px] text-white/52">
                    {companySnapshot.mintingStatus.status.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-1 text-[9px] text-white/28">
                    {companySnapshot.mintingStatus.note}
                  </div>
                </div>
              </section>
            )}

            {treasury && treasury.transactions.length > 0 && (
              <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-white/76">Treasury Activity</div>
                    <div className="mt-1 text-[9px] text-white/28">{successfulRecentTreasury} validierte erfolgreiche Einträge</div>
                  </div>
                  <Database size={13} className="text-white/20" />
                </div>

                <div className="mt-3 divide-y divide-white/[0.05]">
                  {treasury.transactions.slice(0, 6).map((tx) => {
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
                </div>
              </section>
            )}
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
