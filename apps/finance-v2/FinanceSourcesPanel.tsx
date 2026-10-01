'use client';

import React, { useState } from 'react';
import { Cable, CircleAlert, KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useConnectCompanyBitvavo, useFinanceConnections, useFinanceSources, useOpenBankingInstitutions, useStartCompanyOpenBanking, useSyncFinanceConnection } from '@/lib/queries/useFinanceSources';

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
  const bitvavo = useConnectCompanyBitvavo(companyId);
  const [bitvavoKey, setBitvavoKey] = useState('');
  const [bitvavoSecret, setBitvavoSecret] = useState('');
  const [bitvavoAttested, setBitvavoAttested] = useState(false);
  const institutions = useOpenBankingInstitutions('DE');
  const startBank = useStartCompanyOpenBanking(companyId);
  const syncConnection = useSyncFinanceConnection(companyId);
  const [institutionId, setInstitutionId] = useState('');
  const [bankAttested, setBankAttested] = useState(false);
  const bankAuthorizationUrl = startBank.data?.data?.authorization_url as string | undefined;

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
                  {connection.provider === 'gocardless_bank_data' && connection.status !== 'revoked' && (
                    <button
                      type="button"
                      disabled={syncConnection.isPending}
                      onClick={() => syncConnection.mutate(connection.id)}
                      className="mt-2 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[9px] text-white/44 disabled:opacity-35"
                    >
                      {syncConnection.isPending ? 'Synchronisiert…' : 'Bankstatus synchronisieren'}
                    </button>
                  )}
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


      {!connected.has('gocardless_bank_data') && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
          <div className="text-xs font-medium text-white/66">Bankkonto über PSD2 verbinden</div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/32">
            Die Bank-Anmeldung findet beim regulierten Open-Banking-Flow statt. SAIMÔR erhält danach Konten, Salden und Transaktionen, aber kein Online-Banking-Passwort.
          </p>
          <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <input type="checkbox" checked={bankAttested} onChange={(event) => setBankAttested(event.target.checked)} />
            <span>Ich bestätige, dass die auszuwählende Bankverbindung SAIMÔR gehört.</span>
          </label>
          {institutions.isError ? (
            <div role="alert" className="mt-3 text-[10px] text-amber-100/58">
              Open Banking ist in CORE noch nicht mit Provider-Credentials konfiguriert.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Bank auswählen"
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white/72"
              >
                <option value="">Bank auswählen…</option>
                {(institutions.data?.institutions || []).map((institution) => (
                  <option key={institution.id} value={institution.id}>{institution.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!institutionId || !bankAttested || startBank.isPending}
                onClick={() => startBank.mutate({ institutionId, label: 'SAIMÔR Bank' })}
                className="rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/72 disabled:opacity-35"
              >
                {startBank.isPending ? 'Consent wird erstellt…' : 'Bankfreigabe starten'}
              </button>
            </div>
          )}
          {startBank.error && <div role="alert" className="mt-2 text-[10px] text-red-100/66">{startBank.error.message}</div>}
          {bankAuthorizationUrl && (
            <a
              href={bankAuthorizationUrl}
              rel="noreferrer"
              className="mt-3 inline-flex rounded-xl border border-emerald-300/18 px-4 py-2.5 text-xs font-medium text-emerald-100/76"
            >
              Zur sicheren Bankfreigabe
            </a>
          )}
        </div>
      )}

      {!connected.has('bitvavo') && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white/66">
            <KeyRound size={12} /> Bitvavo read-only verbinden
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/32">
            Verwende einen API-Key mit ausschließlich View/Read-Zugriff. SAIMÔR implementiert hier keine Order-, Trade- oder Withdrawal-Methode.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              type="password"
              autoComplete="off"
              value={bitvavoKey}
              onChange={(event) => setBitvavoKey(event.target.value)}
              aria-label="Bitvavo API Key"
              placeholder="API Key"
              className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white/72 outline-none"
            />
            <input
              type="password"
              autoComplete="off"
              value={bitvavoSecret}
              onChange={(event) => setBitvavoSecret(event.target.value)}
              aria-label="Bitvavo API Secret"
              placeholder="API Secret"
              className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white/72 outline-none"
            />
          </div>
          <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <input type="checkbox" checked={bitvavoAttested} onChange={(event) => setBitvavoAttested(event.target.checked)} />
            <span>Ich bestätige, dass dieses Bitvavo-Konto SAIMÔR gehört und der verwendete Key nur Leserechte haben soll.</span>
          </label>
          {bitvavo.error && <div role="alert" className="mt-2 text-[10px] text-red-100/66">{bitvavo.error.message}</div>}
          <button
            type="button"
            disabled={!bitvavoAttested || bitvavoKey.length < 16 || bitvavoSecret.length < 16 || bitvavo.isPending}
            onClick={() => bitvavo.mutate(
              { apiKey: bitvavoKey, apiSecret: bitvavoSecret, label: 'SAIMÔR Bitvavo' },
              { onSuccess: () => { setBitvavoKey(''); setBitvavoSecret(''); } },
            )}
            className="mt-3 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/72 disabled:opacity-35"
          >
            {bitvavo.isPending ? 'Prüft echten Account…' : 'Bitvavo verbinden'}
          </button>
        </div>
      )}
    </section>
  );
}
