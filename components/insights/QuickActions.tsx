'use client';

import { useState, useEffect } from 'react';
import type { MoraObject } from '@/lib/types';
import { showToast } from '@/lib/toast';

interface QuickActionsProps {
  selectedObject?: MoraObject | null;
  onFilterByTag?: (tag: string) => void;
}

// LocalStorage key for reviewed objects
const REVIEWED_OBJECTS_KEY = 'mora_reviewed_objects';

export default function QuickActions({ selectedObject, onFilterByTag }: QuickActionsProps) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  // Load reviewed IDs from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(REVIEWED_OBJECTS_KEY);
      if (stored) {
        setReviewedIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('[QuickActions] Failed to load reviewed state:', error);
    }
  }, []);

  // Save reviewed IDs to LocalStorage
  const saveReviewedState = (ids: Set<string>) => {
    try {
      localStorage.setItem(REVIEWED_OBJECTS_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
      console.error('[QuickActions] Failed to save reviewed state:', error);
    }
  };

  const handleMarkReviewed = () => {
    if (!selectedObject) return;

    const newReviewedIds = new Set(reviewedIds);
    if (newReviewedIds.has(selectedObject.id)) {
      newReviewedIds.delete(selectedObject.id);
      showToast({ message: 'Markierung entfernt', variant: 'info' });
    } else {
      newReviewedIds.add(selectedObject.id);
      showToast({ message: 'Als geprÃ¼ft markiert', variant: 'info' });
    }

    setReviewedIds(newReviewedIds);
    saveReviewedState(newReviewedIds);
  };

  const handleCopyPath = () => {
    if (!selectedObject) return;

    const textToCopy = selectedObject.path || selectedObject.url || selectedObject.spaceId || selectedObject.id;

    navigator.clipboard.writeText(textToCopy).then(
      () => showToast({ message: 'In Zwischenablage kopiert', variant: 'info' }),
      () => showToast({ message: 'Kopieren fehlgeschlagen', variant: 'error' })
    );
  };

  const handleOpenUrl = () => {
    if (!selectedObject?.url) return;

    window.open(selectedObject.url, '_blank', 'noopener,noreferrer');
    showToast({ message: 'Ã–ffne in neuem Tab', variant: 'info' });
  };

  const handleFilterByTag = (tag: string) => {
    if (onFilterByTag) {
      onFilterByTag(tag);
      showToast({ message: `Filter: #${tag}`, variant: 'info' });
    }
  };

  if (!selectedObject) {
    return (
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="text-sm text-muted-foreground">
          Waehle ein Objekt aus, um schnelle Aktionen auszufuehren.
        </div>
      </div>
    );
  }

  const isReviewed = reviewedIds.has(selectedObject.id);

  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Quick Actions
      </h3>

      <div className="space-y-2">
        {/* Mark as Reviewed */}
        <button
          onClick={handleMarkReviewed}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left mora-transition mora-ripple flex items-center gap-2 ${
            isReviewed
              ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30'
              : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
          }`}
        >
          <span className="text-base">{isReviewed ? 'âœ“' : 'â—‹'}</span>
          <span>{isReviewed ? 'Als geprÃ¼ft markiert' : 'Als geprÃ¼ft markieren'}</span>
        </button>

        {/* Copy Path */}
        <button
          onClick={handleCopyPath}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left mora-transition mora-ripple bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-2"
        >
          <span className="text-base">ðŸ“‹</span>
          <span>Pfad kopieren</span>
        </button>

        {/* Open Source URL */}
        {selectedObject.url && (
          <button
            onClick={handleOpenUrl}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left mora-transition mora-ripple bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-2"
          >
            <span className="text-base">ðŸ”—</span>
            <span>URL oeffnen</span>
          </button>
        )}

        {/* Filter by Tags */}
        {selectedObject.tags && selectedObject.tags.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2">Nach Tag filtern:</div>
            <div className="flex flex-wrap gap-1">
              {selectedObject.tags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleFilterByTag(tag)}
                  className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 mora-transition"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        Demo-Modus: Aktionen wirken nur lokal.
      </p>
    </div>
  );
}

