'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FolderOpen, FolderHeart, MessageCircle, Compass, FileText, Clock, StickyNote, LogOut, Eye } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchNodesByCompany, fetchMyContent, authLogout, coreGet } from '@/lib/api/coreClient';
import type { UserContentResponse } from '@/lib/api/coreClient';
import type { CoreNode } from '@/lib/types/core';
import { useAccountStore } from '@/lib/auth/useAccount';
import { resetUserState } from '@/lib/hooks/useUser';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { isSourceFileAvailable, openSourceFileLike } from '@/lib/utils/contentOpen';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { toast } from 'sonner';

interface KairosEvent {
    id: string;
    timestamp: string;
    event_type: string;
    source: string;
    payload: {
        summary?: string;
        new_nodes?: number;
        sample_titles?: string[];
    };
}

type PersonalLatestItem =
    | { kind: 'node'; id: string; label: string; timestamp: number }
    | { kind: 'file'; id: string; label: string; timestamp: number; linkedNodeId?: string | null }
    | { kind: 'folder'; id: string; label: string; timestamp: number };

function getComparableTimestamp(value?: string | null): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min.`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std.`;
    const days = Math.floor(h / 24);
    if (days <= 14) {
        return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    }
    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: 'short',
    }).format(new Date(isoStr));
}

function normalizePrivateSpaceName(value?: string | null): string {
    const next = (value || '').trim();
    if (!next) return 'Privater Bereich';
    const normalized = next.toLowerCase();
    if (['my space', 'personal space', 'private space'].includes(normalized)) {
        return 'Privater Bereich';
    }
    return next;
}

function getDocumentsFromContent(content: UserContentResponse | null | undefined): CoreNode[] {
    if (!content) return [];
    if (Array.isArray(content.documents)) return content.documents;
    if (Array.isArray(content.nodes)) return content.nodes;
    return [];
}

function isFreshSignal(timestamp: string, maxDays = 21): boolean {
    const parsed = new Date(timestamp).getTime();
    if (!Number.isFinite(parsed)) return false;
    return Date.now() - parsed <= maxDays * 24 * 60 * 60 * 1000;
}

/**
 * HomeSurface - Day-start working surface for SAIMOR 1.0.
 *
 * Sections:
 *   1. Quick Access  - Finder, Meine Dateien, Notizen, Mora, Erkunden
 *   2. Recent Docs   - fetchNodesByCompany, sorted desc by updated_at
 *   3. Personal Area - fetchMyContent counts summary card
 *
 * Each data section degrades independently - null response = section hidden.
 * No fake placeholder content.
 */
