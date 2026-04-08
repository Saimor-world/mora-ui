'use client';

import React, { useCallback, useMemo } from 'react';
import { FileText, FolderOpen, StickyNote, MessageCircle, LogOut } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { authLogout } from '@/lib/api/coreClient';
import { useAccountStore } from '@/lib/auth/useAccount';
import { resetUserState } from '@/lib/hooks/useUser';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { buildBriefing } from '@/lib/home/briefing';

// ─── helpers ────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min.`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std.`;
    const days = Math.floor(h / 24);
    if (days <= 14) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(isoStr));
}

// ─── types ───────────────────────────────────────────────────────────────────

type RecentKind = 'document' | 'finder' | 'notes' | 'chat' | 'other';

interface RecentActivityItem {
    id: string;
    label: string;
    kind: RecentKind;
    openedAt: number;
    paneData?: any;
}

// ─── small UI helpers ─────────────────────────────────────────────────────────

function kindIcon(kind: RecentKind): React.ReactNode {
    switch (kind) {
        case 'document': return <FileText size={13} className="text-emerald-400/60" />;
        case 'finder':   return <FolderOpen size={13} className="text-white/40" />;
        case 'notes':    return <StickyNote size={13} className="text-white/40" />;
        case 'chat':     return <MessageCircle size={13} className="text-white/40" />;
        default:         return <FileText size={13} className="text-white/40" />;
    }
}

function kindLabel(kind: RecentKind): string {
    switch (kind) {
        case 'document': return 'Dokument';
        case 'finder':   return 'Finder';
        case 'notes':    return 'Notizen';
        case 'chat':     return 'Mora';
        default:         return 'Aktivität';
    }
}

// ─── component ───────────────────────────────────────────────────────────────

/**
 * HomeSurface — Ambient Intelligence edition.
 *
 * No static nav grid. No org metadata panel. No fetchMyContent.
 * The home tells you what's happening right now:
 *   1. Mora briefing (from pre-loaded moraStore departments + treeData)
 *   2. Dept pulse tiles (click → Finder scoped to dept)
 *   3. Zuletzt berührt (OS-level activityStore — what you actually opened)
 *   4. Three quick actions
 */
