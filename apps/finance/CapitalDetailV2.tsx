'use client';

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Copy, Gem, HardDrive, LockKeyhole, ShieldCheck, Tag } from 'lucide-react';
import { Segmented } from '@/components/universe/app/Tiles';
import type { AccountSnapshot, CompanyFinanceSnapshot, XrplTransaction } from './index';

const nf = (v: number, max = 2) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: max }).format(v);
const short = (v: string) => (v.length < 18 ? v : `${v.slice(0, 6)}…${v.slice(-5)}`);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '–');
const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

const TX_LABEL: Record<string, string> = {
    founder_funding: 'Gründer-Einlage',
    external_dust: 'Kleinstbetrag (ignoriert)',
    nft_mint: 'NFT geprägt',
    nft_create_offer: 'Angebot erstellt',
    nft_sale_accepted: 'Verkauf',
    nft_offer_cancelled: 'Angebot zurückgezogen',
    outgoing_payment: 'Zahlung raus',
};

function amountText(a: unknown) {
    if (typeof a === 'string' && Number.isFinite(Number(a))) return `${nf(Number(a) / 1_000_000, 4)} XRP`;
    if (a && typeof a === 'object' && 'value' in a) return `${(a as any).value} ${(a as any).currency ?? ''}`.trim();
    return '–';
}

function CopyAddr({ value }: { value: string }) {
    const [ok, setOk] = useState(false);
    return (
        <button type="button" className="uv2-capx__addr" title="Adresse kopieren" onClick={() => { void navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); }}>
            {short(value)}{ok ? <Check /> : <Copy />}
        </button>
    );
}

function Account({ acc, kind }: { acc: AccountSnapshot | null; kind: string }) {
    const [open, setOpen] = useState(false);
    if (!acc) return <div className="uv2-capx__acct" data-empty=""><span className="uv2-capx__kind">{kind}</span><p>Nicht verfügbar</p></div>;
    const xrp = acc.xrp ?? 0;
    const avail = acc.availableXrp ?? 0;
    const pct = xrp > 0 ? Math.max(0, Math.min(100, (avail / xrp) * 100)) : 0;
    const live = !acc.error && acc.evidence.confidence === 'live';
    const b = acc.breakdown;
    return (
        <div className="uv2-capx__acct" data-testid={`cap-acct-${kind}`}>
            <div className="uv2-capx__acctHead">
                <span className="uv2-capx__ico">{kind === 'Treasury' ? <ShieldCheck /> : <HardDrive />}</span>
                <span className="uv2-capx__acctName"><b>{acc.role.label}</b><CopyAddr value={acc.address} /></span>
                <span className="uv2-capx__live" data-live={live ? '' : undefined}>{acc.error ? 'Fehler' : live ? 'Live' : 'Älter'}</span>
            </div>
            {acc.error ? <p className="uv2-capx__err">{acc.error}</p> : <>
                <div className="uv2-capx__big">{nf(xrp, 4)}<small>XRP</small></div>
                <div className="uv2-capx__bar" aria-label={`${nf(pct, 0)} % verfügbar`}><i style={{ width: `${pct}%` }} /></div>
                <div className="uv2-capx__legend"><span><em data-c="a" />Verfügbar {nf(avail)}</span><span><em data-c="r" />Reserve {nf(acc.reserve.requiredXrp)}</span></div>
                <div className="uv2-capx__chips">
                    <span>{acc.ownerCount} Objekte</span><span>Ledger {acc.evidence.ledgerIndex ?? '–'}</span><span>{time(acc.evidence.fetchedAt)}</span>
                    {acc.security.masterKeyDisabled && <span data-good="">Hauptschlüssel aus</span>}
                </div>
                {b && (
                    <button type="button" className="uv2-capx__disc" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Herkunft<ChevronDown /></button>
                )}
                {b && open && (
                    <dl className="uv2-capx__rows">
                        {b.targetAllocationXrp !== null && <><dt>Zielverteilung</dt><dd>{nf(b.targetAllocationXrp)}</dd></>}
                        <dt>Gründer-Einlage</dt><dd>{nf(b.founderFundingXrp)}</dd>
                        <dt>Verkäufe (realisiert)</dt><dd>{nf(b.realizedSalesXrp)}</dd>
                        <dt>Kleinstbeträge</dt><dd>{nf(b.externalDustXrp)}</dd>
                        {b.totalFeesXrp > 0 && <><dt>Gebühren</dt><dd>−{nf(b.totalFeesXrp, 6)}</dd></>}
                        <dt><b>Ledger-Stand</b></dt><dd><b>{nf(b.ledgerBalanceXrp, 4)}</b></dd>
                    </dl>
                )}
            </>}
        </div>
    );
}

function TxRow({ tx }: { tx: XrplTransaction }) {
    const In = tx.direction === 'in';
    return (
        <div className="uv2-capx__tx" data-dir={tx.direction}>
            <span className="uv2-capx__txico">{In ? <ArrowDownLeft /> : <ArrowUpRight />}</span>
            <span className="uv2-capx__txt"><b>{(tx.classification && TX_LABEL[tx.classification]) || tx.type}</b><small>{tx.hash ? `${tx.hash.slice(0, 8)}…` : `Ledger ${tx.ledgerIndex ?? '–'}`}</small></span>
            <span className="uv2-capx__amt"><b>{In ? '+' : '−'}{amountText(tx.amount)}</b><small>{day(tx.closeTimeIso)}</small></span>
        </div>
    );
}

