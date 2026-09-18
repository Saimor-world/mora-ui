'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Eye, ShieldCheck, Trash2 } from 'lucide-react';
import {
  analyzeXrplSigningRequest,
  type XrplGuardVerdict,
  type XrplSignGuardResult,
} from '@/lib/capital/xrpl-sign-guard';

function verdictCopy(verdict: XrplGuardVerdict) {
  if (verdict === 'blocked') return { label: 'BLOCKED', note: 'Payload nicht verwenden.' };
  if (verdict === 'critical') return { label: 'CRITICAL REVIEW', note: 'Nicht signieren, bevor jeder kritische Punkt verstanden ist.' };
  if (verdict === 'unknown') return { label: 'UNKNOWN FIELDS', note: 'Der Guard versteht den Payload nicht vollständig.' };
  if (verdict === 'elevated') return { label: 'VALUE / LEDGER CHANGE', note: 'Wirkung verstanden, aber kapital- oder ledgerwirksam.' };
  return { label: 'REVIEW', note: 'Keine erhöhte Guard-Warnung; das ist keine Freigabe.' };
}

function verdictClasses(verdict: XrplGuardVerdict) {
  if (verdict === 'blocked' || verdict === 'critical') {
    return 'border-red-300/20 bg-red-400/[0.055] text-red-100/82';
  }
  if (verdict === 'unknown') {
    return 'border-amber-300/20 bg-amber-400/[0.055] text-amber-100/78';
  }
  if (verdict === 'elevated') {
    return 'border-orange-300/16 bg-orange-400/[0.045] text-orange-100/72';
  }
  return 'border-white/[0.08] bg-white/[0.025] text-white/58';
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/[0.055] bg-black/15 px-3.5 py-3">
      <div className="text-[8px] uppercase tracking-[0.16em] text-white/24">{label}</div>
      <div className="mt-1 break-all font-mono text-[10px] text-white/58">{value || '—'}</div>
    </div>
  );
}

