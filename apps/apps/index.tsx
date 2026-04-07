'use client';

/**
 * AppLibrary — the "App Store" / launcher for the Saimor App Platform.
 * Shows all registered apps in a grid, grouped by category.
 * Clicking an app opens it as a floating pane.
 */

import React, { useState } from 'react';
import {
  Activity, Calendar, FileText, Folder, MessageCircle, PenTool,
  ScanLine, Search, Settings, StickyNote, SquareCheckBig, Terminal,
  Timer, UserCog, Users, Sparkles,
} from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import type { AppCategory, AppManifest } from '@/lib/apps/types';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';

// Map icon string names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Activity, Calendar, FileText, Folder, MessageCircle, PenTool,
  ScanLine, Search, Settings, StickyNote, SquareCheckBig, Terminal,
  Timer, UserCog, Users, Sparkles,
};

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-500/15 border-blue-500/20 hover:border-blue-400/40 text-blue-300',
  purple: 'bg-purple-500/15 border-purple-500/20 hover:border-purple-400/40 text-purple-300',
  green:  'bg-emerald-500/15 border-emerald-500/20 hover:border-emerald-400/40 text-emerald-300',
  orange: 'bg-orange-500/15 border-orange-500/20 hover:border-orange-400/40 text-orange-300',
  rose:   'bg-rose-500/15 border-rose-500/20 hover:border-rose-400/40 text-rose-300',
  teal:   'bg-teal-500/15 border-teal-500/20 hover:border-teal-400/40 text-teal-300',
  amber:  'bg-amber-500/15 border-amber-500/20 hover:border-amber-400/40 text-amber-300',
  indigo: 'bg-indigo-500/15 border-indigo-500/20 hover:border-indigo-400/40 text-indigo-300',
  slate:  'bg-white/5 border-white/10 hover:border-white/20 text-white/50',
};

const CATEGORY_LABELS: Record<AppCategory, string> = {
  core: 'Kern',
  intelligence: 'Intelligenz',
  workspace: 'Arbeitsbereich',
  people: 'Personen',
  system: 'System',
  creative: 'Kreativ',
};

const CATEGORY_ORDER: AppCategory[] = ['core', 'intelligence', 'workspace', 'people', 'creative', 'system'];

function AppTile({ manifest, onLaunch, disabled }: { manifest: AppManifest; onLaunch: () => void; disabled?: boolean }) {
  const Icon = ICON_MAP[manifest.icon] ?? Sparkles;
  const colorCls = COLOR_MAP[manifest.color] ?? COLOR_MAP.slate;
  return (
    <button onClick={onLaunch} disabled={disabled}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group disabled:opacity-30 disabled:cursor-not-allowed ${colorCls}`}>
      {manifest.isNew && (
        <span className="absolute top-2 right-2 text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Neu
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs font-medium text-white/80 leading-tight">{manifest.name}</div>
        <div className="text-[10px] text-white/30 mt-0.5 leading-tight">{manifest.description}</div>
      </div>
    </button>
  );
}

export default function AppLibraryApp({ paneId }: AppProps) {
  const { openPane, removePane } = usePaneStore();
  const user = useMoraStore(s => s.user);
  const [filter, setFilter] = useState<AppCategory | 'all'>('all');

  const canLaunch = (manifest: AppManifest): boolean => {
    if (!isPaneEnabled(manifest.id as any)) return false;
    if (!manifest.requiresRole) return true;
    if (!user?.role) return false;
    return manifest.requiresRole.includes(user.role as any);
  };

  const launch = (manifest: AppManifest) => {
    openPane({
      id: manifest.singleton ? manifest.id : `${manifest.id}-${Date.now()}`,
      type: manifest.id as any,
      title: manifest.name,
      size: manifest.defaultSize,
      position: { x: 100 + Math.random() * 120, y: 60 + Math.random() * 80 },
      data: {},
    });
    removePane(paneId);
  };

  const categories = CATEGORY_ORDER.filter(cat =>
    APP_REGISTRY.some(a => a.category === cat && (filter === 'all' || a.category === filter))
  );

  const filtered = filter === 'all' ? APP_REGISTRY : APP_REGISTRY.filter(a => a.category === filter);
  const grouped = Object.fromEntries(categories.map(cat => [cat, filtered.filter(a => a.category === cat)]));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white/70">Apps</h2>
          <span className="text-[10px] text-white/25">{APP_REGISTRY.length} verfügbar</span>
        </div>
        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${filter === 'all' ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/50'}`}>
            Alle
          </button>
          {CATEGORY_ORDER.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${filter === cat ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/50'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {categories.map(cat => {
          const apps = grouped[cat];
          if (!apps?.length) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-wider text-white/25 mb-3">{CATEGORY_LABELS[cat]}</div>
              <div className="grid grid-cols-3 gap-2.5">
                {apps.map(manifest => (
                  <AppTile key={manifest.id} manifest={manifest}
                    onLaunch={() => launch(manifest)}
                    disabled={!canLaunch(manifest)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
