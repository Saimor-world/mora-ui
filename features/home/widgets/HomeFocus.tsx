import React from 'react';
import type { FocusCard } from '@/lib/mora/bridgeData';

/** Kosmos-Mitte: was heute zählt, als Name + Zahl/Datum. Keine Karten → nichts, kein Platzhalter. */
/** Handy: mehr als zwei Karten laufen in MÔRA hinein. */
export const PHONE_FOCUS_MAX = 2;

export function HomeFocus({ cards: all, onOpen, phone = false }: { cards: FocusCard[]; onOpen: (target: FocusCard['target']) => void; phone?: boolean }) {
  const cards = phone ? all.slice(0, PHONE_FOCUS_MAX) : all;
  if (!cards.length) return null;
  return (
    <ul className="ck-focus" data-testid="home-focus" aria-label="Heute">
      {cards.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className="ck-focus__card"
            data-tone={c.tone}
            data-testid="home-focus-card"
            aria-label={`${c.label} · ${c.value}`}
            onClick={() => onOpen(c.target)}
          >
            <span>{c.label}</span>
            <b>{c.value}</b>
          </button>
        </li>
      ))}
    </ul>
  );
}
