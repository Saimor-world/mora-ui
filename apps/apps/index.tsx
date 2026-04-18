'use client';

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    Activity,
    Box,
    Calendar,
    FileText,
    Folder,
    Globe,
    Grid,
    Mail,
    PenTool,
    ScanLine,
    Search,
    Settings,
    SquareCheckBig,
    StickyNote,
    Terminal,
    Users,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import type { AppProps } from '@/lib/apps/types';

// ─── App catalogue ────────────────────────────────────────────────────────────

interface AppEntry {
    name: string;
    type: PaneType;
    icon: LucideIcon;
    color: string;
    category: string;
    width?: number;
    height?: number;
}

const APPS: AppEntry[] = [
    // Core
    { name: 'Finder',          type: 'finder',       icon: Folder,         color: 'text-emerald-400',  category: 'core',          width: 900,  height: 620 },
    { name: 'Alle Inhalte',    type: 'grid',         icon: Grid,           color: 'text-emerald-300',  category: 'core' },
    { name: 'Suche',           type: 'search',       icon: Search,         color: 'text-emerald-400',  category: 'core',          width: 640,  height: 500 },
    { name: 'Notizen',         type: 'notes',        icon: StickyNote,     color: 'text-yellow-400',   category: 'core',          width: 480,  height: 420 },
    { name: 'Scanner',         type: 'scanner',      icon: ScanLine,       color: 'text-purple-400',   category: 'core',          width: 840,  height: 600 },
    // Workspace
    { name: 'Aufgaben',        type: 'tasks',        icon: SquareCheckBig, color: 'text-orange-400',   category: 'workspace',     width: 900,  height: 580 },
    { name: 'Zeitverlauf',     type: 'timeline',     icon: Activity,       color: 'text-rose-400',     category: 'workspace',     width: 540,  height: 620 },
    { name: 'Canvas',          type: 'canvas',       icon: PenTool,        color: 'text-violet-400',   category: 'workspace',     width: 900,  height: 660 },
    { name: 'Kalender',        type: 'calendar',     icon: Calendar,       color: 'text-orange-400',   category: 'workspace',     width: 840,  height: 620 },
    // Collaboration
    { name: 'Team',            type: 'team',         icon: Users,          color: 'text-emerald-400',  category: 'collaboration', width: 780,  height: 620 },
    { name: 'Benutzer',        type: 'users',        icon: Users,          color: 'text-emerald-300',  category: 'collaboration', width: 760,  height: 600 },
    { name: 'Post',            type: 'mail',         icon: Mail,           color: 'text-red-400',      category: 'collaboration', width: 860,  height: 640 },
    { name: 'Browser',         type: 'browser',      icon: Globe,          color: 'text-cyan-300',     category: 'collaboration', width: 1160, height: 760 },
    // System
    { name: 'Terminal',        type: 'terminal',     icon: Terminal,       color: 'text-mora-gold',    category: 'system',        width: 860,  height: 560 },
    { name: 'Integrationen',   type: 'integrations', icon: Wrench,         color: 'text-blue-300',     category: 'system',        width: 760,  height: 560 },
    { name: 'Einstellungen',   type: 'settings',     icon: Settings,       color: 'text-white/80',     category: 'system',        width: 700,  height: 500 },
];

// ─── AppLibraryApp ────────────────────────────────────────────────────────────

export default function AppLibraryApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);

    if (!pane) return null;

    const handleAppClick = (app: AppEntry) => {
        openPane({
            id: `${app.type}-main`,
            type: app.type,
            title: app.name,
            size: { width: app.width ?? 800, height: app.height ?? 600 },
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
                {APPS.map((app) => (
                    <div
                        key={app.type}
                        onClick={() => handleAppClick(app)}
                        className="aspect-square rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer"
                    >
                        <div className={`p-3 rounded-xl bg-black/20 ${app.color}`}>
                            <app.icon size={28} />
                        </div>
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors text-center leading-tight px-1">
                            {app.name}
                        </span>
                    </div>
                ))}
            </div>
        </GlassPanel>
    );
}
