'use client';

import React, { useMemo, useCallback } from 'react';
import { Activity, MessageSquare, Mic2, Sparkles, RotateCcw } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { LagefeldCanvas } from '@/components/lagefeld/LagefeldCanvas';
import { LagefeldEmptyState } from '@/components/lagefeld/LagefeldEmptyState';
import { reduceUiActions } from '@/lib/lagefeld/reduceUiActions';
import { useLagefeldSignals } from '@/lib/hooks/useLagefeldSignals';
import { useLagefeldDeutung } from '@/lib/hooks/useLagefeldDeutung';
import { usePaneStore } from '@/lib/store/paneStore';
import { openVoiceOverlay } from '@/lib/os/openVoiceOverlay';

export default function LagefeldApp({ initialData }: AppProps) {
  const { uiActions, openFlow, hasSignals } = useLagefeldSignals(initialData);
  const { deuten, actions: deutungActions, isLoading: deuting, error: deutungError, reset } = useLagefeldDeutung();
  const effectiveActions = deutungActions ?? uiActions;
  const state = useMemo(() => reduceUiActions(effectiveActions), [effectiveActions]);
  const openPane = usePaneStore((s) => s.openPane);

  const requestDeutung = useCallback(() => {
    void deuten(openFlow).catch(() => { /* surfaced via deutungError */ });
  }, [deuten, openFlow]);

  const source = typeof initialData?.source === 'string' ? initialData.source : 'lagefeld';
  const prompt = typeof initialData?.prompt === 'string' ? initialData.prompt : undefined;

  const openChat = useCallback(() => {
    openPane({
      id: 'chat-main',
      type: 'chat',
      title: 'Mora',
      size: { width: 860, height: 680 },
    });
  }, [openPane]);

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
            Signale aus deinen echten Quellen — Mail, Kalender, Aufgaben und Môra-Beobachtungen.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-cyan-100/12 bg-cyan-100/[0.06] px-3 py-1.5 text-[11px] text-cyan-100/60">
            {deutungActions ? 'Môras Deutung' : source === 'ambient-room' ? 'aus dem Voice-Raum' : 'Situationsboard'}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={requestDeutung}
              disabled={deuting || !hasSignals}
              data-testid="lagefeld-deuten"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/24 bg-amber-400/12 px-3 py-1.5 text-[11px] font-medium text-amber-100/90 transition-colors hover:border-amber-200/40 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${deuting ? 'animate-pulse' : ''}`} />
              {deuting ? 'Môra deutet…' : deutungActions ? 'Neu deuten' : 'Mit Môra deuten'}
            </button>
            {deutungActions ? (
              <button
                type="button"
                onClick={reset}
                data-testid="lagefeld-deuten-reset"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:border-white/28 hover:bg-white/[0.1]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Übersicht
              </button>
            ) : null}
            <button
              type="button"
              onClick={openChat}
              data-testid="lagefeld-open-chat"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-500/12 px-3 py-1.5 text-[11px] font-medium text-violet-100/90 transition-colors hover:border-violet-200/32 hover:bg-violet-500/20"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Mit Mora schreiben
            </button>
            <button
              type="button"
              onClick={openVoiceOverlay}
              data-testid="lagefeld-open-voice"
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/18 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100/85 transition-colors hover:border-cyan-200/30 hover:bg-cyan-500/18"
            >
              <Mic2 className="h-3.5 w-3.5" />
              Sprache
            </button>
          </div>
        </div>
      </header>

      {prompt ? (
        <div className="mx-6 mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/62">
          <span className="mr-2 text-[10px] uppercase tracking-[0.22em] text-white/34">Ausgangspunkt</span>
          {prompt}
        </div>
      ) : null}

      <main className="flex-1 p-6">
        {deutungError ? (
          <div
            data-testid="lagefeld-deuten-error"
            className="mb-3 rounded-xl border border-amber-300/24 bg-amber-400/[0.08] px-4 py-2.5 text-[12px] text-amber-100/80"
          >
            {deutungError}
          </div>
        ) : null}
        {hasSignals ? (
          <LagefeldCanvas state={state} />
        ) : (
          <LagefeldEmptyState onOpenChat={openChat} onOpenVoice={openVoiceOverlay} />
        )}
      </main>
    </section>
  );
}
