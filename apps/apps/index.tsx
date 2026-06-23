'use client';

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    Activity, Bot, Calendar, Clock, Folder, FileText, Globe, Grid, Inbox, Mail,
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
    Mail,
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

const LAUNCHER_EXCLUDE = new Set<string>([
    'document',
    'website-dossier',
    'action-center',
    'meine-dateien',
    'codex',
]);

const COLOR_CLASS: Record<AppColor, { icon: string; bg: string; border: string; accent: string }> = {
    blue:   { icon: 'text-blue-300',    bg: 'bg-blue-500/15',    border: 'border-blue-400/20',    accent: 'text-blue-300' },
    purple: { icon: 'text-purple-300',  bg: 'bg-purple-500/15',  border: 'border-purple-400/20',  accent: 'text-purple-300' },
    green:  { icon: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-400/20', accent: 'text-emerald-300' },
    orange: { icon: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-400/20',  accent: 'text-orange-300' },
    rose:   { icon: 'text-rose-300',    bg: 'bg-rose-500/15',    border: 'border-rose-400/20',    accent: 'text-rose-300' },
    teal:   { icon: 'text-teal-300',    bg: 'bg-teal-500/15',    border: 'border-teal-400/20',    accent: 'text-teal-300' },
    amber:  { icon: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-400/20',   accent: 'text-amber-300' },
    indigo: { icon: 'text-indigo-300',  bg: 'bg-indigo-500/15',  border: 'border-indigo-400/20',  accent: 'text-indigo-300' },
    slate:  { icon: 'text-slate-300',   bg: 'bg-slate-500/15',   border: 'border-slate-400/15',   accent: 'text-slate-300' },
};

function matchesQuery(
    query: string,
    name: string,
    description: string,
    category: string,
    groupLabel?: string,
) {
    if (!query) return true;
    return [name, description, category, groupLabel]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('de').includes(query));
}

export default function AppLibraryApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const userRole = useSessionStore(s => s.user?.role);
    const [query, setQuery] = React.useState('');
    const [activeGroupId, setActiveGroupId] = React.useState<string>('all');

    if (!pane) return null;

    const visibleApps = APP_REGISTRY.filter(manifest => {
        if (LAUNCHER_EXCLUDE.has(manifest.id)) return false;
        if (manifest.launcherHidden) return false;
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
                .filter((app) => matchesQuery(
                    normalizedQuery,
                    app!.name,
                    app!.description,
                    app!.category,
                    group.label,
                )) as typeof visibleApps,
        }))
        .filter((group) => group.apps.length > 0);

    const filteredGroups = activeGroupId === 'all'
        ? universeGroups
        : universeGroups.filter((group) => group.id === activeGroupId);

    const visibleCount = filteredGroups.reduce((count, group) => count + group.apps.length, 0);

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
            <div className="app-library flex min-h-full flex-col gap-6 px-1 pb-4" data-testid="app-library">
                <header className="app-library__hero flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="app-library__eyebrow mb-2 text-[9px] uppercase tracking-[0.22em] text-emerald-100/45">
                            Arbeitsräume
                        </p>
                        <h3 className="m-0 text-2xl font-medium tracking-tight text-white/[0.92]">
                            Was möchtest du öffnen?
                        </h3>
                        <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-white/40">
                            {visibleCount} Werkzeuge sichtbar
                            {normalizedQuery ? ` für „${query.trim()}“` : ''}.
                            {' '}Technische Bereiche erscheinen nur mit passender Rolle.
                        </p>
                    </div>
                    <label className="app-library__search flex h-10 w-full min-w-0 shrink-0 items-center gap-2 rounded-[13px] border border-white/[0.08] bg-black/20 px-3 text-white/35 sm:w-auto sm:min-w-[220px] sm:max-w-[280px]">
                        <Search size={15} aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Apps durchsuchen"
                            aria-label="Apps durchsuchen"
                            className="w-full border-0 bg-transparent p-0 text-[11px] text-white/80 outline-none placeholder:text-white/30"
                        />
                    </label>
                </header>

                {universeGroups.length > 1 && (
                    <div
                        className="flex flex-wrap gap-2 px-1"
                        role="tablist"
                        aria-label="Kategorien filtern"
                        data-testid="app-library-filters"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeGroupId === 'all'}
                            onClick={() => setActiveGroupId('all')}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide transition ${
                                activeGroupId === 'all'
                                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70'
                            }`}
                        >
                            Alle
                        </button>
                        {universeGroups.map((group) => (
                            <button
                                key={group.id}
                                type="button"
                                role="tab"
                                aria-selected={activeGroupId === group.id}
                                onClick={() => setActiveGroupId(group.id)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide transition ${
                                    activeGroupId === group.id
                                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                                        : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70'
                                }`}
                            >
                                {group.label}
                                <span className="ml-1 text-white/30">({group.apps.length})</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="app-library__groups grid gap-7 px-1">
                    {filteredGroups.map(group => (
                        <section key={group.id} className="app-library__group grid gap-3" data-testid={`app-library-group-${group.id}`}>
                            <div className="app-library__group-head flex items-end justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                        {group.label}
                                    </p>
                                    <span className="mt-1 block text-[10px] text-white/30">
                                        {group.description}
                                    </span>
                                </div>
                                <span className="shrink-0 text-[10px] text-white/25">{group.apps.length}</span>
                            </div>
                            <div className="app-library__grid grid grid-cols-1 gap-2 md:grid-cols-2">
                                {group.apps.map(app => {
                                    const IconComp = ICON_MAP[app.icon] ?? Grid;
                                    const colors = COLOR_CLASS[app.color] ?? COLOR_CLASS.slate;
                                    return (
                                        <button
                                            key={app.id}
                                            type="button"
                                            onClick={() => handleAppClick(app.id, app.name, app.defaultSize)}
                                            title={app.description}
                                            data-testid={`app-library-card-${app.id}`}
                                            className={`app-library__card group relative grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 text-left transition hover:-translate-y-0.5 hover:border-white/15 hover:from-white/[0.07] hover:to-white/[0.02] ${colors.accent}`}
                                        >
                                            {app.isNew && (
                                                <span className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-emerald-300">
                                                    Neu
                                                </span>
                                            )}
                                            <div className={`app-library__icon grid h-[42px] w-[42px] place-items-center rounded-[13px] border ${colors.bg} ${colors.border}`}>
                                                <IconComp size={22} className={colors.icon} />
                                            </div>
                                            <div className="app-library__card-copy min-w-0">
                                                <strong className="block truncate text-xs font-medium text-white/82">
                                                    {app.name}
                                                </strong>
                                                <span className="block truncate text-[9px] leading-snug text-white/35">
                                                    {app.description}
                                                </span>
                                            </div>
                                            <span className="app-library__open rounded-lg bg-white/[0.04] px-2 py-1.5 text-[9px] text-white/35 opacity-100 transition group-hover:text-white/55 md:opacity-0 md:group-hover:opacity-100">
                                                Öffnen
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {filteredGroups.length === 0 && (
                        <div
                            className="app-library__none rounded-2xl border border-dashed border-white/10 px-5 py-14 text-center text-sm text-white/40"
                            data-testid="app-library-empty"
                        >
                            {normalizedQuery
                                ? <>Keine App passt zu „{query.trim()}“.</>
                                : <>Keine Apps in dieser Kategorie verfügbar.</>}
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
}
