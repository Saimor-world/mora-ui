'use client';

import React, { useMemo } from 'react';
import { Activity, Mic2 } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { LagefeldCanvas } from '@/components/lagefeld/LagefeldCanvas';
import { LANDESSOZIALGERICHT_FIELD } from '@/lib/lagefeld/fixtures';
import { reduceUiActions } from '@/lib/lagefeld/reduceUiActions';
import type { UiToolCall } from '@/lib/lagefeld/types';

function isUiToolCall(value: unknown): value is UiToolCall {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<UiToolCall>;
  return (
    typeof maybe.name === 'string'
    && ['placeCard', 'connect', 'placeSymbol', 'proposeAction'].includes(maybe.name)
    && !!maybe.input
    && typeof maybe.input === 'object'
    && !Array.isArray(maybe.input)
  );
}

function readUiActions(initialData?: Record<string, unknown>): UiToolCall[] {
  const raw = initialData?.uiActions;
  if (!Array.isArray(raw)) return LANDESSOZIALGERICHT_FIELD;
  const actions = raw.filter(isUiToolCall);
  return actions.length ? actions : LANDESSOZIALGERICHT_FIELD;
}

export default function LagefeldApp({ initialData }: AppProps) {
  const actions = useMemo(() => readUiActions(initialData), [initialData]);
  const state = useMemo(() => reduceUiActions(actions), [actions]);
  const source = typeof initialData?.source === 'string' ? initialData.source : 'lagefeld';
  const prompt = typeof initialData?.prompt === 'string' ? initialData.prompt : undefined;

  return (
    <section className="flex h-full min-h-[560px] w-full flex-col overflow-hidden rounded-[24px] border border-cyan-200/[0.12] bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_84%_16%,rgba(168,85,247,0.14),transparent_34%),linear-gradient(145deg,rgba(2,6,23,0.94),rgba(3,7,18,0.98))] text-slate-100">
      <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-cyan-100/45">
            <Activity className="h-3.5 w-3.5" />
            Lagefeld
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white/92">
            Raum der aktuellen Lage
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/52">
            Môra ordnet Signale, Unsicherheiten und nächste Schritte sichtbar an — noch ohne kritische Aktionen automatisch auszuführen.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-cyan-100/12 bg-cyan-100/[0.06] px-3 py-1.5 text-[11px] text-cyan-100/60">
          <Mic2 className="h-3.5 w-3.5" />
          {source === 'ambient-room' ? 'aus dem Voice-Raum' : 'Arbeitsraum'}
        </div>
      </header>

      {prompt ? (
        <div className="mx-6 mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/62">
          <span className="mr-2 text-[10px] uppercase tracking-[0.22em] text-white/34">Ausgangspunkt</span>
          {prompt}
        </div>
      ) : null}

      <main className="flex-1 p-6">
        <LagefeldCanvas state={state} />
      </main>
    </section>
  );
}
