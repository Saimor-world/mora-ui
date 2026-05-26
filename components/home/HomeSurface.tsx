'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, FileText, FolderOpen, Globe, Lock, LogOut, Mail, MessageCircle, MessageSquare, StickyNote, Users, Wrench } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { usePaneStore } from '@/lib/store/paneStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { authLogout, coreGet, fetchMyContent } from '@/lib/api/coreClient';
import { useAccountStore } from '@/lib/auth/useAccount';
import { resetUserState } from '@/lib/hooks/useUser';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { buildBriefing } from '@/lib/home/briefing';
import { BriefingStack, type Briefing } from './BriefingStack';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import { consumeWebsiteEntryHomeOpenFlag, loadWebsiteEntryContext } from '@/lib/websiteEntryStorage';

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

interface TeamActivitySurface {
    id: string;
    user_name?: string;
    action?: string;
    target_name?: string;
    timestamp?: string;
}

interface TeamMessageSurface {
    id: string;
    sender_name?: string;
    content: string;
    timestamp?: string;
}

interface TeamPresenceSurface {
    online_count?: number;
    unread_messages?: number;
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
        case 'document': return <FileText size={13} className="text-violet-400/60" />;
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
    const user        = useSessionStore((s) => s.user);
    const resetStore  = useSessionStore((s) => s.resetStore);
    const setUser     = useSessionStore((s) => s.setUser);
    const { activeCompanyId, setCoreMode } = useNavStore();
    const { data: companies = [] }   = useCompanies();
    const resolvedCompanyId = activeCompanyId || companies[0]?.id || null;
    const { data: departments = [] } = useDepartments(resolvedCompanyId);
    const { data: treeData = [] }    = useTree(resolvedCompanyId);

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
    const [isUniversePortalHovered, setIsUniversePortalHovered] = useState(false);
    const [teamActivities, setTeamActivities] = useState<TeamActivitySurface[]>([]);
    const [teamMessages, setTeamMessages] = useState<TeamMessageSurface[]>([]);
    const [teamPresence, setTeamPresence] = useState<TeamPresenceSurface | null>(null);
    const [websiteEntryContext, setWebsiteEntryContext] = useState<StoredWebsiteEntryContext | null>(null);
    const {
        overview: integrationsOverview,
        summary: communicationSummary,
    } = useCommunicationSurface();
    const {
        mailPreview = [],
        calendarPreview = [],
        feedPreview = [],
    } = useCommunicationLiveData();

