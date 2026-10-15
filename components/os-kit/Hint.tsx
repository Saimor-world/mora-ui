'use client';
import React from 'react';
import { Info, Lightbulb, TriangleAlert } from 'lucide-react';

/**
 * V1.6 Hinweis (aus Legacy `components/mora/MoraHint.tsx`, überarbeitet):
 * ohne Framer-Animation und ohne feste Farben – Ton kommt aus den Phasen-Tokens,
 * role="note", optional mit Aktion und Schließen.
 */
export function Hint({ tone = 'info', children, action, onDismiss, testId }: {
  tone?: 'info' | 'insight' | 'warning';
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  testId?: string;
}) {
  const Icon = tone === 'warning' ? TriangleAlert : tone === 'insight' ? Lightbulb : Info;
  return (
    <div className="os-hint" data-tone={tone} role="note" data-testid={testId}>
      <Icon size={14} aria-hidden className="os-hint__icon" />
      <div className="os-hint__body">{children}</div>
      {action}
      {onDismiss ? <button type="button" className="os-hint__close" onClick={onDismiss} aria-label="Hinweis schließen">×</button> : null}
    </div>
  );
}

/** Zählerplakette (aus Legacy MemoryBadge): nur sichtbar, wenn es etwas zu zählen gibt. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (!count) return null;
  return <span className="os-count-badge" aria-label={`${count} ${label}`} title={`${count} ${label}`}>{count > 99 ? '99+' : count}</span>;
}
