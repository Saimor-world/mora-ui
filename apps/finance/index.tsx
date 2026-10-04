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
  Tag,
  Unplug,
  WalletCards,
  Banknote,
  Building2,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CAPITAL_OPPORTUNITIES } from '@/lib/capital/opportunities';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { KNOWN_ACCOUNTS, ORIGIN_NFT, MINTING_STATUS } from '@/lib/finance/types';

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
  feeDrops?: string;
  feeXrp?: number;
  classification?: string;
  isRevenue?: boolean;
  isFounderFunding?: boolean;
  result: string;
  validated: boolean;
};

type WalletBreakdown = {
  targetAllocationXrp: number | null;
  founderFundingXrp: number;
  initialAllocationFundingXrp: number | null;
  topUpFundingXrp: number | null;
  externalDustXrp: number;
  realizedSalesXrp: number;
  totalFeesXrp: number;
  ledgerBalanceXrp: number;
};

type NftSellOffer = {
  offerId: string;
  nftokenId: string;
  owner: string;
  destination: string | null;
  amountDrops: string;
  amountXrp: number;
  flags: number;
  expiration: number | null;
  ledgerIndex: number | null;
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
  breakdown?: WalletBreakdown | null;
  evidence: { source: string; fetchedAt: string; ledgerIndex: number | null; validatedLedger: number | null; confidence: string };
  error: string | null;
};

type OpenListing = {
  type: string;
  offerId: string;
  nftokenId: string;
  nftName: string;
  askingPriceXrp: number;
  seller: string;
  destination: string | null;
  expiration: string | null;
  evidence: { source: string; fetchedAt: string; ledgerIndex: number | null; confidence: string };
  note: string;
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
  sellOffers: NftSellOffer[];
  evidence: { source: string; fetchedAt: string; confidence: string } | null;
};

type ProviderStatus = {
  status: 'connected' | 'not_connected' | 'error';
  lastSync?: string;
};