export const HomeSurface: React.FC = () => {
    const navigateToExplore = useMoraStore((s) => s.navigateToExplore);
    const isStandardMode = useMoraStore((s) => s.isStandardMode);
    const user = useMoraStore((s) => s.user);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const resetStore = useMoraStore((s) => s.resetStore);
    const setUser = useMoraStore((s) => s.setUser);
    const openPane = usePaneStore((s) => s.openPane);
    const getPane = usePaneStore((s) => s.getPane);
    const focusPane = usePaneStore((s) => s.focusPane);
    const restorePane = usePaneStore((s) => s.restorePane);
    const updatePane = usePaneStore((s) => s.updatePane);
    const updatePanePosition = usePaneStore((s) => s.updatePanePosition);
    const updatePaneSize = usePaneStore((s) => s.updatePaneSize);
    const logoutAccount = useAccountStore((s) => s.logout);
    const surfaceProfile = useSurfaceProfile();

    const [recentDocs, setRecentDocs] = useState<CoreNode[] | null>(null);
    const [myContent, setMyContent] = useState<UserContentResponse | null | undefined>(undefined);
    const [kairosEvents, setKairosEvents] = useState<KairosEvent[] | null>(null);

    useEffect(() => {
        if (!activeCompanyId) {
            setRecentDocs(null);
            setMyContent(undefined);
            return;
        }

        let cancelled = false;

        void fetchNodesByCompany(activeCompanyId, { limit: 8 })
            .then((nodes) => {
                if (cancelled) return;
                const sorted = Array.isArray(nodes)
                    ? [...nodes].sort((a, b) => {
                          const ta = a.updated_at ?? a.created_at ?? '';
                          const tb = b.updated_at ?? b.created_at ?? '';
                          return tb.localeCompare(ta);
                      })
                    : null;
                setRecentDocs(sorted);
            })
            .catch(() => {
                if (!cancelled) setRecentDocs(null);
            });

        void fetchMyContent()
            .then((content) => {
                if (!cancelled) setMyContent(content);
            })
            .catch(() => {
                if (!cancelled) setMyContent(null);
            });

        // KAIROS awareness events — v3 endpoint, company-scoped
        void coreGet('/v3/mindloop/events?type=awareness&limit=5')
            .then((data: any) => {
                if (cancelled) return;
                const events: KairosEvent[] = data?.events ?? [];
                setKairosEvents(events.length > 0 ? events.slice(0, 3) : null);
            })
            .catch(() => {
                if (!cancelled) setKairosEvents(null);
            });

        return () => {
            cancelled = true;
        };
    }, [activeCompanyId]);

    const revealPane = useCallback((
        paneId: string,
        request: { type: 'document' | 'finder' | 'meine-dateien' | 'notes' | 'chat'; title: string; size: { width: number; height: number }; data?: any }
    ) => {
        const existing = getPane(paneId);
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const centeredX = Math.max(24, Math.floor((viewportWidth - request.size.width) / 2));
        const centeredY = Math.max(64, Math.floor((viewportHeight - request.size.height) / 2) - 20);

        if (existing) {
            updatePane(paneId, { title: request.title, data: request.data });
            updatePaneSize(paneId, request.size.width, request.size.height);
            updatePanePosition(paneId, centeredX, centeredY);
            if (existing.minimized) {
                restorePane(paneId);
            } else {
                focusPane(paneId);
            }
            return;
        }

        openPane({
            id: paneId,
            type: request.type,
            title: request.title,
            size: request.size,
            position: { x: centeredX, y: centeredY },
            data: request.data,
        });
    }, [focusPane, getPane, openPane, restorePane, updatePane, updatePanePosition, updatePaneSize]);

    const openDocument = useCallback((node: CoreNode) => {
        revealPane(`doc-${node.id}`, {
            type: 'document',
            title: node.title || 'Dokument',
            size: { width: 960, height: 720 },
            data: { nodeId: node.id },
        });
    }, [revealPane]);

    const openFinder = useCallback(() => {
        revealPane('finder-main', { type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } });
    }, [revealPane]);

    const openMeineDateien = useCallback(() => {
        revealPane('meine-dateien', { type: 'meine-dateien', title: 'Privater Bereich', size: { width: 920, height: 720 } });
    }, [revealPane]);

    const openNotes = useCallback(() => {
        revealPane('notes-main', { type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } });
    }, [revealPane]);

    const openMora = useCallback(() => {
        revealPane('chat-main', { type: 'chat', title: 'Mora', size: { width: 860, height: 680 } });
    }, [revealPane]);

    const handleLogout = useCallback(async () => {
        await authLogout();
        clearClientSessionArtifacts();
        logoutAccount();
        resetUserState();
        setUser(null);
        resetStore();
        if (typeof window !== 'undefined') {
            window.location.assign('/');
        }
    }, [logoutAccount, resetStore, setUser]);

    const t = {
        heading:   isStandardMode ? 'text-gray-900'      : 'text-white/90',
        sub:       isStandardMode ? 'text-gray-500'      : 'text-white/40',
        card:      isStandardMode ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                  : 'bg-white/[0.04] border-white/8 hover:border-white/18',
        cardText:  isStandardMode ? 'text-gray-700'      : 'text-white/75',
        cardSub:   isStandardMode ? 'text-gray-400'      : 'text-white/35',
        sectionHd: isStandardMode ? 'text-gray-400'      : 'text-white/30',
        item:      isStandardMode ? 'hover:bg-gray-50 text-gray-700'
                                  : 'hover:bg-white/[0.04] text-white/70',
        qaBtn:     isStandardMode
            ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50 shadow-sm'
            : 'bg-white/[0.05] border border-white/10 text-white/65 hover:border-white/22 hover:bg-white/[0.08]',
        qaIcon:    isStandardMode ? 'text-gray-400'      : 'text-white/35',
    };

    const firstName = user?.name?.split(' ')[0] ?? null;

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 5)  return 'Gute Nacht';
        if (h < 11) return 'Guten Morgen';
        if (h < 14) return 'Guten Mittag';
        if (h < 18) return 'Guten Tag';
        return 'Guten Abend';
    })();

    const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const personalSpaceLabel = normalizePrivateSpaceName(myContent?.space?.name);
    const personalLatestItem = useMemo<PersonalLatestItem | null>(() => {
        if (!myContent) return null;

        if (Array.isArray(myContent.items) && myContent.items.length > 0) {
            const first = myContent.items[0];
            if (first.kind === 'document' && first.node_id) {
                return {
                    kind: 'node',
                    id: first.node_id,
                    label: first.label,
                    timestamp: getComparableTimestamp(first.timestamp),
                };
            }
            if (first.kind === 'file' && first.file_id) {
                return {
                    kind: 'file',
                    id: first.file_id,
                    label: first.label,
                    timestamp: getComparableTimestamp(first.timestamp),
                    linkedNodeId: null,
                };
            }
        }

        const candidates = [
            ...getDocumentsFromContent(myContent).map((node) => ({
                kind: 'node' as const,
                id: node.id,
                label: node.title || node.name || 'Unbenanntes Dokument',
                timestamp: getComparableTimestamp(node.updated_at || node.created_at),
            })),
            ...(Array.isArray(myContent.files) ? myContent.files.filter((file) => !file.linked_node_id && isSourceFileAvailable(file)).map((file) => ({
                kind: 'file' as const,
                id: file.id,
                label: file.name || 'Datei',
                timestamp: getComparableTimestamp(file.created_at),
                linkedNodeId: file.linked_node_id || null,
            })) : []),
            ...(Array.isArray(myContent.folders) ? myContent.folders.map((folder) => ({
                kind: 'folder' as const,
                id: folder.id,
                label: folder.name || 'Ordner',
                timestamp: getComparableTimestamp(folder.updated_at || folder.created_at),
            })) : []),
        ];

        return candidates.sort((left, right) => right.timestamp - left.timestamp)[0] ?? null;
    }, [myContent]);

    const openPersonalLatest = useCallback(() => {
        if (!personalLatestItem) {
            openMeineDateien();
            return;
        }

        if (personalLatestItem.kind === 'node') {
            revealPane(`doc-${personalLatestItem.id}`, {
                type: 'document',
                title: personalLatestItem.label,
                size: { width: 960, height: 720 },
                data: { nodeId: personalLatestItem.id },
            });
            return;
        }

        if (personalLatestItem.kind === 'folder') {
            revealPane(`finder-${personalLatestItem.id}`, {
                type: 'finder',
                title: personalLatestItem.label,
                size: { width: 960, height: 720 },
                data: { folderId: personalLatestItem.id },
            });
            return;
        }

        void openSourceFileLike({
            id: personalLatestItem.id,
            name: personalLatestItem.label,
            linked_node_id: (personalLatestItem as PersonalLatestItem & { linkedNodeId?: string | null }).linkedNodeId,
        }, openPane).catch((error: any) => {
            toast.error(error?.message || 'Datei konnte nicht geoeffnet werden.');
        });
    }, [openMeineDateien, openPane, personalLatestItem, revealPane]);

    const contentSummaryBadges = useMemo(() => {
        if (!myContent?.counts) return [];
        const standaloneVisibleFiles = Array.isArray(myContent.files)
            ? myContent.files.filter((file) => !file.linked_node_id && isSourceFileAvailable(file)).length
            : 0;
        return [
            myContent.counts.documents != null ? { id: 'documents', label: 'Inhalte', value: myContent.counts.documents } : null,
            myContent.counts.folders != null ? { id: 'folders', label: 'Ordner', value: myContent.counts.folders } : null,
            { id: 'files', label: 'Dateien', value: standaloneVisibleFiles },
        ].filter(Boolean) as Array<{ id: string; label: string; value: number }>;
    }, [myContent]);

    const freshKairosEvents = useMemo(() => {
        if (!kairosEvents) return null;
        return kairosEvents.filter((event) => isFreshSignal(event.timestamp));
    }, [kairosEvents]);

    const staleKairosCount = useMemo(() => {
        if (!kairosEvents) return 0;
        return kairosEvents.filter((event) => !isFreshSignal(event.timestamp)).length;
    }, [kairosEvents]);

    const personalLatestLabel = personalLatestItem?.label ?? null;
    const personalLatestKindLabel = personalLatestItem
        ? personalLatestItem.kind === 'node'
            ? 'Inhalt'
            : personalLatestItem.kind === 'file'
                ? 'Datei'
                : 'Ordner'
        : null;

    return (
        <div className="absolute inset-0 overflow-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pb-[16rem] pt-12 md:pb-[18rem] xl:pb-[19rem]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-semibold tracking-tight ${t.heading}`}>
                            {firstName ? `${greeting}, ${firstName}.` : greeting + '.'}
                        </h1>
                        <p className={`mt-1 text-sm ${t.sub}`}>{todayLabel}</p>
                        {surfaceProfile.isLocalTruthSurface && (
                            <p className="mt-2 inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-500/6 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300/50">
                                Interne Instanz
                            </p>
                        )}
                        {surfaceProfile.isPublicDemoSurface && (
                            <p className="mt-3 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200/75">
                                Oeffentliche Demo · kuratierte Beispielinstanz
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        data-testid="home-logout"
                        onClick={() => void handleLogout()}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${t.qaBtn}`}
                    >
                        <LogOut size={16} className={t.qaIcon} />
                        Abmelden
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <button
                        data-testid="qa-finder"
                        onClick={openFinder}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-medium transition-all ${t.qaBtn}`}
                    >
                        <FolderOpen size={22} className={t.qaIcon} />
                        Finder
                    </button>
                    <button
                        data-testid="qa-meine-dateien"
                        onClick={openMeineDateien}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-medium transition-all ${t.qaBtn}`}
                    >
                        <FolderHeart size={22} className={t.qaIcon} />
                        Meine Dateien
                    </button>
                    <button
                        data-testid="qa-notes"
                        onClick={openNotes}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-medium transition-all ${t.qaBtn}`}
                    >
                        <StickyNote size={22} className={t.qaIcon} />
                        Notizen
                    </button>
                    <button
                        data-testid="qa-mora"
                        onClick={openMora}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-medium transition-all ${t.qaBtn}`}
                    >
                        <MessageCircle size={22} className={t.qaIcon} />
                        Mora
                    </button>
                    <button
                        data-testid="qa-explore"
                        onClick={navigateToExplore}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-medium transition-all ${t.qaBtn}`}
                    >
                        <Compass size={22} className={t.qaIcon} />
                        Erkunden
                    </button>
                </div>

                {surfaceProfile.isLocalTruthSurface && (
                    <section className={`rounded-3xl border px-5 py-4 ${t.card}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className={`text-[11px] uppercase tracking-[0.16em] font-medium ${t.sectionHd}`}>
                                    Local Truth
                                </p>
                                <p className={`mt-1 text-xs ${t.cardSub}`}>
                                    Produktwahrheit — echte Regeln, echte Inhalte.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={openFinder}
                                    className={`rounded-xl px-4 py-2 text-sm transition-all ${t.qaBtn}`}
                                >
                                    Instanz-Finder
                                </button>
                                <button
                                    type="button"
                                    onClick={openMora}
                                    className={`rounded-xl px-4 py-2 text-sm transition-all ${t.qaBtn}`}
                                >
                                    Mora Center
                                </button>
                                <button
                                    type="button"
                                    onClick={openMeineDateien}
                                    className={`rounded-xl px-4 py-2 text-sm transition-all ${t.qaBtn}`}
                                >
                                    Privaten Bereich oeffnen
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {recentDocs !== null && (
                    <section data-testid="recent-docs-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.16em] font-medium ${t.sectionHd}`}>
                            Zuletzt aktualisiert
                        </h2>
                        {recentDocs.length === 0 ? (
                            <p data-testid="recent-docs-empty" className={`text-sm ${t.cardSub}`}>
                                Noch keine Dokumente sichtbar. Öffne den Finder, um die aktuelle Struktur zu prüfen.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {recentDocs.map((node) => (
                                    <li key={node.id} data-testid="recent-doc-item">
                                        <button
                                            onClick={() => openDocument(node)}
                                            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${t.item}`}
                                        >
                                            <FileText size={15} className={t.cardSub} />
                                            <span className="flex-1 truncate text-sm">{node.title || 'Unbenannt'}</span>
                                            {node.updated_at && (
                                                <span className={`text-[11px] shrink-0 ${t.cardSub}`}>
                                                    <Clock size={11} className="inline mr-1 opacity-60" />
                                                    {relativeTime(node.updated_at)}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {kairosEvents !== null && (
                    <section data-testid="kairos-feed-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.16em] font-medium ${t.sectionHd}`}>
                            Mora bemerkt
                        </h2>
                        {freshKairosEvents && freshKairosEvents.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                                {freshKairosEvents.map((evt) => (
                                    <li key={evt.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${t.item}`}>
                                        <Eye size={14} className={`mt-0.5 shrink-0 ${t.cardSub}`} />
                                        <span className="flex-1 text-sm leading-snug">
                                            {evt.payload.summary || (evt.payload.new_nodes != null
                                                ? `${evt.payload.new_nodes} neue Element${evt.payload.new_nodes !== 1 ? 'e' : ''}`
                                                : 'Operatives Signal in der Organisation')}
                                        </span>
                                        <span className={`text-[11px] shrink-0 ${t.cardSub}`}>
                                            {relativeTime(evt.timestamp)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className={`rounded-2xl border px-4 py-4 text-sm ${t.card} ${t.cardText}`}>
                                <div className="font-medium">Derzeit keine frischen Awareness-Signale.</div>
                                <div className={`mt-1 text-xs ${t.cardSub}`}>
                                    {staleKairosCount > 0
                                        ? `${staleKairosCount} aeltere Ereignisse bleiben im Verlauf, werden hier aber nicht kuenstlich als aktuell dargestellt.`
                                        : surfaceProfile.isPublicDemoSurface
                                            ? 'Die Demo zeigt gerade keine neuen operativen Signale im Vordergrund.'
                                            : 'Sobald neue Ereignisse eintreffen, erscheinen sie hier automatisch.'}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {myContent && (
                    <section data-testid="personal-area-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.16em] font-medium ${t.sectionHd}`}>
                            Privater Bereich
                        </h2>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
                            <button
                                data-testid="my-content-card"
                                onClick={openMeineDateien}
                                className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${t.card}`}
                            >
                                <FolderHeart size={20} className={t.qaIcon} />
                                <div className="min-w-0 flex-1">
                                    <div className={`text-sm font-medium ${t.cardText}`}>Privater Bereich</div>
                                    {contentSummaryBadges.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {contentSummaryBadges.map((badge) => (
                                                <span
                                                    key={badge.id}
                                                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/55"
                                                >
                                                    {badge.value} {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className={`mt-1 text-[11px] ${t.cardSub}`}>
                                        Persoenliche Ordner und Inhalte — getrennt vom Organisations-Finder.
                                    </div>
                                </div>
                            </button>

                            <button
                                data-testid="personal-space-card"
                                onClick={openPersonalLatest}
                                className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${t.card}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className={`text-[11px] uppercase tracking-[0.18em] ${t.cardSub}`}>
                                        Privater Bereich
                                    </div>
                                    {personalLatestKindLabel && (
                                        <span className={`text-[10px] uppercase tracking-[0.14em] ${t.cardSub}`}>
                                            {personalLatestKindLabel}
                                        </span>
                                    )}
                                </div>
                                <div className={`mt-2 truncate text-sm font-medium ${t.cardText}`}>
                                    {personalSpaceLabel}
                                </div>
                                <div className={`mt-4 text-[11px] uppercase tracking-[0.18em] ${t.cardSub}`}>
                                    Zuletzt aktiv
                                </div>
                                <div className={`mt-2 text-sm ${t.cardText}`}>
                                    {personalLatestLabel || 'Noch keine privaten Inhalte sichtbar.'}
                                </div>
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
