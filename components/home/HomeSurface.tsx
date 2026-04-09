'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, FolderOpen, StickyNote, MessageCircle, LogOut, Orbit } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { authLogout, fetchMyContent } from '@/lib/api/coreClient';
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

interface PrivateAreaSurface {
    label: string;
    folderCount: number;
    documentCount: number;
    fileCount: number;
    latestItems: Array<{ id: string; label: string; kind: 'document' | 'file' }>;
}

function normalizePrivateAreaLabel(value?: string | null): string {
    const next = (value || '').trim();
    if (!next) return 'Privater Bereich';
    const normalized = next.toLowerCase();
    if (['my space', 'personal space', 'private space'].includes(normalized)) {
        return 'Privater Bereich';
    }
    return next;
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
export const HomeSurface: React.FC<{ overlayMode?: boolean }> = ({ overlayMode = false }) => {
    // ── store selectors ────────────────────────────────────────────────────
    const user        = useMoraStore((s) => s.user);
    const departments = useMoraStore((s) => s.departments);
    const treeData    = useMoraStore((s) => s.treeData);
    const resetStore  = useMoraStore((s) => s.resetStore);
    const setUser     = useMoraStore((s) => s.setUser);
    const setCoreMode = useMoraStore((s) => s.setCoreMode);

    const openPane         = usePaneStore((s) => s.openPane);
    const getPane          = usePaneStore((s) => s.getPane);
    const focusPane        = usePaneStore((s) => s.focusPane);
    const restorePane      = usePaneStore((s) => s.restorePane);
    const updatePane       = usePaneStore((s) => s.updatePane);
    const updatePanePos    = usePaneStore((s) => s.updatePanePosition);
    const updatePaneSize   = usePaneStore((s) => s.updatePaneSize);

    const logoutAccount = useAccountStore((s) => s.logout);
    const recentItems   = useActivityStore((s) => s.recentItems);
    const [privateArea, setPrivateArea] = useState<PrivateAreaSurface | null>(null);

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

    const openPrivateArea = useCallback(() => {
        revealPane('meine-dateien', {
            type: 'meine-dateien',
            title: 'Privater Bereich',
            size: { width: 920, height: 720 },
        });
    }, [revealPane]);

    const openUpload = useCallback(() => {
        revealPane('finder-upload', {
            type: 'finder',
            title: 'Finder',
            size: { width: 1280, height: 820 },
            data: { showUpload: true },
        });
    }, [revealPane]);

    const openUniverse = useCallback(() => {
        setCoreMode('explore');
    }, [setCoreMode]);

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

    useEffect(() => {
        let cancelled = false;

        void fetchMyContent()
            .then((response) => {
                if (cancelled || !response || typeof response !== 'object') return;
                const folders = Array.isArray(response.folders) ? response.folders : [];
                const documents = Array.isArray(response.documents)
                    ? response.documents
                    : (Array.isArray(response.nodes) ? response.nodes : []);
                const files = Array.isArray(response.files) ? response.files.filter((file) => !file.linked_node_id) : [];
                const latestDocumentItems = documents.slice(0, 2).map((document) => ({
                    id: document.id,
                    label: document.title || document.name || 'Dokument',
                    kind: 'document' as const,
                }));
                const latestFileItems = files.slice(0, Math.max(0, 2 - latestDocumentItems.length)).map((file) => ({
                    id: file.id,
                    label: file.name || 'Datei',
                    kind: 'file' as const,
                }));

                setPrivateArea({
                    label: normalizePrivateAreaLabel(response.space?.name),
                    folderCount: folders.length,
                    documentCount: documents.length,
                    fileCount: files.length,
                    latestItems: [...latestDocumentItems, ...latestFileItems],
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setPrivateArea(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

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
    if (overlayMode) {
        return (
            <div className="pointer-events-none absolute inset-0 z-[44] overflow-hidden">
                <div className="absolute left-8 top-28 w-[min(430px,calc(100vw-28rem))]">
                    <div className="pointer-events-auto rounded-[32px] border border-white/12 bg-[linear-gradient(160deg,rgba(4,16,16,0.78),rgba(4,10,13,0.52))] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/62">Home</div>
                                <h1 className="mt-2 text-[24px] font-light tracking-[0.02em] text-white/92">
                                    {firstName ? `${greeting}, ${firstName}.` : 'Arbeitsplatz'}
                                </h1>
                                <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/28">
                                    {todayLabel}
                                </div>
                            </div>
                            <button
                                type="button"
                                data-testid="home-logout"
                                onClick={() => void handleLogout()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/45 transition-all hover:border-white/14 hover:bg-white/[0.06] hover:text-white/72"
                            >
                                <LogOut size={13} />
                                Abmelden
                            </button>
                        </div>

                        <p
                            data-testid="briefing-text"
                            className="mt-4 text-[14px] font-light leading-relaxed text-white/76"
                        >
                            {briefing}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={openUniverse}
                                className="rounded-[22px] border border-cyan-400/18 bg-cyan-500/[0.10] px-4 py-3 text-left transition-all hover:border-cyan-300/30 hover:bg-cyan-500/[0.16]"
                            >
                                <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/54">Raum</div>
                                <div className="mt-2 text-[15px] text-cyan-50/92">Live-Topographie</div>
                                <div className="mt-1 text-[11px] text-cyan-100/52">Planetenraum oeffnen</div>
                            </button>
                            <button
                                type="button"
                                onClick={openFinder}
                                className="rounded-[22px] border border-emerald-400/16 bg-emerald-500/[0.08] px-4 py-3 text-left transition-all hover:border-emerald-300/28 hover:bg-emerald-500/[0.14]"
                            >
                                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/52">Arbeit</div>
                                <div className="mt-2 text-[15px] text-emerald-50/90">Finder</div>
                                <div className="mt-1 text-[11px] text-emerald-100/50">Direkt in Inhalte springen</div>
                            </button>
                        </div>

                        {deptTiles.length > 0 && (
                            <div
                                data-testid="dept-pulse-tiles"
                                className="mt-5 flex flex-wrap gap-2"
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
                                            'rounded-full border px-4 py-2.5 text-left transition-all',
                                            'hover:border-white/16 hover:bg-white/[0.06]',
                                            active
                                                ? 'border-cyan-400/16 bg-cyan-500/[0.08]'
                                                : 'border-white/[0.08] bg-white/[0.03]',
                                        ].join(' ')}
                                    >
                                        <div className="truncate text-[12px] text-white/86">{dept.name}</div>
                                        <div className="mt-0.5 text-[10px] text-white/45">
                                            {active
                                                ? `${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}`
                                                : loaded
                                                    ? 'ruhig'
                                                    : 'lädt…'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button
                                data-testid="qa-finder"
                                onClick={openFinder}
                                className="rounded-xl border border-emerald-400/18 bg-emerald-500/[0.10] px-4 py-2 text-[12px] tracking-[0.04em] text-emerald-200/80 transition-all hover:border-emerald-300/28 hover:bg-emerald-500/[0.16]"
                            >
                                Finder öffnen
                            </button>
                            <button
                                onClick={openUniverse}
                                className="rounded-xl border border-cyan-400/18 bg-cyan-500/[0.10] px-4 py-2 text-[12px] tracking-[0.04em] text-cyan-100/84 transition-all hover:border-cyan-300/28 hover:bg-cyan-500/[0.16]"
                            >
                                Live-Topographie
                            </button>
                            <button
                                data-testid="qa-mora"
                                onClick={openMora}
                                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] tracking-[0.04em] text-white/52 transition-all hover:border-white/14 hover:bg-white/[0.06] hover:text-white/72"
                            >
                                Mora fragen
                            </button>
                            <button
                                data-testid="qa-upload"
                                onClick={openUpload}
                                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] tracking-[0.04em] text-white/52 transition-all hover:border-white/14 hover:bg-white/[0.06] hover:text-white/72"
                            >
                                Datei hochladen
                            </button>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-[8.25rem] left-8 w-[min(430px,calc(100vw-28rem))]">
                    <div className="pointer-events-auto rounded-[30px] border border-white/12 bg-[linear-gradient(160deg,rgba(4,16,16,0.78),rgba(4,10,13,0.52))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
                        <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/42">Privater Bereich</div>
                                <div className="mt-1 text-[13px] text-white/82">
                                    {privateArea?.label || 'Eigene Inhalte'}
                                </div>
                                <div className="mt-2 text-[11px] text-white/42">
                                    Dein eigener Bereich im System. Hier liegt nur, was deinem Konto gehört.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={openPrivateArea}
                                className="rounded-xl border border-emerald-400/16 bg-emerald-500/[0.08] px-3 py-2 text-[11px] text-emerald-200/74 transition-colors hover:border-emerald-300/24 hover:bg-emerald-500/[0.14] hover:text-emerald-100"
                            >
                                Öffnen
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <HomeChip label="Ordner" value={privateArea?.folderCount ?? 0} />
                            <HomeChip label="Inhalte" value={privateArea?.documentCount ?? 0} />
                            <HomeChip label="Dateien" value={privateArea?.fileCount ?? 0} />
                        </div>

                        {privateArea?.latestItems?.length ? (
                            <div className="mt-4 grid gap-2">
                                {privateArea.latestItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={openPrivateArea}
                                        className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.04] px-3 py-3 text-left transition-all hover:border-white/14 hover:bg-white/[0.07]"
                                    >
                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.kind === 'document' ? 'bg-emerald-500/[0.08]' : 'bg-white/[0.04]'}`}
                                        >
                                            {item.kind === 'document' ? (
                                                <FileText size={14} className="text-emerald-300/72" />
                                            ) : (
                                                <FolderOpen size={14} className="text-white/42" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[13px] text-white/78">{item.label}</div>
                                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/28">
                                                {item.kind === 'document' ? 'Inhalt' : 'Datei'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-white/34">
                                Noch keine privaten Inhalte sichtbar. Öffne den privaten Bereich oder lade eine Datei hoch.
                            </p>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-[8.25rem] right-8 w-[min(480px,calc(100vw-26rem))]">
                    <div className="pointer-events-auto rounded-[30px] border border-white/12 bg-[linear-gradient(160deg,rgba(4,16,16,0.78),rgba(4,10,13,0.52))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/42">Zuletzt berührt</div>
                                <div className="mt-1 text-[12px] text-white/48">Echte OS-Aktivität statt statischer Home-Daten.</div>
                            </div>
                            <button
                                type="button"
                                onClick={openFinder}
                                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/52 transition-colors hover:border-white/14 hover:bg-white/[0.06] hover:text-white/72"
                            >
                                Alles im Finder
                            </button>
                        </div>

                        {recentActivityItems.length === 0 ? (
                            <p data-testid="recent-items-empty" className="text-sm text-white/30">
                                Noch keine Aktivität. Starte im Finder.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {recentActivityItems.map((item) => (
                                    <li key={item.id} data-testid="recent-item">
                                        <button
                                            onClick={() => openRecentActivity(item)}
                                            className="group flex w-full items-center gap-3 rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-left transition-all hover:border-white/14 hover:bg-white/[0.06]"
                                        >
                                            <div
                                                className={[
                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                                    item.kind === 'document'
                                                        ? 'bg-emerald-500/[0.08]'
                                                        : 'bg-white/[0.04]',
                                                ].join(' ')}
                                            >
                                                {kindIcon(item.kind)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-[13px] text-white/78">
                                                    {item.label}
                                                </div>
                                                <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/28">
                                                    {kindLabel(item.kind)} · {relativeTime(new Date(item.openedAt).toISOString())}
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 overflow-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-[16rem] pt-10 md:pb-[18rem] xl:pb-[19rem]">

                {/* ── 0. Header: greeting + logout ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-medium tracking-tight text-white/85">
                            {firstName ? `${greeting}, ${firstName}.` : 'Arbeitsplatz'}
                        </h1>
                        <button
                            type="button"
                            onClick={openUniverse}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-cyan-200/78 transition-all hover:border-cyan-300/28 hover:bg-cyan-500/[0.14]"
                        >
                            <Orbit size={13} />
                            Live-Topographie
                        </button>
                    </div>
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
                        onClick={openUniverse}
                        className="rounded-lg border border-cyan-400/15 bg-cyan-500/[0.08] px-3.5 py-1.5 text-[11px] tracking-[0.05em] text-cyan-200/72 transition-all hover:border-cyan-300/26 hover:bg-cyan-500/[0.12]"
                    >
                        Universe oeffnen
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

const HomeChip: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40">
        <span>{label}</span>
        <span className="ml-2 text-[11px] normal-case tracking-normal text-white/82">{value}</span>
    </div>
);
