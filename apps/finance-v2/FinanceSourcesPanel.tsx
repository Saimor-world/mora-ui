'use client';

import React, { useEffect, useState } from 'react';
import { Cable, CircleAlert, KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
  useConnectCompanyBitvavo,
  useFinanceConnections,
  useFinanceSources,
  useOpenBankingInstitutions,
  useStartCompanyOpenBanking,
  useStartCompanyRevolut,
  useSyncFinanceConnection,
} from '@/lib/queries/useFinanceSources';
import type { FinanceConnection, FinanceSource } from '@/lib/queries/useFinanceSources';

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Freigabe offen', connected: 'Verbunden', reauth_required: 'Neue Freigabe nötig',
  degraded: 'Aktualisierung fehlgeschlagen', revoked: 'Freigabe beendet',
};

export default function FinanceSourcesPanel({ companyId }: { companyId: string }) {
  const sources = useFinanceSources('company');
  const connections = useFinanceConnections('company', companyId);
  const connected = new Set((connections.data?.connections || []).map((item) => item.provider));
  const sourceRows = (sources.data?.sources || []).flatMap<{ source: FinanceSource; connection?: FinanceConnection }>((source) => {
    const matches = (connections.data?.connections || []).filter((item) => item.provider === source.id);
    return matches.length ? matches.map((connection) => ({ source, connection })) : [{ source, connection: undefined }];
  });
  const revolut = useStartCompanyRevolut(companyId);
  const [revolutCallbackUrl, setRevolutCallbackUrl] = useState('/finance/revolut/callback');
  const [revolutClientId, setRevolutClientId] = useState('');
  const [revolutPrivateKey, setRevolutPrivateKey] = useState('');
  const [revolutKeyName, setRevolutKeyName] = useState('');
  const [revolutEnvironment, setRevolutEnvironment] = useState<'production' | 'sandbox'>('production');
  const [revolutAttested, setRevolutAttested] = useState(false);
  const revolutAuthorizationUrl = revolut.data?.data?.authorization_url as string | undefined;
  const revolutConnectionId = revolut.data?.data?.connection_id as string | undefined;

  useEffect(() => {
    setRevolutCallbackUrl(window.location.origin + '/finance/revolut/callback');
  }, []);

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
        {sourceRows.map(({ source, connection }) => {
          const isConnected = connection?.status === 'connected';
          return (
            <div key={`${source.id}:${connection?.id || 'new'}`} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-white/68">{LABELS[source.id] || source.label}</div>
                <div className={isConnected
                  ? 'rounded-full border border-emerald-300/12 bg-emerald-400/[0.05] px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-emerald-100/58'
                  : 'rounded-full border border-white/[0.07] px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-white/28'
                }>
                  {connection ? STATUS_LABELS[connection.status] || connection.status : 'Nicht verbunden'}
                </div>
              </div>
              <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-white/24">{source.mode}</div>
              {connection ? (
                <div className="mt-3 space-y-1 text-[10px] text-white/34">
                  <div>{connection.label}</div>
                  <div>{connection.account_count} Account{connection.account_count === 1 ? '' : 's'}</div>
                  <div>{connection.last_synced_at ? 'Sync ' + new Date(connection.last_synced_at).toLocaleString('de-DE') : 'Noch kein erfolgreicher Sync'}</div>
                  {connection.last_error_code && <div className="text-amber-100/52">Fehler: {connection.last_error_code}</div>}
                  {connection.status === 'pending' && connection.authorization_url && (
                    <a
                      href={connection.authorization_url}
                      rel="noreferrer"
                      onClick={() => {
                        if (connection.provider === 'revolut_business' && typeof window !== 'undefined') {
                          window.sessionStorage.setItem('saimor_revolut_connection_id', connection.id);
                          window.sessionStorage.setItem('saimor_revolut_company_id', companyId);
                        }
                      }}
                      className="mt-2 inline-flex rounded-lg border border-emerald-300/18 px-3 py-2 text-xs text-emerald-100/80"
                    >
                      {connection.provider === 'revolut_business' ? 'Revolut-Freigabe fortsetzen' : 'Bankfreigabe fortsetzen'}
                    </a>
                  )}
                  {connection.status === 'pending' && !connection.authorization_url && (
                    <p>Der Freigabe-Link ist nicht verfügbar. Starte unten eine neue Bankfreigabe.</p>
                  )}
                  {['gocardless_bank_data', 'revolut_business'].includes(connection.provider) && connection.status === 'connected' && (
                    <button
                      type="button"
                      disabled={syncConnection.isPending}
                      onClick={() => syncConnection.mutate(connection.id)}
                      className="mt-2 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[9px] text-white/44 disabled:opacity-35"
                    >
                      {syncConnection.isPending ? 'Synchronisiert…' : 'Daten synchronisieren'}
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
      {syncConnection.error && <div role="alert" className="mt-3 text-xs text-red-100/80">Bankdaten konnten nicht aktualisiert werden: {syncConnection.error.message}. Der letzte bekannte Stand bleibt erhalten.</div>}


      {companyId && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
          <div className="text-xs font-medium text-white/80">Bankkonto verbinden oder Freigabe erneuern</div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/32">
            Die Bank-Anmeldung findet beim regulierten Open-Banking-Flow statt. SAIMÔR erhält danach Konten, Salden und Transaktionen, aber kein Online-Banking-Passwort.
          </p>
          <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <input type="checkbox" checked={bankAttested} onChange={(event) => setBankAttested(event.target.checked)} />
            <span>Ich bestätige, dass die auszuwählende Bankverbindung SAIMÔR gehört.</span>
          </label>
          {institutions.isError ? (
            <div role="alert" className="mt-3 text-[10px] text-amber-100/58">
              Die Bankauswahl konnte nicht geladen werden. {institutions.error.message}
              <button type="button" onClick={() => void institutions.refetch()} className="ml-2 underline">Erneut versuchen</button>
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

      {!connected.has('revolut_business') && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4" data-testid="revolut-business-setup">
          <div className="flex items-center gap-2 text-xs font-medium text-white/72">
            <KeyRound size={12} /> Revolut Business READ verbinden
          </div>
          <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-white/32">
            Registriere zuerst dein öffentliches X.509-Zertifikat und die Callback-URL in Revolut Business.
            SAIMÔR speichert danach nur den passenden privaten Schlüssel verschlüsselt in CORE und fordert ausschließlich den READ-Scope an.
          </p>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-[9px] text-white/34">
            Callback: <span className="font-mono text-white/52">{revolutCallbackUrl}</span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={revolutClientId}
              onChange={(event) => setRevolutClientId(event.target.value)}
              aria-label="Revolut Client ID"
              placeholder="Revolut ClientID"
              autoComplete="off"
              className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white/72 outline-none"
            />
            <select
              value={revolutEnvironment}
              onChange={(event) => setRevolutEnvironment(event.target.value as 'production' | 'sandbox')}
              aria-label="Revolut Umgebung"
              className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white/72"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>

          <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-[10px] text-white/42">
            <span>{revolutKeyName ? `Privater Schlüssel geladen: ${revolutKeyName}` : 'Passenden privaten PEM-Schlüssel auswählen'}</span>
            <input
              type="file"
              accept=".pem,.key,.txt"
              className="max-w-[190px] text-[9px]"
              aria-label="Revolut Private Key Datei"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setRevolutPrivateKey('');
                  setRevolutKeyName('');
                  return;
                }
                const value = await file.text();
                setRevolutPrivateKey(value);
                setRevolutKeyName(file.name);
              }}
            />
          </label>

          <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <input type="checkbox" checked={revolutAttested} onChange={(event) => setRevolutAttested(event.target.checked)} />
            <span>Ich bestätige, dass dieser Revolut-Business-Zugang SAIMÔR gehört. Es werden ausschließlich READ-Rechte angefordert.</span>
          </label>

          {revolut.error && <div role="alert" className="mt-2 text-[10px] text-red-100/66">{revolut.error.message}</div>}
          <button
            type="button"
            disabled={!revolutCallbackUrl.startsWith('https://') || !revolutAttested || revolutClientId.length < 8 || !revolutPrivateKey.includes('PRIVATE KEY') || revolut.isPending}
            onClick={() => {
              const redirectUri = revolutCallbackUrl;
              revolut.mutate(
                {
                  clientId: revolutClientId,
                  privateKeyPem: revolutPrivateKey,
                  redirectUri,
                  environment: revolutEnvironment,
                  label: 'SAIMÔR Revolut Business',
                },
                {
                  onSuccess: (payload) => {
                    const id = payload?.data?.connection_id;
                    if (id && typeof window !== 'undefined') {
                      window.sessionStorage.setItem('saimor_revolut_connection_id', id);
                      window.sessionStorage.setItem('saimor_revolut_company_id', companyId);
                    }
                    setRevolutPrivateKey('');
                    setRevolutKeyName('');
                  },
                },
              );
            }}
            className="mt-3 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.065] px-4 py-2.5 text-xs font-medium text-emerald-100/72 disabled:opacity-35"
          >
            {revolut.isPending ? 'READ-Consent wird vorbereitet…' : 'Revolut READ-Consent starten'}
          </button>

          {revolutAuthorizationUrl && revolutConnectionId && (
            <a
              href={revolutAuthorizationUrl}
              rel="noreferrer"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem('saimor_revolut_connection_id', revolutConnectionId);
                  window.sessionStorage.setItem('saimor_revolut_company_id', companyId);
                }
              }}
              className="ml-2 mt-3 inline-flex rounded-xl border border-emerald-300/18 px-4 py-2.5 text-xs font-medium text-emerald-100/76"
            >
              Bei Revolut freigeben
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
