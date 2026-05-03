'use client';

/**
 * ResultCard — renders Result.ok=true post-execution.
 * Shows change_summary + affected_entities chips + journal_id link.
 *
 * For Result.ok=false → use ErrorCard instead.
 */
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Result } from '@/lib/types/toolContract';

interface Props {
  result: Result;
  /** Called when user clicks 'Merken' to promote this run to memory (P5b). */
  onPromoteToMemory?: () => void;
  className?: string;
}

export function ResultCard({ result, onPromoteToMemory, className = '' }: Props) {
  if (!result.ok) return null; // delegate to ErrorCard

  return (
    <div
      className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-sm text-white/90 leading-relaxed flex-1">
          {result.change_summary || 'Aktion erfolgreich.'}
        </p>
      </div>

      {result.affected_entities && result.affected_entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 ml-7">
          {result.affected_entities.map((e, i) => (
            <span
              key={`${e.id}-${i}`}
              className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-300/85 inline-flex items-center gap-1"
              style={{ fontFamily: 'system-ui, sans-serif' }}
              title={e.id}
            >
              <span className="opacity-60">{e.role === 'created' ? '+' : e.role === 'modified' ? '~' : '−'}</span>
              <span className="opacity-90">{e.type}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-white/30 ml-7" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <span className="font-mono" title="Journal entry">
          {result.journal_id}
        </span>
        {onPromoteToMemory && (
          <button
            onClick={onPromoteToMemory}
            className="text-emerald-400/65 hover:text-emerald-300 transition-colors text-[11px]"
          >
            Merken
          </button>
        )}
      </div>
    </div>
  );
}
