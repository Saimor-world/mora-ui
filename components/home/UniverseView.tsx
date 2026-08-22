"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useCompanies } from '@/lib/queries/useCompanies';
import { DeptSpaceMap } from '@/components/mora/DeptSpaceMap';
import type { UniverseSignal } from '@/lib/universe/types';
import { OrganizationField, type OrganizationTerritory } from '@/components/universe/OrganizationField';
import { UniverseAmbientField } from '@/components/universe/UniverseAmbientField';
import { UniverseObservatory } from '@/components/universe/UniverseObservatory';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    fetchDepartmentStats,
    fetchUserMemberships,
    fetchWorkspaceSubscriptions,
    type DepartmentStats,
    type UserMembership,
} from '@/lib/api/coreClient';
import { summarizeSubscriptions, type BusinessSummary } from '@/lib/business/mrr';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { buildOrganicUniverseLayout } from '@/lib/universe/layout';
import { isAdmin } from '@/lib/auth/roles';
import { resolveVisibleCompany } from '@/lib/auth/activeCompany';
import { UNASSIGNED_DEPARTMENT_ID, UNASSIGNED_DEPARTMENT_NAME } from '@/lib/constants/tree';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { intakeIntoDepartment, fetchFoldersByCompany } from '@/lib/api/orgClient';
import { groupFoldersByDepartment } from '@/lib/universe/moonsFromFolders';
import { chooseMoraAttention } from '@/lib/mora/attention';
import { CursorAgent } from '@/components/mora/CursorAgent';
import { useUniverseFieldStore } from '@/lib/store/universeFieldStore';
import { anchorsToViewport } from '@/lib/universe/anchors';
import { buildTickerItems } from '@/lib/universe/ticker';
import { buildSubstanceBars } from '@/lib/universe/substanceChart';
import { UniverseTicker } from '@/components/universe/UniverseTicker';

const EMPTY_ITEMS: any[] = [];

interface TerritoryMetrics {
    nodes: number;
    spaces: number;
    folders: number;
    source: 'live' | 'derived' | 'missing';
}

