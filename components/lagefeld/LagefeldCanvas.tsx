'use client';

import React from 'react';
import type { Card, FieldState } from '@/lib/lagefeld/types';

const CARD_W = 190;

const KIND_STYLE: Record<Card['kind'], { border: string; glow: string; label: string }> = {
  signal: { border: 'rgba(96, 165, 250, 0.42)', glow: 'rgba(37, 99, 235, 0.18)', label: 'Signal' },
  uncertainty: { border: 'rgba(251, 191, 36, 0.48)', glow: 'rgba(217, 119, 6, 0.18)', label: 'Unklar' },
  interpretation: { border: 'rgba(196, 181, 253, 0.42)', glow: 'rgba(124, 58, 237, 0.18)', label: 'Deutung' },
  action: { border: 'rgba(52, 211, 153, 0.46)', glow: 'rgba(5, 150, 105, 0.18)', label: 'Handlung' },
  object: { border: 'rgba(148, 163, 184, 0.36)', glow: 'rgba(71, 85, 105, 0.16)', label: 'Objekt' },
};

const SYMBOL_LABELS: Record<string, string> = {
  clock: '⏱',
  lock: '🔒',
  eye: '◉',
  check: '✓',
  loop: '↻',
  alert: '!',
};

function center(card: Card) {
  return { x: card.x + CARD_W / 2, y: card.y + 44 };
}

export function LagefeldCanvas({ state }: { state: FieldState }) {
  const cardsById = new Map(state.cards.map((card) => [card.id, card]));

  return (
    <div
      aria-label="Lagefeld"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 460,
        overflow: 'hidden',
        borderRadius: 22,
        background:
          'radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.14), transparent 26%), radial-gradient(circle at 78% 28%, rgba(168, 85, 247, 0.13), transparent 28%), rgba(3, 7, 18, 0.78)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
      }}
    >
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {state.connections.map((edge, index) => {
          const from = cardsById.get(edge.from);
          const to = cardsById.get(edge.to);
          if (!from || !to) return null;
          const start = center(from);
          const end = center(to);
          return (
            <line
              key={`${edge.from}-${edge.to}-${index}`}
              data-testid="lagefeld-edge"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(226, 232, 240, 0.36)"
              strokeWidth={1.3}
              strokeDasharray={edge.relation === 'needs_decision' ? '4 4' : undefined}
            />
          );
        })}
      </svg>

      {state.cards.map((card) => {
        const style = KIND_STYLE[card.kind];
        return (
          <article
            key={card.id}
            style={{
              position: 'absolute',
              left: card.x,
              top: card.y,
              width: CARD_W,
              borderRadius: 16,
              padding: '10px 12px',
              color: 'rgba(248, 250, 252, 0.94)',
              background: `linear-gradient(145deg, ${style.glow}, rgba(15, 23, 42, 0.86))`,
              border: `1px solid ${style.border}`,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.72 }}>
                {style.label}
              </span>
              <span aria-hidden="true" style={{ display: 'flex', gap: 4, fontSize: 12 }}>
                {card.symbols.map((symbol) => (
                  <span key={symbol}>{SYMBOL_LABELS[symbol] ?? symbol}</span>
                ))}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{card.title}</div>
            {card.body ? <p style={{ margin: '6px 0 0', opacity: 0.76, fontSize: 12 }}>{card.body}</p> : null}
            {card.action?.locked ? (
              <button
                type="button"
                style={{
                  marginTop: 9,
                  borderRadius: 999,
                  border: '1px solid rgba(52, 211, 153, 0.45)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'rgba(209, 250, 229, 0.96)',
                  padding: '5px 10px',
                  fontSize: 12,
                }}
              >
                Freigeben
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
