'use client';

/**
 * ProgressFrame — minimal visible heartbeat during tool execution.
 * Shows phase + optional pct. Caller decides when to mount/unmount it.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  phase: string;
  pct?: number | null;
  className?: string;
}

export function ProgressFrame({ phase, pct, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] ${className}`}
    >
      <Loader2 size={12} className="text-emerald-400/80 animate-spin" />
      <span
        className="text-xs text-white/70"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {phase}
      </span>
      {typeof pct === 'number' && (
        <span
          className="text-[10px] text-white/40 tabular-nums"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {Math.round(pct * 100)}%
        </span>
      )}
    </div>
  );
}
