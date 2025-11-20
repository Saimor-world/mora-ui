/**
 * Space Selector Component
 *
 * Beautiful organic UI for selecting and managing spaces
 * Shows all spaces with stats and quick actions
 */

'use client';

import { useSpaceStore, useHasSpaces } from '@/store/spaces';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateSpaceDialog from './CreateSpaceDialog';

export default function SpaceSelector() {
  const { spaces, currentSpaceId, setCurrentSpace } = useSpaceStore();
  const hasSpaces = useHasSpaces();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleOpenSpace = (spaceId: string) => {
    setCurrentSpace(spaceId);
    router.push(`/spaces/${spaceId}/field`);
  };

  if (!hasSpaces) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-transparent backdrop-blur-xl p-12 text-center animate-in fade-in slide-in-from-bottom duration-700">
        <div className="text-6xl mb-6 animate-bounce">🌱</div>
        <h3 className="text-2xl font-semibold mb-3">Willkommen bei Môra!</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Erstelle deinen ersten Space, um deine Datenquellen zu organisieren.
          Jeder Space ist ein isoliertes Myzelium mit eigenen Quellen und Einstellungen.
        </p>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500/90 via-emerald-600/80 to-emerald-500/90 text-emerald-50 text-sm font-semibold shadow-[0_4px_24px_0_rgba(16,185,129,0.4)] hover:shadow-[0_8px_40px_0_rgba(16,185,129,0.6)] hover:scale-105 mora-transition"
        >
          🌿 Ersten Space erstellen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span>🌳</span>
            <span>Deine Spaces</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {spaces.length} {spaces.length === 1 ? 'Space' : 'Spaces'} · Wähle einen zum Öffnen
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-6 py-3 rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-emerald-900/15 to-transparent backdrop-blur-lg text-emerald-200/90 hover:text-emerald-100 hover:border-emerald-500/50 hover:scale-105 text-sm mora-transition"
        >
          ➕ Neuer Space
        </button>
      </div>

      {/* Space Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space, idx) => (
          <SpaceCard
            key={space.id}
            space={space}
            isActive={space.id === currentSpaceId}
            onOpen={() => handleOpenSpace(space.id)}
            delay={idx * 100}
          />
        ))}
      </div>

      {/* Create Space Dialog */}
      <CreateSpaceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}

function SpaceCard({
  space,
  isActive,
  onOpen,
  delay,
}: {
  space: any;
  isActive: boolean;
  onOpen: () => void;
  delay: number;
}) {
  const sourceCount = space.sources?.length || 0;
  const objectCount = space.stats?.objectCount || 0;
  const lastSync = space.stats?.lastSync
    ? new Date(space.stats.lastSync)
    : null;

  const lastSyncLabel = lastSync
    ? formatTimeAgo(lastSync)
    : 'Noch nicht synchronisiert';

  // Use branding colors if available
  const primaryColor = space.branding?.primaryColor;
  const borderColor = primaryColor
    ? `${primaryColor}40` // 25% opacity
    : 'rgb(16 185 129 / 0.2)';
  const bgColor = primaryColor
    ? `${primaryColor}15` // 8% opacity
    : 'rgb(16 185 129 / 0.1)';

  return (
    <div
      className={`
        rounded-3xl border backdrop-blur-xl p-6
        hover:scale-105 mora-transition cursor-pointer
        animate-in fade-in slide-in-from-bottom duration-700
        ${
          isActive
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-transparent shadow-[0_8px_32px_0_rgba(16,185,129,0.2)]'
            : 'border-border/10 bg-gradient-to-br from-card/50 via-card/30 to-transparent hover:border-emerald-500/30'
        }
      `}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      {/* Icon & Name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="text-4xl">{space.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold truncate">{space.name}</h4>
          {space.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {space.description}
            </p>
          )}
        </div>
        {isActive && (
          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-medium">
            Aktiv
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Quellen</span>
          <span className="font-medium">{sourceCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Objekte</span>
          <span className="font-medium">{objectCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Zuletzt</span>
          <span className="text-xs text-muted-foreground/80">{lastSyncLabel}</span>
        </div>
      </div>

      {/* Sources Preview */}
      {sourceCount > 0 && (
        <div className="flex gap-2 flex-wrap">
          {space.sources?.slice(0, 3).map((source: any) => (
            <span
              key={source.id}
              className="px-2 py-1 rounded-full bg-background/60 text-xs text-muted-foreground border border-border/30"
            >
              {getSourceIcon(source.type)} {source.name}
            </span>
          ))}
          {sourceCount > 3 && (
            <span className="px-2 py-1 rounded-full bg-background/60 text-xs text-muted-foreground border border-border/30">
              +{sourceCount - 3} mehr
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        className="mt-4 w-full px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-600/15 to-emerald-500/20 hover:from-emerald-500/30 hover:via-emerald-600/25 hover:to-emerald-500/30 text-emerald-200 text-sm font-medium mora-transition border border-emerald-500/20 hover:border-emerald-500/40"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        🌿 Space öffnen
      </button>
    </div>
  );
}

function getSourceIcon(type: string): string {
  const icons: Record<string, string> = {
    filesystem: '📁',
    notion: '📝',
    github: '🐙',
    gmail: '📧',
    slack: '💬',
    email: '✉️',
  };
  return icons[type] || '🔗';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)}w`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