    // ── pane helper ───────────────────────────────────────────────────────
    const revealPane = useCallback((
        paneId: string,
        req: {
            type: 'document' | 'finder' | 'meine-dateien' | 'notes' | 'chat' | 'team' | 'mail' | 'calendar' | 'integrations' | 'browser' | 'website-dossier';
            title: string;
            size: { width: number; height: number };
            data?: any;
        }
    ) => {
        const existing = getPane(paneId);
        const vw = typeof window !== 'undefined' ? window.innerWidth  : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const leftInset = vw >= 1440 ? 300 : 24;
        const rightInset = vw >= 1440 ? 320 : 24;
        const topInset = vh >= 760 ? 86 : 52;
        const bottomInset = vh >= 760 ? 150 : 96;
        const workspaceWidth = Math.max(360, vw - leftInset - rightInset);
        const workspaceHeight = Math.max(360, vh - topInset - bottomInset);
        const cx = req.size.width <= workspaceWidth
            ? leftInset + Math.floor((workspaceWidth - req.size.width) / 2)
            : Math.max(24, Math.floor((vw - req.size.width) / 2));
        const cy = req.size.height <= workspaceHeight
            ? topInset + Math.floor((workspaceHeight - req.size.height) / 2)
            : Math.max(52, topInset - 34);

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

    const openWebsiteDossier = useCallback(() => {
        if (!websiteEntryContext) return;
        revealPane('website-dossier-current', {
            type: 'website-dossier',
            title: `${websiteEntryContext.companyName} Dossier`,
            size: { width: 1040, height: 720 },
            data: { context: websiteEntryContext },
        });
    }, [revealPane, websiteEntryContext]);

    const openTeam = useCallback(() => {
        revealPane('team-main', {
            type: 'team',
            title: 'Team',
            size: { width: 900, height: 680 },
        });
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

    const openMail = useCallback(() => {
        if (!integrationsOverview?.mail?.configured) {
            revealPane('integrations-main', {
                type: 'integrations',
                title: 'Integrationen',
                size: { width: 980, height: 740 },
            });
            return;
        }
        revealPane('mail-main', {
            type: 'mail',
            title: 'Post',
            size: { width: 960, height: 720 },
        });
    }, [integrationsOverview?.mail?.configured, revealPane]);

    const openIntegrations = useCallback(() => {
        revealPane('integrations-main', {
            type: 'integrations',
            title: 'Integrationen',
            size: { width: 980, height: 740 },
        });
    }, [revealPane]);

    const openBrowserConnect = useCallback(() => {
        revealPane('browser-connect', {
            type: 'browser',
            title: 'Browser',
            size: { width: 1160, height: 760 },
            data: { initialUrl: 'about:saimor-connect' },
        });
    }, [revealPane]);

    const openCalendarSetup = useCallback(() => {
        if (!communicationSummary.ownerManageable || !communicationSummary.calendarOauthEnabled || !integrationsOverview?.calendar?.configured) {
            revealPane('integrations-main', {
                type: 'integrations',
                title: 'Integrationen',
                size: { width: 980, height: 740 },
            });
            return;
        }
        revealPane('calendar-main', {
            type: 'calendar',
            title: 'Kalender',
            size: { width: 840, height: 620 },
        });
    }, [communicationSummary.calendarOauthEnabled, communicationSummary.ownerManageable, integrationsOverview?.calendar?.configured, revealPane]);

    const openLocalTruth = useCallback(() => {
        if (typeof window === 'undefined') return;
        const url = communicationSummary.localTruthUrl;

        if (communicationSummary.localTruthUiOpenable) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        revealPane('browser-connect', {
            type: 'browser',
            title: 'Browser',
            size: { width: 1160, height: 760 },
            data: { initialUrl: communicationSummary.connectSurfaceUrl },
        });
    }, [communicationSummary.connectSurfaceUrl, communicationSummary.localTruthUiOpenable, communicationSummary.localTruthUrl, revealPane]);

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
    const currentCompany = useMemo(
        () => companies.find((company) => company.id === resolvedCompanyId) || null,
        [companies, resolvedCompanyId]
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

    useEffect(() => {
        setWebsiteEntryContext(loadWebsiteEntryContext());
    }, []);

    useEffect(() => {
        if (!websiteEntryContext || process.env.NODE_ENV === 'test') return;
        const storedAt = websiteEntryContext.storedAt ? Date.parse(websiteEntryContext.storedAt) : 0;
        const isFreshExplicitOpen = Boolean(
            websiteEntryContext.openOnHome &&
            Number.isFinite(storedAt) &&
            Date.now() - storedAt < 10 * 60 * 1000
        );
        if (!isFreshExplicitOpen) return;
        const autoOpenKey = `saimor_website_entry_auto_opened_${websiteEntryContext.id || websiteEntryContext.companyName}`;
        try {
            if (window.localStorage.getItem(autoOpenKey)) return;
            window.localStorage.setItem(autoOpenKey, '1');
            consumeWebsiteEntryHomeOpenFlag(websiteEntryContext);
        } catch {
            // If storage is unavailable, still open once for this mounted session.
        }

        const timer = window.setTimeout(() => {
            revealPane('website-dossier-current', {
                type: 'website-dossier',
                title: `${websiteEntryContext.companyName} Dossier`,
                size: { width: 1040, height: 720 },
                data: { context: websiteEntryContext },
            });
        }, 900);

        return () => window.clearTimeout(timer);
    }, [revealPane, websiteEntryContext]);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            coreGet('/v3/team/activity?limit=4', { isOptional: true }),
            coreGet('/v3/team/presence', { isOptional: true }),
            coreGet('/v3/user-chat/history?channel_id=shared%3Acompany&limit=3', { isOptional: true }),
        ])
            .then(([activityRes, presenceRes, messagesRes]) => {
                if (cancelled) return;
                const nextActivities = Array.isArray(activityRes) ? activityRes : [];
                const nextPresence = presenceRes && typeof presenceRes === 'object' ? presenceRes as TeamPresenceSurface : null;
                const nextMessages = Array.isArray(messagesRes) ? messagesRes : [];

                if (nextActivities.length > 0) setTeamActivities(nextActivities);
                if (nextPresence) setTeamPresence(nextPresence);
                if (nextMessages.length > 0) setTeamMessages(nextMessages);
            })
            .catch(() => {
                // Initial empty state already represents an unavailable team surface.
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

    const overlayBriefing = useMemo(() => {
        const compact = briefing.replace(/\s+/g, ' ').trim();
        if (compact.length <= 112) return compact;
        return `${compact.slice(0, 109).trimEnd()}...`;
    }, [briefing]);

    const featuredDeptTiles = useMemo(() => deptTiles.slice(0, 4), [deptTiles]);
    const overlayRecentActivityItems = useMemo(() => recentActivityItems.slice(0, 3), [recentActivityItems]);
    const overlayPrivateItems = useMemo(
        () => privateArea?.latestItems?.slice(0, 2) ?? [],
        [privateArea]
    );
    const privateContentCount = (privateArea?.documentCount ?? 0) + (privateArea?.fileCount ?? 0);
    const activeDepartmentCount = useMemo(
        () => deptTiles.filter(({ active }) => active).length,
        [deptTiles]
    );
    const browserStatusLabel = communicationSummary.browserStatusLabel;
    const localTruthStatusLabel = communicationSummary.localTruthStatusLabel;
    const nextCalendarEvent = calendarPreview[0] ?? null;
    const latestMail = mailPreview[0] ?? null;
    const latestFeed = feedPreview[0] ?? null;
    const latestTeamMessage = teamMessages[teamMessages.length - 1] ?? null;
    const latestTeamActivity = teamActivities[0] ?? null;
    const TEAM_ACTIVITY_LABELS: Record<string, string> = {
        related_objects_cluster: 'Mora entdeckt Zusammenhänge',
        context_shift: 'Kontext hat sich verschoben',
        semantic: 'Semantische Verbindung',
        potential_risk: 'Mora hat etwas bemerkt',
        node_updated: 'Dokument bearbeitet',
        node_created: 'Neues Dokument',
        folder_created: 'Neuer Ordner',
    };
    const teamActivityTitle = latestTeamActivity
        ? (TEAM_ACTIVITY_LABELS[latestTeamActivity.action ?? ''] ?? latestTeamActivity.target_name ?? 'Teamaktivität')
        : null;
    const teamActivityDetail = latestTeamActivity
        ? (latestTeamActivity.user_name ? `${latestTeamActivity.user_name} · Teamraum` : 'Mora · Teamraum')
        : null;
    const onlineTeamCount = Math.max(0, Number(teamPresence?.online_count || 0));
    const unreadTeamCount = Math.max(0, Number(teamPresence?.unread_messages || 0));
    const hasCommunicationSignal = Boolean(latestMail || nextCalendarEvent || latestFeed);
    const hasTeamSignal = Boolean(latestTeamMessage || latestTeamActivity || onlineTeamCount > 1 || unreadTeamCount > 0);
    const homeSignalCount = [
        Boolean(websiteEntryContext),
        Boolean(latestMail),
        Boolean(nextCalendarEvent),
        Boolean(latestFeed),
        hasTeamSignal,
        overlayRecentActivityItems.length > 0,
    ].filter(Boolean).length;
    const homeSummaryChips = useMemo(
        () => [
            { label: 'Bereiche', value: activeDepartmentCount },
            { label: 'Signale', value: homeSignalCount },
            { label: 'Privat', value: privateContentCount },
            { label: 'Website', value: websiteEntryContext ? 1 : 0 },
        ].filter((item) => item.value > 0),
        [activeDepartmentCount, homeSignalCount, privateContentCount, websiteEntryContext]
    );
    const absenceFocusLabel = recentActivityItems.length > 0
        ? `${recentActivityItems.length} OS-Spuren`
        : hasCommunicationSignal || hasTeamSignal
            ? 'Eingang aktiv'
            : 'Ruhiger Start';
    const focusTitle = websiteEntryContext
        ? `${websiteEntryContext.companyName}: Dossier im HQ.`
        : latestTeamMessage
            ? 'Team-Signal wartet.'
            : overlayRecentActivityItems[0]
                ? `Weiter in ${overlayRecentActivityItems[0].label}.`
                : hasCommunicationSignal
                    ? 'Eingang bereit.'
                    : 'Bereit wenn du es bist.';
    const focusDetail = websiteEntryContext
        ? websiteEntryContext.score !== undefined
            ? `Board-Signal ${websiteEntryContext.score}. Dossier, Aufgaben und Arbeitsraeume sind aus dem Website-Check geladen.`
            : 'Dossier, Aufgaben und Arbeitsraeume sind aus dem Website-Check geladen.'
        : latestTeamMessage
            ? `${latestTeamMessage.sender_name || 'Team'}: ${latestTeamMessage.content}`
            : overlayRecentActivityItems[0]
                ? `${kindLabel(overlayRecentActivityItems[0].kind)} · ${relativeTime(new Date(overlayRecentActivityItems[0].openedAt).toISOString())}`
                : hasCommunicationSignal
                    ? 'Post, Kalender oder Feeds haben neue Daten fuer dich vorbereitet.'
                    : 'Home zeigt nur den Einstieg: was offen ist, wo du weiterarbeiten kannst und welche echten Signale warten.';
    const displayCompanyName = websiteEntryContext?.companyName || currentCompany?.name || user?.active_company_name || 'Organisation';

    const stackBriefings = useMemo((): Briefing[] => {
        const items: Briefing[] = [];
        if (overlayRecentActivityItems[0] && !websiteEntryContext) {
            items.push({
                id: 'activity',
                label: 'Aktivität',
                title: `Weiter in ${overlayRecentActivityItems[0].label}`,
                detail: relativeTime(new Date(overlayRecentActivityItems[0].openedAt).toISOString()),
            });
        }
        if (latestMail) {
            items.push({
                id: 'mail',
                label: 'Mail',
                title: latestMail.subject || 'Neue Mail',
                detail: latestMail.from || 'Posteingang',
            });
        }
        if (nextCalendarEvent) {
            items.push({
                id: 'calendar',
                label: 'Termin',
                title: nextCalendarEvent.title,
                detail: nextCalendarEvent.time || nextCalendarEvent.date || 'heute',
            });
        }
        return items.slice(0, 3);
    }, [overlayRecentActivityItems, latestMail, nextCalendarEvent, websiteEntryContext]);

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
        <div
            data-testid="home-universe-mission-control"
            className="pointer-events-none absolute inset-0 z-[44] overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(124,58,237,0.12),transparent_32%),radial-gradient(circle_at_78%_28%,rgba(34,211,238,0.09),transparent_24%),linear-gradient(180deg,rgba(5,4,16,0.04),rgba(5,4,16,0.26))]" />
            <div className="absolute left-1/2 top-1/2 h-[min(86vw,86vh)] w-[min(86vw,86vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/[0.045]" />
            <div className="absolute left-1/2 top-1/2 h-[min(58vw,58vh)] w-[min(58vw,58vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/[0.06]" />
            <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-cyan-100/12 to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

            <div className="absolute left-8 top-24 w-[318px]">
                <div
                    data-testid="briefing-strip"
                    className="pointer-events-auto relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(18,16,38,0.78),rgba(10,9,25,0.42)_54%,rgba(7,18,24,0.34))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[26px]"
                >
                    <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-violet-300/70 via-cyan-200/55 to-violet-200/50" />
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/60">Mission Control</div>
                            <h1 className="mt-2 text-[28px] font-light leading-tight tracking-[-0.02em] text-white/92">
                                {websiteEntryContext
                                    ? `${websiteEntryContext.companyName} · Preview`
                                    : firstName
                                        ? <><span className="text-white/95">{greeting}</span><span className="text-white/50">, {firstName}.</span></>
                                        : 'Arbeitsplatz'}
                            </h1>
                            <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/30">{todayLabel}</div>
                        </div>
                        {/* Hide logout in unauthenticated website preview — no real session to end */}
                        {(!websiteEntryContext || user) && (
                            <button
                                type="button"
                                data-testid="home-logout"
                                onClick={() => void handleLogout()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/46 transition-all hover:border-white/14 hover:bg-white/[0.055] hover:text-white/74"
                            >
                                <LogOut size={13} />
                                Abmelden
                            </button>
                        )}
                    </div>

                    <p data-testid="briefing-text" className="mt-4 text-[12px] font-light leading-relaxed text-white/58">
                        {overlayBriefing}
                    </p>

                    {homeSummaryChips.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {homeSummaryChips.map((chip) => (
                                <HomeChip key={chip.label} label={chip.label} value={chip.value} />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-2xl border border-white/[0.045] bg-white/[0.018] px-3 py-2 text-[11px] text-white/38">
                            Keine offenen Marker. Home bleibt reduziert.
                        </div>
                    )}

                    <div className="mt-4 rounded-[18px] border border-white/[0.075] bg-black/[0.18] p-3" style={{ borderTop: '1px solid rgba(34,211,238,0.16)' }}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/48">
                                    <Lock size={9} className="opacity-60" />
                                    Privater Bereich
                                </div>
                                <div className="mt-1 text-[12px] text-white/62">{privateArea?.label || 'Eigene Daten'}</div>
                            </div>
                            <button
                                type="button"
                                onClick={openPrivateArea}
                                className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.10] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-cyan-50/75 transition-colors hover:border-cyan-200/32 hover:bg-cyan-400/[0.16]"
                            >
                                Öffnen
                            </button>
                        </div>
                        {privateContentCount > 0 || (privateArea?.folderCount ?? 0) > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <HomeChip label="Ordner" value={privateArea?.folderCount ?? 0} />
                                <HomeChip label="Inhalte" value={privateArea?.documentCount ?? 0} />
                                <HomeChip label="Dateien" value={privateArea?.fileCount ?? 0} />
                            </div>
                        ) : (
                            <div className="mt-3 rounded-2xl border border-white/[0.045] bg-white/[0.018] px-3 py-2 text-[11px] text-white/38">
                                Noch leer. Dateien oder Notizen erscheinen erst, wenn echte private Inhalte vorhanden sind.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <section className="absolute left-[370px] right-[360px] xl:right-[400px] 2xl:right-[680px] top-[150px] bottom-[140px] flex items-center justify-center">
                <div className="pointer-events-auto relative w-full max-w-[760px]">
                    <div className="absolute inset-x-[4%] top-1/2 h-80 -translate-y-1/2 rounded-full bg-cyan-400/[0.12] blur-[130px]" />
                    <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.045]" />
                    <div className="relative overflow-hidden rounded-[30px] border border-white/[0.095] bg-[linear-gradient(145deg,rgba(20,18,42,0.82),rgba(10,9,25,0.56)_48%,rgba(7,28,34,0.40))] px-8 py-7 shadow-[0_44px_160px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[30px]">
                        <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-violet-300/60 via-cyan-200/70 to-violet-300/65" />
                        <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-cyan-300/[0.13] blur-[72px]" />
                        <div className="absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-violet-400/[0.12] blur-[82px]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.055),transparent_22%),repeating-linear-gradient(115deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_28px)] opacity-70" />

                        <div className="relative flex items-start justify-between gap-6">
                            <div className="min-w-0 flex-1">
                                <div className="inline-block text-[10px] uppercase tracking-[0.24em] text-cyan-100/62 relative">
                                    Universe aktiv
                                    <span
                                        className="absolute left-0 bottom-[-3px] rounded-full"
                                        style={{ width: 28, height: 1, background: 'rgba(103,232,249,0.80)' }}
                                    />
                                </div>
                                {stackBriefings.length > 0 ? (
                                    <div className="mt-3">
                                        <BriefingStack briefings={stackBriefings} />
                                    </div>
                                ) : (
                                    <h2 className="mt-3 max-w-[34rem] text-[44px] font-light leading-[1.02] tracking-[-0.04em] text-white/94">
                                        {overlayRecentActivityItems[0] && !websiteEntryContext && !latestTeamMessage
                                            ? <>Weiter in <span style={{ color: 'rgba(167,139,250,0.95)' }}>{overlayRecentActivityItems[0].label}</span>.</>
                                            : focusTitle}
                                    </h2>
                                )}
                                <p className="mt-4 flex max-w-[31rem] items-start gap-1.5 text-[13px] leading-relaxed text-white/60">
                                    {overlayRecentActivityItems[0] && !websiteEntryContext && !latestTeamMessage && (
                                        <span className="mt-1.5 inline-block w-1.5 h-1.5 shrink-0 rounded-full bg-violet-400 animate-pulse" />
                                    )}
                                    <span>{focusDetail}</span>
                                </p>
                                {websiteEntryContext ? (
                                    <div
                                        className="mt-5 max-w-[29rem] rounded-[22px] border border-amber-300/12 bg-amber-400/[0.06] p-3"
                                        data-testid="website-entry-home-card"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="text-[10px] uppercase tracking-[0.22em] text-amber-100/55">Website-Einstieg</div>
                                                <div className="mt-1 truncate text-[13px] font-medium text-white/78">
                                                    {websiteEntryContext.domain || websiteEntryContext.title}
                                                </div>
                                            </div>
                                            {websiteEntryContext.score !== undefined ? (
                                                <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-amber-100/80">
                                                    {websiteEntryContext.score}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="mt-3 grid gap-1.5">
                                            {websiteEntryContext.tasks.slice(0, 2).map((task) => (
                                                <div key={task.title} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.045] bg-violet-950/[0.20] px-3 py-2">
                                                    <span className="min-w-0 truncate text-[12px] text-white/64">{task.title}</span>
                                                    <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-white/32">{task.priority}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openWebsiteDossier}
                                            className="mt-3 rounded-full border border-amber-300/16 bg-amber-400/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-amber-50/75 transition-colors hover:border-amber-200/26 hover:bg-amber-400/[0.12]"
                                        >
                                            Dossier öffnen
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <div
                                className="relative shrink-0"
                                onMouseEnter={() => setIsUniversePortalHovered(true)}
                                onMouseLeave={() => setIsUniversePortalHovered(false)}
                                onClick={openUniverse}
                                role="button"
                                tabIndex={0}
                                data-interaction-sound="firm"
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openUniverse();
                                    }
                                }}
                            >
                                <div className="absolute inset-[-1.3rem] rounded-full border border-cyan-200/[0.11] bg-cyan-300/[0.045]" />
                                <div className="absolute inset-[-2.6rem] rounded-full border border-violet-200/[0.06]" />
                                <CompanyLogo
                                    src={currentCompany?.logo_url}
                                    companyName={displayCompanyName}
                                    size="lg"
                                    animated
                                />
                                {isUniversePortalHovered ? (
                                    <div className="absolute right-0 top-[calc(100%+0.9rem)] w-[220px] rounded-[16px] border border-cyan-200/16 bg-slate-950/70 px-4 py-3 text-left shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-[24px]">
                                        <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/54">Universe</div>
                                        <div className="mt-1 text-[12px] leading-relaxed text-white/68">Organisation als Topographie öffnen.</div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <HomeCommandButton dataTestId="qa-finder" label="Finder öffnen" detail="Dateien & Ordner" onClick={openFinder} tone="emerald" />
                            <HomeCommandButton dataTestId="qa-universe" label="Universe" detail="Topographie" onClick={openUniverse} tone="cyan" />
                            <HomeCommandButton dataTestId="qa-mora" label="Mora" detail="Fragen" onClick={openMora} tone="amber" />
                            <HomeCommandButton dataTestId="qa-upload" label="Upload" detail="Datei ablegen" onClick={openUpload} tone="violet" />
                        </div>

                        {featuredDeptTiles.length > 0 && (
                            <div className="relative mt-6">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/36">Planetenverbindungen</div>
                                    <button
                                        type="button"
                                        onClick={openUniverse}
                                        className="text-[10px] uppercase tracking-[0.16em] text-violet-200/50 transition-colors hover:text-violet-100/80"
                                    >
                                        alle ansehen
                                    </button>
                                </div>
                                <div data-testid="dept-pulse-tiles" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                    {featuredDeptTiles.map(({ dept, count, active, loaded }) => (
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
                                                'min-w-0 rounded-[16px] border px-3 py-3 text-left transition-all',
                                                active
                                                    ? 'border-cyan-300/24 bg-cyan-400/[0.10] hover:border-cyan-200/38 hover:bg-cyan-400/[0.15]'
                                                    : 'border-white/[0.08] bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.06]',
                                            ].join(' ')}
                                        >
                                            <div className="truncate text-[12px] font-medium text-white/78">{dept.name}</div>
                                            <div className="mt-1 text-[10px] text-white/38">
                                                {active
                                                    ? `${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}`
                                                    : loaded
                                                        ? 'ruhig'
                                                        : 'lädt...'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <aside className="absolute bottom-[9.2rem] right-8 w-[330px] 2xl:right-[21rem]">
                <div data-tageslage-panel className="pointer-events-auto relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(155deg,rgba(18,16,38,0.74),rgba(8,14,26,0.34))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-[26px]">
                    <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-amber-300/55 via-violet-300/45 to-cyan-200/50" />
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-cyan-100/52">
                                Tageslage
                                <span className="text-violet-200/35">›</span>
                            </div>
                            <div className="mt-1 text-[22px] font-light tracking-[-0.03em] text-white/86">{absenceFocusLabel}</div>
                            <div className="mt-1 text-[11px] text-white/38">
                                <span style={{ color: 'rgba(251,191,36,0.72)' }}>{homeSignalCount}</span>
                                {' '}echte Signal{homeSignalCount === 1 ? '' : 'e'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={openIntegrations}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/50 transition-colors hover:border-cyan-300/22 hover:bg-cyan-500/[0.08] hover:text-cyan-100/80"
                        >
                            Quellen
                        </button>
                    </div>

                    <div className="mt-4 grid gap-2">
                        {latestMail && (
                            <HomeSignalCard icon={<Mail size={14} />} label="Postfach" title={latestMail.subject} detail={latestMail.from} tone="violet" onClick={openMail} />
                        )}
                        {nextCalendarEvent && (
                            <HomeSignalCard icon={<CalendarDays size={14} />} label="Kalender" title={nextCalendarEvent.title} detail={nextCalendarEvent.time || nextCalendarEvent.date} tone="amber" onClick={openCalendarSetup} />
                        )}
                        {latestFeed && (
                            <HomeSignalCard icon={<Globe size={14} />} label="Feed" title={latestFeed.title} detail={latestFeed.sourceTitle || 'RSS'} tone="cyan" onClick={openIntegrations} />
                        )}
                        {hasTeamSignal && (
                            <HomeSignalCard
                                icon={<Users size={14} />}
                                label="Teamraum"
                                title={latestTeamMessage ? latestTeamMessage.content : teamActivityTitle ?? `${onlineTeamCount} online`}
                                detail={latestTeamMessage ? latestTeamMessage.sender_name || 'Team' : teamActivityDetail ?? 'Teamchat und Präsenz'}
                                tone="violet"
                                onClick={openTeam}
                            />
                        )}
                        <div
                            className="rounded-[16px] border border-cyan-300/14 bg-black/[0.16] p-2.5"
                            data-testid="recent-items-section"
                        >
                            <div className="mb-1.5 flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
                                <Activity size={12} />
                                Zuletzt berührt
                            </div>
                            {overlayRecentActivityItems.length > 0 ? (
                                <div className="space-y-1">
                                    {overlayRecentActivityItems.map((item) => (
                                        <div key={item.id} data-testid="recent-item">
                                            <button
                                                type="button"
                                                onClick={() => openRecentActivity(item)}
                                                className="group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
                                            >
                                                {kindIcon(item.kind)}
                                                <span className="min-w-0 flex-1 truncate text-[12px] text-white/66 group-hover:text-white/86">
                                                    {item.label}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-white/28">
                                                    {relativeTime(new Date(item.openedAt).toISOString())}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div
                                    className="rounded-xl border border-white/[0.04] bg-violet-950/[0.15] px-3 py-2 text-[12px] leading-relaxed text-white/44"
                                    data-testid="recent-items-empty"
                                >
                                    Noch keine OS-Spuren. Öffne Finder, Team oder Mora, dann erscheint hier der Wiedereinstieg.
                                </div>
                            )}
                        </div>
                        {homeSignalCount === 0 && (
                            <HomeSignalCard
                                icon={<Activity size={14} />}
                                label="Ruhig"
                                title="Keine offenen Signale"
                                detail="Home bleibt leer, bis echte Aktivitaet entsteht."
                                tone="muted"
                                onClick={openFinder}
                            />
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <HomeMiniAction icon={<MessageSquare size={13} />} label="Teamchat" onClick={openTeam} />
                        <HomeMiniAction icon={<Mail size={13} />} label="Mail" onClick={openMail} />
                        <HomeMiniAction icon={<Wrench size={13} />} label={localTruthStatusLabel} onClick={openLocalTruth} />
                        <HomeMiniAction icon={<Globe size={13} />} label={browserStatusLabel} onClick={openBrowserConnect} />
                    </div>
                </div>
            </aside>
        </div>
    );
};

const CHIP_ACCENT: Record<string, { border: string; shadow: string }> = {
    Bereiche: { border: '2px solid rgba(52,211,153,0.55)', shadow: 'inset 2px 0 0 rgba(52,211,153,0.45)' },
    Signale:  { border: '2px solid rgba(251,191,36,0.55)', shadow: 'inset 2px 0 0 rgba(251,191,36,0.45)' },
    Privat:   { border: '2px solid rgba(100,116,139,0.55)', shadow: 'inset 2px 0 0 rgba(100,116,139,0.45)' },
    Website:  { border: '2px solid rgba(56,189,248,0.55)', shadow: 'inset 2px 0 0 rgba(56,189,248,0.45)' },
};

const HomeChip: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const accent = CHIP_ACCENT[label];
    return (
        <div
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40 overflow-hidden relative"
            style={accent ? { borderLeftColor: 'transparent', boxShadow: accent.shadow } : undefined}
        >
            {accent && (
                <span
                    className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-full"
                    style={{ background: accent.border.replace('2px solid ', '') }}
                />
            )}
            <span>{label}</span>
            <span className="ml-2 text-[11px] normal-case tracking-normal text-white/82">{value}</span>
        </div>
    );
};

const commandToneClass: Record<string, { card: string; accent: string }> = {
    emerald: {
        card: 'border-violet-400/30 bg-violet-400/[0.18] hover:border-violet-300/45 hover:bg-violet-400/[0.26]',
        accent: 'bg-violet-400',
    },
    cyan: {
        card: 'border-cyan-400/28 bg-cyan-400/[0.15] hover:border-cyan-300/42 hover:bg-cyan-400/[0.22]',
        accent: 'bg-cyan-400',
    },
    amber: {
        card: 'border-amber-400/30 bg-amber-400/[0.16] hover:border-amber-300/44 hover:bg-amber-400/[0.24]',
        accent: 'bg-amber-400',
    },
    violet: {
        card: 'border-violet-400/30 bg-violet-400/[0.18] hover:border-violet-300/44 hover:bg-violet-400/[0.26]',
        accent: 'bg-violet-400',
    },
    muted: {
        card: 'border-white/[0.10] bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.09]',
        accent: 'bg-white/40',
    },
};

const HomeCommandButton: React.FC<{
    label: string;
    detail: string;
    onClick: () => void;
    tone: 'emerald' | 'cyan' | 'amber' | 'violet' | 'muted';
    dataTestId?: string;
}> = ({ label, detail, onClick, tone, dataTestId }) => {
    const toneStyle = commandToneClass[tone];
    return (
        <button
            type="button"
            data-testid={dataTestId}
            onClick={onClick}
            className={`relative overflow-hidden rounded-[20px] border pl-5 pr-4 py-3 text-left transition-all ${toneStyle.card}`}
        >
            <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-70 ${toneStyle.accent}`} />
            <span className="block text-[13px] font-medium text-white/84">{label}</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-white/34">{detail}</span>
        </button>
    );
};

const signalToneClass: Record<string, string> = {
    emerald: 'border-violet-300/[0.10] bg-violet-500/[0.035] text-violet-100 hover:border-violet-200/20 hover:bg-violet-500/[0.065]',
    violet:  'border-violet-300/[0.10] bg-violet-500/[0.035] text-violet-100 hover:border-violet-200/20 hover:bg-violet-500/[0.065]',
    cyan: 'border-cyan-300/[0.10] bg-cyan-500/[0.032] text-cyan-100 hover:border-cyan-200/18 hover:bg-cyan-500/[0.06]',
    amber: 'border-amber-300/[0.10] bg-amber-500/[0.032] text-amber-100 hover:border-amber-200/18 hover:bg-amber-500/[0.06]',
    muted: 'border-white/[0.045] bg-white/[0.012] text-white/56 hover:border-white/9 hover:bg-white/[0.028]',
};

const SIGNAL_CARD_BORDER: Record<string, string> = {
    emerald: 'rgba(139,92,246,0.55)',
    violet:  'rgba(139,92,246,0.55)',
    amber:   'rgba(251,191,36,0.55)',
    cyan:    'rgba(56,189,248,0.55)',
    muted:   'rgba(100,116,139,0.28)',
};

const HomeSignalCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    title: string;
    detail?: string | null;
    tone: 'emerald' | 'violet' | 'cyan' | 'amber' | 'muted';
    onClick: () => void;
}> = ({ icon, label, title, detail, tone, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full items-start gap-2.5 rounded-[18px] border px-3 py-2.5 text-left transition-all overflow-hidden ${signalToneClass[tone]}`}
        style={{ borderLeftColor: SIGNAL_CARD_BORDER[tone] }}
    >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20">
            {icon}
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-[0.18em] text-white/34">{label}</span>
            <span className="mt-1 block truncate text-[12px] font-medium text-white/78">{title}</span>
            {detail ? <span className="mt-1 block truncate text-[11px] text-white/42">{detail}</span> : null}
        </span>
    </button>
);

const HomeMiniAction: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}> = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/48 transition-colors hover:border-violet-300/16 hover:bg-violet-500/[0.07] hover:text-violet-100/74"
    >
        {icon}
        <span className="max-w-[9rem] truncate">{label}</span>
    </button>
);
