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
    type DepartmentStats,
    type UserMembership,
} from '@/lib/api/coreClient';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { buildOrganicUniverseLayout } from '@/lib/universe/layout';
import { isAdmin } from '@/lib/auth/roles';
import { resolveVisibleCompany } from '@/lib/auth/activeCompany';
import { UNASSIGNED_DEPARTMENT_ID, UNASSIGNED_DEPARTMENT_NAME } from '@/lib/constants/tree';

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
        universeScope,
        universeScopeDeptId,
    } = useNavStore();
    const user = useSessionStore((state) => state.user);
    const openPane = usePaneStore((state) => state.openPane);

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

    useEffect(() => {
        setSelectedTerritoryId(null);
    }, [effectiveCompanyId]);

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
                metricSource: value?.source || 'missing',
                access: department.universeAccess,
            };
        }),
        [metrics, positionedDepartments],
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
        <div className="relative h-full w-full overflow-hidden bg-[#06101d] text-white">
            <UniverseAmbientField
                lens={coreMode === 'mindfield' ? 'relations' : 'organization'}
                selected={Boolean(selectedTerritoryId)}
            />

            <UniverseObservatory
                mail={mailPreview}
                calendar={calendarPreview}
                feed={feedPreview}
                incidents={nightwatchIncidents}
                territoryCount={territories.length}
                documentCount={territories.reduce((sum, territory) => sum + territory.documents, 0)}
                selected={Boolean(selectedTerritoryId)}
                onOpenMail={() => openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 980, height: 700 } })}
                onOpenCalendar={() => openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 980, height: 700 } })}
                onOpenFeed={() => openPane({ id: 'feeds-main', type: 'feeds', title: 'Dein Feed', size: { width: 920, height: 680 } })}
                onOpenNightwatch={() => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1100, height: 760 } })}
            />
            <div className="absolute left-1/2 top-[74px] z-[46] -translate-x-1/2 rounded-full border border-sky-100/10 bg-slate-950/38 p-1 shadow-[0_16px_50px_rgba(0,8,20,0.24)] backdrop-blur-xl">
                <button
                    type="button"
                    onClick={() => setCoreMode('explore')}
                    className={'rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-all ' +
                        (coreMode === 'explore' ? 'bg-sky-100/12 text-sky-50' : 'text-sky-100/42 hover:text-sky-50/80')}
                >
                    Organisation
                </button>
                <button
                    type="button"
                    onClick={() => setCoreMode('mindfield')}
                    className={'rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-all ' +
                        (coreMode === 'mindfield' ? 'bg-violet-300/14 text-violet-50' : 'text-sky-100/42 hover:text-sky-50/80')}
                >
                    Zusammenhänge
                </button>
            </div>

            <OrganizationField
                lens={coreMode === 'mindfield' ? 'relations' : 'organization'}
                organizationName={organizationName}
                territories={territories}
                signals={signals}
                selectedId={selectedTerritoryId}
                onSelect={setSelectedTerritoryId}
                onOpen={navigateToDepartment}
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