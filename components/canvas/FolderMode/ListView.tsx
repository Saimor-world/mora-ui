'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMemoryFacts } from '@/lib/hooks/useApi';
import { useAppContext } from '@/lib/contexts';
import DocumentViewer from '@/components/documents/DocumentViewer';
import type { MoraObject } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { emitMoraEvent } from '@/lib/mora/listener';

const REVIEWED_OBJECTS_KEY = 'mora_reviewed_objects';

function formatTimeAgo(timestamp?: string): string {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function ListView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'modified'>('modified');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerObject, setViewerObject] = useState<MoraObject | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [inlinePreviewId, setInlinePreviewId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const { setSelectedObject, orb, activeTagFilter, setActiveTagFilter } = useAppContext();

  const filters: Record<string, string> = {};
  if (orb !== 'all') filters.orb = orb;
  if (activeTagFilter) filters.tag = activeTagFilter;
  const hasFilters = Object.keys(filters).length > 0;
  const { data: objects, isLoading, error } = useMemoryFacts(hasFilters ? filters : undefined);

  const filteredObjects = (objects || []).filter((obj) => {
    if (!activeTagFilter) return true;
    return obj.tags?.includes(activeTagFilter);
  });

  const sortedObjects = filteredObjects.slice().sort((a, b) => {
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    }
    const aTime = new Date(a.ts || 0).getTime();
    const bTime = new Date(b.ts || 0).getTime();
    return bTime - aTime;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REVIEWED_OBJECTS_KEY);
      if (stored) {
        setReviewedIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.warn('[Folder] Failed to load reviewed ids', err);
    }
  }, []);

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && selected) {
        setInlinePreviewId(selected);
        const target = sortedObjects.find((obj) => obj.id === selected);
        if (target) {
          emitMoraEvent('open_document', {
            id: target.id,
            title: target.title,
            path: target.path,
            tags: target.tags,
          });
        }
      }
      if (event.key === 'Escape') {
        setInlinePreviewId(null);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [selected, sortedObjects]);

  const inlinePreviewObject = useMemo(
    () => sortedObjects.find((obj) => obj.id === inlinePreviewId) ?? null,
    [sortedObjects, inlinePreviewId]
  );

  const selectionObjects = useMemo(
    () => sortedObjects.filter((obj) => selectedRows.has(obj.id)),
    [sortedObjects, selectedRows]
  );

  const persistReviewed = (ids: Set<string>) => {
    try {
      localStorage.setItem(REVIEWED_OBJECTS_KEY, JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.warn('[Folder] Failed to persist reviewed ids', err);
    }
  };

  const handleSelect = (obj: MoraObject) => {
    setSelected(obj.id);
    setSelectedObject(obj);
    setSelectedRows(new Set([obj.id]));
  };

  const handlePreview = (obj: MoraObject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewerObject(obj);
    setViewerOpen(true);
    emitMoraEvent('open_document', {
      id: obj.id,
      title: obj.title,
      path: obj.path,
      tags: obj.tags,
    });
  };

  const handleOpenExternal = (obj: MoraObject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const externalUrl = (obj as any).file_url || obj.url;
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      showToast({ message: 'Öffne in neuem Tab', variant: 'info' });
    } else {
      showToast({
        message: 'Keine externe Quelle vorhanden – bitte Preview nutzen.',
        variant: 'info',
      });
    }
  };

  const handleCopyPath = (obj: MoraObject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const textToCopy = obj.path || obj.url || obj.spaceId || obj.id;
    navigator.clipboard.writeText(textToCopy).then(
      () => showToast({ message: 'Pfad kopiert', variant: 'info' }),
      () => showToast({ message: 'Kopieren fehlgeschlagen', variant: 'error' })
    );
  };

  const handleRowCheckbox = (id: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const markSelectionReviewed = () => {
    if (selectionObjects.length === 0) return;
    setReviewedIds((prev) => {
      const next = new Set(prev);
      selectionObjects.forEach((obj) => next.add(obj.id));
      persistReviewed(next);
      return next;
    });
    showToast({ message: 'Als geprüft markiert', variant: 'info' });
  };

  const copySelectionPaths = async () => {
    if (selectionObjects.length === 0) return;
    const payload = selectionObjects
      .map((obj) => obj.path || obj.url || obj.spaceId || obj.id)
      .join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      showToast({ message: 'Pfade kopiert', variant: 'info' });
    } catch {
      showToast({ message: 'Kopieren fehlgeschlagen', variant: 'error' });
    }
  };

  const hasInlinePreview = Boolean(inlinePreviewObject);

  return (
    <div className="p-4">
      <div className={`grid gap-6 ${hasInlinePreview ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <div>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-primary/20 mora-breathe" />
                  <div className="absolute inset-2 rounded-full bg-primary/30 mora-breathe" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute inset-4 rounded-full bg-primary/40 mora-breathe" style={{ animationDelay: '0.4s' }} />
                </div>
                <p className="text-sm text-muted-foreground tracking-wide">Loading objects...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Failed to load objects</p>
                <p className="text-xs text-muted-foreground">Check API connection</p>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {selectedRows.size > 0 && (
                <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-border bg-card/90 px-4 py-3 flex items-center justify-between shadow">
                  <span className="text-sm font-medium">{selectedRows.size} ausgewählt</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={markSelectionReviewed}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      ✓ Mark reviewed
                    </button>
                    <button
                      onClick={copySelectionPaths}
                      className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80"
                    >
                      📋 Copy paths
                    </button>
                    <button
                      onClick={() => setSelectedRows(new Set())}
                      className="px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground"
                      aria-label="Auswahl löschen"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{sortedObjects.length} objects</span>
                  {orb !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Orb: {orb}
                    </span>
                  )}
                  {activeTagFilter && (
                    <button
                      onClick={() => setActiveTagFilter(null)}
                      className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 text-xs font-medium hover:bg-amber-500/30 mora-transition"
                    >
                      #{activeTagFilter} entfernen
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      sortBy === 'name'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => setSortBy('modified')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      sortBy === 'modified'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    Modified
                  </button>
                </div>
              </div>

              {sortedObjects.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">
                    Keine Objekte gefunden. {hasFilters ? 'Filter zurücksetzen?' : 'Verbinde zuerst eine Quelle.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedObjects.map((obj) => {
                    const isSelected = selected === obj.id;
                    const isHovered = hoveredRow === obj.id;
                    const isPreviewed = inlinePreviewId === obj.id;
                    return (
                      <div
                        key={obj.id}
                        onClick={() => handleSelect(obj)}
                        onDoubleClick={() => handlePreview(obj)}
                        onMouseEnter={() => setHoveredRow(obj.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSelect(obj);
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300 text-left ${
                          isSelected
                            ? 'bg-primary/15 border border-primary/50 shadow-[0_0_30px_rgba(34,197,94,0.18)]'
                            : isHovered
                            ? 'bg-secondary/30 border border-secondary/60'
                            : 'border border-transparent hover:bg-secondary/20 hover:border-secondary/60'
                        } ${isPreviewed ? 'ring-1 ring-primary/40' : ''}`}
                      >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(obj.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleRowCheckbox(obj.id, e.target.checked)}
                        aria-label={`Objekt ${obj.title} auswählen`}
                      />
                      <span className="text-xl">
                        {obj.type === 'file' ? '📄' :
                         obj.type === 'link' ? '🔗' :
                         obj.type === 'note' ? '📝' :
                         obj.type === 'email' ? '✉️' :
                         obj.type === 'task' ? '✓' : '🌱'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-left">{obj.title}</span>
                          {obj.tags && obj.tags.length > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                              #{obj.tags[0]}
                            </span>
                          )}
                          {obj.source === 'mock' && (
                            <span className="text-[10px] uppercase tracking-wide text-amber-500">Demo</span>
                          )}
                          {reviewedIds.has(obj.id) && (
                            <span className="text-[10px] text-green-500">Reviewed</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {obj.path || obj.url || obj.spaceId}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(obj.ts)}
                      </div>

                      {hoveredRow === obj.id && (
                        <div className="absolute right-2 flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1 mora-transition shadow-lg">
                          <button
                            onClick={(e) => handlePreview(obj, e)}
                            className="p-1.5 hover:bg-secondary rounded mora-transition text-base"
                            title="Preview"
                          >
                            👁️
                          </button>
                          <button
                            onClick={(e) => handleOpenExternal(obj, e)}
                            className="p-1.5 hover:bg-secondary rounded mora-transition text-base"
                            title="Open Source"
                          >
                            🔍
                          </button>
                          <button
                            onClick={(e) => handleCopyPath(obj, e)}
                            className="p-1.5 hover:bg-secondary rounded mora-transition text-base"
                            title="Copy Path"
                          >
                            📋
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {inlinePreviewObject && (
          <aside className="rounded-3xl border border-border bg-card/80 p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Inline Preview</p>
                <h3 className="text-lg font-semibold">{inlinePreviewObject.title}</h3>
              </div>
              <button
                onClick={() => setInlinePreviewId(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
                aria-label="Inline Preview schließen"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>{inlinePreviewObject.type}</div>
              <div className="font-mono break-all">{inlinePreviewObject.path || inlinePreviewObject.url || inlinePreviewObject.spaceId}</div>
              {inlinePreviewObject.tags && inlinePreviewObject.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {inlinePreviewObject.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <button
                onClick={(e) => handlePreview(inlinePreviewObject, e)}
                className="w-full px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                In Viewer öffnen
              </button>
              <button
                onClick={(e) => handleOpenExternal(inlinePreviewObject, e)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              >
                Quelle öffnen
              </button>
            </div>
          </aside>
        )}
      </div>

      {viewerOpen && viewerObject && (
        <DocumentViewer object={viewerObject} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
