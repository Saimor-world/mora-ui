'use client';

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    Activity,
    Calendar,
    Folder,
    Grid,
    PenTool,
    ScanLine,
    Search,
    Settings,
    SquareCheckBig,
    StickyNote,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';
import { getAppManifest } from '@/lib/apps/appRegistry';
import type { AppProps } from '@/lib/apps/types';

// ─── App catalogue ────────────────────────────────────────────────────────────

interface AppEntry {
    name: string;
    type: PaneType;
    icon: LucideIcon;
    color: string;
    category: string;
}

const ALL_APPS: AppEntry[] = [
    // Core
    { name: 'Finder',          type: 'finder',       icon: Folder,         color: 'text-emerald-400',  category: 'core' },
    { name: 'Alle Inhalte',    type: 'grid',         icon: Grid,           color: 'text-emerald-300',  category: 'core' },
    { name: 'Suche',           type: 'search',       icon: Search,         color: 'text-emerald-400',  category: 'core' },
    { name: 'Notizen',         type: 'notes',        icon: StickyNote,     color: 'text-yellow-400',   category: 'core' },
    { name: 'Scanner',         type: 'scanner',      icon: ScanLine,       color: 'text-purple-400',   category: 'core' },
    // Workspace
    { name: 'Aufgaben',        type: 'tasks',        icon: SquareCheckBig, color: 'text-orange-400',   category: 'workspace' },
    { name: 'Zeitverlauf',     type: 'timeline',     icon: Activity,       color: 'text-rose-400',     category: 'workspace' },
    { name: 'Canvas',          type: 'canvas',       icon: PenTool,        color: 'text-violet-400',   category: 'workspace' },
    { name: 'Kalender',        type: 'calendar',     icon: Calendar,       color: 'text-orange-400',   category: 'workspace' },
    // Collaboration
    { name: 'Team',            type: 'team',         icon: Users,          color: 'text-emerald-400',  category: 'collaboration' },
    { name: 'Benutzer',        type: 'users',        icon: Users,          color: 'text-emerald-300',  category: 'collaboration' },
    // System
    { name: 'Einstellungen',   type: 'settings',     icon: Settings,       color: 'text-white/80',     category: 'system' },
];

// ─── AppLibraryApp ────────────────────────────────────────────────────────────

export default function AppLibraryApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const userRole = useSessionStore(s => s.user?.role);

    if (!pane) return null;

    // Filter: surface tier (not future-gated) + requiresRole from APP_REGISTRY
    const visibleApps = ALL_APPS.filter(app => {
        if (!isPaneEnabled(app.type)) return false;
        const manifest = getAppManifest(app.type);
        if (manifest?.requiresRole && userRole && !manifest.requiresRole.includes(userRole as any)) return false;
        return true;
    });

    const handleAppClick = (app: AppEntry) => {
        const manifest = getAppManifest(app.type);
        openPane({
            id: `${app.type}-main`,
            type: app.type,
            title: app.name,
            size: manifest?.defaultSize ?? { width: 800, height: 600 },
        });
        removePane(paneId);
    };

    return (
        <GlassPanel
            title="Apps"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto">
                {visibleApps.map((app) => {
                    const manifest = getAppManifest(app.type);
                    const isNew = manifest?.isNew ?? false;
                    return (
                        <div
                            key={app.type}
                            onClick={() => handleAppClick(app)}
                            className="relative aspect-square rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer"
                        >
                            {isNew && (
                                <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 leading-none">
                                    Neu
                                </span>
                            )}
                            <div className={`p-3 rounded-xl bg-black/20 ${app.color}`}>
                                <app.icon size={28} />
                            </div>
                            <span className="text-sm text-white/60 group-hover:text-white transition-colors text-center leading-tight px-1">
                                {app.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </GlassPanel>
    );
}
