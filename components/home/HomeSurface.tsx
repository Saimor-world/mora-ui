'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CalendarDays, ExternalLink, Globe, Lock, LogOut, Mail, MessageSquare, Mic, Sparkles, Users, Wrench } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useHomeStatus, useHomeView } from '@/lib/queries/useHomeView';
import { resolveCompanyName } from '@/lib/home/resolveCompanyName';
import { HomeViewHighlights } from '@/components/home/HomeViewHighlights';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { usePaneStore } from '@/lib/store/paneStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { coreGet, fetchMyContent } from '@/lib/api/coreClient';
import { useAccountStore } from '@/lib/auth/useAccount';
import { resetUserState } from '@/lib/hooks/useUser';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { buildBriefing } from '@/lib/home/briefing';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { useAutoOpenDossier } from '@/lib/hooks/useAutoOpenDossier';
import { BriefingStack, type Briefing } from './BriefingStack';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { OpenFlowLagebild } from '@/components/home/OpenFlowLagebild';
import { HomeCockpit } from '@/components/home/HomeCockpit';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';

import { buildOpenFlowLagebild } from '@/lib/openflow/presentation';
import { nightwatchIncidentsToIncidentStatusPanels, nightwatchIncidentsToSignals, type NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import { consumeWebsiteEntryHomeOpenFlag, loadWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import { relativeTime, normalizePrivateAreaLabel, kindIcon, kindLabel, type RecentKind } from '@/components/home/homeSurfaceFormat';
import { HomeChip, HomeCommandButton, HomeSignalCard, HomeMiniAction, SuggestionCard, DeptPlanetTile } from '@/components/home/homeCards';

// ─── types ───────────────────────────────────────────────────────────────────

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

// ─── Suggestions Card Component ─────────────────────────────────────────────

interface SuggestionItem {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    actionText: string;
    tone: 'cyan' | 'violet' | 'amber' | 'emerald';
}

// ─── MÔRA Orb ────────────────────────────────────────────────────────────────

function MoraOrbSmall() {
    return (
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <motion.div
                className="absolute inset-0 rounded-full bg-violet-500/14"
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute inset-0 rounded-full bg-emerald-400/10"
                animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />
            <motion.div
                className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/24 bg-gradient-to-br from-violet-600/40 to-emerald-600/28"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Sparkles size={13} className="text-violet-200/88" />
            </motion.div>
        </div>
    );
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
    // ── surface profile ────────────────────────────────────────────────────
    const { isPublicDemoSurface } = useSurfaceProfile();

    // ── store selectors ────────────────────────────────────────────────────
    const user        = useSessionStore((s) => s.user);
    const resetStore  = useSessionStore((s) => s.resetStore);
    const setUser     = useSessionStore((s) => s.setUser);
    const { activeCompanyId, setCoreMode, activeMode } = useNavStore();
    const { data: companies = [] }   = useCompanies();
    const { data: homeView }         = useHomeView();
    const { data: homeStatus }       = useHomeStatus();
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
    // Auto-create a private dossier Node once per context.id (20-day TTL).
    const { nodeId: dossierNodeId } = useCreateDossierNode(websiteEntryContext);
    // On first OS visit after Security Check: open dossier pane + Môra automatically.
    useAutoOpenDossier(websiteEntryContext, dossierNodeId);
    const {
        overview: integrationsOverview,
        summary: communicationSummary,
    } = useCommunicationSurface();
    const {
        mailPreview = [],
        calendarPreview = [],
        feedPreview = [],
        cloudPreview = [],
    } = useCommunicationLiveData();

    // Real Nightwatch incidents -> OpenFlow signals and typed panels (read-only; empty on error).
    const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);
    useEffect(() => {
        let cancelled = false;
        fetchNightwatchIncidents()
            .then((incidents) => { if (!cancelled) setNightwatchIncidents(incidents ?? []); })
            .catch(() => { if (!cancelled) setNightwatchIncidents([]); });
        return () => { cancelled = true; };
    }, []);

    const nightwatchSignals = useMemo(
        () => nightwatchIncidentsToSignals(nightwatchIncidents),
        [nightwatchIncidents],
    );
    const incidentStatusPanels = useMemo(
        () => nightwatchIncidentsToIncidentStatusPanels(nightwatchIncidents),
        [nightwatchIncidents],
    );

    const openFlowView = useMemo(() => buildOpenFlowLagebild({
        mailPreview,
        calendarPreview,
        feedPreview,
        cloudPreview,
        homeView: homeView ?? null,
        homeStatus: homeStatus ?? null,
        communicationSummary,
        nightwatchSignals,
        incidentStatusPanels,
    }), [
        mailPreview,
        calendarPreview,
        feedPreview,
        cloudPreview,
        homeView,
        homeStatus,
        communicationSummary,
        nightwatchSignals,
        incidentStatusPanels,
    ]);
    const hiddenHomePlaceholders = homeStatus?.placeholders_detected?.map((item) => item.label) ?? [];
    const hidesLarryDashboard = hiddenHomePlaceholders.includes('Larry Dashboard');

    // ── pane helper ───────────────────────────────────────────────────────
    const revealPane = useCallback((
        paneId: string,
        req: {
            type: 'document' | 'finder' | 'meine-dateien' | 'notes' | 'chat' | 'team' | 'mail' | 'calendar' | 'integrations' | 'browser' | 'website-dossier' | 'settings' | 'wall' | 'nightwatch';
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
        const bottomInset = vh >= 760 ? 190 : 128;
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

    const openNightwatch = useCallback(() => {
        revealPane('nightwatch-main', { type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } });
    }, [revealPane]);

    const openWebsiteDossier = useCallback(() => {
        if (!websiteEntryContext) return;
        if (dossierNodeId) {
            // Node exists — open the real dossier document
            revealPane('dossier-main', {
                type: 'document',
                title: `${websiteEntryContext.companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        } else if (websiteEntryContext.domain) {
            // Fallback — live URL check while node is still being created
            revealPane('website-dossier-current', {
                type: 'website-dossier',
                title: `${websiteEntryContext.companyName} Dossier`,
                size: { width: 1040, height: 720 },
                data: { url: `https://${websiteEntryContext.domain}` },
            });
        }
    }, [revealPane, websiteEntryContext, dossierNodeId]);

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
        revealPane('calendar-main', {
            type: 'calendar',
            title: 'Kalender',
            size: { width: 840, height: 620 },
        });
    }, [revealPane]);

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

    // ── open_node / open_pane: URL params from audit_session redirect ─────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const nodeId = params.get('open_node');
        const openPaneParam = params.get('open_pane');

        if (nodeId) {
            // Clear param from URL so it doesn't re-fire on back-navigation
            window.history.replaceState({}, '', window.location.pathname);
            // Persist so the curated demo dock's "Dossier" button can reopen it.
            try { localStorage.setItem('saimor_dossier_node', nodeId); } catch {}
            const timer = setTimeout(() => {
                openPane({
                    id: 'dossier-main',
                    type: 'document',
                    title: 'Mein Dossier',
                    size: { width: 760, height: 620 },
                    data: { nodeId },
                });
            }, 600);
            return () => clearTimeout(timer);
        }

        if (openPaneParam === 'wall') {
            window.history.replaceState({}, '', window.location.pathname);
            const timer = setTimeout(() => {
                openPane({
                    id: 'wall-main',
                    type: 'wall',
                    title: 'Community Wall',
                    size: { width: 900, height: 680 },
                });
            }, 600);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    const focusTitle = activeMode === 'public_playground'
        ? "Saimôr Public HQ"
        : activeMode === 'personal_demo'
            ? 'So sieht dein Unternehmen von innen aus.'
            : websiteEntryContext
                ? 'Dein Workspace ist bereit.'
                : latestTeamMessage
                ? 'Team-Signal wartet.'
                : overlayRecentActivityItems[0]
                    ? `Weiter in ${overlayRecentActivityItems[0].label}.`
                    : hasCommunicationSignal
                        ? 'Eingang bereit.'
                        : 'Bereit wenn du es bist.';
    const focusDetail = activeMode === 'public_playground'
        ? "Erkunde die Myzel-Struktur des Systems. Teile dein Feedback an der Wall oder teste freie Experimente im Sandbox-Bereich."
        : activeMode === 'personal_demo'
            ? 'Öffne Finder, Universe oder Môra — und erlebe, wie SAIMÔR OS deine Organisation als lebendes System abbildet.'
            : websiteEntryContext
                ? 'Erkunde Finder, Universe und Môra — so würde SAIMÔR OS in deiner Organisation aussehen.'
                : latestTeamMessage
                ? `${latestTeamMessage.sender_name || 'Team'}: ${latestTeamMessage.content}`
                : overlayRecentActivityItems[0]
                    ? `${kindLabel(overlayRecentActivityItems[0].kind)} · ${relativeTime(new Date(overlayRecentActivityItems[0].openedAt).toISOString())}`
                    : hasCommunicationSignal
                        ? 'Post, Kalender oder Feeds haben neue Daten für dich vorbereitet.'
                        : 'Home zeigt nur den Einstieg: was offen ist, wo du weiterarbeiten kannst und welche echten Signale warten.';
    const displayCompanyName = resolveCompanyName(homeView, websiteEntryContext);

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

    const navigateToAmbient = useNavStore((s) => s.navigateToAmbient);
    const isSpeechSupported = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }, []);

    const moraSuggestions = useMemo((): SuggestionItem[] => {
        const suggestions: SuggestionItem[] = [];

        // 0a. Community Wall — pinned first in demo mode
        if (isPublicDemoSurface) {
            suggestions.push({
                id: 'community-wall',
                title: 'Community Wall',
                description: 'Sieh, was andere Unternehmen über ihren Security-Check sagen — und was Mora dazu analysiert.',
                icon: <Users size={15} />,
                onClick: () => openPane({
                    id: 'wall-main',
                    type: 'wall',
                    title: 'Community Wall',
                    size: { width: 900, height: 680 },
                }),
                actionText: 'Wall öffnen',
                tone: 'cyan' as const,
            });
        }

        // 0b. Larry Dashboard — OWNER ONLY. Contains sensitive infra/agent data.
        // MUST NOT be exposed to public playground / demo visitors.
        if (user?.role === 'owner' && !hidesLarryDashboard) {
            suggestions.push({
                id: 'larry-dashboard',
                title: 'Larry Dashboard',
                description: 'Echtzeit-Überblick über alle KI-Agenten, Infrastruktur und Systemstatus.',
                icon: <Activity size={15} />,
                onClick: () => window.open('https://larry.saimor.world', '_blank'),
                actionText: 'Dashboard öffnen',
                tone: 'amber',
            });
        }

        // 1. Website Dossier
        if (websiteEntryContext) {
            suggestions.push({
                id: 'website-dossier',
                title: 'Dossier analysieren',
                description: `Website-Check für ${websiteEntryContext.companyName} ist bereit. Schau dir das Dossier an.`,
                icon: <Globe size={15} />,
                onClick: openWebsiteDossier,
                actionText: 'Dossier öffnen',
                tone: 'amber',
            });
        }

        // 2. Recent Activity
        if (overlayRecentActivityItems[0]) {
            const firstRecent = overlayRecentActivityItems[0];
            suggestions.push({
                id: 'recent-activity',
                title: 'Arbeit fortsetzen',
                description: `Zuletzt geöffnet: "${firstRecent.label}". Klicke hier, um nahtlos weiterzuarbeiten.`,
                icon: <Activity size={15} />,
                onClick: () => openRecentActivity(firstRecent),
                actionText: 'Fortsetzen',
                tone: 'violet',
            });
        }

        // 3. Voice Room
        suggestions.push({
            id: 'voice-room',
            title: 'Môra Voice aktivieren',
            description: isSpeechSupported
                ? 'Steuere Saimôr OS per Sprachbefehl und unterhalte dich direkt mit Môra.'
                : 'Oeffnet Môra Field. Wenn Sprache blockiert ist, zeigt der Raum die konkrete Mikrofon- oder Browser-Ursache.',
            icon: <Mic size={15} />,
            onClick: navigateToAmbient,
            actionText: 'Voice Room',
            tone: 'cyan',
        });

        // 4. Universe (if not already saturated)
        if (suggestions.length < 3) {
            suggestions.push({
                id: 'universe',
                title: 'Topographie erkunden',
                description: 'Wechsle in den Explore-Modus, um die gesamte Organisation visualisiert zu betrachten.',
                icon: <Globe size={15} />,
                onClick: openUniverse,
                actionText: 'Explore',
                tone: 'emerald',
            });
        }

        return suggestions;
    }, [websiteEntryContext, overlayRecentActivityItems, isSpeechSupported, openWebsiteDossier, openRecentActivity, navigateToAmbient, openUniverse, isPublicDemoSurface, user?.role, hidesLarryDashboard]);

    // ── display values ─────────────────────────────────────────────────────
    const firstName = (() => {
        const rawName = user?.name?.trim();
        if (!rawName) return null;
        return rawName.includes('@') ? rawName.split('@')[0] : rawName.split(' ')[0];
    })();

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
            {/* Reading scrim: the cosmos stays visible at the edges but the working
                surface gets a calm, darker centre so panels read clearly. */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_42%,rgba(4,3,14,0.62)_0%,rgba(4,3,14,0.44)_46%,rgba(4,3,14,0.30)_100%)]" />
            <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* HOME WIDGETS — right-side panel on large screens; cockpit keeps the center stage.
                Hidden on mobile (< lg) where the cockpit fills the viewport. */}
            {!websiteEntryContext && (
                <div className="absolute top-32 bottom-28 right-4 z-[2] pointer-events-none hidden lg:block lg:w-[340px] xl:w-[380px] 2xl:w-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}>
                    <div className="pointer-events-auto">
                        <WidgetGrid
                            surface="home"
                            context={{
                                surface: 'home',
                                openMora: openMora,
                                openFinder: openFinder,
                                openNightwatch: openNightwatch,
                                goExplore: () => setCoreMode('explore'),
                            }}
                        />
                    </div>
                </div>
            )}

            {!websiteEntryContext && (
                <form
                    action="/api/auth/logout"
                    method="get"
                    className="pointer-events-auto absolute right-4 top-24 z-[2] lg:right-6"
                    onSubmit={() => {
                        window.setTimeout(() => {
                            clearClientSessionArtifacts();
                            logoutAccount();
                            resetUserState();
                            setUser(null);
                            resetStore();
                        }, 0);
                    }}
                >
                    <button
                        type="submit"
                        data-testid="home-logout"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/46 transition-colors hover:border-white/14 hover:bg-white/[0.055] hover:text-white/74"
                    >
                        <LogOut size={13} />
                        Abmelden
                    </button>
                </form>
            )}

            {!websiteEntryContext && isPublicDemoSurface && (
                <div
                    data-testid="demo-mode-chip"
                    className="pointer-events-auto absolute right-4 top-[6.5rem] z-[2] lg:right-[7.5rem] inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-300/80"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Demo-Modus
                </div>
            )}

            {!websiteEntryContext && (
                <div
                    data-testid="openflow-workspace"
                    className="pointer-events-auto absolute bottom-28 left-4 right-4 top-32 z-[1] lg:left-6 lg:right-6 lg:top-36 flex justify-center"
                >
                    <div className="flex w-full max-w-[1320px] flex-col min-h-0">
                    <div className="min-h-0 flex-1">
                    <HomeCockpit
                        firstName={firstName}
                        greeting={greeting}
                        todayLabel={todayLabel}
                        mailPreview={mailPreview}
                        calendarPreview={calendarPreview}
                        mailConfigured={Boolean(integrationsOverview?.mail?.configured)}
                        calendarConfigured={Boolean(integrationsOverview?.calendar?.configured)}
                        teamActivities={teamActivities}
                        teamMessages={teamMessages}
                        onlineCount={onlineTeamCount}
                        unreadTeamMessages={unreadTeamCount}
                        homeView={homeView}
                        incidentStatusPanels={incidentStatusPanels}
                        recentActivityItems={recentActivityItems}
                        deptTiles={featuredDeptTiles}
                        onOpenMail={openMail}
                        onOpenCalendar={openCalendarSetup}
                        onOpenTeam={openTeam}
                        onOpenIntegrations={openIntegrations}
                        onOpenFinder={openFinder}
                        onOpenMora={openMora}
                        onOpenRecentActivity={openRecentActivity}
                        onGoExplore={() => setCoreMode('explore')}
                    />
                    </div>
                    </div>
                </div>
            )}

            {websiteEntryContext && (
            <div className="pointer-events-auto absolute left-6 top-24 bottom-28 w-[min(360px,calc(100vw-2rem))] overflow-y-auto pr-2 pb-4 flex flex-col gap-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.4) transparent' }}>
                <motion.div
                    data-testid="briefing-strip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="pointer-events-auto relative overflow-hidden glass-card p-5 z-10"
                >
                    <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-violet-300/70 via-cyan-200/55 to-violet-200/50" />
                    <div className="flex items-center gap-3">
                        <MoraOrbSmall />
                        <div className="min-w-0 flex-1">
                            {isPublicDemoSurface && (
                                <div
                                    data-testid="demo-mode-chip"
                                    className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-violet-300/80"
                                >
                                    <span className="h-1 w-1 rounded-full bg-violet-400 animate-pulse" />
                                    Demo
                                </div>
                            )}
                            <h1 className="text-[clamp(15px,1.8vw,20px)] font-light leading-tight tracking-[-0.02em] text-white/92">
                                {websiteEntryContext
                                    ? <span>{displayCompanyName}</span>
                                    : firstName
                                        ? <><span>{greeting}</span><span className="text-white/44">, {firstName}.</span></>
                                        : 'Workspace'}
                            </h1>
                            <div className="mt-0.5 text-[10px] text-white/28">{todayLabel}</div>
                        </div>
                        {/* Hide logout in unauthenticated website preview — no real session to end */}
                        {(!websiteEntryContext || user) && (
                            <form
                                action="/api/auth/logout"
                                method="get"
                                onSubmit={() => {
                                    window.setTimeout(() => {
                                        clearClientSessionArtifacts();
                                        logoutAccount();
                                        resetUserState();
                                        setUser(null);
                                        resetStore();
                                    }, 0);
                                }}
                            >
                                <button
                                    type="submit"
                                    data-testid="home-logout"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/46 transition-all hover:border-white/14 hover:bg-white/[0.055] hover:text-white/74"
                                >
                                    <LogOut size={13} />
                                    Abmelden
                                </button>
                            </form>
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

                    {activeMode !== 'public_playground' && (
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
                    )}
                </motion.div>

                {/* View-Highlights: Aufmerksamkeit + Nächste Aufgaben aus dem Backend */}
                <HomeViewHighlights view={homeView} />

                {/* Schnellzugriff — compact icon-action grid replaces old suggestion cards */}
                {moraSuggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22, duration: 0.5, ease: 'easeOut' }}
                        className="pointer-events-auto relative overflow-hidden glass-card p-4 z-10"
                    >
                        <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-cyan-300/70 via-violet-200/55 to-amber-200/50" />
                        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-white/28">Schnellzugriff</div>
                        <div className="grid grid-cols-3 gap-2">
                            {moraSuggestions.map((suggestion, i) => {
                                const toneClass = {
                                    amber:   'border-amber-300/15 bg-amber-400/[0.07] hover:bg-amber-400/[0.14] hover:border-amber-300/28',
                                    violet:  'border-violet-300/15 bg-violet-400/[0.07] hover:bg-violet-400/[0.14] hover:border-violet-300/28',
                                    emerald: 'border-emerald-300/15 bg-emerald-400/[0.07] hover:bg-emerald-400/[0.14] hover:border-emerald-300/28',
                                    cyan:    'border-cyan-300/15 bg-cyan-400/[0.07] hover:bg-cyan-400/[0.14] hover:border-cyan-300/28',
                                }[suggestion.tone];
                                return (
                                    <motion.button
                                        key={suggestion.id}
                                        type="button"
                                        onClick={suggestion.onClick}
                                        initial={{ opacity: 0, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.28 + i * 0.05, duration: 0.3, ease: 'easeOut' }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.94 }}
                                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors ${toneClass}`}
                                    >
                                        <span className="opacity-72">{suggestion.icon}</span>
                                        <span className="text-[10px] leading-snug text-white/68">{suggestion.actionText}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
            )}

            {websiteEntryContext && (
            <section className="absolute left-[400px] right-[360px] top-[148px] bottom-[184px] hidden items-center justify-center 2xl:right-[390px] xl:flex">
                <div className="pointer-events-auto relative w-full max-w-[690px]">
                    <div
                        className="absolute inset-x-[4%] top-1/2 h-80 -translate-y-1/2 rounded-full blur-[130px]"
                        style={{ background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(244,63,94,0.13)' : websiteEntryContext.score !== undefined && websiteEntryContext.score < 70 ? 'rgba(245,158,11,0.11)' : 'rgba(34,211,238,0.12)' }}
                    />
                    <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.045]" />
                    <div className="relative overflow-hidden glass-card px-6 py-6 shadow-[0_34px_130px_rgba(0,0,0,0.4)]">
                        <div
                            className="pointer-events-none absolute left-0 top-0 h-[2px] w-full"
                            style={{ background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'linear-gradient(90deg,rgba(251,113,133,0.55),rgba(244,63,94,0.70),rgba(251,113,133,0.55))' : websiteEntryContext.score !== undefined && websiteEntryContext.score < 70 ? 'linear-gradient(90deg,rgba(251,191,36,0.50),rgba(245,158,11,0.65),rgba(251,191,36,0.50))' : 'linear-gradient(90deg,rgba(52,211,153,0.50),rgba(16,185,129,0.65),rgba(52,211,153,0.50))' }}
                        />
                        <div
                            className="absolute -right-20 -top-24 h-52 w-52 rounded-full blur-[72px]"
                            style={{ background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.15)' : websiteEntryContext.score !== undefined && websiteEntryContext.score < 70 ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.11)' }}
                        />
                        <div
                            className="absolute -bottom-24 left-12 h-56 w-56 rounded-full blur-[82px]"
                            style={{ background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(244,63,94,0.10)' : 'rgba(139,92,246,0.12)' }}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.055),transparent_22%),repeating-linear-gradient(115deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_28px)] opacity-70" />

                        <div className="relative flex items-start justify-between gap-6">
                            <div className="min-w-0 flex-1">
                                <div
                                    className="inline-block text-[10px] uppercase tracking-[0.24em] relative"
                                    style={{ color: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.72)' : websiteEntryContext.score !== undefined && websiteEntryContext.score < 70 ? 'rgba(251,191,36,0.70)' : 'rgba(52,211,153,0.70)' }}
                                >
                                    Scan-Ergebnis
                                    <span
                                        className="absolute left-0 bottom-[-3px] rounded-full"
                                        style={{ width: 28, height: 1, background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.85)' : websiteEntryContext.score !== undefined && websiteEntryContext.score < 70 ? 'rgba(251,191,36,0.80)' : 'rgba(52,211,153,0.80)' }}
                                    />
                                </div>
                                <div className="mt-3 flex items-start gap-4" data-testid="website-entry-home-card">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="max-w-[24rem] text-[clamp(22px,2.4vw,32px)] font-light leading-[1.05] tracking-[-0.03em] text-white/94 truncate">
                                            {websiteEntryContext.domain || websiteEntryContext.title || 'Dein Unternehmen'}
                                        </h2>
                                        <p className="mt-1.5 text-[12px] leading-relaxed text-white/48">
                                            {websiteEntryContext.tasks.length} Signal{websiteEntryContext.tasks.length !== 1 ? 'e' : ''} erkannt · Analyse abgeschlossen
                                        </p>
                                    </div>
                                    {websiteEntryContext.score !== undefined && (
                                        <div
                                            className="shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[4.5rem] rounded-2xl"
                                            style={{
                                                border: `1.5px solid ${websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.38)' : websiteEntryContext.score < 70 ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.35)'}`,
                                                background: websiteEntryContext.score < 40 ? 'rgba(244,63,94,0.11)' : websiteEntryContext.score < 70 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)',
                                            }}
                                        >
                                            <span
                                                className="text-[28px] font-light leading-none tabular-nums"
                                                style={{ color: websiteEntryContext.score < 40 ? '#fb7185' : websiteEntryContext.score < 70 ? '#fbbf24' : '#34d399' }}
                                            >
                                                {websiteEntryContext.score}
                                            </span>
                                            <span
                                                className="mt-0.5 text-[8px] uppercase tracking-[0.13em]"
                                                style={{ color: websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.68)' : websiteEntryContext.score < 70 ? 'rgba(251,191,36,0.65)' : 'rgba(52,211,153,0.65)' }}
                                            >
                                                {websiteEntryContext.score < 40 ? 'Hoch' : websiteEntryContext.score < 70 ? 'Mittel' : 'Gut'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 space-y-1.5">
                                    {websiteEntryContext.tasks.slice(0, 3).map((task) => (
                                        <div key={task.title} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2">
                                            <span className="min-w-0 truncate text-[12px] text-white/72">{task.title}</span>
                                            <span
                                                className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.11em]"
                                                style={
                                                    task.priority === 'hoch'
                                                        ? { background: 'rgba(244,63,94,0.14)', color: 'rgba(251,113,133,0.85)' }
                                                        : task.priority === 'mittel'
                                                            ? { background: 'rgba(245,158,11,0.14)', color: 'rgba(251,191,36,0.85)' }
                                                            : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)' }
                                                }
                                            >
                                                {task.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={openWebsiteDossier}
                                        className="rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors"
                                        style={{
                                            borderColor: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.28)' : 'rgba(251,191,36,0.24)',
                                            background: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(244,63,94,0.09)' : 'rgba(245,158,11,0.08)',
                                            color: websiteEntryContext.score !== undefined && websiteEntryContext.score < 40 ? 'rgba(251,113,133,0.88)' : 'rgba(251,191,36,0.82)',
                                        }}
                                    >
                                        Dossier öffnen
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="dossier-wall-btn"
                                        onClick={() => revealPane('wall-main', {
                                            type: 'wall',
                                            title: 'Community Wall',
                                            size: { width: 900, height: 680 },
                                        })}
                                        className="rounded-full border border-violet-300/16 bg-violet-400/[0.06] px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] text-violet-100/60 transition-colors hover:bg-violet-400/[0.10]"
                                    >
                                        Auf die Wall
                                    </button>
                                </div>
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

                        <div className={`relative mt-6 grid grid-cols-2 gap-2 ${activeMode === 'public_playground' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                            <HomeCommandButton dataTestId="qa-finder" label="Finder" detail="Dateien & Ordner" onClick={openFinder} tone="emerald" />
                            <HomeCommandButton dataTestId="qa-universe" label="Universe" detail="Topographie" onClick={openUniverse} tone="cyan" />
                            {activeMode !== 'public_playground' && (
                                <HomeCommandButton dataTestId="qa-mora" label="Mora" detail="Fragen" onClick={openMora} tone="amber" />
                            )}
                            <HomeCommandButton dataTestId="qa-upload" label="Upload" detail="Datei ablegen" onClick={openUpload} tone="violet" />
                        </div>

                        {featuredDeptTiles.length > 0 && (
                            <div className="relative mt-5">
                                <div className="mb-2.5 flex items-center justify-between">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Planetenverbindungen</div>
                                    <button
                                        type="button"
                                        onClick={openUniverse}
                                        className="text-[10px] uppercase tracking-[0.14em] text-violet-200/40 transition-colors hover:text-violet-100/72"
                                    >
                                        alle →
                                    </button>
                                </div>
                                <div data-testid="dept-pulse-tiles" className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                                    {featuredDeptTiles.map(({ dept, count, active, loaded }, tileIdx) => (
                                        <DeptPlanetTile
                                            key={dept.id}
                                            dept={dept}
                                            count={count}
                                            active={active}
                                            loaded={loaded}
                                            colorIdx={tileIdx}
                                            onClick={() => revealPane(`finder-dept-${dept.id}`, {
                                                type: 'finder',
                                                title: dept.name,
                                                size: { width: 900, height: 620 },
                                                data: { departmentId: dept.id, departmentName: dept.name },
                                            })}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            )}

            {websiteEntryContext && (
            <aside className="absolute bottom-[12rem] right-6 w-[318px] 2xl:right-10">
                <div data-tageslage-panel className="pointer-events-auto relative overflow-hidden glass-card p-4 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
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
                                detail="Home bleibt leer, bis echte Aktivität entsteht."
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
                        {/* Larry Dashboard — OWNER ONLY (sensitive infra/agent data). */}
                        {user?.role === 'owner' && !hidesLarryDashboard && (
                            <HomeMiniAction
                                icon={<ExternalLink size={13} />}
                                label="Larry"
                                onClick={() => typeof window !== 'undefined' && window.open('https://dash.saimor.world', '_blank', 'noopener,noreferrer')}
                            />
                        )}
                    </div>
                </div>
            </aside>
            )}
        </div>
    );
};

// ─── Planet tile color palette (deterministic, not random) ───────────────────
