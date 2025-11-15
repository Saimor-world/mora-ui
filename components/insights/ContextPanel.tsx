'use client';

import { useState } from 'react';
import type { MoraObject } from '@/lib/types';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { showToast } from '@/lib/toast';

interface ContextPanelProps {
  selectedObject?: MoraObject | null;
}

export default function ContextPanel({ selectedObject }: ContextPanelProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  if (!selectedObject) {
    return (
      <div className="p-4" aria-live="polite">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Kein Objekt ausgewaehlt</p>
          <div className="text-sm text-muted-foreground">
            Waehle ein Objekt im Field oder Folder, dann halte ich hier die Details fest.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Objekt ausgewaehlt</p>
            <p className="text-sm text-muted-foreground">Details aus Field oder Folder.</p>
          </div>
          {selectedObject.source === 'mock' && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded border border-amber-500/30 whitespace-nowrap">
              Demo
            </span>
          )}
        </div>

        {/* Object Details */}
        <div className="space-y-3">
          {/* Title */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Title</div>
            <div className="font-medium">{selectedObject.title}</div>
          </div>

          {/* Type */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium">
              {selectedObject.type}
            </div>
          </div>

          {/* Space */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Space</div>
            <div className="text-sm">{selectedObject.spaceId || 'Unbekannt'}</div>
          </div>

          {/* Path */}
          {selectedObject.path && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Path</div>
              <div className="text-sm text-muted-foreground font-mono text-xs break-all">
                {selectedObject.path}
              </div>
            </div>
          )}

          {/* Tags */}
          {selectedObject.tags && selectedObject.tags.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {selectedObject.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {selectedObject.ts && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Modified</div>
              <div className="text-sm">{selectedObject.ts}</div>
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
      </div>

      {/* Document Viewer Modal */}
      {viewerOpen && (
        <DocumentViewer object={selectedObject} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
