'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FolderOpen, FolderHeart, MessageCircle, Compass, FileText, Clock, StickyNote, LogOut, Eye } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchNodesByCompany, fetchMyContent, authLogout, coreGet } from '@/lib/api/coreClient';
import type { UserContentResponse } from '@/lib/api/coreClient';
import type { CoreNode } from '@/lib/types/core';
import { useAccountStore } from '@/lib/auth/useAccount';
import { resetUserState } from '@/lib/hooks/useUser';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';

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

function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min.`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std.`;
    return `vor ${Math.floor(h / 24)} Tag${Math.floor(h / 24) > 1 ? 'en' : ''}`;
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
    const logoutAccount = useAccountStore((s) => s.logout);

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

    const openDocument = useCallback((node: CoreNode) => {
        openPane({
            id: `doc-${node.id}`,
            type: 'document',
            title: node.title || 'Dokument',
            size: { width: 960, height: 720 },
            data: { nodeId: node.id },
        });
    }, [openPane]);

    const openFinder = useCallback(() => {
        openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } });
    }, [openPane]);

    const openMeineDateien = useCallback(() => {
        openPane({ id: 'meine-dateien', type: 'meine-dateien', title: 'Meine Dateien', size: { width: 380, height: 560 } });
    }, [openPane]);

    const openNotes = useCallback(() => {
        openPane({ id: 'notes-main', type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } });
    }, [openPane]);

    const openMora = useCallback(() => {
        openPane({ id: 'chat-main', type: 'chat', title: 'Mora', size: { width: 860, height: 680 } });
    }, [openPane]);

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
    const personalSpaceLabel = myContent?.space?.name || 'Persoenlicher Space';
    const personalLatestLabel =
        myContent?.nodes?.[0]?.title ||
        myContent?.files?.[0]?.name ||
        myContent?.folders?.[0]?.name ||
        null;

    return (
        <div className="absolute inset-0 overflow-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pb-[16rem] pt-12 md:pb-[18rem] xl:pb-[19rem]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-semibold tracking-tight ${t.heading}`}>
                            {firstName ? `${greeting}, ${firstName}.` : greeting + '.'}
                        </h1>
                        <p className={`mt-1 text-sm ${t.sub}`}>{todayLabel}</p>
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

                {recentDocs !== null && (
                    <section data-testid="recent-docs-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.2em] font-semibold ${t.sectionHd}`}>
                            Zuletzt geoeffnet
                        </h2>
                        {recentDocs.length === 0 ? (
                            <p data-testid="recent-docs-empty" className={`text-sm ${t.cardSub}`}>
                                Noch keine Dokumente - oeffne den Finder, um loszulegen.
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
                                                    {new Date(node.updated_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {kairosEvents && kairosEvents.length > 0 && (
                    <section data-testid="kairos-feed-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.2em] font-semibold ${t.sectionHd}`}>
                            Mora bemerkt
                        </h2>
                        <ul className="flex flex-col gap-1">
                            {kairosEvents.map((evt) => (
                                <li key={evt.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${t.item}`}>
                                    <Eye size={14} className={`mt-0.5 shrink-0 ${t.cardSub}`} />
                                    <span className="flex-1 text-sm leading-snug">
                                        {evt.payload.summary || (evt.payload.new_nodes != null
                                            ? `${evt.payload.new_nodes} neue Element${evt.payload.new_nodes !== 1 ? 'e' : ''}`
                                            : 'Workspace-Aktivitaet erkannt')}
                                    </span>
                                    <span className={`text-[11px] shrink-0 ${t.cardSub}`}>
                                        {relativeTime(evt.timestamp)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {myContent && (
                    <section data-testid="personal-area-section">
                        <h2 className={`mb-3 text-[11px] uppercase tracking-[0.2em] font-semibold ${t.sectionHd}`}>
                            Persoenlicher Bereich
                        </h2>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
                            <button
                                data-testid="my-content-card"
                                onClick={openMeineDateien}
                                className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${t.card}`}
                            >
                                <FolderHeart size={20} className={t.qaIcon} />
                                <div className="min-w-0 flex-1">
                                    <div className={`text-sm font-medium ${t.cardText}`}>Meine Dateien</div>
                                    {myContent.counts && (
                                        <div className={`mt-0.5 text-[12px] ${t.cardSub}`}>
                                            {[
                                                myContent.counts.nodes != null && `${myContent.counts.nodes} Dokumente`,
                                                myContent.counts.folders != null && `${myContent.counts.folders} Ordner`,
                                                myContent.counts.files != null && `${myContent.counts.files} Dateien`,
                                            ].filter(Boolean).join(' · ')}
                                        </div>
                                    )}
                                </div>
                            </button>

                            <div className={`rounded-2xl border px-5 py-4 ${t.card.replace('hover:border-gray-300', '').replace('hover:border-white/18', '')}`}>
                                <div className={`text-[11px] uppercase tracking-[0.18em] ${t.cardSub}`}>
                                    Personal Space
                                </div>
                                <div className={`mt-2 truncate text-sm font-medium ${t.cardText}`}>
                                    {personalSpaceLabel}
                                </div>
                                <div className={`mt-4 text-[11px] uppercase tracking-[0.18em] ${t.cardSub}`}>
                                    Neueste Spur
                                </div>
                                <div className={`mt-2 text-sm ${t.cardText}`}>
                                    {personalLatestLabel || 'Noch keine privaten Inhalte sichtbar.'}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
