'use client';

import React from 'react';
import { Activity, CircleAlert, Landmark, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';
import {
  financeReadErrorKind,
  type FinanceMoraAccount,
  type FinanceOpenListing,
  useFinanceMoraContext,
} from '@/lib/queries/useFinanceStateFlow';

const ORIGIN_111_ID = '001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87';

function xrp(value?: string | null) {
  if (value == null || value === '') return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${value} XRP`;
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(parsed)} XRP`;
}

function compact(value?: string | null) {
  if (!value) return '—';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function listingLabel(listing: FinanceOpenListing) {
  return listing.nftoken_id === ORIGIN_111_ID ? 'SAIMÔR // ORIGIN #111' : 'XRPL NFT Listing';
}

function WalletCard({
  title,
  account,
  treasury = false,
}: {
  title: string;
  account: FinanceMoraAccount | null;
  treasury?: boolean;
}) {
  if (!account) {
    return (
      <section className="rounded-[26px] border border-white/[0.07] bg-black/14 p-5">
        <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">{title}</div>
        <div className="mt-3 text-sm text-white/42">Noch nicht als CORE-Company-Quelle verbunden.</div>
      </section>
    );
  }

  const wc = account.wallet_classification || {};
  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-black/14 p-5" data-testid={treasury ? 'core-treasury-card' : 'core-hot-minter-card'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">{title}</div>
          <div className="mt-2 text-xl font-medium tracking-[-0.035em] text-white/88">
            {account.observed_balance ? xrp(account.observed_balance.value) : xrp(wc.ledger_balance_xrp)}
          </div>
          <div className="mt-1 font-mono text-[9px] text-white/24">{compact(account.address_or_ref)}</div>
        </div>
        <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.04] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-emerald-100/58">
          CORE · read-only
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
        {treasury && (
          <>
            <Metric label="Ziel-Allokation" value={xrp(wc.target_allocation_xrp)} />
            <Metric label="Founder Funding" value={xrp(wc.founder_funding_xrp)} />
            <Metric label="davon Top-up" value={xrp(wc.top_up_funding_xrp)} />
            <Metric label="externer Dust" value={xrp(wc.external_dust_xrp)} />
          </>
        )}
        <Metric label="Reserviert" value={xrp(account.reserved_xrp || wc.reserved_xrp)} />
        <Metric label="Verfügbar" value={xrp(account.available_balance_xrp || wc.available_balance_xrp)} />
        {!treasury && <Metric label="Fees" value={xrp(wc.total_fees_xrp)} />}
        {!treasury && <Metric label="Realisierte Sales" value={xrp(wc.realized_sales_xrp)} />}
      </div>

      {account.delta_since_previous && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2 text-[10px] text-white/46">
          Seit vorherigem belegten Snapshot: <span className="font-medium text-white/72">{xrp(account.delta_since_previous.value)}</span>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5">
      <div className="text-[8px] uppercase tracking-[0.12em] text-white/23">{label}</div>
      <div className="mt-1 tabular-nums text-[11px] text-white/62">{value}</div>
    </div>
  );
}

export default function CoreTreasuryPanel({ companyId }: { companyId: string }) {
  const query = useFinanceMoraContext(companyId, Boolean(companyId));
  const errorKind = financeReadErrorKind(query.error);
  const context = query.data;
  const listings = context?.hot_minter?.open_listings || [];
  const activity = [
    ...(context?.sovereign_treasury?.activity || []),
    ...(context?.hot_minter?.activity || []),
  ]
    .sort((a, b) => String(b.booking_date || '').localeCompare(String(a.booking_date || '')))
    .slice(0, 8);

  if (query.isLoading && !context) {
    return (
      <div className="grid min-h-[180px] place-items-center rounded-[28px] border border-white/[0.06] bg-black/10">
        <div className="text-center">
          <Activity className="mx-auto animate-pulse text-emerald-200/50" size={22} />
          <div className="mt-3 text-[9px] uppercase tracking-[0.18em] text-white/28">CORE Treasury wird geladen</div>
        </div>
      </div>
    );
  }

  if (query.isError && !context) {
    return (
      <div role="alert" className="rounded-[28px] border border-amber-300/[0.10] bg-amber-400/[0.025] p-5">
        <div className="flex items-center gap-2 text-sm text-white/68">
          <CircleAlert size={14} /> Treasury-Kontext nicht verfügbar
        </div>
        <p className="mt-2 text-[11px] text-white/36">
          {['unauthenticated', 'denied', 'scope_mismatch'].includes(errorKind)
            ? 'Dieser Zugriff darf den Finance-Kontext nicht lesen.'
            : 'CORE konnte den Finance-Kontext gerade nicht liefern. Es wird kein Nullsaldo daraus abgeleitet.'}
        </p>
        <button type="button" onClick={() => void query.refetch()} className="mt-3 rounded-xl border border-white/[0.08] px-3 py-2 text-[10px] text-white/48">
          Erneut laden
        </button>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-4" data-testid="core-treasury-panel">
      <section className="rounded-[28px] border border-emerald-300/[0.08] bg-emerald-400/[0.018] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-100/42">
              <ShieldCheck size={11} /> CORE Finance Truth
            </div>
            <h2 className="mt-2 text-xl font-medium tracking-[-0.035em] text-white/86">Treasury und operatives Wallet bleiben getrennt.</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/34">
              Ziel-Allokation, eingezahltes Kapital, Dust, Reserven, Ledger-Balance und Listings werden getrennt klassifiziert. Listings zählen weder als Cash noch als Umsatz.
            </p>
          </div>
          <div className="text-right text-[9px] text-white/28">
            <div>{context.comparison_status === 'compared' ? 'Snapshot-Vergleich aktiv' : 'Erster belegter Snapshot'}</div>
            <div className="mt-1">{context.as_of ? new Date(context.as_of).toLocaleString('de-DE') : 'Zeitpunkt unbekannt'}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <WalletCard title="SAIMÔR · 111 Treasury" account={context.sovereign_treasury} treasury />
        <WalletCard title="SAIMÔR · ORIGIN Hot-Minter" account={context.hot_minter} />
      </div>

      <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-white/64">
              <Landmark size={13} /> ORIGIN Listings
            </div>
            <div className="mt-1 text-[9px] text-white/27">Offene Preise sind Forderungen an den Markt, kein Unternehmensvermögen.</div>
          </div>
          <div className="text-[9px] text-white/28">{listings.length} offen</div>
        </div>

        {listings.length === 0 ? (
          <div className="mt-4 border-t border-white/[0.05] pt-4 text-[11px] text-white/34">
            Kein aktuelles Sell Offer im letzten persistierten CORE-Snapshot. Das allein beweist keinen Verkauf.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {listings.map((listing, index) => (
              <div key={listing.offer_index || `${listing.nftoken_id || 'listing'}-${index}`} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4" data-testid="core-origin-listing">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-white/70">{listingLabel(listing)}</div>
                    <div className="mt-1 font-mono text-[9px] text-white/23">{compact(listing.nftoken_id)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium tabular-nums text-white/84">{xrp(listing.amount_xrp)}</div>
                    <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-amber-100/48">offenes Listing · kein Vermögen</div>
                  </div>
                </div>
                {listing.expiration && (
                  <div className="mt-3 text-[9px] text-white/28">Ablauf: {new Date(listing.expiration).toLocaleString('de-DE')}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/64">
            <ReceiptText size={13} /> Letzte XRPL-Aktivität
          </div>
          {activity.length === 0 ? (
            <div className="mt-4 text-[11px] text-white/32">Noch keine persistierte Activity im CORE-Kontext.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {activity.map((item, index) => (
                <div key={item.hash || index} className="border-t border-white/[0.05] pt-2 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-white/52">{item.description || item.classification || item.type || 'XRPL event'}</span>
                    <span className="font-mono text-white/24">{compact(item.hash)}</span>
                  </div>
                  <div className="mt-1 text-[9px] text-white/24">
                    {item.booking_date ? new Date(item.booking_date).toLocaleString('de-DE') : 'Zeitpunkt unbekannt'}
                    {item.is_revenue ? ' · verifizierter Revenue' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5">
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/64">
            <WalletCards size={13} /> MÔRA Finance Changes
          </div>
          {context.recent_changes.length === 0 ? (
            <div className="mt-4 text-[11px] text-white/32">
              {context.comparison_status === 'compared'
                ? 'Keine belegte Veränderung seit dem vorherigen Snapshot.'
                : 'Für einen Vergleich wird ein zweiter persistierter Snapshot benötigt.'}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {context.recent_changes.slice(0, 8).map((change, index) => (
                <div key={`${change.kind}-${change.account_id || index}`} className="rounded-xl border border-white/[0.05] bg-white/[0.014] px-3 py-2">
                  <div className="text-[10px] text-white/55">{change.kind.replaceAll('_', ' ')}</div>
                  {change.note && <div className="mt-1 text-[9px] leading-relaxed text-white/28">{change.note}</div>}
                  {change.sale_verified === true && <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-emerald-100/55">Ledger sale evidence verified</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {context.disconnected_sources.length > 0 && (
        <section className="rounded-[22px] border border-white/[0.055] bg-white/[0.012] px-4 py-3">
          <div className="text-[8px] uppercase tracking-[0.14em] text-white/22">Noch nicht verbunden</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {context.disconnected_sources.map((source) => (
              <span key={source.id} className="rounded-full border border-white/[0.06] px-2.5 py-1 text-[9px] text-white/34">
                {source.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
