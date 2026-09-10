'use client';
import React, { useEffect, useState } from 'react';
import { holdScenario } from '@/lib/capital/xrpl-capital';

type Pool = { account: string; name: string; status: string; symbol?: string; issuer?: string; xrp?: number; tokenAmount?: number; feePercent?: number; ownedLp?: number; frozen?: boolean; position?: { xrp: number; token: number; spotEquivalentXrp: number } };
type Capital = { address: string; ledgerIndex: number; fetchedAt: string; balanceXrp: number; spendableXrp: number | null; reserveXrp: number | null; positionsComplete: boolean; pools: Pool[]; baseline: { status: string; investedXrp?: number; spotDifferenceXrp?: number | null } | null };
const fmt = (n?: number | null, digits = 6) => n === null || n === undefined || !Number.isFinite(n) ? 'Nicht verifiziert' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
export default function CapitalYieldPanel({ address }: { address: string }) {
  const [data, setData] = useState<Capital | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [hashInput, setHashInput] = useState('');
  const [deposit, setDeposit] = useState('');
  const [experiment, setExperiment] = useState(5);
  const [ratio, setRatio] = useState(1.2);
  useEffect(() => {
    setData(null); setError(''); setHashInput(''); setDeposit('');
  }, [address]);
  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    fetch('/api/finance/xrpl/capital?address=' + encodeURIComponent(address) + (deposit ? '&deposit=' + encodeURIComponent(deposit) : ''), { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Abfrage fehlgeschlagen'); return body; })
      .then((body) => { if (!controller.signal.aborted && body.address === address) setData(body); })
      .catch((e) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Abfrage fehlgeschlagen'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [address, deposit, refresh]);
  const scenario = holdScenario(experiment, ratio);
  return (
    <section className="rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/30 to-black/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-xs uppercase tracking-widest text-emerald-100/65">XRP CAPITAL · Erträge</div><h3 className="mt-2 text-xl font-medium">Liquidität bereitstellen. In XRP messen.</h3></div>
        <button type="button" disabled={loading} onClick={() => setRefresh((n) => n + 1)} className="rounded-xl border border-white/15 px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Wird geprüft…' : 'Pools aktualisieren'}</button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">AMM-Anteile beteiligen dich an Handelsgebühren. Der Gegenwert und die XRP-Menge können sinken. Die angezeigte Pool-Gebühr ist kein Jahreszins.</p>
      {error && <p role="alert" className="mt-3 text-sm text-amber-100">{error}</p>}
      {data && <p className="mt-3 break-all text-xs text-white/55">Mainnet · Ledger {data.ledgerIndex} · {new Date(data.fetchedAt).toLocaleString('de-DE')} · {address}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[['Bestand', data?.balanceXrp], ['Verfügbar nach Reserve', data?.spendableXrp], ['Gebundene Reserve', data?.reserveXrp]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-black/25 p-4"><div className="text-xs text-white/60">{label}</div><div className="mt-2 text-lg">{fmt(typeof value === 'number' ? value : null)} <span className="text-xs">XRP</span></div></div>)}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {(data?.pools || []).map((pool) => <article key={pool.account} className="rounded-2xl border border-white/10 p-4">
          <h4 className="font-medium">{pool.name}</h4>
          {pool.status !== 'verified' ? <p className="mt-2 text-sm text-amber-100/80">Pool aktuell nicht verifiziert.</p> : <>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt>XRP im Pool</dt><dd>{fmt(pool.xrp, 2)}</dd></div>
              <div className="flex justify-between gap-2"><dt>{pool.symbol} im Pool</dt><dd>{fmt(pool.tokenAmount, 2)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Handelsgebühr</dt><dd>{fmt(pool.feePercent, 3)} %</dd></div>
              <div className="flex justify-between gap-2"><dt>Deine LP-Token</dt><dd>{fmt(pool.ownedLp)}</dd></div>
              <div className="flex justify-between gap-2"><dt>24h-Volumen / Jahresertrag</dt><dd>Nicht verifiziert</dd></div>
            </dl>
            {pool.frozen && <p className="mt-2 text-sm text-red-200">Pool-Asset eingefroren. Kein Einstieg.</p>}
            {!!pool.ownedLp && pool.position && <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
              <div>Anteil: {fmt(pool.position.xrp)} XRP + {fmt(pool.position.token)} {pool.symbol}</div>
              <div className="mt-2">Indikativer Gegenwert: {fmt(pool.position.spotEquivalentXrp)} XRP</div>
              <p className="mt-2 text-xs text-white/60">Bewertung zum Pool-Verhältnis, keine ausführbare Exit-Quote. Slippage, Umtausch und Netzwerkgebühren fehlen. Gebühren sind im Anteil enthalten und werden nicht nochmals als Reward addiert.</p>
            </div>}
          </>}
          <p className="mt-3 break-all font-mono text-xs text-white/50">Pool: {pool.account}</p>
          {pool.issuer && <p className="mt-1 break-all font-mono text-xs text-white/50">Issuer: {pool.issuer}</p>}
          <a href={'https://xrpscan.com/account/' + pool.account} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-emerald-100 underline">Pool im Explorer prüfen</a>
        </article>)}
      </div>
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-amber-100/80">Positionsübersicht unvollständig. Fehlende Daten bedeuten nicht null Bestand.</p>}
      <div className="mt-5 rounded-2xl bg-black/25 p-4">
        <h4 className="font-medium">Performance gegenüber XRP halten</h4>
        <p className="mt-2 text-sm text-white/65">Nach dem ersten einzelnen XRP-Deposit: Transaktions-ID eintragen. Der Einsatz wird anhand der Ledger-Balanceänderung inklusive Netzwerkgebühr geprüft. Weitere LP-Bewegungen sperren den einfachen Vergleich, bis sie abgeglichen sind.</p>
        <label className="mt-3 block text-xs text-white/70">AMMDeposit-Transaktions-ID<input value={hashInput} onChange={(e) => setHashInput(e.target.value)} placeholder="64-stellige öffentliche Transaktions-ID" className="mt-1 w-full rounded-xl bg-black/30 p-3 font-mono text-xs" /></label>
        <button type="button" disabled={!/^[A-Fa-f0-9]{64}$/.test(hashInput.trim()) || loading} onClick={() => setDeposit(hashInput.trim())} className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm disabled:opacity-40">Deposit on-chain prüfen</button>
        {data?.baseline && <div role="status" className="mt-3 text-sm">
          <p>Status: {data.baseline.status === 'verified' ? 'Deposit und unveränderte LP-Menge bestätigt' : data.baseline.status === 'needs_reconciliation' ? 'Weitere Bewegungen oder unvollständige Historie: Vergleich gesperrt' : 'Deposit nicht verifiziert'}</p>
          <p>Eingesetzte XRP: {fmt(data.baseline.investedXrp)}</p>
          <p>Indikative Differenz zu HOLD: {fmt(data.baseline.spotDifferenceXrp)} XRP</p>
          <p className="mt-2 text-xs text-white/60">Unrealisierte Bewertung. Separat verdiente Gebühren und realisierter Netto-Exit sind nicht verifiziert.</p>
        </div>}
      </div>
      <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-950/10 p-4">
        <h4 className="font-medium">Vorbereitung: höchstens 5 XRP in XRP / RLUSD</h4>
        <p className="mt-2 text-sm text-white/70">Ein kleiner Funktionstest, kein belegter Renditevorteil. Einstieg, Ausstieg, Mindest-LP-Menge und Gebühren müssen vor einer Freigabe aktuell geprüft werden. Hier wird keine Transaktion erstellt oder signiert.</p>
        <p className="mt-2 text-sm text-white/70">Ein einzelner XRP-Deposit erhält wirtschaftlich auch RLUSD-Anteile. Der Exit erfolgt durch Einlösen der LP-Token; ein Exit nur in XRP kostet zusätzlich Umtauschgebühren. Es gibt keine feste Laufzeit, aber Liquiditäts- und Issuerrisiken.</p>
        <p className="mt-2 text-sm text-white/70">NFT-Kauf, Mint und Pool-Test haben getrennte Freigaben. Externe Lending- oder Bridge-Angebote sind für diesen ersten Test nicht ausgewählt.</p>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 p-4">
        <h4 className="font-medium">Szenario: Was bleibt in XRP?</h4>
        <p className="mt-2 text-xs text-white/60">Rechenmodell für einen ausgeglichenen XRP/Stablecoin-Pool. Keine Prognose, keine Gebühreneinnahmen, kein Depeg und keine Ein-/Ausstiegskosten berücksichtigt.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Modell-Einsatz in XRP<input type="number" min="0" max="5" step="0.5" value={experiment} onChange={(e) => setExperiment(Math.min(5, Math.max(0, Number(e.target.value))))} className="mt-1 block w-full rounded-xl bg-black/30 p-3" /></label>
          <label className="text-sm">XRP-Kursänderung<select value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="mt-1 block w-full rounded-xl bg-black p-3"><option value={0.5}>−50 %</option><option value={0.8}>−20 %</option><option value={1}>Unverändert</option><option value={1.2}>+20 %</option><option value={2}>+100 %</option></select></label>
        </div>
        {scenario && <div className="mt-3 flex flex-wrap gap-4 text-sm"><span>HOLD: {fmt(scenario.holdXrp)} XRP</span><span>LP-Gegenwert: {fmt(scenario.lpXrp)} XRP</span><span>Differenz: {fmt(scenario.differenceXrp)} XRP</span></div>}
        <a href="https://xrpl.org/docs/concepts/tokens/decentralized-exchange/automated-market-makers" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-white/60 underline">Grundlagen und Risiken auf XRPL.org</a>
      </div>
    </section>
  );
}

