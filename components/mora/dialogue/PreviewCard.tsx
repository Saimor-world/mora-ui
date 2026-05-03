'use client';

/**
 * PreviewCard — renders a tool's pre-execution Preview.
 *
 * Shown when Mora is about to invoke a tool. The user sees what will
 * change BEFORE confirming. Pure presentational; the parent decides
 * whether to also render a ConfirmCard below it (depends on risk_level).
 */
import React from 'react';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';
import type { Preview } from '@/lib/types/toolContract';

interface Props {
  preview: Preview;
  toolLabel?: string;
  className?: string;
}

export function PreviewCard({ preview, toolLabel, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Sparkles size={12} className="text-emerald-400/80" />
          <span
            className="text-[10px] uppercase tracking-[0.28em] text-emerald-400/80"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Vorschau
          </span>
        </div>
        {toolLabel && (
          <span
            className="text-[10px] text-white/30 font-mono"
            title="Tool"
          >
            {toolLabel}
          </span>
        )}
      </div>

      <p className="text-sm text-white/85 leading-relaxed mb-2">
        {preview.intent}
      </p>

      {preview.scope_path && preview.scope_path !== '(global)' && (
        <p className="text-xs text-white/45 mb-3 inline-flex items-center gap-1">
          <ArrowRight size={11} className="opacity-60" />
          <span style={{ fontFamily: 'system-ui, sans-serif' }}>
            {preview.scope_path}
          </span>
        </p>
      )}

      {preview.affected_entities.length > 0 && (
        <ul className="space-y-1 mb-3">
          {preview.affected_entities.map((e, i) => (
            <li
              key={`${e.id}-${i}`}
              className="text-xs text-white/55 inline-flex items-center gap-2 mr-3"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              <span
                className={
                  e.role === 'will_create'
                    ? 'text-emerald-400/80'
                    : e.role === 'will_modify'
                    ? 'text-amber-400/80'
                    : 'text-rose-400/80'
                }
              >
                {e.role === 'will_create' ? '+' : e.role === 'will_modify' ? '~' : '−'}
              </span>
              <span className="truncate">{e.id}</span>
              <span className="text-white/30 text-[10px]">{e.type}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 text-[10px] text-white/35" style={{ fontFamily: 'system-ui, sans-serif' }}>
        {preview.estimated_duration_ms !== null && preview.estimated_duration_ms !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Clock size={10} />
            {preview.estimated_duration_ms < 1000
              ? `${preview.estimated_duration_ms} ms`
              : `${(preview.estimated_duration_ms / 1000).toFixed(1)} s`}
          </span>
        )}
        <span>{preview.reversible ? 'umkehrbar' : 'nicht umkehrbar'}</span>
      </div>
    </div>
  );
}
