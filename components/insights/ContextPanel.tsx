'use client';

import { useState } from 'react';
import type { MoraObject } from '@/lib/types';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { showToast } from '@/lib/toast';
import PanelCard from '@/components/ui/PanelCard';
import { useMyceliumSelection } from '@/lib/mycelium/selection';
import MyceliumContextChip from '@/components/ui/MyceliumContextChip';
import { isSemanticEnabled } from '@/lib/api/semantic';

interface ContextPanelProps {
  selectedObject?: MoraObject | null;
}

export default function ContextPanel({ selectedObject }: ContextPanelProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const { selection } = useMyceliumSelection();
  const effectiveObject =
    selectedObject ?? (selection.kind === 'node' ? selection.object ?? null : null);
  const semanticActive = isSemanticEnabled();

  if (!effectiveObject) {
    return (
      <div className="p-4" aria-live="polite">
        <PanelCard paddingClassName="p-4" className="bg-card/80 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Kontext</p>
          <div className="text-sm text-muted-foreground">
            Kein Objekt ausgewaehlt. Waehle im Feld (Myzel) oder in der Ordner-Ansicht ein Objekt, dann erscheinen hier Titel, Typ, Tags, Pfad und Quick Actions als Basis fuer Moras Antworten.
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PanelCard paddingClassName="p-5" className="bg-card/80 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Objektdetails</p>
            <p className="text-sm text-muted-foreground">Details zu dem Objekt aus Feld oder Ordner. Der Myzel-Kontext-Chip zeigt, worauf sich Moras Antworten beziehen. Demo-Daten spiegeln heute den Ablauf mit spaeter echten Inhalten.</p>
            <MyceliumContextChip />
          </div>
          {effectiveObject.source === 'mock' && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded border border-amber-500/30 whitespace-nowrap">
              Demo
            </span>
          )}
        </div>
        {semanticActive && (
          <p className="text-[11px] text-muted-foreground">
            Wenn die semantische Auswertung aktiv ist, koennen Antworten diesen Kontext nutzen.
          </p>
        )}

        <div className="h-px bg-gradient-to-r from-primary/25 via-border to-transparent rounded-full" aria-hidden="true" />

        {/* Object Details */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Titel</div>
            <div className="font-medium">{effectiveObject.title}</div>
          </div>

          {/* Type */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Typ</div>
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium">
              {effectiveObject.type}
            </div>
          </div>

          {/* Space */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Bereich</div>
            <div className="text-sm">{effectiveObject.spaceId || 'Unbekannt'}</div>
          </div>

          {/* Path */}
          {effectiveObject.path && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Path</div>
              <div className="text-sm text-muted-foreground font-mono text-xs break-all">
                {effectiveObject.path}
              </div>
            </div>
          )}

          {/* Tags */}
          {effectiveObject.tags && effectiveObject.tags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {effectiveObject.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {effectiveObject.ts && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Modified</div>
              <div className="text-sm">{effectiveObject.ts}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setViewerOpen(true)}
              className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all duration-200"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() =>
                showToast({
                  message: 'Demo-Modus: Aktion noch nicht aktiv.',
                  variant: 'info',
                })
              }
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-all duration-200"
            >
              Demo-Hinweis
            </button>
          </div>
        </div>
      </PanelCard>

      {/* Document Viewer Modal */}
      {viewerOpen && (
        <DocumentViewer object={effectiveObject} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