export default function XrplSignGuard() {
  const [expectedAccount, setExpectedAccount] = useState('');
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<XrplSignGuardResult | null>(null);

  const copy = useMemo(() => result ? verdictCopy(result.verdict) : null, [result]);

  const review = () => {
    setResult(analyzeXrplSigningRequest(payload, expectedAccount || null));
  };

  const clear = () => {
    setPayload('');
    setResult(null);
  };

  return (
    <section
      id="xrpl-sign-guard"
      className="mt-4 rounded-[28px] border border-white/[0.07] bg-[radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.065),transparent_34%),rgba(0,0,0,0.16)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-sky-100/42">
            <ShieldCheck size={12} /> XRPL Sign Guard
          </div>
          <h3 className="mt-2 text-xl font-medium tracking-[-0.035em] text-white/86">
            Verstehen, was du unterschreibst — bevor Xaman signiert.
          </h3>
          <p className="mt-2 text-[11px] leading-relaxed text-white/36">
            Der Review läuft nur im Browser. SAIMÔR sendet den eingefügten Payload nicht an CORE oder einen XRPL-Node,
            speichert ihn nicht und signiert nichts. Seed, Secret, Private Key oder Mnemonic gehören hier niemals hinein.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-white/34">local only</span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-white/34">no seed</span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-white/34">no signing</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="text-[10px] text-white/46">
          Erwartetes Signing-Konto <span className="text-white/22">(optional, nur öffentliche r…-Adresse)</span>
          <input
            value={expectedAccount}
            onChange={(event) => {
              setExpectedAccount(event.target.value);
              setResult(null);
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="r…"
            className="mt-1.5 block w-full rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 font-mono text-xs text-white/74 outline-none focus:border-sky-300/20"
          />
        </label>

        <label className="text-[10px] text-white/46">
          XRPL Transaction JSON / Xaman txjson
          <textarea
            value={payload}
            onChange={(event) => {
              setPayload(event.target.value);
              setResult(null);
            }}
            spellCheck={false}
            autoComplete="off"
            rows={9}
            placeholder={'{\n  "TransactionType": "Payment",\n  "Account": "r…",\n  "Destination": "r…",\n  "Amount": "1000000"\n}'}
            className="mt-1.5 block w-full resize-y rounded-2xl border border-white/[0.07] bg-black/30 p-3 font-mono text-[10px] leading-relaxed text-white/66 outline-none focus:border-sky-300/20"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!payload.trim()}
            onClick={review}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-300/15 bg-sky-300/[0.07] px-4 py-2.5 text-[10px] font-medium text-sky-50/78 transition hover:bg-sky-300/[0.11] disabled:opacity-35"
          >
            <Eye size={12} /> Transaktion prüfen
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!payload && !result}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[10px] text-white/42 disabled:opacity-30"
          >
            <Trash2 size={12} /> Löschen
          </button>
        </div>
      </div>

      {result && copy && (
        <div className="mt-5 space-y-4">
          <div className={`rounded-[22px] border p-4 ${verdictClasses(result.verdict)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em]">{copy.label}</div>
                <div className="mt-1 text-[10px] opacity-75">{copy.note}</div>
              </div>
              {(result.verdict === 'critical' || result.verdict === 'blocked') && <AlertTriangle size={17} />}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Transaction type" value={result.transactionType} />
            <Field label="Signing account" value={result.account} />
            <Field label="Network fee" value={result.fee} />
            <Field label="Last ledger" value={result.lastLedgerSequence} />
          </div>

          {result.expectedAccount && (
            <div className={`rounded-xl border px-3 py-2.5 text-[10px] ${
              result.accountMatches
                ? 'border-white/[0.06] bg-white/[0.018] text-white/46'
                : 'border-red-300/16 bg-red-400/[0.04] text-red-100/70'
            }`}>
              Erwartet: <span className="break-all font-mono">{result.expectedAccount}</span>
              {' · '}
              {result.accountMatches ? 'Account stimmt überein.' : 'Account stimmt NICHT überein.'}
            </div>
          )}

          {result.effects.length > 0 && (
            <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-4">
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">Was sich ändern soll</div>
              <div className="mt-3 space-y-2">
                {result.effects.map((effect) => (
                  <div key={effect} className="rounded-xl border border-white/[0.045] bg-white/[0.014] px-3 py-2 text-[10px] leading-relaxed text-white/52">
                    {effect}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-4">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">Guard findings</div>
            <div className="mt-3 space-y-2">
              {result.findings.map((item) => (
                <div
                  key={`${item.code}-${item.title}`}
                  className={`rounded-xl border px-3 py-2.5 ${
                    item.severity === 'danger'
                      ? 'border-red-300/12 bg-red-400/[0.025]'
                      : item.severity === 'warning'
                        ? 'border-amber-300/10 bg-amber-400/[0.02]'
                        : 'border-white/[0.05] bg-white/[0.014]'
                  }`}
                >
                  <div className="text-[10px] font-medium text-white/66">{item.title}</div>
                  <div className="mt-1 text-[9px] leading-relaxed text-white/34">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {result.unknownFields.length > 0 && (
            <div className="rounded-xl border border-amber-300/10 bg-amber-400/[0.02] px-3 py-2.5 text-[9px] text-amber-50/54">
              Nicht interpretierte Felder: <span className="font-mono">{result.unknownFields.join(', ')}</span>
            </div>
          )}

          {result.transaction && (
            <details className="rounded-[20px] border border-white/[0.055] bg-black/15 p-4">
              <summary className="cursor-pointer text-[10px] text-white/46">Normalisierte Transaktion anzeigen</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-relaxed text-white/34">
                {JSON.stringify(result.transaction, null, 2)}
              </pre>
            </details>
          )}

          <p className="text-[9px] leading-relaxed text-white/24">
            Der Guard ist ein deterministischer Vorab-Review, keine Sicherheitsgarantie. Im externen Signer weiterhin vollständige Account-Adresse,
            Netzwerk, Betrag/Asset, Gebühren, LastLedgerSequence und alle angezeigten Rechteänderungen prüfen.
          </p>
        </div>
      )}
    </section>
  );
}
