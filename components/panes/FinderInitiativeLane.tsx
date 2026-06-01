'use client';

import React from 'react';
import { Network, Plus } from 'lucide-react';
import type { InitiativeSummary } from '@/lib/openflow/types';

interface FinderInitiativeLaneProps {
  initiatives: InitiativeSummary[];
  onOpenInUniverse: () => void;
  onAddToInitiative: (initiativeId: string) => void;
}

/**
 * Context lane shown above the Finder grid. It surfaces which initiatives the
 * current folder's items belong to (derived, read-only) without replacing the
 * folder hierarchy. Renders nothing when no initiative context exists.
 */
export function FinderInitiativeLane({ initiatives, onOpenInUniverse, onAddToInitiative }: FinderInitiativeLaneProps) {
  if (initiatives.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2 backdrop-blur-xl">
      <span className="text-[10px] uppercase tracking-[0.18em] text-violet-100/45">Initiativen</span>
      {initiatives.map((initiative) => (
        <div
          key={initiative.id}
          className="flex items-center gap-2 rounded-full border border-violet-200/12 bg-violet-300/[0.08] py-1 pl-3 pr-1.5"
        >
          <span className="text-xs font-medium text-white/82">{initiative.title}</span>
          <span className="text-[11px] text-white/40">{initiative.signalCount} Signale</span>
          <button
            type="button"
            aria-label={`Zu Initiative hinzufügen: ${initiative.title}`}
            onClick={() => onAddToInitiative(initiative.id)}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/55 transition-colors hover:bg-white/[0.14] hover:text-white/90"
          >
            <Plus size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpenInUniverse}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-300/16 bg-cyan-300/[0.07] px-3 py-1.5 text-xs text-cyan-50/75 transition-colors hover:bg-cyan-300/[0.12]"
      >
        <Network size={13} />
        In Universe öffnen
      </button>
    </div>
  );
}
