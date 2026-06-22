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
    const [query, setQuery] = React.useState('');

    if (!pane) return null;

    // Build the list from APP_REGISTRY, applying all filters.
    const visibleApps = APP_REGISTRY.filter(manifest => {
        if (LAUNCHER_EXCLUDE.has(manifest.id)) return false;
        if (!isPaneEnabled(manifest.id as PaneType)) return false;
        if (manifest.requiresRole && (!userRole || !manifest.requiresRole.includes(userRole))) return false;
        return true;
    });

    const normalizedQuery = query.trim().toLocaleLowerCase('de');
    const universeGroups = getAppUniverseGroups()
        .map((group) => ({
            ...group,
            apps: group.appIds
                .map((appId) => visibleApps.find((app) => app.id === appId))
                .filter(Boolean)
                .filter((app) => !normalizedQuery || [app?.name, app?.description, app?.category]
                    .filter(Boolean)
                    .some((value) => value!.toLocaleLowerCase('de').includes(normalizedQuery))) as typeof visibleApps,
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
            <div className="app-library">
                <header className="app-library__hero">
                    <div>
                        <p className="app-library__eyebrow">Arbeitsräume</p>
                        <h3>Was möchtest du öffnen?</h3>
                        <p>{visibleApps.length} Werkzeuge, nach Aufgabe geordnet. Technische Systembereiche erscheinen nur mit passender Rolle.</p>
                    </div>
                    <label className="app-library__search">
                        <Search size={15} aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Apps durchsuchen"
                            aria-label="Apps durchsuchen"
                        />
                    </label>
                </header>

                <div className="app-library__groups">
                {universeGroups.map(group => (
                    <section key={group.id} className="app-library__group">
                        <div className="app-library__group-head">
                            <div>
                            <p>
                                {group.label}
                            </p>
                            <span>
                                {group.description}
                            </span>
                            </div>
                            <span>{group.apps.length}</span>
                        </div>
                        <div className="app-library__grid">
                            {group.apps.map(app => {
                                const IconComp = ICON_MAP[app.icon] ?? Grid;
                                const colors = COLOR_CLASS[app.color] ?? COLOR_CLASS.slate;
                                return (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={() => handleAppClick(app.id, app.name, app.defaultSize)}
                                        title={app.description}
                                        className="app-library__card group"
                                        data-tone={app.color}
                                    >
                                        {app.isNew && (
                                            <span className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-emerald-300">
                                                Neu
                                            </span>
                                        )}
                                        <div className={`app-library__icon border ${colors.bg} ${colors.border}`}>
                                            <IconComp size={22} className={colors.icon} />
                                        </div>
                                        <div className="app-library__card-copy">
                                            <strong>{app.name}</strong>
                                            <span>{app.description}</span>
                                        </div>
                                        <span className="app-library__open">Öffnen</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
                {universeGroups.length === 0 && (
                    <div className="app-library__none">Keine App passt zu „{query}“.</div>
                )}
                </div>
            </div>
        </GlassPanel>
    );
}
