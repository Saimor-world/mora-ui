"use client";

import { FormEvent, useRef, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, Database, Fingerprint, LockKeyhole, Search, ShieldAlert } from "lucide-react";
import { CoreError } from "@/lib/api/http";
import {
  inspectRealTestnetTransaction,
  type TestnetTransferObservation,
} from "@/lib/api/xrplCommerceInspector";

const HASH = /^[0-9a-fA-F]{64}$/;

function LabelledEvidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-white/[.07] py-3 last:border-b-0 sm:grid sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
      <dt className="mb-1 text-[11px] text-white/40 sm:mb-0">{label}</dt>
      <dd className="break-all font-mono text-[11px] leading-relaxed text-emerald-100/85">{value}</dd>
    </div>
  );
}

/** Public OS demo surface, but the CORE call itself requires a verified SYSTEM_OWNER. */
export function XRPLTestnetInspector() {
  const [hash, setHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [observation, setObservation] = useState<TestnetTransferObservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observedHash, setObservedHash] = useState("");
  const requestVersion = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setError(null);
    setObservation(null);
    setObservedHash("");
    if (!HASH.test(hash.trim())) {
      setError("Der Transaktionshash muss genau 64 hexadezimale Zeichen enthalten.");
      return;
    }
    const thisRequest = ++requestVersion.current;
    setIsLoading(true);
    try {
      const result = await inspectRealTestnetTransaction(hash.trim());
      if (requestVersion.current !== thisRequest) return;
      setObservation(result);
      setObservedHash(hash.trim().toUpperCase());
    } catch (cause) {
      if (requestVersion.current !== thisRequest) return;
      if (cause instanceof CoreError) {
        if (cause.status === 401 || cause.status === 403) {
          setError("Für echte Testnet-Abfragen brauchst du eine gültige SAIMÔR-System-Owner-Sitzung.");
        } else if (cause.status === 404) {
          setError("Der lesende CORE-Testnet-Inspektor ist noch nicht aktiviert oder bereitgestellt.");
        } else {
          setError(`CORE konnte diesen Testnet-Nachweis nicht bestätigen: ${cause.message}`);
        }
      } else {
        setError(cause instanceof Error ? cause.message : "Testnet-Inspektion fehlgeschlagen.");
      }
    } finally {
      if (requestVersion.current === thisRequest) setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="xrpl-real-inspector-heading" className="mt-6 overflow-hidden rounded-[26px] border border-emerald-200/[.14] bg-[#101918]/95">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.07] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200/[.16] bg-emerald-200/[.045] text-emerald-200">
            <Activity size={19} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-emerald-200/55">03 / Read-only Testnet</p>
            <h2 id="xrpl-real-inspector-heading" className="mt-1 text-lg font-light tracking-[-.03em]">Echten Ledger-Nachweis prüfen</h2>
            <p className="mt-2 max-w-[650px] text-xs leading-[1.7] text-white/40">
              Separater System-Owner-Inspektor. Nur öffentliche Testnet-Transaktionsdaten, niemals eine Wallet verbinden oder Schlüssel eingeben.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-200/20 bg-amber-200/[.06] px-3 py-1.5 text-[10px] uppercase tracking-[.14em] text-amber-100/75">
          CORE-Featureflag erforderlich
        </span>
      </div>

      <div className="grid gap-7 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_.82fr]">
        <div className="min-w-0">
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="xrpl-testnet-hash" className="block text-[11px] font-medium text-white/65">
              Testnet-Transaktionshash (64 Zeichen)
            </label>
            <input
              id="xrpl-testnet-hash"
              data-testid="testnet-hash-input"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={64}
              value={hash}
              onChange={(event) => { requestVersion.current += 1; setIsLoading(false); setHash(event.target.value); setError(null); setObservation(null); }}
              placeholder="64-stelliger bestätigter Testnet-Hash"
              className="w-full min-w-0 rounded-xl border border-white/[.14] bg-[#070d0d] px-4 py-3.5 font-mono text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-200/40"
            />
            <button
              type="submit"
              disabled={isLoading || !HASH.test(hash.trim())}
              className="flex min-h-[47px] w-full items-center justify-center gap-2 rounded-full bg-emerald-200 px-5 text-xs font-semibold text-[#0d2920] transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Search size={15} /> {isLoading ? "CORE prüft das Testnet …" : "Echten Testnet-Hash prüfen"}
            </button>
          </form>

          <p className="mt-4 text-[11px] leading-[1.8] text-white/40">
            Verwendet die authentifizierte CORE-API und einen festen XRPL-Testnet-RPC.
            Eine erfolgreiche Ledger-Abfrage bedeutet <strong className="font-medium text-white/70">nicht</strong>,
            dass eine SAIMÔR-Bestellung bezahlt wurde.
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/20 bg-amber-200/[.05] p-4 text-xs leading-[1.7] text-amber-100/85">
              <ShieldAlert className="mt-0.5 shrink-0" size={17} /> <span>{error}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-white/[.07] bg-[#0a1110] px-5 py-4" aria-live="polite">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/70">
            <Database size={14} className="text-emerald-200/60" /> Ledger-Beobachtung
          </div>
          {!observation ? (
            <div className="flex min-h-[125px] flex-col justify-center gap-2 text-xs leading-[1.8] text-white/35">
              <Fingerprint size={24} className="mb-1 text-white/25" />
              {isLoading ? "Validierung des RPC-Nachweises läuft …" : "Noch keine echte Testnet-Abfrage erfolgreich abgeschlossen."}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-emerald-200">
                <CheckCircle2 size={16} /> Validierter Testnet-Transfer beobachtet
              </div>
              <dl>
                <LabelledEvidence label="Netzwerk" value={observation.network} />
                <LabelledEvidence label="Ledger" value={String(observation.ledger_index)} />
                <LabelledEvidence label="Ledger-Hash" value={observation.ledger_hash} />
                <LabelledEvidence label="Betrag" value={`${observation.delivered_drops} Drops (Testnet)`} />
                <LabelledEvidence label="Absender" value={observation.sender} />
                <LabelledEvidence label="Empfänger" value={observation.destination} />
                <LabelledEvidence label="InvoiceID" value={observation.invoice_id ?? "Keine"} />
                <LabelledEvidence label="DestinationTag" value={observation.destination_tag?.toString() ?? "Keiner"} />
              </dl>
              <a href={`https://testnet.xrpl.org/transactions/${observedHash}`} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-200/80 hover:text-emerald-100">
                Im Testnet-Explorer öffnen <ArrowUpRight size={12} />
              </a>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-white/[.06] px-6 py-4 text-[10px] text-white/40 sm:px-8">
        <LockKeyhole size={13} className="text-emerald-200/60" />
        Kein Kundenauftrag abgeglichen · Keine Finanzbuchung · Keine Produktfreigabe · Keine Mainnet-Verbindung
      </div>
    </section>
  );
}
