'use client';

import React from 'react';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

/**
 * Universe v2 – gemeinsame Bühne für die meistgenutzten Apps.
 * Ein Hero pro App: Eyebrow (Space Mono, Gold), ein Satz in Cormorant aus echten Daten,
 * eine Unterzeile und höchstens eine Handlung. Ohne v2-Flag rendert nichts.
 */
export function AppHero({ app, eyebrow, title, sub, figure, figureLabel, action, children }: {
  app: string;
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  figure?: React.ReactNode;
  figureLabel?: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode } | null;
  children?: React.ReactNode;
}) {
  if (!isUniverseV2Enabled()) return null;
  return (
    <header className="uv2-hero" data-uv2-hero={app}>
      <div className="uv2-hero__text">
        <p className="uv2-hero__eyebrow">{eyebrow}</p>
        <h2 className="uv2-hero__title">{title}</h2>
        {sub ? <p className="uv2-hero__sub">{sub}</p> : null}
        {action ? (
          <button type="button" className="uv2-hero__action" onClick={action.onClick}>
            {action.icon}{action.label}
          </button>
        ) : null}
      </div>
      {figure !== undefined ? (
        <div className="uv2-hero__figure" aria-label={figureLabel}>
          <span className="uv2-hero__num">{figure}</span>
          {figureLabel ? <span className="uv2-hero__numlabel">{figureLabel}</span> : null}
        </div>
      ) : null}
      {children}
    </header>
  );
}

/** Leerer Zustand mit Haltung: eingravierter Ring, ein Satz, eine hilfreiche Handlung. */
export function AppEmpty({ glyph, title, text, action, compact }: {
  glyph: React.ReactNode;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void } | null;
  compact?: boolean;
}) {
  return (
    <div className={'uv2-empty' + (compact ? ' uv2-empty--compact' : '')} data-uv2-empty>
      <span className="uv2-empty__ring" aria-hidden>{glyph}</span>
      <p className="uv2-empty__title">{title}</p>
      {text ? <p className="uv2-empty__text">{text}</p> : null}
      {action ? <button type="button" className="uv2-empty__action" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  );
}

export const uv2 = () => isUniverseV2Enabled();
