'use client';

import React from 'react';
import { MessageSquare, Mic2, Radio } from 'lucide-react';

interface LagefeldEmptyStateProps {
  onOpenChat: () => void;
  onOpenVoice: () => void;
}

export function LagefeldEmptyState({ onOpenChat, onOpenVoice }: LagefeldEmptyStateProps) {
  return (
    <div
      data-testid="lagefeld-empty"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/[0.12] bg-white/[0.03] px-8 py-12 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-100/[0.06]">
        <Radio className="h-6 w-6 text-cyan-200/70" />
      </div>
      <h2 className="text-lg font-medium text-white/88">Noch keine Signale</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/48">
        Môra zeigt hier deine echte Lage — aus Post, Kalender, Aufgaben und System-Signalen.
        Sobald Daten verbunden sind oder Môra etwas erkannt hat, erscheinen Karten hier.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenChat}
          className="inline-flex items-center gap-2 rounded-full border border-violet-300/22 bg-violet-500/14 px-4 py-2 text-sm font-medium text-violet-50 transition-colors hover:border-violet-200/35 hover:bg-violet-500/22"
        >
          <MessageSquare className="h-4 w-4" />
          Mit Mora schreiben
        </button>
        <button
          type="button"
          onClick={onOpenVoice}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-500/12 px-4 py-2 text-sm font-medium text-cyan-50 transition-colors hover:border-cyan-200/35 hover:bg-cyan-500/20"
        >
          <Mic2 className="h-4 w-4" />
          Sprache öffnen
        </button>
      </div>
      <p className="mt-4 text-[11px] text-white/30">Alt+A · Leertaste halten im Voice-Raum</p>
    </div>
  );
}
