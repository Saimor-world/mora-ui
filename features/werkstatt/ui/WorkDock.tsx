'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import { JADE_MORA_SRC } from '@/components/world/JadeMora';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

export interface DockAction { id: string; label: string; run: () => void; pressed?: boolean; disabled?: boolean }

/**
 * Der Dock bleibt Kommandozentrale: links MÔRA, dann „zurück“ (immer dorthin, woher man kam),
 * dann nur die Handgriffe, die an diesem Ort Sinn ergeben. Liegt über der Icon-Leiste des Arbeitsmodus.
 */
export function WorkDock({ back, actions }: { back: { label: string; run: () => void } | null; actions: DockAction[] }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="wk-dock" role="toolbar" aria-label="Aktionen an diesem Ort" data-testid="wk-dock">
      <button type="button" className="wk-dock__mora" onClick={() => useOsShellStore.getState().setMoraOpen(true)} aria-label="MÔRA fragen" data-testid="wk-dock-mora">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={JADE_MORA_SRC} alt="" width={20} height={26} draggable={false} />
        <span>MÔRA</span>
      </button>
      {back ? (
        <button type="button" className="wk-dock__btn wk-dock__back" onClick={back.run} data-testid="wk-dock-back" aria-label={`Zurück: ${back.label}`}>
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden /><span>{back.label}</span>
        </button>
      ) : null}
      {actions.length ? <i className="wk-dock__sep" aria-hidden /> : null}
      {actions.map((a) => (
        <button key={a.id} type="button" className="wk-dock__btn" onClick={a.run} aria-pressed={a.pressed} disabled={a.disabled} data-testid={`wk-dock-${a.id}`}>{a.label}</button>
      ))}
    </div>,
    document.body,
  );
}