export default function UniverseView() {
    const {
        activeCompanyId,
        activeMode,
        viewMode,
        coreMode,
        setCoreMode,
        navigateToDepartment,
        navigateToFolder,
        universeScope,
        universeScopeDeptId,
    } = useNavStore();
    const user = useSessionStore((state) => state.user);
    const openPane = usePaneStore((state) => state.openPane);
    const queryClient = useQueryClient();

    const { data: companiesData = [] } = useCompanies();
    const companies = useMemo(
        () => Array.isArray(companiesData) ? companiesData : EMPTY_ITEMS,
        [companiesData],
    );
    const currentCompany = useMemo(
        () => resolveVisibleCompany(companies, activeCompanyId, viewMode, activeMode),
        [companies, activeCompanyId, viewMode, activeMode],
    );
    const effectiveCompanyId = currentCompany?.id ?? activeCompanyId ?? null;
    useEffect(() => {
        if (effectiveCompanyId && effectiveCompanyId !== activeCompanyId) {
            useNavStore.getState().setActiveCompany(effectiveCompanyId);
        }
    }, [activeCompanyId, effectiveCompanyId]);

    const { data: departmentsData = [], isLoading: departmentsLoading } = useDepartments(effectiveCompanyId);
    const { data: treeDataRaw = [], isLoading: treeLoading } = useTree(effectiveCompanyId);
    const departments = useMemo(
        () => Array.isArray(departmentsData) ? departmentsData : EMPTY_ITEMS,
        [departmentsData],
    );
    const tree = useMemo(
        () => Array.isArray(treeDataRaw) ? treeDataRaw : EMPTY_ITEMS,
        [treeDataRaw],
    );

    const [statsMap, setStatsMap] = useState<Record<string, DepartmentStats>>({});
    const [memberships, setMemberships] = useState<UserMembership[] | null>(null);
    const [membershipsLoaded, setMembershipsLoaded] = useState(false);
    const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);
    const [folderMoons, setFolderMoons] = useState<Record<string, { id: string; name: string; documents?: number; updatedAt?: string | null }[]>>({});
    const [business, setBusiness] = useState<BusinessSummary>({ monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] });
    const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
    const { mailPreview, calendarPreview, feedPreview } = useCommunicationLiveData();

    useEffect(() => {
        if (!effectiveCompanyId) {
            setStatsMap({});
            return;
        }
        let cancelled = false;
        const load = async () => {
            const stats = await fetchDepartmentStats(effectiveCompanyId);
            if (cancelled) return;
            const next: Record<string, DepartmentStats> = {};
            stats.forEach((item) => { next[item.department_id] = item; });
            setStatsMap(next);
        };
        void load();
        const interval = window.setInterval(load, 45_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [effectiveCompanyId]);

    useEffect(() => {
        if (!effectiveCompanyId) {
            setMemberships(null);
            setMembershipsLoaded(false);
            return;
        }
        let cancelled = false;
        setMembershipsLoaded(false);
        void fetchUserMemberships()
            .then((response) => {
                if (cancelled) return;
                setMemberships(response?.department_memberships ?? null);
                setMembershipsLoaded(true);
            })
            .catch(() => {
                if (cancelled) return;
                setMemberships(null);
                setMembershipsLoaded(true);
            });
        return () => { cancelled = true; };
    }, [effectiveCompanyId, user?.id]);

    useEffect(() => {
        let cancelled = false;
        fetchNightwatchIncidents()
            .then((items) => { if (!cancelled) setNightwatchIncidents(items); })
            .catch(() => { if (!cancelled) setNightwatchIncidents([]); });
        return () => { cancelled = true; };
    }, []);

    // "wir bereiten uns auf ersten Umsatz 2027 vor" - die Leitung liegt schon,
    // bevor Wasser durchfliesst. tenant_subscriptions hatte am 21.08.2026 null
    // Zeilen; summarizeSubscriptions sagt das ehrlich, statt eine Zahl zu
    // erfinden, und rechnet richtig, sobald die erste Zahlung eintrifft.
    useEffect(() => {
        let cancelled = false;
        fetchWorkspaceSubscriptions()
            .then((subs) => { if (!cancelled) setBusiness(summarizeSubscriptions(subs)); })
            .catch(() => { if (!cancelled) setBusiness({ monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] }); });
        return () => { cancelled = true; };
    }, [effectiveCompanyId]);

    useEffect(() => {
        setSelectedTerritoryId(null);
    }, [effectiveCompanyId]);

    // 'mindfield' war der zweite Zustand des entfernten Umschalters
    // "Organisation | Zusammenhaenge". Seit beide Linsen ein Feld sind, ist
    // er ein toter Zustand - aber andere Teile der Shell fragen coreMode ab,
    // um zu erkennen, ob man ueberhaupt im Universe ist:
    //   - QuickTips blendet sich nur bei 'home' | 'explore' aus. Blieb
    //     coreMode auf 'mindfield' stehen, schob sich die Tour-Blase
    //     ("Tipp 1/4: Spotlight Suche") ueber das Feld und stahl die
    //     Kontrolle.
    //   - Die Statusanzeige oben rechts zeigte weiterhin "ZUSAMMENHAENGE".
    // Deshalb hier einmalig auf den lebenden Zustand zurueckziehen.
    useEffect(() => {
        if (coreMode === 'mindfield') setCoreMode('explore');
    }, [coreMode, setCoreMode]);

    const baseAccessibleDepartments = useMemo(() => {
        if (!membershipsLoaded) return [];
        if (!user || isAdmin(user.role)) {
            return departments.map((department) => ({ ...department, universeAccess: 'open' as const }));
        }

        const memberIds = new Set((memberships ?? []).map((membership) => membership.department_id));
        return departments.flatMap((department) => {
            if (memberIds.has(department.id) || department.visibility === 'public') {
                return [{ ...department, universeAccess: 'open' as const }];
            }
            if (department.visibility === 'visible') {
                return [{ ...department, universeAccess: 'locked' as const }];
            }
            return [];
        });
    }, [departments, memberships, membershipsLoaded, user]);

    // Bereiche ohne Abteilung wurden bisher stillschweigend verworfen (siehe
    // core/services/tree_service.py) - bei der echten Saimoer-HQ-Firma waren
    // das 2 von 8 Spaces mit 2 Ordnern und 7 echten Dokumenten aus dem
    // Onboarding, unsichtbar im Finder und in Universe. CORE liefert sie
    // jetzt additiv als eigenen Baumeintrag; hier wird daraus EIN weiterer
    // Planet, ohne Mitgliedschaft zu pruefen - er hatte nie eine Abteilung,
    // die ihn haette regeln koennen.
    const accessibleDepartments = useMemo(() => {
        const unassigned = tree.find((item) => item.id === UNASSIGNED_DEPARTMENT_ID);
        if (!unassigned) return baseAccessibleDepartments;
        return [
            ...baseAccessibleDepartments,
            {
                id: UNASSIGNED_DEPARTMENT_ID,
                name: UNASSIGNED_DEPARTMENT_NAME,
                description: 'Bereiche ohne Abteilung – noch nicht eingeordnet, aber vorhanden.',
                color: '#94a3b8',
                visibility: 'public',
                universeAccess: 'open' as const,
            },
        ];
    }, [baseAccessibleDepartments, tree]);

    const metrics = useMemo<Record<string, TerritoryMetrics>>(() => {
        const result: Record<string, TerritoryMetrics> = {};

        Object.entries(statsMap).forEach(([departmentId, stats]) => {
            result[departmentId] = {
                nodes: stats.docs || stats.nodes || 0,
                spaces: stats.spaces || 0,
                folders: stats.folders || 0,
                source: 'live',
            };
        });

        const countChildren = (children: any[]): { nodes: number; folders: number } => {
            let nodes = 0;
            let folders = 0;
            children.forEach((child) => {
                if (child.type === 'folder') folders += 1;
                else if (child.type !== 'space' && child.type !== 'department') nodes += 1;
                if (Array.isArray(child.children)) {
                    const nested = countChildren(child.children);
                    nodes += nested.nodes;
                    folders += nested.folders;
                }
            });
            return { nodes, folders };
        };

        tree.filter((item) => item.type === 'department').forEach((department) => {
            if (result[department.id]) return;
            const children = Array.isArray(department.children) ? department.children : [];
            const counted = countChildren(children);
            result[department.id] = {
                nodes: counted.nodes,
                spaces: children.filter((child: any) => child.type === 'space').length,
                folders: counted.folders,
                source: 'derived',
            };
        });

        departments.forEach((department) => {
            if (!result[department.id]) {
                result[department.id] = { nodes: 0, spaces: 0, folders: 0, source: 'missing' };
            }
        });

        return result;
    }, [departments, statsMap, tree]);

    // Die echten Bereiche je Abteilung, aus dem Baum. get_company_tree
    // liefert Abteilungen -> Bereiche eager (Ordner/Dokumente erst beim
    // Aufklappen), also steht genau das hier zur Verfuegung, was ein Mond
    // braucht: id und Name.
    const spaceListByDepartment = useMemo(() => {
        const result: Record<string, { id: string; name: string }[]> = {};
        tree.filter((item) => item.type === 'department').forEach((department) => {
            const children = Array.isArray(department.children) ? department.children : [];
            result[department.id] = children
                .filter((child: any) => child.type === 'space')
                .map((child: any) => ({ id: String(child.id), name: String(child.name || 'Bereich') }));
        });
        return result;
    }, [tree]);

    // Monde sind Ordner, nicht Bereiche. Der Baum liefert Bereiche eager,
    // Ordner erst beim Aufklappen - deshalb hier ein eigener Abruf ueber die
    // ganze Firma (ein Aufruf, nicht einer je Bereich).
    useEffect(() => {
        if (!effectiveCompanyId) { setFolderMoons({}); return; }
        let cancelled = false;
        const spaceToDepartment: Record<string, string> = {};
        Object.entries(spaceListByDepartment).forEach(([departmentId, spaces]) => {
            spaces.forEach((space) => { spaceToDepartment[space.id] = departmentId; });
        });
        void fetchFoldersByCompany(effectiveCompanyId)
            .then((folders) => {
                if (!cancelled) setFolderMoons(groupFoldersByDepartment(folders as any, spaceToDepartment));
            })
            .catch(() => { if (!cancelled) setFolderMoons({}); });
        return () => { cancelled = true; };
    }, [effectiveCompanyId, spaceListByDepartment]);

    const positionedDepartments = useMemo(() => {
        const sorted = [...accessibleDepartments].sort((left, right) => {
            const a = String(left.id || '') + ':' + String(left.name || '');
            const b = String(right.id || '') + ':' + String(right.name || '');
            return a.localeCompare(b);
        });
        return buildOrganicUniverseLayout(sorted, metrics);
    }, [accessibleDepartments, metrics]);

    const territories = useMemo<OrganizationTerritory[]>(
        () => positionedDepartments.map((department) => {
            const value = metrics[department.id];
            return {
                id: department.id,
                name: department.name,
                description: department.description,
                color: department.color,
                x: department.x,
                y: department.y,
                spaces: value?.spaces || 0,
                folders: value?.folders || 0,
                documents: value?.nodes || 0,
                // Die echten Bereiche dieser Abteilung aus dem Baum - jeder
                // wird ein Mond mit eigenem Namen. Die blosse Anzahl (spaces)
                // reicht dafuer nicht.
                // Monde tragen jetzt echte Ordnernamen; solange die noch
                // laden, dienen die Bereiche als Zwischenstand statt
                // eines leeren Orbits.
                spaceList: folderMoons[department.id] || spaceListByDepartment[department.id] || [],
                metricSource: value?.source || 'missing',
                access: department.universeAccess,
            };
        }),
        [metrics, positionedDepartments, spaceListByDepartment, folderMoons],
    );

    const signals = useMemo<UniverseSignal[]>(() => {
        const normalized = accessibleDepartments
            .map((department) => ({
                id: department.id,
                needle: String(department.name || '').trim().toLocaleLowerCase('de-DE'),
            }))
            .filter((department) => department.needle.length >= 3);
        const match = (text: string) => {
            const haystack = text.toLocaleLowerCase('de-DE');
            return normalized.find((department) => haystack.includes(department.needle))?.id || null;
        };
        const result: UniverseSignal[] = [];

        nightwatchIncidents.slice(0, 4).forEach((incident) => {
            const assignedId = incident.department_id || incident.affected_department_id;
            const targetId = assignedId
                || match(String(incident.title || '') + ' ' + String(incident.summary || ''));
            if (!targetId || !normalized.some((department) => department.id === targetId)) return;
            result.push({
                id: incident.id,
                title: incident.title || incident.host || 'Nightwatch',
                subtitle: 'Nightwatch · ' + String(incident.severity || 'Hinweis'),
                targetId,
                kind: 'nightwatch',
                evidence: assignedId ? 'assigned' : 'inferred',
                severity: incident.severity,
            });
        });
        feedPreview.slice(0, 4).forEach((item) => {
            const targetId = match(item.title + ' ' + String(item.summary || ''));
            if (targetId) {
                result.push({
                    id: item.id,
                    title: item.title,
                    subtitle: 'Feed · ' + item.sourceTitle,
                    targetId,
                    kind: 'rss',
                    // match() findet den Bereichsnamen im Text. Das ist ein
                    // Treffer, kein Beleg - der Strang wird gestrichelt.
                    evidence: 'inferred',
                    href: item.link,
                });
            }
        });
        mailPreview.slice(0, 3).forEach((item) => {
            const targetId = match(item.subject + ' ' + String(item.snippet || ''));
            if (targetId) {
                result.push({
                    id: item.id,
                    title: item.subject,
                    subtitle: 'Mail · ' + item.from,
                    targetId,
                    kind: 'mail',
                    evidence: 'inferred',
                });
            }
        });
        calendarPreview.slice(0, 3).forEach((item) => {
            const targetId = match(item.title + ' ' + String(item.location || ''));
            if (targetId) {
                result.push({
                    id: item.id,
                    title: item.title,
                    subtitle: 'Kalender',
                    targetId,
                    kind: 'calendar',
                    evidence: 'inferred',
                });
            }
        });

        return result;
    }, [accessibleDepartments, calendarPreview, feedPreview, mailPreview, nightwatchIncidents]);

    const tickerItems = useMemo(() => buildTickerItems({
        territories: territories.map((t) => ({ id: t.id, name: t.name, documents: t.documents, spaces: t.spaces, folders: t.folders })),
        signals,
        business,
        openIncidentCount: nightwatchIncidents.filter((item) => !['resolved', 'closed', 'dismissed'].includes(String(item.status || 'open').toLowerCase())).length,
        mailPreview,
        calendarPreview,
        feedPreview,
    }), [territories, signals, business, nightwatchIncidents, mailPreview, calendarPreview, feedPreview]);

    // Môra lebt im Feld statt in einem Fenster: der CursorAgent war seit
    // Monaten fertig gebaut, stand in MoraShell aber auskommentiert als
    // "1.0 gated (future-tier)". Sie zeigt nur auf etwas, das wirklich da
    // ist - und schweigt sonst. Aufmerksamkeit, die immer an ist, ist keine.
    const fieldAnchors = useUniverseFieldStore((state) => state.anchors);
    const fieldRect = useUniverseFieldStore((state) => state.rect);

    const attention = useMemo(() => chooseMoraAttention({
        territories: territories.map((t) => ({
            id: t.id, name: t.name, documents: t.documents, spaces: t.spaces, metricSource: t.metricSource,
        })),
        openIncidents: nightwatchIncidents
            .filter((item) => !['resolved', 'closed', 'dismissed'].includes(String(item.status || 'open').toLowerCase()))
            .map((item) => ({
                id: String(item.id),
                title: String(item.title || item.host || 'Vorfall'),
                targetId: item.department_id || item.affected_department_id || null,
            })),
        mailPreview,
        calendarPreview,
    }), [territories, nightwatchIncidents, mailPreview, calendarPreview]);

    const attentionPoint = useMemo(() => {
        if (!attention) return null;
        const anchor = anchorsToViewport(fieldAnchors, fieldRect)
            .find((point) => point.id === attention.targetId);
        return anchor ? { x: anchor.x, y: anchor.y } : null;
    }, [attention, fieldAnchors, fieldRect]);

    const substanceBars = useMemo(() => buildSubstanceBars(territories), [territories]);

    // Der vorzeitige Ausstieg in die Abteilungs-Ansicht stand frueher WEITER
    // OBEN - mitten zwischen den Hooks. React verlangt aber, dass Hooks in
    // jedem Durchlauf in derselben Reihenfolge laufen: beim Wechsel in eine
    // Abteilung wurden die danach stehenden uebersprungen, und die Zustaende
    // htten sich gegeneinander verschoben. Die CI hat das gefunden
    // (react-hooks/rules-of-hooks), bevor es jemand im Betrieb als "es
    // passieren komische Sachen" gemeldet haette.
    if (universeScope === 'dept' && universeScopeDeptId) {
        const scoped = accessibleDepartments.find((department) => (
            department.id === universeScopeDeptId && department.universeAccess === 'open'
        ));
        if (scoped) {
            return <DeptSpaceMap departmentId={universeScopeDeptId} departmentName={scoped.name} />;
        }
    }

    const organizationName = currentCompany?.name || user?.active_company_name || 'Organisation';
    const loading = departmentsLoading || treeLoading || !membershipsLoaded;
    const hasRestrictedDepartments = membershipsLoaded && departments.length > 0 && territories.length === 0;

    return (
        /* Kein eigenes bg-Farbe mehr: MoraShell traegt bereits ein geteiltes,
           lebendiges Hintergrundsystem (MoraLivingBackground - 500 Sterne,
           Aurora, szenenreaktiver Nebel - plus TemporalAtmosphere,
           RitualSceneStyler). Universe malte bislang blickdicht darueber und
           zeigte stattdessen sein eigenes, kleineres Sternfeld - abgeschnitten
           vom "living ambient desktop", den docs/superpowers/specs/
           2026-06-18-universe-as-company-desktop.md als Vision festgehalten
           hat. UniverseAmbientField setzt jetzt nur noch eine Stimmung obenauf,
           statt selbst der Hintergrund zu sein. */
        <div className="relative h-full w-full overflow-hidden text-white">
            <UniverseAmbientField lens="organization" selected={Boolean(selectedTerritoryId)} />

            {/* Sie zeigt nur, wenn es ein echtes Ziel UND einen echten Grund
                gibt - kein Zeiger ins Leere. */}
            {attention && attentionPoint && (
                <CursorAgent
                    active
                    action="point"
                    target={attentionPoint}
                    message={attention.message}
                    awareness={attention.reason === 'incident' ? 'alert' : 'insight'}
                />
            )}

            <UniverseObservatory
                mail={mailPreview}
                calendar={calendarPreview}
                feed={feedPreview}
                incidents={nightwatchIncidents}
                business={business}
                substanceBars={substanceBars}
                onSelectTerritory={setSelectedTerritoryId}
                territoryCount={territories.length}
                documentCount={territories.reduce((sum, territory) => sum + territory.documents, 0)}
                selected={Boolean(selectedTerritoryId)}
                onOpenMail={() => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 980, height: 700 } })}
                onOpenCalendar={() => openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 980, height: 700 } })}
                onOpenFeed={() => openPane({ id: 'feeds-main', type: 'feeds', title: 'Dein Feed', size: { width: 920, height: 680 } })}
                onOpenNightwatch={() => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } })}
            />


            {/* Der Umschalter "Organisation | Zusammenhaenge" ist entfernt.
                Beide Linsen zeigten denselben Ort mit derselben Kamera - der
                einzige Unterschied waren Verbindungslinien, die ohnehin nur
                erscheinen, wenn es Belege gibt. Bei null Signalen (dem
                Normalfall) waren die Ansichten nicht unterscheidbar; Marius
                hat sie mehrfach als identisch erlebt und zuletzt gefragt:
                "wieso sind das 2 sachen?".

                Ein Schalter zwischen zwei gleich aussehenden Zustaenden ist
                schlimmer als kein Schalter. Jetzt: ein Feld. Verbindungen
                zeichnen sich selbst, wenn Belege da sind, und kosten nichts,
                wenn keine da sind. */}
            <OrganizationField
                lens="relations"
                organizationName={organizationName}
                territories={territories}
                signals={signals}
                selectedId={selectedTerritoryId}
                onSelect={setSelectedTerritoryId}
                onOpen={navigateToDepartment}
                attentionId={attention?.targetId ?? null}
                onOpenMoon={(folderId, folderName) => {
                    // In den Ordner selbst, nicht in ein generisches Fenster:
                    // navigateToFolder setzt den Kontext, der Finder oeffnet
                    // sich darin. Ein Mond ist ein Ort, kein Vorschaubild.
                    navigateToFolder(folderId);
                    openPane({
                        // Eigene Fenster-id je Ordner. Mit der festen
                        // 'finder-main' traf openPane ein bereits offenes
                        // Fenster und uebernahm dessen alte Daten nicht - der
                        // Finder blieb auf "Start" stehen, statt den
                        // angeklickten Ordner zu zeigen.
                        id: 'finder-' + folderId,
                        type: 'finder',
                        title: folderName,
                        size: { width: 1040, height: 720 },
                        // companyId MUSS mit: apps/finder/index.tsx setzt beim
                        // Aufloesen der Firma auf den Wurzelordner zurueck,
                        // solange der Aufrufer keine mitgibt (`if
                        // (!paneCompanyId) resetNavigationRoot(null)`, Zeile
                        // 575). Ohne sie sprang der Finder sofort wieder auf
                        // "Start" - der angeklickte Mond war nach einem
                        // Wimpernschlag wieder weg.
                        data: { folderId, companyId: effectiveCompanyId },
                    });
                }}
                onFile={async (departmentId, label, kind) => {
                    try {
                        const created = await intakeIntoDepartment(departmentId, {
                            name: label,
                            type: 'note',
                            source: kind,
                        });
                        if (!created?.id) return false;
                        // Der Planet muss danach wachsen: ein Dokument mehr ist
                        // ein Stern mehr. Ohne das zeigte das Feld noch den
                        // Stand von vor der Ablage.
                        queryClient.invalidateQueries({ queryKey: queryKeys.tree(effectiveCompanyId) });
                        const stats = await fetchDepartmentStats(effectiveCompanyId ?? undefined);
                        const next: Record<string, DepartmentStats> = {};
                        stats.forEach((item) => { next[item.department_id] = item; });
                        setStatsMap(next);
                        return true;
                    } catch {
                        // Fehlschlag bleibt Fehlschlag - die Oberflaeche sagt das
                        // ausdruecklich, statt einen Erfolg zu zeigen, den es
                        // nicht gab.
                        return false;
                    }
                }}
                onAskMora={(territory) => openPane({
                    id: 'chat-universe-' + territory.id,
                    type: 'chat',
                    title: 'Môra',
                    size: { width: 520, height: 640 },
                    data: {
                        initialPrompt:
                            'Ordne die Abteilung ' + territory.name + ' in ' + organizationName +
                            ' ein. Nutze nur den sichtbaren Organisationskontext, benenne fehlende Daten ausdrücklich ' +
                            'und schlage den nächsten sinnvollen Schritt vor.',
                    },
                })}
            />

            <AnimatePresence>
                {!loading && territories.length === 0 && (
                    <motion.div
                        className="absolute inset-0 z-[50] flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex max-w-sm flex-col items-center gap-4 rounded-[32px] border border-amber-400/18 bg-black/55 px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10">
                                <Sparkles className="h-7 w-7 text-amber-300/80" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/55">
                                    {hasRestrictedDepartments ? 'Zugriff erforderlich' : 'Einrichtung erforderlich'}
                                </div>
                                <h2 className="mt-2 text-lg font-light text-white/88">
                                    {hasRestrictedDepartments ? 'Keine zugänglichen Abteilungen' : 'Noch keine Abteilungen'}
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-white/52">
                                    {hasRestrictedDepartments
                                        ? 'Dein Account ist aktuell keiner sichtbaren Abteilung zugeordnet.'
                                        : 'Das Universe wird lebendig, sobald deine Organisation echte Bereiche erhält.'}
                                </p>
                            </div>
                            {!hasRestrictedDepartments && (
                                <button
                                    type="button"
                                    onClick={() => openPane({
                                        id: 'settings-main',
                                        type: 'settings',
                                        title: 'Einstellungen',
                                        size: { width: 720, height: 640 },
                                    })}
                                    className="rounded-full border border-amber-400/22 bg-amber-500/12 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-amber-100/80 transition hover:bg-amber-500/20"
                                >
                                    Einstellungen öffnen
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}