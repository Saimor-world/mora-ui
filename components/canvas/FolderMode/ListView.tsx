'use client';

import { useState } from 'react';
import { useMemoryFacts } from '@/lib/hooks/useApi';
import { useAppContext } from '@/lib/contexts';

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
  const { setSelectedObject } = useAppContext();

  // Fetch real data from API
  const { data: objects, isLoading, error } = useMemoryFacts();

  const sortedObjects = (objects || []).slice().sort((a, b) => {
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    }
    // Sort by timestamp (most recent first)
    const aTime = new Date(a.ts || 0).getTime();
    const bTime = new Date(b.ts || 0).getTime();
    return bTime - aTime;
  });

  const handleSelect = (obj: typeof sortedObjects[0]) => {
    setSelected(obj.id);
    setSelectedObject(obj);
  };

  return (
    <div className="p-4">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading objects...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">Failed to load objects</p>
            <p className="text-xs text-muted-foreground">Check API connection</p>
          </div>
        </div>
      )}

      {/* Data Loaded */}
      {!isLoading && !error && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {sortedObjects.length} objects
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

          {/* List */}
          {sortedObjects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No objects found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedObjects.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => handleSelect(obj)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-colors text-left ${
                    selected === obj.id
                      ? 'bg-primary/20 border border-primary/40'
                      : 'hover:bg-secondary border border-transparent'
                  }`}
                >
                  <span className="text-xl">
                    {obj.type === 'memory' ? '🧠' :
                     obj.type === 'code' ? '💻' :
                     obj.type === 'document' ? '📄' :
                     obj.type === 'project' ? '📁' : '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{obj.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {obj.path || `/${obj.spaceId}`}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(obj.ts)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
