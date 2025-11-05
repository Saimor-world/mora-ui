'use client';

import { useAppContext } from '@/lib/contexts';

export default function Lens() {
  const { mode, setMode } = useAppContext();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Mode Switcher */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          View Mode
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('folder')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'folder'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            📁 Folder
          </button>
          <button
            onClick={() => setMode('field')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'field'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            🌐 Field
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Spaces
        </h3>
        <ul className="space-y-1">
          <li>
            <a href="#" className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
              🏠 Home
            </a>
          </li>
          <li>
            <a href="#" className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
              💼 Work
            </a>
          </li>
          <li>
            <a href="#" className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
              📚 Projects
            </a>
          </li>
        </ul>

        <h3 className="text-xs font-semibold text-muted-foreground mb-2 mt-6 uppercase tracking-wide">
          Recent
        </h3>
        <ul className="space-y-1">
          <li>
            <a href="#" className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors truncate">
              Meeting Notes.md
            </a>
          </li>
          <li>
            <a href="#" className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors truncate">
              Project Proposal.pdf
            </a>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Môra UI v0.1
        </p>
      </div>
    </aside>
  );
}
