'use client';

import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, FileSearch, RotateCcw, ShieldAlert } from 'lucide-react';
import { formatFinanceMoney } from '@/lib/finance/format';
import {
  financeReadErrorKind,
  type FinanceAccountState,
  useCorrectFinanceRecord,
  useFinanceEvidence,
  useFinanceRecord,
} from '@/lib/queries/useFinanceStateFlow';

function idempotencyKey() {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `finance-correction-${suffix}`;
}

export default function RecordDetailPanel({
  companyId,
  recordId,
  accounts,
  onClose,
  onOpenNode,
}: {
  companyId: string;
  recordId: string;
  accounts: FinanceAccountState[];
  onClose: () => void;
  onOpenNode?: (nodeId: string) => void;
}) {
  const recordQuery = useFinanceRecord(companyId, recordId, true);
  const record = recordQuery.data;
  const evidenceQuery = useFinanceEvidence(
    companyId,
    record?.evidence?.id || null,
    Boolean(record?.evidence?.id),
  );

  const correctionMutation = useCorrectFinanceRecord(companyId, recordId);
  const [correctionStage, setCorrectionStage] = useState<'closed' | 'edit' | 'review' | 'receipt'>('closed');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [label, setLabel] = useState('');
  const [resourceNodeId, setResourceNodeId] = useState('');
  const [correctionKey, setCorrectionKey] = useState('');

  const recordErrorKind = financeReadErrorKind(recordQuery.error);
  const evidenceErrorKind = financeReadErrorKind(evidenceQuery.error);

  if (recordQuery.isLoading) {
    return (
      <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5" data-testid="finance-record-detail-loading">
        <div className="text-xs text-white/38">Vorgang wird geladen…</div>
      </section>
    );
  }

  if (recordQuery.isError || !record) {
    return (
      <section className="rounded-[28px] border border-red-300/[0.10] bg-red-500/[0.035] p-5" data-testid="finance-record-detail-error">
        <button type="button" onClick={onClose} className="mb-4 inline-flex items-center gap-2 text-xs text-white/44">
          <ArrowLeft size={12} /> Zurück
        </button>
        <div className="flex items-center gap-2 text-sm text-red-100/72"><ShieldAlert size={15} /> Vorgang nicht verfügbar</div>
        <p className="mt-2 text-[11px] text-white/36">
          {recordErrorKind === 'denied' || recordErrorKind === 'scope_mismatch'
            ? 'Der aktuelle Zugriff darf diesen Finanzvorgang nicht lesen.'
            : 'Der Vorgang konnte gerade nicht geladen werden. Es wird kein leerer Vorgang vorgetäuscht.'}
        </p>
        <button type="button" onClick={() => void recordQuery.refetch()} className="mt-4 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/48">
          Erneut versuchen
        </button>
      </section>
    );
  }

  const alreadyCorrected = Boolean(record.corrections?.length);
  const isCorrection = Boolean(record.correction_of_record_id);

  const startCorrectionReview = () => {
    if (!reason.trim() || !reference.trim()) return;
    if (!correctionKey) setCorrectionKey(idempotencyKey());
    setCorrectionStage('review');
  };

  const persistCorrection = async () => {
    try {
      await correctionMutation.mutateAsync({
        company_id: companyId,
        idempotency_key: correctionKey || idempotencyKey(),
        evidence: {
          source_kind: 'manual',
          reference: reference.trim(),
          label: label.trim() || null,
          resource_node_id: resourceNodeId.trim() || null,
        },
        reason: reason.trim(),
      });
      setCorrectionStage('receipt');
      await recordQuery.refetch();
    } catch {
      // Keep the review visible with the mutation error.
    }
  };

  return (
    <section className="rounded-[28px] border border-white/[0.07] bg-black/14 p-5" data-testid="finance-record-detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-[10px] text-white/38 hover:text-white/62">
            <ArrowLeft size={12} /> Flow
          </button>
          <div className="mt-4 text-[9px] uppercase tracking-[0.2em] text-white/28">Vorgang</div>
          <h3 className="mt-1 text-xl font-medium tracking-[-0.035em] text-white/84">
            {record.classification.replaceAll('_', ' ')}
          </h3>
          <div className="mt-1 font-mono text-[9px] text-white/22">{record.id}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/24">Wirksam</div>
          <div className="mt-1 text-xs text-white/54">
            {record.effective_at ? new Date(record.effective_at).toLocaleString('de-DE') : 'nicht belegt'}
          </div>
        </div>
      </div>

      {record.memo && <p className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-2.5 text-[11px] text-white/44">{record.memo}</p>}

      <div className="mt-5">
        <div className="text-[10px] font-medium text-white/58">Buchungszeilen</div>
        <div className="mt-2 overflow-hidden rounded-[18px] border border-white/[0.06]">
          {record.postings.map((posting) => {
            const account = posting.account_id ? accounts.find((item) => item.id === posting.account_id) : null;
            return (
              <div key={posting.id} className="grid gap-2 border-b border-white/[0.05] px-3 py-3 last:border-b-0 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-white/54">{posting.ledger_code}</div>
                  <div className="mt-1 text-[9px] text-white/24">
                    {account?.display_name || (posting.account_id ? `Account ${posting.account_id}` : 'Gegenkonto / Ledger-Code')}
                  </div>
                </div>
                <div className="text-left text-sm font-medium tabular-nums text-white/72 sm:text-right">
                  {formatFinanceMoney(posting.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="flex items-center gap-2 text-[10px] font-medium text-white/58"><FileSearch size={13} /> Beleg</div>
        <div className="mt-2 text-[11px] text-white/48">{record.evidence?.label || record.evidence?.reference || 'Kein Beleg im Record'}</div>
        {record.evidence?.reference && <div className="mt-1 font-mono text-[9px] text-white/24">{record.evidence.reference}</div>}

        {record.evidence?.id && evidenceQuery.isLoading && <div className="mt-3 text-[10px] text-white/28">Belegzugriff wird geprüft…</div>}

        {record.evidence?.id && evidenceQuery.isError && (
          <div role="alert" className="mt-3 rounded-xl border border-amber-300/[0.10] bg-amber-400/[0.025] px-3 py-2 text-[10px] text-amber-50/52">
            {evidenceErrorKind === 'denied' || evidenceErrorKind === 'scope_mismatch'
              ? 'Der verknüpfte Beleg ist für den aktuellen Zugriff nicht freigegeben.'
              : 'Der Beleg konnte gerade nicht aufgelöst werden. Die gespeicherte Referenz bleibt sichtbar.'}
          </div>
        )}

        {evidenceQuery.data?.evidence?.kind === 'manual_statement' && (
          <div className="mt-3 text-[10px] text-white/30">Manuelle Referenz · kein aufgelöstes Dokument.</div>
        )}

        {evidenceQuery.data?.resource && (
          <button
            type="button"
            onClick={() => onOpenNode?.(evidenceQuery.data!.resource!.id)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-300/12 bg-emerald-400/[0.04] px-3 py-2 text-[10px] text-emerald-100/62"
          >
            <ExternalLink size={11} /> {evidenceQuery.data.resource.title}
          </button>
        )}
      </div>

      {(record.correction_of_record_id || alreadyCorrected) && (
        <div className="mt-4 rounded-xl border border-amber-300/[0.09] bg-amber-400/[0.025] px-3 py-2 text-[10px] text-amber-50/48">
          {record.correction_of_record_id
            ? `Dieser Vorgang ist die vollständige Gegenbuchung von ${record.correction_of_record_id}.`
            : `Dieser Vorgang wurde bereits vollständig korrigiert: ${record.corrections?.[0]?.id || 'Korrektur vorhanden'}.`}
        </div>
      )}

      {!isCorrection && !alreadyCorrected && correctionStage === 'closed' && (
        <button type="button" onClick={() => setCorrectionStage('edit')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-white/44">
          <RotateCcw size={12} /> Vollständig korrigieren
        </button>
      )}

      {correctionStage === 'edit' && (
        <div className="mt-5 grid gap-3 rounded-[18px] border border-white/[0.06] bg-black/16 p-4" data-testid="finance-correction-edit">
          <div className="text-xs font-medium text-white/62">Korrektur vorbereiten</div>
          <label className="grid gap-1.5 text-[10px] text-white/36">
            Grund
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white/72 outline-none" />
          </label>
          <label className="grid gap-1.5 text-[10px] text-white/36">
            Belegreferenz
            <input value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white/72 outline-none" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[10px] text-white/36">
              Belegbezeichnung
              <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white/72 outline-none" />
            </label>
            <label className="grid gap-1.5 text-[10px] text-white/36">
              Dokument-ID
              <input value={resourceNodeId} onChange={(event) => setResourceNodeId(event.target.value)} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 font-mono text-xs text-white/72 outline-none" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCorrectionStage('closed')} className="rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-white/42">Abbrechen</button>
            <button type="button" disabled={!reason.trim() || !reference.trim()} onClick={startCorrectionReview} className="rounded-xl border border-amber-300/12 bg-amber-400/[0.04] px-3 py-2 text-xs text-amber-50/62 disabled:opacity-30">Korrektur prüfen</button>
          </div>
        </div>
      )}

      {correctionStage === 'review' && (
        <div className="mt-5 rounded-[18px] border border-amber-300/[0.10] bg-amber-400/[0.025] p-4" data-testid="finance-correction-review">
          <div className="text-xs font-medium text-amber-50/66">Vollständige Gegenbuchung prüfen</div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/40">
            Das Original bleibt unverändert. Beim Speichern wird genau eine verknüpfte Gegenbuchung erzeugt; eine zweite Vollkorrektur ist nicht zulässig.
          </p>
          <div className="mt-3 text-[10px] text-white/44">Grund: {reason}</div>
          <div className="mt-1 text-[10px] text-white/44">Beleg: {label || reference}</div>
          {correctionMutation.error && (
            <div role="alert" className="mt-3 text-[10px] text-red-100/68">{correctionMutation.error.message}</div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setCorrectionStage('edit')} className="rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-white/42">Zurück</button>
            <button type="button" disabled={correctionMutation.isPending} onClick={() => void persistCorrection()} className="rounded-xl border border-amber-300/14 bg-amber-400/[0.05] px-3 py-2 text-xs text-amber-50/66 disabled:opacity-35">
              {correctionMutation.isPending ? 'Speichert…' : 'Gegenbuchung speichern'}
            </button>
          </div>
        </div>
      )}

      {correctionStage === 'receipt' && (
        <div className="mt-5 rounded-[18px] border border-emerald-300/[0.10] bg-emerald-400/[0.03] p-4" data-testid="finance-correction-receipt">
          <div className="text-xs font-medium text-emerald-50/70">Korrektur gespeichert.</div>
          <div className="mt-1 text-[10px] text-white/38">Original und Gegenbuchung bleiben als getrennte Vorgänge nachvollziehbar.</div>
        </div>
      )}
    </section>
  );
}
