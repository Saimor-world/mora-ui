'use client';

import { useState } from 'react';
import TreeView from './FolderMode/TreeView';
import ListView from './FolderMode/ListView';

export type ViewType = 'tree' | 'list';

export default function FolderMode() {
  const [view, setView] = useState<ViewType>('tree');

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">📁 Folder Mode</h2>
          <div className="flex gap-1 bg-secondary rounded-md p-1">
            <button
              onClick={() => setView('tree')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'tree'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              🌳 Tree
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              📋 List
            </button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {view === 'tree' ? 'Hierarchical view' : 'Flat file list'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'tree' ? <TreeView /> : <ListView />}
      </div>
    </div>
  );
}
