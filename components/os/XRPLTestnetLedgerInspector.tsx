"use client";

/** Owner-only XRPL TESTNET ledger observation. This is NOT merchant checkout. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Fingerprint, LockKeyhole, RefreshCcw, Shield, XCircle } from "lucide-react";

import { coreGet, corePost } from "@/lib/api/http";

type Capabilities = {
  enabled: boolean;
  mode: "disabled" | "testnet_ledger_inspection_only";
  network: string;
  can_create_order: false;
  can_write_finance: false;
  can_grant_entitlement: false;
  caller_fields_are_verified_merchant_quote: false;
};
type Inspection = {
  status: "validated_testnet_ledger_match_only";
  network: string;
  tx_hash: string;
  ledger_index: number;
  ledger_hash: string;
  amount_drops: number;
  rpc_origin: string;
  merchant_order_verified: false;
  finance_posting_created: false;
  product_access_granted: false;
  source_evidence_is_live: true;
};
type Form = {
  tx_hash: string;
  invoice_id: string;
  destination: string;
  amount_drops: string;
  destination_tag: string;
  expected_sender: string;
};
const EMPTY: Form = {
  tx_hash: "",
  invoice_id: "",
  destination: "",
  amount_drops: "1000",
  destination_tag: "",
  expected_sender: "",
};
const hex64 = /^[a-fA-F0-9]{64}$/;
const classicAccountShape = /^r[a-zA-Z0-9]{24,39}$/;

function Field({
  name, title, value, placeholder, onChange,
}: {
  name: keyof Form;
  title: string;
  value: string;
  placeholder: string;
  onChange: (field: keyof Form, value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[.15em] text-white/40">{title}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[.10] bg-[#090f10] px-3 font-mono text-xs text-emerald-50/90 outline-none transition placeholder:text-white/20 focus:border-emerald-200/45"
      />
    </label>
  );
}

export function TestnetLedgerInspector() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [connection, setConnection] = useState<"checking" | "disabled" | "available" | "unavailable">("checking");
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const check = useCallback(async () => {
    setConnection("checking");
    setCapabilities(null);
    setResult(null);
    setError(null);
    try {
      const response = (await coreGet("/v3/xrpl-commerce-lab/capabilities", {
        throwAuthErrors: true,
      })) as Capabilities | null;
      if (!response || response.network !== "xrpl:1") {
        setConnection("unavailable");
        return;
      }
      setCapabilities(response);
      setConnection(response.enabled ? "available" : "disabled");
    } catch {
      setConnection("unavailable");
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const valid = useMemo(() => {
    const drops = Number(form.amount_drops);
    const tag = form.destination_tag.trim() === "" ? null : Number(form.destination_tag);
    return hex64.test(form.tx_hash.trim()) &&
      hex64.test(form.invoice_id.trim()) &&
      classicAccountShape.test(form.destination.trim()) &&
      (form.expected_sender.trim() === "" || classicAccountShape.test(form.expected_sender.trim())) &&
      Number.isSafeInteger(drops) && drops >= 1 && drops <= 1_000_000 &&
      (tag === null || (Number.isSafeInteger(tag) && tag >= 0 && tag <= 4294967295));
  }, [form]);

  const update = (key: keyof Form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setResult(null);
    setError(null);
    setAttempted(false);
  };

  const inspect = async () => {
    if (connection !== "available" || !valid || busy) return;
    setBusy(true);
    setResult(null);
    setError(null);
    setAttempted(true);
    try {
      const response = (await corePost("/v3/xrpl-commerce-lab/inspect", {
        tx_hash: form.tx_hash.trim(),
        invoice_id: form.invoice_id.trim(),
        destination: form.destination.trim(),
        amount_drops: Number(form.amount_drops),
        destination_tag: form.destination_tag.trim() === "" ? null : Number(form.destination_tag),
        expected_sender: form.expected_sender.trim() || null,
      }, { throwAuthErrors: true })) as Inspection | null;
      if (response?.status !== "validated_testnet_ledger_match_only" || !response.source_evidence_is_live) {
        setError("CORE hat keine verifizierte Testnet-Evidenz geliefert.");
        return;
      }
      setResult(response);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unbekannter Fehler";
      setError(`Keine passende validierte Testnet-Transaktion: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Echte XRPL-Testnet-Prüfung" className="mt-6 rounded-[26px] border border-emerald-100/[.14] bg-[#0c1514]/95 px-6 py-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-100/[.14] bg-emerald-100/[.06] text-emerald-100">
            <Fingerprint size={19} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[.22em] text-emerald-100/50">03 / CORE · Echte Netzwerkbeobachtung</div>
            <h2 className="mt-1 text-lg font-light tracking-[-.025em]">XRPL Testnet · Ledger prüfen</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span data-testid="xrpl-inspector-status" className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${connection === "available" ? "border-emerald-200/25 text-emerald-200" : "border-amber-200/20 text-amber-200/70"}`}>
            {connection === "available" ? "Testnet lesend verfügbar" : connection === "checking" ? "CORE wird geprüft" : connection === "disabled" ? "Per Feature-Flag deaktiviert" : "CORE nicht verbunden"}
          </span>
          <button type="button" aria-label="CORE-Verbindung erneut prüfen" onClick={() => void check()} className="text-white/50 transition hover:text-white"><RefreshCcw size={16}/></button>
        </div>
      </div>

      <p className="mt-5 max-w-3xl text-xs leading-6 text-white/47">
        Anders als die Simulation oben fragt dieser Bereich einen echten XRPL-Testnet-Server über CORE ab.
        Du vergleichst eine bereits bestätigte Transaktion mit den Feldern, die du eingibst.
        <strong className="font-medium text-emerald-100/75"> Das ist keine Prüfung einer gespeicherten Händlerrechnung.</strong>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field name="tx_hash" title="Transaktionshash · 64 Hex" value={form.tx_hash} onChange={update} placeholder="64-stelliger Testnet-Hash" />
        <Field name="invoice_id" title="InvoiceID · 64 Hex" value={form.invoice_id} onChange={update} placeholder="Eindeutige Rechnungskennung" />
        <Field name="destination" title="Empfänger · Testnet" value={form.destination} onChange={update} placeholder="r..." />
        <Field name="amount_drops" title="Exakter Betrag · Drops (max. 1 XRP)" value={form.amount_drops} onChange={update} placeholder="1000" />
        <Field name="destination_tag" title="DestinationTag · optional" value={form.destination_tag} onChange={update} placeholder="Optional" />
        <Field name="expected_sender" title="Sender · optional" value={form.expected_sender} onChange={update} placeholder="r..." />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!valid || connection !== "available" || busy}
          onClick={() => void inspect()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#b8e8cf] px-5 text-xs font-semibold text-[#082015] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Activity size={15}/> {busy ? "Ledger wird gelesen…" : "Echte Testnet-Evidenz prüfen"}
        </button>
        <span className="flex items-center gap-2 text-[11px] text-white/38"><LockKeyhole size={13}/> Nur System-Owner · Kein Wallet-Zugriff · Keine Buchung</span>
      </div>
      {capabilities?.enabled === false && (
        <p className="mt-4 text-xs leading-5 text-amber-100/65">
          CORE hat diese Funktion deaktiviert. Das ist der sichere Ausgangszustand.
        </p>
      )}
      <div aria-live="polite" className="mt-5">
        {error && attempted && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200/[.18] bg-rose-200/[.045] p-4 text-xs leading-6 text-rose-100/80">
            <XCircle size={16} className="mt-1 shrink-0"/>{error}
          </div>
        )}
        {result && (
          <div className="rounded-2xl border border-emerald-100/[.18] bg-emerald-100/[.055] p-5">
            <div className="flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 size={18}/> Validierter Testnet-Zahlungsnachweis</div>
            <dl className="mt-4 grid gap-3 text-xs text-white/65 sm:grid-cols-2">
              <div><dt className="text-white/35">Ledger-Index</dt><dd className="mt-1 font-mono">{result.ledger_index}</dd></div>
              <div><dt className="text-white/35">Betrag</dt><dd className="mt-1 font-mono">{result.amount_drops} Drops</dd></div>
              <div className="sm:col-span-2"><dt className="text-white/35">Ledger-Hash</dt><dd className="mt-1 break-all font-mono">{result.ledger_hash}</dd></div>
              <div className="sm:col-span-2"><dt className="text-white/35">Transaktionshash</dt><dd className="mt-1 break-all font-mono">{result.tx_hash}</dd></div>
            </dl>
            <div className="mt-5 flex items-start gap-2 border-t border-emerald-100/10 pt-4 text-xs leading-6 text-amber-100/80">
              <CircleAlert size={16} className="mt-1 shrink-0"/>
              <span>Nur Ledger-Evidenz. Keine Händlerbestellung zugeordnet, kein Umsatz gebucht und kein Produkt freigeschaltet.</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-2 text-[10px] leading-5 text-white/30"><Shield size={14} className="mt-0.5 shrink-0"/> Keine Seeds, keine Private Keys, keine Mainnet-Zahlungen. Feature-Flag ausschließlich auf CORE konfigurierbar.</div>
    </section>
  );
}