function mintLabel(s: string) {
    if (/PAUSED_AWAITING_FINAL_ART/.test(s)) return 'pausiert · wartet auf finale Gestaltung';
    if (/FROZEN|PAUSED/i.test(s)) return 'eingefroren';
    return s.replace(/_/g, ' ').toLowerCase();
}

export function CapitalDetailV2({ snap }: { snap: CompanyFinanceSnapshot }) {
    const [txFrom, setTxFrom] = useState<'treasury' | 'hot'>('treasury');
    const acct = txFrom === 'treasury' ? snap.treasury : snap.hotMinter;
    const txs = acct?.transactions ?? [];
    const o = snap.originNft;
    const listings = snap.openListings ?? [];
    return (
        <div className="uv2-capx" data-testid="finance-detail-v2">
            <div className="uv2-capx__h">Konten</div>
            <div className="uv2-capx__accts">
                <Account acc={snap.treasury} kind="Treasury" />
                <Account acc={snap.hotMinter} kind="Hot Minter" />
            </div>

            <div className="uv2-capx__cols">
                <section className="uv2-capx__card">
                    <div className="uv2-capx__cardHead">
                        <div className="uv2-capx__h">Bewegungen</div>
                        <Segmented value={txFrom} onChange={(v) => setTxFrom(v)} label="Konto" options={[{ id: 'treasury' as const, label: 'Treasury' }, { id: 'hot' as const, label: 'Hot Minter' }]} />
                    </div>
                    {txs.length === 0 ? <p className="uv2-capx__empty">Keine Bewegungen.</p> : txs.slice(0, 6).map((tx) => <TxRow key={`${tx.hash}-${tx.ledgerIndex}`} tx={tx} />)}
                </section>

                <section className="uv2-capx__card">
                    <div className="uv2-capx__cardHead">
                        <div className="uv2-capx__h"><Tag />Angebote <em>{listings.length}</em></div>
                        <span className="uv2-capx__hint">kein Vermögen</span>
                    </div>
                    {listings.length === 0 ? <p className="uv2-capx__empty">Keine offenen Angebote.</p> : (
                        <div className="uv2-capx__listings">
                            {listings.slice(0, 6).map((l) => (
                                <div key={l.offerId} className="uv2-capx__listing uv2-tip" data-tip={`Verkäufer ${l.seller}`} tabIndex={0} aria-label={`${l.nftName}, Verkäufer ${l.seller}`}>
                                    <span className="uv2-capx__gem"><Gem /></span>
                                    <span className="uv2-capx__txt"><b>{l.nftName}</b><small>{l.expiration ? `bis ${day(l.expiration)}` : 'ohne Ablauf'}</small></span>
                                    <span className="uv2-capx__price">{nf(l.askingPriceXrp)}<small>XRP</small></span>
                                </div>
                            ))}
                            <div className="uv2-capx__sum"><span>Summe Angebotspreise</span><b>{nf(snap.aggregates.aggregateAskingPriceXrp)} XRP</b></div>
                        </div>
                    )}
                </section>
            </div>

            {o && (
                <section className="uv2-capx__card uv2-capx__origin" data-testid="finance-origin-v2">
                    <span className="uv2-capx__originArt uv2-tip" data-tip={`NFT ${o.nftokenId}\nBild ${o.artIpfs}\nMetadaten ${o.metadataIpfs}`} tabIndex={0} aria-label={`NFT-ID ${o.nftokenId}`}><Gem /><i>#111</i></span>
                    <div className="uv2-capx__originBody">
                        <div className="uv2-capx__originTop">
                            <b>{o.name}</b>
                            {o.verified && <span className="uv2-capx__live" data-live="">Verifiziert</span>}
                            <span className="uv2-capx__chip">{o.status === 'LIVE_GENESIS_MAINNET_PROOF' ? 'Genesis · Mainnet' : o.status.replace(/_/g, ' ').toLowerCase()}</span>
                        </div>
                        <div className="uv2-capx__chips">
                            {o.flagsDescription.onlyXrp && <span>nur XRP</span>}
                            {o.flagsDescription.transferable && <span>übertragbar</span>}
                            {o.flagsDescription.mutable && <span>änderbar</span>}
                            <span>Gebühr {o.transferFeePercent} %</span>
                            <span>Aussteller {short(o.issuer)}</span>
                            <span>{o.sellOffers.length} Angebote</span>
                        </div>
                        <div className="uv2-capx__frozen"><LockKeyhole /><b>{snap.mintingStatus.range}</b><span>{mintLabel(snap.mintingStatus.status)}</span></div>
                    </div>
                </section>
            )}
            <p className="uv2-capx__foot"><LockKeyhole />Nur lesend · MÔRA erklärt, signiert nie · Quelle {snap.network}, {time(snap.fetchedAt)}</p>
        </div>
    );
}