export const HomeSurface: React.FC = () => {
    // ── store selectors ────────────────────────────────────────────────────
    const user        = useMoraStore((s) => s.user);
    const departments = useMoraStore((s) => s.departments);
    const treeData    = useMoraStore((s) => s.treeData);
    const resetStore  = useMoraStore((s) => s.resetStore);
    const setUser     = useMoraStore((s) => s.setUser);

    const openPane         = usePaneStore((s) => s.openPane);
    const getPane          = usePaneStore((s) => s.getPane);
    const focusPane        = usePaneStore((s) => s.focusPane);
    const restorePane      = usePaneStore((s) => s.restorePane);
    const updatePane       = usePaneStore((s) => s.updatePane);
    const updatePanePos    = usePaneStore((s) => s.updatePanePosition);
    const updatePaneSize   = usePaneStore((s) => s.updatePaneSize);

    const logoutAccount = useAccountStore((s) => s.logout);
    const recentItems   = useActivityStore((s) => s.recentItems);

    // ── pane helper ───────────────────────────────────────────────────────
    const revealPane = useCallback((
        paneId: string,
        req: {
            type: 'document' | 'finder' | 'meine-dateien' | 'notes' | 'chat';
            title: string;
            size: { width: number; height: number };
            data?: any;
        }
    ) => {
        const existing = getPane(paneId);
        const vw = typeof window !== 'undefined' ? window.innerWidth  : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const cx = Math.max(24, Math.floor((vw - req.size.width)  / 2));
        const cy = Math.max(64, Math.floor((vh - req.size.height) / 2) - 20);

        if (existing) {
            updatePane(paneId, { title: req.title, data: req.data });
            updatePaneSize(paneId, req.size.width, req.size.height);
            updatePanePos(paneId, cx, cy);
            if (existing.minimized) restorePane(paneId);
            else focusPane(paneId);
            return;
        }

        openPane({ id: paneId, type: req.type, title: req.title, size: req.size, position: { x: cx, y: cy }, data: req.data });
    }, [focusPane, getPane, openPane, restorePane, updatePane, updatePanePos, updatePaneSize]);

    // ── named shortcuts ───────────────────────────────────────────────────
    const openFinder = useCallback(() => {
        revealPane('finder-main', { type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } });
    }, [revealPane]);

    const openMora = useCallback(() => {
        revealPane('chat-main', { type: 'chat', title: 'Mora', size: { width: 860, height: 680 } });
    }, [revealPane]);

    const openUpload = useCallback(() => {
        revealPane('finder-upload', {
            type: 'finder',
            title: 'Finder',
            size: { width: 1280, height: 820 },
            data: { showUpload: true },
        });
    }, [revealPane]);

    // ── logout ────────────────────────────────────────────────────────────
    const handleLogout = useCallback(async () => {
        await authLogout();
        clearClientSessionArtifacts();
        logoutAccount();
        resetUserState();
        setUser(null);
        resetStore();
        if (typeof window !== 'undefined') window.location.assign('/');
    }, [logoutAccount, resetStore, setUser]);

    // ── derived data ───────────────────────────────────────────────────────
    const briefing = useMemo(
        () => buildBriefing(departments, treeData),
        [departments, treeData],
    );

    const deptTiles = useMemo(() => (
        departments.slice(0, 6).map((dept) => {
            const node          = treeData?.find((n) => n.id === dept.id) ?? null;
            const loaded        = node?.children !== undefined;
            const count         = node?.children?.length ?? 0;
            const active        = loaded && count > 0;
            return { dept, count, active, loaded };
        })
    ), [departments, treeData]);

    const recentActivityItems = useMemo<RecentActivityItem[]>(() => (
        recentItems.slice(0, 5).map((item) => ({
            id:       item.id,
            label:    item.label,
            kind: (
                item.paneType === 'document'                                 ? 'document' :
                item.paneType === 'finder' || item.paneType === 'meine-dateien' ? 'finder' :
                item.paneType === 'notes'                                    ? 'notes' :
                item.paneType === 'chat'                                     ? 'chat' : 'other'
            ) as RecentKind,
            openedAt: item.openedAt,
            paneData: item.paneData,
        }))
    ), [recentItems]);

    const openRecentActivity = useCallback((item: RecentActivityItem) => {
        if (item.kind === 'document' && item.paneData?.nodeId) {
            revealPane(`doc-${item.paneData.nodeId}`, {
                type: 'document',
                title: item.label,
                size: { width: 960, height: 720 },
                data: { nodeId: item.paneData.nodeId },
            });
            return;
        }
        if (item.kind === 'finder') {
            const id = item.paneData?.folderId ? `finder-${item.paneData.folderId}` : 'finder-main';
            revealPane(id, { type: 'finder', title: item.label || 'Finder', size: { width: 1280, height: 820 }, data: item.paneData });
            return;
        }
        if (item.kind === 'notes') {
            revealPane('notes-main', { type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } });
            return;
        }
        if (item.kind === 'chat') {
            revealPane('chat-main', { type: 'chat', title: 'Mora', size: { width: 860, height: 680 } });
            return;
        }
        openFinder();
    }, [openFinder, revealPane]);

    // ── display values ─────────────────────────────────────────────────────
    const firstName = user?.name?.split(' ')[0] ?? null;

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 5)  return 'Gute Nacht';
        if (h < 11) return 'Guten Morgen';
        if (h < 14) return 'Guten Mittag';
        if (h < 18) return 'Guten Tag';
        return 'Guten Abend';
    })();

    const now         = new Date();
    const dateStr     = now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr     = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const todayLabel  = `${dateStr} · ${timeStr}`;

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <div className="absolute inset-0 overflow-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-[16rem] pt-10 md:pb-[18rem] xl:pb-[19rem]">

                {/* ── 0. Header: greeting + logout ── */}
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-medium tracking-tight text-white/85">
                        {firstName ? `${greeting}, ${firstName}.` : 'Arbeitsplatz'}
                    </h1>
                    <button
                        type="button"
                        data-testid="home-logout"
                        onClick={() => void handleLogout()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/40 transition-all hover:bg-white/[0.04] hover:text-white/65"
                    >
                        <LogOut size={13} />
                        Abmelden
                    </button>
                </div>

                {/* ── 1. Mora Briefing Strip ── */}
                <div
                    data-testid="briefing-strip"
                    className="rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-5 py-4"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-[7px] w-[7px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]" />
                            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/50">Mora</span>
                        </div>
                        <span className="text-[10px] text-white/[0.18]">{todayLabel}</span>
                    </div>
                    <p data-testid="briefing-text" className="text-[13px] font-light leading-relaxed text-white/72">
                        {briefing}
                    </p>
                </div>

                {/* ── 2. Department Pulse Tiles ── */}
                {deptTiles.length > 0 && (
                    <div
                        data-testid="dept-pulse-tiles"
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                        {deptTiles.map(({ dept, count, active, loaded }) => (
                            <button
                                key={dept.id}
                                data-testid={`dept-tile-${dept.id}`}
                                onClick={() => revealPane(`finder-dept-${dept.id}`, {
                                    type: 'finder',
                                    title: dept.name,
                                    size: { width: 900, height: 620 },
                                    data: { departmentId: dept.id, departmentName: dept.name },
                                })}
                                className={[
                                    'rounded-[10px] border px-3 py-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.05]',
                                    active
                                        ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
                                        : 'border-white/[0.07] bg-white/[0.03]',
                                ].join(' ')}
                            >
                                <div className="mb-1 truncate text-[11px] font-medium text-white/85">
                                    {dept.name}
                                </div>
                                {active ? (
                                    <div className="text-[10px] text-emerald-400">
                                        {count} {count === 1 ? 'Inhalt' : 'Inhalte'}
                                    </div>
                                ) : loaded ? (
                                    <div className="text-[10px] text-white/30">ruhig</div>
                                ) : (
                                    <div className="text-[10px] text-white/[0.18]">…</div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── 3. Zuletzt berührt ── */}
                <section data-testid="recent-items-section">
                    <h2 className="mb-2.5 text-[9px] uppercase tracking-[0.14em] text-white/20">
                        Zuletzt berührt
                    </h2>
                    {recentActivityItems.length === 0 ? (
                        <p data-testid="recent-items-empty" className="text-sm text-white/30">
                            Noch keine Aktivität. Starte im Finder.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-1">
                            {recentActivityItems.map((item) => (
                                <li key={item.id} data-testid="recent-item">
                                    <button
                                        onClick={() => openRecentActivity(item)}
                                        className="group w-full flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
                                    >
                                        <div className={[
                                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                            item.kind === 'document'
                                                ? 'bg-emerald-500/[0.08]'
                                                : 'bg-white/[0.04]',
                                        ].join(' ')}>
                                            {kindIcon(item.kind)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[12px] text-white/75">
                                                {item.label}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-white/25">
                                                {kindLabel(item.kind)} · {relativeTime(new Date(item.openedAt).toISOString())}
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[10px] text-white/15 opacity-0 transition-opacity group-hover:opacity-100">
                                            öffnen →
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ── 4. Quick Actions ── */}
                <div className="flex flex-wrap gap-2">
                    <button
                        data-testid="qa-finder"
                        onClick={openFinder}
                        className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.08] px-3.5 py-1.5 text-[11px] tracking-[0.05em] text-emerald-300/70 transition-all hover:border-emerald-500/25 hover:bg-emerald-500/[0.12]"
                    >
                        Finder öffnen
                    </button>
                    <button
                        data-testid="qa-mora"
                        onClick={openMora}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] tracking-[0.05em] text-white/40 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                    >
                        Mora fragen
                    </button>
                    <button
                        data-testid="qa-upload"
                        onClick={openUpload}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] tracking-[0.05em] text-white/40 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                    >
                        Datei hochladen
                    </button>
                </div>

            </div>
        </div>
    );
};
