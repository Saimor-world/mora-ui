'use client';

import type { MoraObject } from '@/lib/types';

interface ContextPanelProps {
  selectedObject?: MoraObject | null;
}

export default function ContextPanel({ selectedObject }: ContextPanelProps) {
  if (!selectedObject) {
    return (
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Context
        </h3>
        <div className="text-sm text-muted-foreground">
          No object selected
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Context
      </h3>

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
          <div className="text-sm">{selectedObject.spaceId}</div>
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
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            Open
          </button>
          <button className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors">
            ···
          </button>
        </div>
      </div>
    </div>
  );
}
