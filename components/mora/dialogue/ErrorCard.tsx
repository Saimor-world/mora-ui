'use client';

/**
 * ErrorCard — renders Result.ok=false post-execution.
 * Shows user_message + recovery_hint + show-detail disclosure.
 *
 * Replaces the old '⚠️ Fehler: <raw>' string-only error rendering
 * per spec §4.4.
 */
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import type { Result } from '@/lib/types/toolContract';

interface Props {
  result: Result;
  /** When set, shows a 'Erneut versuchen' button. */
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({ result, onRetry, className = '' }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  if (result.ok || !result.error) return null;
  const err = result.error;

  return (
    <div
      className={`rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 ${className}`}
    >
      <div className="flex items-start gap-3 mb-2">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 leading-snug">
            {err.user_message}
          </p>
          {err.recovery_hint && (
            <p className="mt-1.5 text-xs text-white/55 leading-relaxed italic">
              {err.recovery_hint}
            </p>
          )}
        </div>
      </div>

      <div className="ml-7 mt-3 flex items-center justify-between">
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="text-[10px] text-white/35 hover:text-white/55 transition-colors inline-flex items-center gap-1"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {showDetail ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          Details ({err.code})
        </button>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] text-amber-300/85 hover:text-amber-200 transition-colors inline-flex items-center gap-1"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            <RotateCw size={11} />
            Erneut versuchen
          </button>
        )}
      </div>

      {showDetail && err.technical_detail && (
        <pre
          className="mt-3 ml-7 text-[10px] text-white/45 bg-black/30 border border-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all"
          style={{ fontFamily: 'monospace' }}
        >
          {err.technical_detail}
        </pre>
      )}
    </div>
  );
}