type CompanyFinanceSnapshot = {
  mode: 'company';
  network: string;
  accessMode: string;
  reserve: { baseXrp: number; incrementXrp: number; validatedLedger: number };
  treasury: AccountSnapshot | null;
  hotMinter: AccountSnapshot | null;
  originNft: OriginNftSnapshot;
  openListings: OpenListing[];
  aggregates: {
    cashTotalXrp: number;
    availableTotalXrp: number;
    reservedTotalXrp: number;
    treasuryXrp: number | null;
    hotMinterXrp: number | null;
    aggregateAskingPriceXrp: number;
    openListingsCount: number;
    floorPriceXrp: number | null;
    realizedSalesXrp: number;
    note: string;
  };
  mintingStatus: { range: string; status: string; note: string };
  providers: {
    xrpl: ProviderStatus;
    bank_psd2: ProviderStatus;
    revolut_business: ProviderStatus;
    bitvavo: ProviderStatus;
    xtb: ProviderStatus;
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE');
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

function StatePill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'safe' | 'warn' | 'neutral' | 'info' | 'muted' }) {
  const classes = tone === 'safe'
    ? 'border-emerald-300/14 bg-emerald-400/[0.055] text-emerald-100/68'
    : tone === 'warn'
      ? 'border-amber-300/12 bg-amber-400/[0.045] text-amber-100/58'
      : tone === 'info'
        ? 'border-violet-300/12 bg-violet-400/[0.045] text-violet-100/58'
        : tone === 'muted'
          ? 'border-white/[0.05] bg-white/[0.015] text-white/28'
          : 'border-white/[0.07] bg-white/[0.025] text-white/42';

  return <span className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${classes}`}>{children}</span>;
}

function classificationLabel(classification?: string) {
  switch (classification) {
    case 'founder_funding':
      return 'Founder Funding (Capital)';
    case 'external_dust':
      return 'External Dust (Ignored)';
    case 'nft_mint':
      return 'NFTokenMint';
    case 'nft_create_offer':
      return 'NFTokenCreateOffer';
    case 'nft_sale_accepted':
      return 'NFTokenAcceptOffer (Sale)';
    case 'nft_offer_cancelled':
      return 'NFTokenCancelOffer';
    case 'outgoing_payment':
      return 'Outgoing Payment';
    default:
      return null;
  }
}

function AccountCard({ account, title }: { account: AccountSnapshot | null; title: string }) {
  if (!account) {
    return (
      <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="text-[11px] font-medium text-white/52">{title}</div>
        <div className="mt-3 text-[10px] text-amber-200/60">Not available</div>
      </div>
    );
  }

  const hasError = account.error !== null;
  const xrp = account.xrp ?? 0;
  const availableXrp = account.availableXrp ?? 0;
  const lastTx = account.transactions[0] || null;
  const breakdown = account.breakdown ?? null;

  return (
    <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-white/72">{account.role.label}</div>
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

          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
            <div className="rounded-lg border border-emerald-300/[0.06] bg-emerald-400/[0.02] p-2">
              <div className="text-emerald-100/36">Available</div>
              <div className="mt-0.5 font-medium text-white/68">{formatNumber(availableXrp)} XRP</div>
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
              <div className="text-white/28">Reserved</div>
              <div className="mt-0.5 font-medium text-white/52">{formatNumber(account.reserve.requiredXrp)} XRP</div>
            </div>
          </div>

          {breakdown && (
            <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/20 p-2.5 space-y-1 text-[8px] text-white/36">
              {breakdown.targetAllocationXrp !== null && (
                <div className="flex justify-between">
                  <span>Allocation target</span>
                  <span className="font-mono text-white/64">{formatNumber(breakdown.targetAllocationXrp)} XRP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Founder funding (not revenue)</span>
                <span className="font-mono text-white/64">
                  {formatNumber(breakdown.founderFundingXrp)} XRP
                  {breakdown.initialAllocationFundingXrp !== null && breakdown.topUpFundingXrp
                    ? ` (${formatNumber(breakdown.initialAllocationFundingXrp)} + ${formatNumber(breakdown.topUpFundingXrp)} top-up)`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>External dust (excluded)</span>
                <span className="font-mono text-white/48">{formatNumber(breakdown.externalDustXrp)} XRP</span>
              </div>
              {breakdown.totalFeesXrp > 0 && (
                <div className="flex justify-between">
                  <span>Network fees</span>
                  <span className="font-mono text-white/48">-{formatNumber(breakdown.totalFeesXrp)} XRP</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/[0.05] pt-1">
                <span>Current ledger balance</span>
                <span className="font-mono font-medium text-white/76">{formatNumber(breakdown.ledgerBalanceXrp)} XRP</span>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1.5 text-[8px] text-white/28">
            <div className="flex justify-between">
              <span>Owner count</span>
              <span className="text-white/48">{account.ownerCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Ledger</span>
              <span className="font-mono text-white/48">{account.evidence.ledgerIndex ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Last sync</span>
              <span className="text-white/48">{formatTime(account.evidence.fetchedAt)}</span>
            </div>
            {lastTx && (
              <div className="flex justify-between">
                <span>Last tx</span>
                <span className="font-mono text-white/36">{lastTx.hash.slice(0, 8)}…</span>
              </div>
            )}
          </div>

          <div className="mt-2 text-[7px] text-white/16">
            Source: {account.evidence.source}
          </div>
        </>
      )}
    </div>
  );
}

function ActivitySection({ account, title }: { account: AccountSnapshot | null | undefined; title: string }) {
  if (!account || account.transactions.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-white/76">{title}</div>
          <div className="mt-1 text-[9px] text-white/28">Recent validated ledger events from {account.role.label}</div>
        </div>
        <Database size={13} className="text-white/20" />
      </div>

      <div className="mt-3 divide-y divide-white/[0.05]">
        {account.transactions.slice(0, 8).map((tx) => {
          const DirectionIcon = tx.direction === 'in' ? ArrowDownLeft : ArrowUpRight;
          const classLabel = classificationLabel(tx.classification);
          return (
            <div key={`${tx.hash}-${tx.ledgerIndex}`} className="flex items-center gap-3 py-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] ${tx.direction === 'in' ? 'text-emerald-200/60' : 'text-amber-200/55'}`}>
                <DirectionIcon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-white/66">{tx.type}</span>
                  <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">{tx.direction}</span>
                  {classLabel && <StatePill tone={tx.classification === 'external_dust' ? 'muted' : tx.isFounderFunding ? 'info' : 'neutral'}>{classLabel}</StatePill>}
                </div>
                <div className="mt-0.5 truncate font-mono text-[8px] text-white/20">
                  {tx.hash ? `${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}` : `Ledger ${tx.ledgerIndex ?? '—'}`}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[10px] text-white/52">{describeAmount(tx.amount)}</div>
                {typeof tx.feeXrp === 'number' && tx.feeXrp > 0 && tx.direction === 'out' && (
                  <div className="font-mono text-[8px] text-amber-200/40">Fee: {formatNumber(tx.feeXrp)} XRP</div>
                )}
                <div className="mt-0.5 text-[8px] text-white/18">{tx.closeTimeIso ? formatDate(tx.closeTimeIso) : tx.result || 'validated'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProviderCard({ name, icon: Icon, status }: { name: string; icon: React.ElementType; status: ProviderStatus }) {
  const isConnected = status.status === 'connected';
  const isError = status.status === 'error';

  return (
    <div className={`rounded-xl border p-3 ${isConnected ? 'border-emerald-300/[0.08] bg-emerald-400/[0.02]' : isError ? 'border-red-300/[0.08] bg-red-400/[0.02]' : 'border-white/[0.05] bg-white/[0.01]'}`}>
      <div className="flex items-center gap-2">
        <Icon size={12} className={isConnected ? 'text-emerald-200/60' : isError ? 'text-red-200/60' : 'text-white/24'} />
        <span className={`text-[10px] ${isConnected ? 'text-emerald-100/60' : isError ? 'text-red-100/60' : 'text-white/32'}`}>{name}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400/60' : isError ? 'bg-red-400/60' : 'bg-white/16'}`} />
        <span className={`text-[8px] uppercase tracking-[0.1em] ${isConnected ? 'text-emerald-100/48' : isError ? 'text-red-100/48' : 'text-white/20'}`}>
          {status.status.replace('_', ' ')}
        </span>
      </div>
      {status.lastSync && (
        <div className="mt-1 text-[7px] text-white/20">{formatTime(status.lastSync)}</div>
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

  if (!pane) return null;

  const treasury = companySnapshot?.treasury;
  const hotMinter = companySnapshot?.hotMinter;
  const originNft = companySnapshot?.originNft;
  const aggregates = companySnapshot?.aggregates;
  const openListings = companySnapshot?.openListings || [];
  const providers = companySnapshot?.providers;

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
                Live company financial state from XRPL mainnet. Read-only — MÔRA may explain changes but never signs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatePill tone="safe">Read only</StatePill>
                <StatePill>Company owned</StatePill>
                {companySnapshot && <StatePill tone="info">Ledger {companySnapshot.reserve.validatedLedger}</StatePill>}
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
                Treasury ≠ Hot Minter. Hot Minter is operational for NFT minting, not the treasury.
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <AccountCard account={treasury ?? null} title="Treasury" />
                <AccountCard account={hotMinter ?? null} title="Hot Minter" />
              </div>

              {aggregates && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-300/[0.08] bg-emerald-400/[0.02] p-3">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-emerald-100/36">Cash Total</div>
                    <div className="mt-1 text-[18px] font-medium text-white/82">{formatNumber(aggregates.cashTotalXrp)} XRP</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-white/28">Available</div>
                    <div className="mt-1 text-[18px] font-medium text-white/68">{formatNumber(aggregates.availableTotalXrp)} XRP</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-white/28">Reserved</div>
                    <div className="mt-1 text-[18px] font-medium text-white/52">{formatNumber(aggregates.reservedTotalXrp)} XRP</div>
                  </div>
                </div>
              )}
            </section>

            {openListings.length > 0 && (
              <section className="rounded-[22px] border border-amber-300/[0.09] bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.06),transparent_30%),rgba(0,0,0,0.14)] p-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/76">
                  <Tag size={14} className="text-amber-200/60" /> Open Listings
                </div>
                <p className="mt-1 text-[9px] text-amber-200/48">
                  Asking prices are NOT counted as assets. Only realized sales count.
                </p>

                <div className="mt-3 space-y-2">
                  {openListings.map((listing) => (
                    <div key={listing.offerId} className="rounded-xl border border-amber-300/[0.06] bg-amber-400/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-medium text-white/68">{listing.nftName}</div>
                          <div className="mt-0.5 font-mono text-[8px] text-white/24">{shortAddress(listing.nftokenId)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] font-medium text-amber-100/72">{formatNumber(listing.askingPriceXrp)} XRP</div>
                          <div className="text-[8px] text-amber-100/36">asking price</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[8px] text-white/28">
                        <span>Seller: {shortAddress(listing.seller)}</span>
                        {listing.expiration && <span>· Expires: {formatDate(listing.expiration)}</span>}
                      </div>
                      <div className="mt-1 text-[7px] text-white/16">Source: {listing.evidence.source}</div>
                    </div>
                  ))}
                </div>

                {aggregates && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-300/[0.06] bg-amber-400/[0.015] p-2 text-[9px]">
                    <span className="text-amber-100/40">Aggregate asking price (NOT an asset)</span>
                    <span className="font-medium text-amber-100/60">{formatNumber(aggregates.aggregateAskingPriceXrp)} XRP</span>
                  </div>
                )}
              </section>
            )}

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

            {providers && (
              <section className="rounded-[22px] border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/76">
                  <Link2 size={14} className="text-white/40" /> Providers
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  <ProviderCard name="XRPL" icon={Coins} status={providers.xrpl} />
                  <ProviderCard name="Bank (PSD2)" icon={Building2} status={providers.bank_psd2} />
                  <ProviderCard name="Revolut" icon={CreditCard} status={providers.revolut_business} />
                  <ProviderCard name="Bitvavo" icon={TrendingUp} status={providers.bitvavo} />
                  <ProviderCard name="XTB" icon={Banknote} status={providers.xtb} />
                </div>
              </section>
            )}

            <ActivitySection account={treasury} title="Treasury Activity" />
            <ActivitySection account={hotMinter} title="Hot Minter Activity" />
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
            MÔRA reads evidence-backed finance state and may explain changes. Asking prices are NOT assets. Only realized sales count.
          </p>
        </section>
      </div>
    </GlassPanel>
  );
}
