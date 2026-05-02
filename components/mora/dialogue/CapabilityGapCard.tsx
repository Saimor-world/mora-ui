'use client';

/**
 * CapabilityGapCard — honest 'I cannot do this directly' surface.
 *
 * Per spec §4.2.3: when no tool fits the user's intent, the planner
 * emits a capability_gap frame; the chat renders this card with the
 * nearest tools and offers a 'draft a plan' path that spins up the
 * work-session machinery to draft a multi-step approach the user can
 * approve as a unit.
 */
import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';
import type { NearestTool } from '@/lib/types/moraFrame';

interface Props {
  intent: string;
  nearest: NearestTool[];
  /** Called when user clicks 'Plan entwerfen' — kicks off work-session draft. */
  onDraftPlan?: () => void;
  className?: string;
}

export function CapabilityGapCard({ intent, nearest, onDraftPlan, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-slate-400/15 bg-slate-500/[0.04] p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Compass size={12} className="text-slate-300/80" />
        <span
          className="text-[10px] uppercase tracking-[0.28em] text-slate-300/80"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Hier fehlt mir ein Werkzeug
        </span>
      </div>

      <p className="text-sm text-white/85 mb-4 leading-relaxed">
        Ich kann <span className="italic text-white/95">{intent}</span> nicht
        direkt ausführen — kein passendes Werkzeug ist bei mir hinterlegt.
      </p>

      {nearest.length > 0 && (
        <>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-2"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Am nächsten dran:
          </p>
          <ul className="space-y-2 mb-4">
            {nearest.map((n, i) => (
              <li
                key={`${n.tool}-${i}`}
                className="text-xs text-white/65 leading-snug"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                <span className="text-slate-200/85 font-medium">{n.tool}</span>
                <span className="text-white/30 mx-2">·</span>
                <span className="italic">{n.why_close}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {onDraftPlan && (
        <button
          onClick={onDraftPlan}
          className="w-full px-4 py-2 rounded-lg border border-slate-400/20 bg-slate-500/[0.06] hover:bg-slate-500/[0.10] text-xs text-slate-200/85 transition-colors inline-flex items-center justify-center gap-2"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Stattdessen einen Plan entwerfen
          <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}
