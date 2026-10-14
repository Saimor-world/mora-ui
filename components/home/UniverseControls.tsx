import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Globe, Home, LayoutGrid, Orbit, PanelTopOpen, Shield, ChevronLeft, Mic, Maximize2, PanelLeft } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';
import { useFolders } from '@/lib/queries/useFolders';
import { requestCommandDeckOpen } from '@/lib/os/commandDeck';
import { buildShellContextSnapshot } from '@/lib/os/shellContext';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { applyRoom, DEFAULT_ROOM, loadRoom, nextMoraLevel, saveRoom, type RoomPrefs } from '@/lib/universe/roomPrefs';
import '@/app/universe-room.css';

export type ViewMode = 'owner' | 'demo' | 'workspace';

interface UniverseControlsProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    activeCompany: { id: string; name: string; is_demo?: boolean } | undefined;
    companies?: { id: string; name: string; is_demo?: boolean }[];
    onSwitchCompany?: (companyId: string) => void;
    visibleModes?: ViewMode[];
    workspaceLabel?: string;
    scopeLabel?: string;
    disableContextSwitch?: boolean;
    companyCountLabel?: string;
    isWebsiteEntryContext?: boolean;
    contextLabelOverride?: string;
    contextSubtitleOverride?: string;
}

export const UniverseControls: React.FC<UniverseControlsProps> = ({
    viewMode,
    setViewMode,
    activeCompany,
    companies = [],
    onSwitchCompany,
    visibleModes = ['owner', 'workspace', 'demo'],
    workspaceLabel = 'Organisation',
    disableContextSwitch = false,
    companyCountLabel,
    isWebsiteEntryContext = false,
    contextLabelOverride,
    contextSubtitleOverride,
}) => {
    const user = useSessionStore((state) => state.user);
    const userKey = (user as { id?: string } | null)?.id ?? null;
    const [room, setRoom] = useState<RoomPrefs>(DEFAULT_ROOM);
    useEffect(() => { if (!isUniverseV2Enabled()) return; const r = loadRoom(userKey); setRoom(r); applyRoom(r); }, [userKey]);
    const updateRoom = useCallback((patch: Partial<RoomPrefs>) => {
        setRoom((prev) => { const next = { ...prev, ...patch }; applyRoom(next); saveRoom(userKey, next); return next; });
    }, [userKey]);
    const cycleMora = useCallback(() => {
        setRoom((prev) => { const next = { ...prev, mora: nextMoraLevel(prev.mora) }; applyRoom(next); saveRoom(userKey, next); return next; });
    }, [userKey]);
    useEffect(() => {
        if (!isUniverseV2Enabled()) return;
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
            const k = e.key.toLowerCase();
            if (k === 'i') updateRoom({ immersive: !document.documentElement.dataset.uv2Immersive });
            else if (k === 'l') updateRoom({ lage: document.documentElement.dataset.uv2Lage !== 'open' });
            else if (k === 'm') cycleMora();
            else if (e.key === '/') { const ask = document.querySelector<HTMLInputElement>('input[aria-label="MÔRA fragen"]'); if (ask) { e.preventDefault(); ask.focus(); } }
            else return;
        };
        // Immersiv: Seitenflächen kommen herein, wenn die Maus an den Rand geht.
        const onMove = (e: PointerEvent) => {
            const r = document.documentElement.dataset;
            if (r.uv2Immersive !== 'on') { if (r.uv2Peek) r.uv2Peek = ''; return; }
            const w = window.innerWidth;
            if (e.clientX < 18) r.uv2Peek = 'left';
            else if (e.clientX > w - 18) r.uv2Peek = 'right';
            else if (r.uv2Peek === 'left' && e.clientX > 460) r.uv2Peek = '';
            else if (r.uv2Peek === 'right' && e.clientX < w - 460) r.uv2Peek = '';
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointermove', onMove);
        return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointermove', onMove); };
    }, [updateRoom, cycleMora]);
    const { viewLevel, coreMode, setCoreMode, activeCompanyId, activeDepartmentId, activeSpaceId, activeFolderId, navigateToExplore } = useNavStore();
    const surfaceProfile = useSurfaceProfile();

    const { data: departments = [] } = useDepartments(activeCompany?.id ?? null);
    const { data: activeSpaces = [] } = useSpaces(activeDepartmentId);
    const { data: activeFolders = [] } = useFolders(activeSpaceId);

    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const activeDepartment = useMemo(
        () => safeDepartments.find((department) => department.id === activeDepartmentId) ?? null,
        [safeDepartments, activeDepartmentId]
    );
    const activeSpace = useMemo(
        () => activeSpaces.find((space) => space.id === activeSpaceId) ?? null,
        [activeSpaces, activeSpaceId]
    );
    const activeFolder = useMemo(
        () => activeFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolders, activeFolderId]
    );
    const foldersBySpace = useMemo(
        () => activeSpaceId ? { [activeSpaceId]: activeFolders } : {},
        [activeSpaceId, activeFolders]
    );
    const operationalCompanyCount =
        surfaceProfile.isLocalTruthSurface || !!activeCompanyId || !!activeCompany
            ? 1
            : companies.length;

    const shellContext = useMemo(() => buildShellContextSnapshot({
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        companyCount: operationalCompanyCount,
        departmentCount: safeDepartments.length,
        userCompanyName: user?.active_company_name,
        accent: activeDepartment?.color || '#10B981',
        isPublicDemoSurface: disableContextSwitch && !isWebsiteEntryContext,
        isLocalTruthSurface: surfaceProfile.isLocalTruthSurface,
    }), [
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        operationalCompanyCount,
        safeDepartments,
        user?.active_company_name,
        disableContextSwitch,
        isWebsiteEntryContext,
        surfaceProfile.isLocalTruthSurface,
    ]);
    const surfaceLabel = useMemo(() => {
        if (viewLevel !== 'core') return shellContext.scopeLabel;
        return coreMode === 'home' ? 'Home' : 'Universe';
    }, [coreMode, shellContext.scopeLabel, viewLevel]);

    // Cycle order: real companies first, demos last — so the switch reads
    // "real → real → demo", never a blind jump into a demo workspace.
    const switchOrder = useMemo(
        () => [...companies].sort((a, b) => Number(a.is_demo ?? false) - Number(b.is_demo ?? false)),
        [companies]
    );
    const nextCompany = useMemo(() => {
        if (!switchOrder.length || !activeCompany) return undefined;
        const currentIndex = switchOrder.findIndex((company) => company.id === activeCompany.id);
        return switchOrder[(currentIndex + 1) % switchOrder.length];
    }, [switchOrder, activeCompany]);

    const handleContextClick = () => {
        if (!nextCompany || !onSwitchCompany) return;
        onSwitchCompany(nextCompany.id);
    };

    const handleOpenContextBridge = () => {
        requestCommandDeckOpen({ pinned: true });
    };

    const showCoreSurfaceSwitch = viewLevel === 'core';
    const showDeptBack = viewLevel === 'department' || viewLevel === 'space';
    const showModeSwitches = visibleModes.length > 1 && !surfaceProfile.isLocalTruthSurface && !surfaceProfile.isHqSurface;
    const contextModeLabel = surfaceProfile.isHqSurface
        ? 'HQ'
        : surfaceProfile.isLocalTruthSurface
            ? 'Lokale Instanz'
            : workspaceLabel || 'Kontext';
    const showCompanySwitcher = Boolean(
        activeCompany &&
        companies.length > 1 &&
        !disableContextSwitch &&
        !surfaceProfile.isLocalTruthSurface &&
        (surfaceProfile.isHqSurface || !activeCompanyId)
    );

    // Universe v2: die Kopfleiste ist nur noch ein Schalter „Home | Universe“.
    // Kein Instanz-Badge, kein Firmenname (steht in MÔRAs Satz), kein zweiter Control-Center-Knopf.
    if (isUniverseV2Enabled()) {
        const roomBtn = (on: boolean): React.CSSProperties => ({ ...V2_GLASS, color: on ? '#D6A848' : 'rgba(247,244,233,0.55)', boxShadow: on ? 'inset 0 0 0 0.5px rgba(214,168,72,0.6), 0 0 18px rgba(214,168,72,0.18)' : V2_GLASS.boxShadow });
        return (
            <>
            <div className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-5 text-white" data-testid="uv2-header">
                {showDeptBack && (
                    <button type="button" onClick={navigateToExplore} title="Zurück zum Universum"
                        className="flex h-8 items-center gap-1 transition-colors hover:text-white"
                        style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,244,233,0.6)' }}>
                        <ChevronLeft size={15} strokeWidth={1.5} /> Universum
                    </button>
                )}
                {showCoreSurfaceSwitch && (
                    <div role="tablist" aria-label="Ansicht" className="relative flex h-8 items-center gap-5">
                        {(['home', 'explore'] as const).map((m) => {
                            const active = m === 'home' ? coreMode === 'home' : coreMode !== 'home';
                            return (
                                <button key={m} type="button" role="tab" aria-selected={active}
                                    data-testid={m === 'explore' ? 'universe-toggle' : 'home-toggle'}
                                    onClick={() => setCoreMode(m)}
                                    className="relative h-8 transition-colors duration-300"
                                    style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? '#D6A848' : 'rgba(247,244,233,0.4)' }}>
                                    {m === 'home' ? 'Home' : 'Universe'}
                                </button>
                            );
                        })}
                    </div>
                )}
                {showCompanySwitcher ? (
                    <button type="button" data-testid="uv2-company-chip" onClick={handleContextClick} title={nextCompany ? `Wechseln zu: ${nextCompany.name}` : 'Organisation wechseln'}
                        className="flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] text-white/70 hover:text-white" style={V2_GLASS}>
                        <Globe size={12} strokeWidth={1.5} /> {activeCompany?.name}
                    </button>
                ) : activeCompany?.name ? (
                    <span data-testid="uv2-company-chip" className="hidden h-7 items-center rounded-full px-3 text-[12px] text-white/60 sm:flex" style={V2_GLASS}>{activeCompany.name}</span>
                ) : null}
            </div>
            <div className="fixed right-6 top-6 z-50 flex items-center gap-2" data-testid="uv2-room" role="toolbar" aria-label="Raum">
                <button type="button" data-testid="uv2-immersive-toggle" aria-pressed={room.immersive} onClick={() => updateRoom({ immersive: !room.immersive })}
                    title="Immersiv (I): Planeten füllen den Raum, Seiten kommen am Rand herein" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors" style={roomBtn(room.immersive)}>
                    <Maximize2 size={14} strokeWidth={1.5} />
                </button>
                <button type="button" data-testid="uv2-lage-toggle" aria-pressed={room.lage} onClick={() => updateRoom({ lage: !room.lage })}
                    title="Lage (L): Signale, Deutung, Handlung links" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors" style={roomBtn(room.lage)}>
                    <PanelLeft size={14} strokeWidth={1.5} />
                </button>
                <button type="button" data-testid="uv2-mora-toggle" onClick={cycleMora}
                    title="MÔRA (M): Aktiv → Leise → Aus" className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] uppercase tracking-[0.08em] transition-colors" style={roomBtn(room.mora === 'aktiv')}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: room.mora === 'aus' ? 'rgba(247,244,233,0.3)' : '#D6A848', opacity: room.mora === 'leise' ? 0.55 : 1 }} />
                    <span className="uv2-room-label">MÔRA · {room.mora === 'aktiv' ? 'Aktiv' : room.mora === 'leise' ? 'Leise' : 'Aus'}</span>
                </button>
            </div>
            </>
        );
    }

    return (
        <div className="fixed left-3 right-3 top-3 z-50 flex min-w-0 items-center justify-between gap-1 rounded-2xl border border-white/[0.10] bg-slate-950/38 px-1.5 py-1.5 text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:left-1/2 sm:right-auto sm:top-4 sm:max-w-[min(96vw,920px)] sm:-translate-x-1/2 sm:justify-center sm:gap-2 sm:px-2">
            {showDeptBack && (
                <button
                    type="button"
                    onClick={navigateToExplore}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-emerald-200"
                    title="Zurück zum Universum"
                >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Universum</span>
                </button>
            )}
            {/* Context mode badge — compact, no switcher clutter */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] uppercase tracking-[0.15em] sm:px-2.5 sm:text-[10px] sm:tracking-[0.18em]">
                {showModeSwitches ? (
                    <>
                        {visibleModes.includes('owner') && (
                            <ControlButton isActive={viewMode === 'owner'} onClick={() => setViewMode('owner')} icon={Shield} label="Owner" />
                        )}
                        {visibleModes.includes('workspace') && (
                            <ControlButton isActive={viewMode === 'workspace'} onClick={() => setViewMode('workspace')} icon={LayoutGrid} label={workspaceLabel || 'Kontext'} />
                        )}
                        {visibleModes.includes('demo') && (
                            <ControlButton isActive={viewMode === 'demo'} onClick={() => setViewMode('demo')} icon={Activity} label="Demo" showLabelAlways />
                        )}
                    </>
                ) : (
                    <span className="text-violet-200/80">{contextModeLabel}</span>
                )}
            </div>

            {/* Company name — single line, opens Control Center. A DEMO chip
                makes a guided-demo company unmistakable next to a real one. */}
            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/95 sm:flex-none sm:px-3 sm:text-[12px]"
            >
                <span className="truncate font-medium">{shellContext.title}</span>
                {activeCompany?.is_demo && (
                    <span className="shrink-0 rounded-full border border-amber-300/35 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-200/90 sm:text-[9px]">
                        Demo
                    </span>
                )}
                {shellContext.contextLabel && (
                    <span className="hidden text-[10px] text-white/35 sm:inline" style={{ color: shellContext.accent }}>
                        {contextLabelOverride || shellContext.contextLabel}
                    </span>
                )}
            </button>

            {/* HOME / UNIVERSE surface and semantic lens toggle */}
            {showCoreSurfaceSwitch && (
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    <CoreSurfaceButton isActive={coreMode === 'home'} onClick={() => setCoreMode('home')} icon={Home} label="Home" />
                    <CoreSurfaceButton isActive={coreMode !== 'home'} onClick={() => setCoreMode('explore')} icon={Orbit} label="Universe" />
                </div>
            )}

            {/* Company switcher — only when multi-company, collapsed to icon+count */}
            {showCompanySwitcher && (
                <button
                    type="button"
                    onClick={handleContextClick}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-white/55 transition-colors hover:text-emerald-200 ${surfaceProfile.isHqSurface ? 'sm:hidden' : ''}`}
                    title={nextCompany ? `Wechseln zu: ${nextCompany.name}${nextCompany.is_demo ? ' (Demo)' : ''}` : 'Organisation wechseln'}
                >
                    <Globe className="h-3 w-3" />
                    <span className="text-[10px] text-emerald-300/68">
                        {companyCountLabel || (surfaceProfile.isHqSurface ? companies.length : operationalCompanyCount)}
                    </span>
                </button>
            )}

            {/* Control center icon — collapsed on wide screens too */}
            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="hidden shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 text-white/45 transition-colors hover:text-emerald-200 sm:flex"
                title="Control Center"
            >
                <PanelTopOpen size={14} />
            </button>
        </div>
    );
};

const V2_GLASS: React.CSSProperties = {
    background: 'rgba(18,22,30,0.5)',
    backdropFilter: 'blur(30px) saturate(160%)',
    WebkitBackdropFilter: 'blur(30px) saturate(160%)',
    boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), 0 8px 24px rgba(0,0,0,0.3)',
};

const CoreSurfaceButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: any;
    label: string;
}> = ({ isActive, onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        data-testid={label === 'Universe' ? 'universe-toggle' : undefined}
        className={`flex items-center gap-2 rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.18em] transition-all sm:px-3 ${
            isActive
                ? 'border border-cyan-400/22 bg-cyan-500/[0.10] text-cyan-100'
                : 'border border-transparent bg-transparent text-white/46 hover:border-white/10 hover:bg-white/[0.05] hover:text-white/78'
        }`}
    >
        <Icon size={13} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const ControlButton: React.FC<{ isActive: boolean; onClick: () => void; icon: any; label: string; showLabelAlways?: boolean }> = ({
    isActive, onClick, icon: Icon, label, showLabelAlways = false
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center justify-center rounded-xl p-2 transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/25' : 'text-white/54 hover:bg-white/6 hover:text-white'}`}
    >
        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        <span className={`ml-2 overflow-hidden text-[10px] font-medium transition-all duration-300 ${(isActive || showLabelAlways) ? 'max-w-[52px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[52px] group-hover:opacity-100'}`}>
            {label}
        </span>
    </button>
);
