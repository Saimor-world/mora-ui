'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Card, Connection, FieldState } from '@/lib/lagefeld/types';

const CARD_W = 190;

const KIND_STYLE: Record<Card['kind'], { border: string; glow: string; label: string; accent: string }> = {
  signal: { border: 'rgba(96, 165, 250, 0.42)', glow: 'rgba(37, 99, 235, 0.18)', label: 'Signal', accent: 'rgba(96, 165, 250, 0.9)' },
  uncertainty: { border: 'rgba(251, 191, 36, 0.48)', glow: 'rgba(217, 119, 6, 0.18)', label: 'Unklar', accent: 'rgba(251, 191, 36, 0.9)' },
  interpretation: { border: 'rgba(196, 181, 253, 0.5)', glow: 'rgba(124, 58, 237, 0.22)', label: 'Deutung', accent: 'rgba(196, 181, 253, 0.95)' },
  action: { border: 'rgba(52, 211, 153, 0.46)', glow: 'rgba(5, 150, 105, 0.18)', label: 'Handlung', accent: 'rgba(52, 211, 153, 0.9)' },
  object: { border: 'rgba(148, 163, 184, 0.36)', glow: 'rgba(71, 85, 105, 0.16)', label: 'Objekt', accent: 'rgba(148, 163, 184, 0.9)' },
};

const SYMBOL_LABELS: Record<string, string> = {
  clock: '⏱',
  lock: '🔒',
  eye: '◉',
  check: '✓',
  loop: '↻',
  alert: '!',
};

const RELATION_STROKE: Record<Connection['relation'], string> = {
  waits_on: 'rgba(196, 181, 253, 0.5)',
  relates_to: 'rgba(125, 211, 252, 0.45)',
  contradicts: 'rgba(248, 113, 113, 0.55)',
  needs_decision: 'rgba(251, 191, 36, 0.6)',
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
      {/* Môra's living presence — a soft attention that drifts across the field
          while she reads. Signals you are not looking at a static dashboard. */}
      <motion.div
        aria-hidden="true"
        data-testid="mora-presence"
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(36px)',
          background:
            'radial-gradient(circle, rgba(45, 212, 191, 0.20), rgba(168, 85, 247, 0.12) 55%, transparent 72%)',
          mixBlendMode: 'screen',
        }}
        initial={{ x: 60, y: 40, opacity: 0.5 }}
        animate={{
          x: [60, 320, 180, 60],
          y: [40, 150, 250, 40],
          opacity: [0.45, 0.65, 0.5, 0.45],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />

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
          const stroke = RELATION_STROKE[edge.relation] ?? 'rgba(226, 232, 240, 0.36)';
          const dashed = edge.relation === 'needs_decision' || edge.relation === 'contradicts';
          return (
            <motion.line
              key={`${edge.from}-${edge.to}-${index}`}
              data-testid="lagefeld-edge"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={stroke}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray={dashed ? '5 6' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                dashed
                  ? { pathLength: 1, opacity: 1, strokeDashoffset: [0, -22] }
                  : { pathLength: 1, opacity: 1 }
              }
              transition={
                dashed
                  ? {
                      pathLength: { duration: 0.6, delay: 0.2 + index * 0.05 },
                      opacity: { duration: 0.4, delay: 0.2 + index * 0.05 },
                      strokeDashoffset: { duration: 1.1, repeat: Infinity, ease: 'linear' },
                    }
                  : { duration: 0.6, delay: 0.2 + index * 0.05 }
              }
            />
          );
        })}
      </svg>

      {state.cards.map((card, index) => {
        const style = KIND_STYLE[card.kind];
        const isAlert = card.status === 'alert';
        const baseShadow = '0 20px 48px rgba(0, 0, 0, 0.28)';
        const alertShadow = `0 0 0 1px rgba(248, 113, 113, 0.5), 0 18px 44px rgba(220, 38, 38, 0.28)`;
        return (
          <motion.article
            key={card.id}
            data-testid={`lagefeld-card-${card.kind}`}
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
            }}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={
              isAlert
                ? { opacity: 1, y: 0, scale: 1, boxShadow: [baseShadow, alertShadow, baseShadow] }
                : { opacity: 1, y: 0, scale: 1, boxShadow: baseShadow }
            }
            transition={
              isAlert
                ? {
                    opacity: { duration: 0.4, delay: index * 0.06 },
                    y: { duration: 0.4, delay: index * 0.06 },
                    scale: { duration: 0.4, delay: index * 0.06 },
                    boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                  }
                : { duration: 0.4, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }
            }
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 12,
                bottom: 12,
                width: 3,
                borderRadius: 3,
                background: style.accent,
                opacity: 0.8,
              }}
            />
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
          </motion.article>
        );
      })}
    </div>
  );
}
