'use client';

import React from 'react';
import { Cable, CircleAlert, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useFinanceConnections, useFinanceSources } from '@/lib/queries/useFinanceSources';

const LABELS: Record<string, string> = {
  gocardless_bank_data: 'Open Banking / PSD2',
  finapi: 'finAPI',
  revolut_business: 'Revolut Business',
  xrpl: 'XRPL',
  bitvavo: 'Bitvavo',
  xtb_statement: 'XTB Statement',
  broker_statement: 'Broker Statement',
  physical_asset: 'Physische Assets',
};

export default function FinanceSourcesPanel({ companyId }: { companyId: string }) {
  const sources = useFinanceSources('company');
  const connections = useFinanceConnections('company', companyId);
  const connected = new Map((connections.data?.connections || []).map((item) => [item.provider, item]));

  return (
    <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5" data-testid="finance-sources-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-100/38">
            <Cable size={11} /> Real Sources
          </div>
          <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-white/82">Nur echte Verbindungen.</h3>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/34">
            Eine Quelle erscheint erst als verbunden, wenn CORE tatsächlich Consent, Ledger-Zuordnung,
            API-Verbindung oder einen belegten Import gespeichert hat.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void connections.refetch()}
          disabled={connections.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-[10px] text-white/44 disabled:opacity-35"
        >
          <RefreshCcw size={11} className={connections.isFetching ? 'animate-spin' : ''} /> Sync-Status
        </button>
      </div>

      {(sources.isError || connections.isError) && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/12 bg-red-500/[0.04] px-3 py-2 text-[10px] text-red-100/66">
          <CircleAlert size={12} /> Source-Truth konnte nicht vollständig aus CORE geladen werden.
        </div>
      )}

      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {(sources.data?.sources || []).map((source) => {
          const connection = connected.get(source.id);
          const isConnected = connection?.status === 'connected';
          return (
            <div key={source.id} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-white/68">{LABELS[source.id] || source.label}</div>
                <div className={isConnected
                  ? 'rounded-full border border-emerald-300/12 bg-emerald-400/[0.05] px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-emerald-100/58'
                  : 'rounded-full border border-white/[0.07] px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-white/28'
                }>
                  {connection?.status || 'nicht verbunden'}
                </div>
              </div>
              <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-white/24">{source.mode}</div>
              {connection ? (
                <div className="mt-3 space-y-1 text-[10px] text-white/34">
                  <div>{connection.label}</div>
                  <div>{connection.account_count} Account{connection.account_count === 1 ? '' : 's'}</div>
                  <div>{connection.last_synced_at ? 'Sync ' + new Date(connection.last_synced_at).toLocaleString('de-DE') : 'Noch kein erfolgreicher Sync'}</div>
                  {connection.last_error_code && <div className="text-amber-100/52">Fehler: {connection.last_error_code}</div>}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-white/28">
                  <ShieldCheck size={11} /> Keine Daten und kein Saldo werden angenommen.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
