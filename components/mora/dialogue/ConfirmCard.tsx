'use client';

/**
 * ConfirmCard — risk-graded consent UI per spec §4.2.d.
 *
 * Maps risk_level → visual tone + interaction friction:
 *   safe         no card rendered (executes implicitly)
 *   write        emerald inline 'Bestätigen' button
 *   destructive  red explicit 'Verstanden, ausführen' + lists what's lost
 *   secret       red 2-step type-to-confirm (extends existing pattern)
 *
 * Caller passes onConfirm + onCancel. The card does NOT execute the
 * tool — it only collects consent. Execution is the chat's job.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Trash2, Lock, Check, X } from 'lucide-react';
import type { RiskLevel } from '@/lib/types/toolContract';

interface Props {
  riskLevel: RiskLevel;
  affectedSummary?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** When set, the destructive/secret card lists what will be lost. */
  irreversibleConsequences?: string[];
  className?: string;
}

export function ConfirmCard({
  riskLevel,
  affectedSummary,
  onConfirm,
  onCancel,
  irreversibleConsequences,
  className = '',
}: Props) {
  // safe → no card; caller should not render this for safe tools
  if (riskLevel === 'safe') return null;

  if (riskLevel === 'write') return <WriteConfirm affectedSummary={affectedSummary} onConfirm={onConfirm} onCancel={onCancel} className={className} />;
  if (riskLevel === 'destructive') return <DestructiveConfirm consequences={irreversibleConsequences} onConfirm={onConfirm} onCancel={onCancel} className={className} />;
  return <SecretConfirm onConfirm={onConfirm} onCancel={onCancel} className={className} />;
}

// ─── write — inline confirm ────────────────────────────────────────────────

function WriteConfirm({
  affectedSummary,
  onConfirm,
  onCancel,
  className,
}: {
  affectedSummary?: string;
  onConfirm: () => void;
  onCancel: () => void;
  className: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-white/75" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {affectedSummary || 'Diese Änderung jetzt ausführen?'}
        </p>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/5 transition-colors"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium transition-colors inline-flex items-center gap-1.5"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <Check size={12} />
          Bestätigen
        </button>
      </div>
    </motion.div>
  );
}

// ─── destructive — explicit confirm + lists what's lost ────────────────────

function DestructiveConfirm({
  consequences,
  onConfirm,
  onCancel,
  className,
}: {
  consequences?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  className: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Trash2 size={14} className="text-rose-400" />
        <span
          className="text-[10px] uppercase tracking-[0.28em] text-rose-400/90"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Endgültig
        </span>
      </div>

      <p className="text-sm text-white/85 mb-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
        Das ist nicht umkehrbar.
      </p>

      {consequences && consequences.length > 0 && (
        <ul className="mb-4 space-y-1">
          {consequences.map((c, i) => (
            <li
              key={i}
              className="text-xs text-white/60 inline-flex items-start gap-2 mr-3"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              <span className="text-rose-400/70 mt-0.5">−</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-lg text-xs text-white/65 border border-white/10 hover:bg-white/5 transition-colors"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 rounded-lg bg-rose-500/85 hover:bg-rose-500 text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <ShieldAlert size={12} />
          Verstanden, ausführen
        </button>
      </div>
    </motion.div>
  );
}

// ─── secret — 2-step type-to-confirm ───────────────────────────────────────

function SecretConfirm({
  onConfirm,
  onCancel,
  className,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  className: string;
}) {
  const phrase = 'AUSFUEHREN';
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === phrase;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-rose-500/40 bg-rose-500/[0.08] p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Lock size={14} className="text-rose-400" />
        <span
          className="text-[10px] uppercase tracking-[0.28em] text-rose-400"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Geschützt — bewusste Bestätigung
        </span>
      </div>

      <p className="text-sm text-white/85 mb-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
        Diese Aktion betrifft Zugriff oder Anmeldedaten.
      </p>
      <p className="text-xs text-white/55 mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
        Tippe <span className="font-mono text-rose-300">{phrase}</span>, um fortzufahren.
      </p>

      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        className="w-full mb-3 bg-black/40 border border-rose-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-500/60"
        placeholder={phrase}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-lg text-xs text-white/65 border border-white/10 hover:bg-white/5 transition-colors"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <X size={12} className="inline mr-1" />
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          disabled={!matches}
          className="flex-1 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <Lock size={12} />
          Ausführen
        </button>
      </div>
    </motion.div>
  );
}
