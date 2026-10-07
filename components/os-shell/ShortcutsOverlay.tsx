'use client';
import React from 'react';
import type { FeatureManifest } from '@/features/types';
import { Text } from '@/components/os-kit';

/** V1.4 – „?“: alle Tastenkürzel der Kommandozentrale auf einen Blick. */
export function ShortcutsOverlay({ items, onClose }: { items: FeatureManifest[]; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ['⌘K / Ctrl K', 'Befehle: Orte, Planeten, Dokumente, MÔRA fragen'],
    ...items.slice(0, 9).map((m, i) => [String(i + 1), m.title] as [string, string]),
    ['M', 'MÔRA öffnen oder schließen'],
    ['U', 'Universe'],
    ['⌘J / Ctrl J', 'MÔRA öffnen oder schließen'],
    ['Esc', 'Schließen, Fokus im Universe lösen'],
    ['C', 'Control Center (Kontext, Szene, Focus)'],
    ['Strg ⇧ F', 'Focus Mode 25 Minuten an/aus'],
    ['?', 'Diese Übersicht'],
  ];
  return (
    <div className="os-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Tastenkürzel" className="os-dialog os-shortcuts" data-testid="shortcuts-overlay">
        <Text variant="eyebrow">Kommandozentrale</Text>
        <Text variant="title" as="h2" className="mt-1 mb-4">Tastenkürzel</Text>
        <div className="os-shortcuts__grid">
          {rows.map(([k, label]) => (
            <React.Fragment key={k + label}>
              <span className="os-kbd os-shortcuts__key">{k}</span>
              <Text tone="default">{label}</Text>
            </React.Fragment>
          ))}
        </div>
        <Text variant="meta" className="mt-4">Kürzel greifen nicht, solange du in einem Eingabefeld schreibst.</Text>
      </div>
    </div>
  );
}
