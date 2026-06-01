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
import { getAppUniverseGroups } from '@/lib/openflow/appUniverse';
import type { AppColor } from '@/lib/apps/types';
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

// ─── Color → icon text + background class ────────────────────────────────────

const COLOR_CLASS: Record<AppColor, { icon: string; bg: string; border: string }> = {
    blue:   { icon: 'text-blue-300',    bg: 'bg-blue-500/15',    border: 'border-blue-400/20' },
    purple: { icon: 'text-purple-300',  bg: 'bg-purple-500/15',  border: 'border-purple-400/20' },
    green:  { icon: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-400/20' },
    orange: { icon: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-400/20' },
    rose:   { icon: 'text-rose-300',    bg: 'bg-rose-500/15',    border: 'border-rose-400/20' },
    teal:   { icon: 'text-teal-300',    bg: 'bg-teal-500/15',    border: 'border-teal-400/20' },
    amber:  { icon: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-400/20' },
    indigo: { icon: 'text-indigo-300',  bg: 'bg-indigo-500/15',  border: 'border-indigo-400/20' },
    slate:  { icon: 'text-slate-300',   bg: 'bg-slate-500/15',   border: 'border-slate-400/15' },
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

    const universeGroups = getAppUniverseGroups()
        .map((group) => ({
            ...group,
            apps: group.appIds
                .map((appId) => visibleApps.find((app) => app.id === appId))
                .filter(Boolean) as typeof visibleApps,
        }))
        .filter((group) => group.apps.length > 0);

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
                {universeGroups.map(group => (
                    <div key={group.id}>
                        <div className="pb-2.5 pl-0.5">
                            <p className="text-[10px] uppercase tracking-widest text-white/30">
                                {group.label}
                            </p>
                            <p className="mt-1 text-[11px] text-white/36">
                                {group.description}
                            </p>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {group.apps.map(app => {
                                const IconComp = ICON_MAP[app.icon] ?? Grid;
                                const colors = COLOR_CLASS[app.color] ?? COLOR_CLASS.slate;
                                return (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={() => handleAppClick(app.id, app.name, app.defaultSize)}
                                        title={app.description}
                                        className="relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 pb-3 pt-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.07] group cursor-pointer"
                                    >
                                        {app.isNew && (
                                            <span className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-emerald-300">
                                                Neu
                                            </span>
                                        )}
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${colors.bg} ${colors.border}`}>
                                            <IconComp size={22} className={colors.icon} />
                                        </div>
                                        <span className="text-center text-[11px] font-medium leading-tight text-white/65 transition-colors group-hover:text-white/90">
                                            {app.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </GlassPanel>
    );
}
