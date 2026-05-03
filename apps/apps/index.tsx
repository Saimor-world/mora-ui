'use client';

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    Activity, Bot, Calendar, Clock, Folder, FileText, Globe, Grid, Inbox,
    MessageCircle, PenTool, Plug, ScanLine, Search, Settings, ShieldCheck,
    SquareCheckBig, StickyNote, Terminal, Timer, UserCog, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import type { AppCategory, AppColor } from '@/lib/apps/types';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';
import type { AppProps } from '@/lib/apps/types';

// ─── Icon map ─────────────────────────────────────────────────────────────────
// Maps Lucide icon names (stored in APP_REGISTRY) to their component references.
// Add entries here when new icons are needed by new apps.

const ICON_MAP: Record<string, LucideIcon> = {
    Activity,
    Bot,
    Calendar,
    Clock,
    FileText,
    Folder,
    Globe,
    Grid,
    Inbox,
    MessageCircle,
    PenTool,
    Plug,
    ScanLine,
    Search,
    Settings,
    ShieldCheck,
    SquareCheckBig,
    StickyNote,
    Terminal,
    Timer,
    UserCog,
    Users,
};

// ─── Apps excluded from the launcher ─────────────────────────────────────────
// These apps are opened programmatically, not by the user from the library.

const LAUNCHER_EXCLUDE = new Set<string>([
    'document',       // opened from Finder by clicking a node
    'website-dossier', // opened from saimor.world security-check
    'action-center',  // has its own dedicated HUD button
    'meine-dateien',  // accessible via sidebar / profile
]);

// ─── Category display order + labels ─────────────────────────────────────────

const CATEGORY_ORDER: AppCategory[] = ['core', 'intelligence', 'workspace', 'people', 'creative', 'system'];

const CATEGORY_LABELS: Record<AppCategory, string> = {
    core:         'Kern',
    intelligence: 'Intelligenz',
    workspace:    'Arbeitsbereich',
    people:       'Team',
    creative:     'Kreativ',
    system:       'System',
};

// ─── Color → Tailwind class ───────────────────────────────────────────────────

const COLOR_CLASS: Record<AppColor, string> = {
    blue:    'text-blue-400',
    purple:  'text-purple-400',
    green:   'text-emerald-400',
    orange:  'text-orange-400',
    rose:    'text-rose-400',
    teal:    'text-teal-400',
    amber:   'text-amber-400',
    indigo:  'text-indigo-400',
    slate:   'text-slate-400',
};

// ─── AppLibraryApp ────────────────────────────────────────────────────────────

export default function AppLibraryApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const userRole = useSessionStore(s => s.user?.role);

    if (!pane) return null;

    // Build the list from APP_REGISTRY, applying all filters.
    const visibleApps = APP_REGISTRY.filter(manifest => {
        if (LAUNCHER_EXCLUDE.has(manifest.id)) return false;
        if (!isPaneEnabled(manifest.id as PaneType)) return false;
        if (manifest.requiresRole && userRole && !manifest.requiresRole.includes(userRole as 'owner' | 'admin' | 'member')) return false;
        return true;
    });

    const handleAppClick = (id: string, name: string, size: { width: number; height: number }) => {
        openPane({
            id: `${id}-main`,
            type: id as PaneType,
            title: name,
            size,
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
            <div className="overflow-y-auto p-4 space-y-5">
                {CATEGORY_ORDER.map(category => {
                    const section = visibleApps.filter(a => a.category === category);
                    if (!section.length) return null;
                    return (
                        <div key={category}>
                            <p className="text-[10px] uppercase tracking-widest text-white/25 pb-2.5 pl-0.5">
                                {CATEGORY_LABELS[category]}
                            </p>
                            <div className="grid grid-cols-4 gap-3">
                                {section.map(app => {
                                    const IconComp = ICON_MAP[app.icon] ?? Grid;
                                    const colorClass = COLOR_CLASS[app.color] ?? 'text-white/70';
                                    return (
                                        <div
                                            key={app.id}
                                            onClick={() => handleAppClick(app.id, app.name, app.defaultSize)}
                                            className="relative aspect-square rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer"
                                        >
                                            {app.isNew && (
                                                <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 leading-none">
                                                    Neu
                                                </span>
                                            )}
                                            <div className={`p-3 rounded-xl bg-black/20 ${colorClass}`}>
                                                <IconComp size={28} />
                                            </div>
                                            <span className="text-sm text-white/60 group-hover:text-white transition-colors text-center leading-tight px-1">
                                                {app.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassPanel>
    );
}
