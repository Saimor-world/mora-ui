'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Plus, RotateCcw } from 'lucide-react';
import {
  type FinanceAccountState,
  type FinanceWriteReceipt,
  useCreateFinanceAccount,
  useCreateFinanceObservation,
  useCreateFinanceRecord,
} from '@/lib/queries/useFinanceStateFlow';

type EntryKind = 'account' | 'observation' | 'record';
type EntryStage = 'edit' | 'review' | 'receipt';

function localDateTimeValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function normalizeEur(value: string): string | null {
  const raw = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(raw)) return null;
  const [wholeRaw, fractionRaw = ''] = raw.split('.');
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  return `${whole}.${fractionRaw.padEnd(2, '0')}`;
}

function createIdempotencyKey() {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `finance-ui-${suffix}`;
}

function ReviewLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-white/[0.05] py-2.5 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <div className="text-[9px] uppercase tracking-[0.15em] text-white/25">{label}</div>
      <div className="text-[11px] text-white/64">{value || '—'}</div>
    </div>
  );
}

export default function FinanceEntryPanel({
  companyId,
  accounts,
}: {
  companyId: string;
  accounts: FinanceAccountState[];
}) {
  const [kind, setKind] = useState<EntryKind>(accounts.length ? 'observation' : 'account');
  const [stage, setStage] = useState<EntryStage>('edit');
  const [receipt, setReceipt] = useState<FinanceWriteReceipt | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('Treasury Cash Account');
  const [accountType, setAccountType] = useState('cash');

  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [asOf, setAsOf] = useState(localDateTimeValue());
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [resourceNodeId, setResourceNodeId] = useState('');

  const [classification, setClassification] = useState('founder_funding');
  const [founderTreatment, setFounderTreatment] = useState('unclassified');
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [memo, setMemo] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const accountMutation = useCreateFinanceAccount(companyId);
  const observationMutation = useCreateFinanceObservation(companyId);
  const recordMutation = useCreateFinanceRecord(companyId);

  const selectedAccountId = accountId || accounts[0]?.id || '';
  const normalizedAmount = normalizeEur(amount);
  const mutation = kind === 'account'
    ? accountMutation
    : kind === 'observation'
      ? observationMutation
      : recordMutation;

  const reviewRows = useMemo(() => {
    if (kind === 'account') {
      return [
        ['Unternehmen', companyId],
        ['Kontoname', accountName],
        ['Typ', accountType || 'cash'],
        ['Währung', 'EUR'],
      ] as Array<[string, string]>;
    }
    if (kind === 'observation') {
      return [
        ['Konto', accounts.find((item) => item.id === selectedAccountId)?.display_name || selectedAccountId],
        ['Beobachteter Stand', normalizedAmount ? `${normalizedAmount} EUR` : amount],
        ['Checkpoint', asOf ? new Date(asOf).toLocaleString('de-DE') : '—'],
        ['Beleg', evidenceLabel || evidenceReference],
        ['Dokument', resourceNodeId || 'Nur manuelle Referenz'],
        ['Abdeckung', 'partial'],
      ] as Array<[string, string]>;
    }
    return [
      ['Konto', accounts.find((item) => item.id === selectedAccountId)?.display_name || selectedAccountId],
      ['Klassifikation', classification.replaceAll('_', ' ')],
      ['Betrag', normalizedAmount ? `${normalizedAmount} EUR` : amount],
      ['Wirksam ab', asOf ? new Date(asOf).toLocaleString('de-DE') : '—'],
      ['Beleg', evidenceLabel || evidenceReference],
      ['Dokument', resourceNodeId || 'Nur manuelle Referenz'],
      ...(classification === 'founder_funding' ? [['Founder treatment', founderTreatment]] : []),
      ...(classification === 'internal_transfer'
        ? [['Zielkonto', accounts.find((item) => item.id === destinationAccountId)?.display_name || destinationAccountId]]
        : []),
      ...(['refund', 'adjustment', 'unclassified'].includes(classification) ? [['Richtung', direction]] : []),
      ['Notiz', memo || '—'],
    ] as Array<[string, string]>;
  }, [
    kind,
    companyId,
    accountName,
    accountType,
    accounts,
    selectedAccountId,
    normalizedAmount,
    amount,
    asOf,
    evidenceLabel,
    evidenceReference,
    resourceNodeId,
    classification,
    founderTreatment,
    destinationAccountId,
    direction,
    memo,
  ]);

  const changeKind = (next: EntryKind) => {
    setKind(next);
    setStage('edit');
    setReceipt(null);
    setValidationError(null);
  };

  const review = () => {
    setValidationError(null);
    if (kind === 'account') {
      if (!accountName.trim()) {
        setValidationError('Bitte einen Kontonamen angeben.');
        return;
      }
    } else {
      if (!selectedAccountId) {
        setValidationError('Bitte ein Konto auswählen.');
        return;
      }
      if (!normalizedAmount) {
        setValidationError('Bitte einen gültigen EUR-Betrag mit höchstens zwei Nachkommastellen eingeben.');
        return;
      }
      if (!evidenceReference.trim()) {
        setValidationError('Bitte eine Belegreferenz angeben.');
        return;
      }
      if (!asOf) {
        setValidationError('Bitte einen Zeitpunkt angeben.');
        return;
      }
      if (kind === 'record' && classification === 'internal_transfer') {
        if (!destinationAccountId || destinationAccountId === selectedAccountId) {
          setValidationError('Für eine Umbuchung braucht es ein anderes Zielkonto.');
          return;
        }
      }
    }
    if (kind === 'record' && !idempotencyKey) setIdempotencyKey(createIdempotencyKey());
    setStage('review');
  };

  const persist = async () => {
    setValidationError(null);
    try {
      if (kind === 'account') {
        const result = await accountMutation.mutateAsync({
          company_id: companyId,
          display_name: accountName.trim(),
          currency: 'EUR',
          account_type: accountType.trim() || 'cash',
        });
        setReceipt(result.receipt);
      } else if (kind === 'observation') {
        const result = await observationMutation.mutateAsync({
          company_id: companyId,
          account_id: selectedAccountId,
          amount: { value: normalizedAmount!, currency: 'EUR', scale: 2 },
          as_of: new Date(asOf).toISOString(),
          evidence: {
            source_kind: 'manual',
            reference: evidenceReference.trim(),
            label: evidenceLabel.trim() || null,
            resource_node_id: resourceNodeId.trim() || null,
          },
          coverage: 'partial',
          freshness: 'current',
        });
        setReceipt(result.receipt);
      } else {
        const payload: Parameters<typeof recordMutation.mutateAsync>[0] = {
          company_id: companyId,
          account_id: selectedAccountId,
          classification: classification as Parameters<typeof recordMutation.mutateAsync>[0]['classification'],
          amount: { value: normalizedAmount!, currency: 'EUR', scale: 2 },
          effective_at: new Date(asOf).toISOString(),
          evidence: {
            source_kind: 'manual',
            reference: evidenceReference.trim(),
            label: evidenceLabel.trim() || null,
            resource_node_id: resourceNodeId.trim() || null,
          },
          idempotency_key: idempotencyKey || createIdempotencyKey(),
          memo: memo.trim() || null,
        };
        if (classification === 'founder_funding') {
          payload.founder_treatment = founderTreatment as 'equity' | 'loan' | 'unclassified';
        }
        if (classification === 'internal_transfer') {
          payload.destination_account_id = destinationAccountId;
        }
        if (['refund', 'adjustment', 'unclassified'].includes(classification)) {
          payload.direction = direction;
        }
        const result = await recordMutation.mutateAsync(payload);
        setReceipt(result.receipt);
      }
      setStage('receipt');
    } catch {
      // Mutation error is rendered below without replacing it with a success/empty state.
    }
  };

  const resetAfterReceipt = () => {
    setStage('edit');
    setReceipt(null);
    setValidationError(null);
    setAmount('');
    setEvidenceReference('');
    setEvidenceLabel('');
    setResourceNodeId('');
    setMemo('');
    setIdempotencyKey('');
    setAsOf(localDateTimeValue());
  };

  return (
    <section className="rounded-[28px] border border-emerald-300/[0.09] bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.07),transparent_34%),rgba(0,0,0,0.14)] p-5" data-testid="finance-entry-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-100/38">
            <Plus size={11} /> Manuell erfassen
          </div>
          <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-white/82">Erst prüfen, dann speichern.</h3>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/34">
            Manuelle Eingaben sind menschlich erfasste Unternehmensdaten. Sie gelten nicht als unabhängig verifiziert.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Finance Eingabetyp">
          {([
            ['account', 'Konto'],
            ['observation', 'Checkpoint'],
            ['record', 'Bewegung'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              disabled={id !== 'account' && accounts.length === 0}
              onClick={() => changeKind(id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] transition disabled:opacity-30 ${
                kind === id
                  ? 'border-emerald-200/18 bg-emerald-300/[0.075] text-emerald-50/82'
                  : 'border-white/[0.06] bg-white/[0.018] text-white/34'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {stage === 'edit' && (
        <div className="mt-5 grid gap-3" data-testid="finance-entry-edit">
          {kind === 'account' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-[10px] text-white/38">
                Kontoname
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
              </label>
              <label className="grid gap-1.5 text-[10px] text-white/38">
                Typ
                <input value={accountType} onChange={(event) => setAccountType(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
              </label>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Konto
                  <select value={selectedAccountId} onChange={(event) => setAccountId(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/76 outline-none">
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.display_name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Betrag EUR
                  <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
                </label>
              </div>

              {kind === 'record' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-[10px] text-white/38">
                    Art der Bewegung
                    <select value={classification} onChange={(event) => setClassification(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/76 outline-none">
                      <option value="founder_funding">Founder funding</option>
                      <option value="customer_receipt">Customer receipt</option>
                      <option value="operating_expense">Operating expense</option>
                      <option value="internal_transfer">Internal transfer</option>
                      <option value="refund">Refund</option>
                      <option value="adjustment">Adjustment</option>
                      <option value="unclassified">Unclassified</option>
                    </select>
                  </label>
                  {classification === 'founder_funding' && (
                    <label className="grid gap-1.5 text-[10px] text-white/38">
                      Founder treatment
                      <select value={founderTreatment} onChange={(event) => setFounderTreatment(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/76 outline-none">
                        <option value="unclassified">Noch nicht klassifiziert</option>
                        <option value="equity">Equity</option>
                        <option value="loan">Loan</option>
                      </select>
                    </label>
                  )}
                  {classification === 'internal_transfer' && (
                    <label className="grid gap-1.5 text-[10px] text-white/38">
                      Zielkonto
                      <select value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/76 outline-none">
                        <option value="">Bitte wählen</option>
                        {accounts.filter((account) => account.id !== selectedAccountId).map((account) => <option key={account.id} value={account.id}>{account.display_name}</option>)}
                      </select>
                    </label>
                  )}
                  {['refund', 'adjustment', 'unclassified'].includes(classification) && (
                    <label className="grid gap-1.5 text-[10px] text-white/38">
                      Richtung
                      <select value={direction} onChange={(event) => setDirection(event.target.value as 'credit' | 'debit')} className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/76 outline-none">
                        <option value="credit">Zufluss</option>
                        <option value="debit">Abfluss</option>
                      </select>
                    </label>
                  )}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  {kind === 'observation' ? 'Stand beobachtet am' : 'Wirksam ab'}
                  <input type="datetime-local" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
                </label>
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Belegreferenz
                  <input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="z. B. Kontoauszug 2026-09-18" className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Belegbezeichnung
                  <input value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} placeholder="optional" className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
                </label>
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Verknüpftes Dokument
                  <input value={resourceNodeId} onChange={(event) => setResourceNodeId(event.target.value)} placeholder="optional: CORE Node-ID" className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 font-mono text-xs text-white/76 outline-none" />
                </label>
              </div>
              {kind === 'record' && (
                <label className="grid gap-1.5 text-[10px] text-white/38">
                  Notiz
                  <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={2} className="resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/76 outline-none" />
                </label>
              )}
            </>
          )}

          {validationError && <div role="alert" className="text-xs text-red-200/72">{validationError}</div>}
          <div className="flex justify-end">
            <button type="button" onClick={review} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.07] px-4 py-2.5 text-xs font-medium text-emerald-100/76">
              <FileCheck2 size={13} /> Prüfen
            </button>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="mt-5" data-testid="finance-entry-review">
          <div className="rounded-[18px] border border-white/[0.07] bg-black/18 px-4">
            {reviewRows.map(([label, value]) => <ReviewLine key={label} label={label} value={value} />)}
          </div>
          <div className="mt-4 rounded-xl border border-amber-300/[0.10] bg-amber-400/[0.025] px-3 py-2 text-[10px] leading-relaxed text-amber-50/48">
            Speichern dokumentiert diesen Sachverhalt im Finance-Journal. Es wird kein Geld bewegt, keine Bank angesprochen und keine Ledger-Transaktion signiert.
          </div>
          {(validationError || mutation.error) && (
            <div role="alert" className="mt-3 rounded-xl border border-red-300/14 bg-red-500/[0.05] px-3 py-2 text-xs text-red-100/72">
              {validationError || mutation.error?.message || 'Speichern fehlgeschlagen.'}
            </div>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setStage('edit')} className="rounded-xl border border-white/[0.07] px-4 py-2.5 text-xs text-white/48">Zurück</button>
            <button
              type="button"
              onClick={() => void persist()}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.08] px-4 py-2.5 text-xs font-medium text-emerald-100/78 disabled:opacity-40"
            >
              <CheckCircle2 size={13} /> {mutation.isPending ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {stage === 'receipt' && receipt && (
        <div className="mt-5 rounded-[20px] border border-emerald-300/[0.12] bg-emerald-400/[0.035] p-4" data-testid="finance-entry-receipt">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-50/78">
            <CheckCircle2 size={16} /> Gespeichert
          </div>
          <div className="mt-3 grid gap-1 text-[10px] text-white/38">
            <div>Receipt: <span className="font-mono text-white/56">{receipt.id || '—'}</span></div>
            <div>Typ: <span className="text-white/56">{receipt.kind}</span></div>
            <div>Persistiert: <span className="text-emerald-100/68">{receipt.persisted ? 'ja' : 'nein'}</span></div>
            <div>Finanzaktion ausgeführt: <span className="text-white/56">{receipt.financial_action_executed ? 'ja' : 'nein'}</span></div>
          </div>
          <button type="button" onClick={resetAfterReceipt} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-white/48">
            <RotateCcw size={12} /> Weitere Eingabe
          </button>
        </div>
      )}
    </section>
  );
}
