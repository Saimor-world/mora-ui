'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock3,
    Music2,
    PanelTopOpen,
    Pin,
    PinOff,
    Play,
    Pause,
    SkipForward,
    Sparkles,
    Sunrise,
    Sun,
    Sunset,
    Moon,
    type LucideIcon,
} from 'lucide-react';
import { RITUAL_SCENE_ORDER, type RitualSceneId } from '@/lib/os/ritualMode';
import { useAssistantRuntime } from '@/lib/hooks/useAssistantRuntime';

const SCENE_PALETTE: Record<RitualSceneId, {
    gradient: string;
    border: string;
    badge: string;
    badgeBg: string;
    glow: string;
    cardBg: string;
    cardBorder: string;
    cardGlow: string;
    label: string;
    timeRange: string;
    Icon: LucideIcon;
}> = {
    flow: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.16), transparent 50%)',
        border: 'rgba(34,211,238,0.32)',
        badge: 'text-emerald-200',
        badgeBg: 'rgba(16,185,129,0.14)',
        glow: 'rgba(16,185,129,0.10)',
        cardBg: 'rgba(16,185,129,0.10)',
        cardBorder: 'rgba(16,185,129,0.30)',
        cardGlow: 'rgba(16,185,129,0.18)',
        label: 'Flow',
        timeRange: '05 – 11',
        Icon: Sunrise,
    },
    build: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(14,165,233,0.22), transparent 55%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.16), transparent 50%)',
        border: 'rgba(14,165,233,0.32)',
        badge: 'text-sky-200',
        badgeBg: 'rgba(14,165,233,0.14)',
        glow: 'rgba(14,165,233,0.10)',
        cardBg: 'rgba(14,165,233,0.10)',
        cardBorder: 'rgba(14,165,233,0.30)',
        cardGlow: 'rgba(251,191,36,0.14)',
        label: 'Build',
        timeRange: '11 – 17',
        Icon: Sun,
    },
    lounge: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(251,146,60,0.22), transparent 55%), radial-gradient(circle at 90% 20%, rgba(244,114,182,0.16), transparent 50%)',
        border: 'rgba(251,146,60,0.32)',
        badge: 'text-orange-200',
        badgeBg: 'rgba(251,146,60,0.14)',
        glow: 'rgba(251,146,60,0.10)',
        cardBg: 'rgba(251,146,60,0.10)',
        cardBorder: 'rgba(251,146,60,0.30)',
        cardGlow: 'rgba(244,114,182,0.14)',
        label: 'Lounge',
        timeRange: '17 – 22',
        Icon: Sunset,
    },
    night: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(99,102,241,0.24), transparent 55%), radial-gradient(circle at 90% 20%, rgba(139,92,246,0.18), transparent 50%)',
        border: 'rgba(139,92,246,0.32)',
        badge: 'text-violet-200',
        badgeBg: 'rgba(99,102,241,0.14)',
        glow: 'rgba(99,102,241,0.10)',
        cardBg: 'rgba(99,102,241,0.10)',
        cardBorder: 'rgba(139,92,246,0.30)',
        cardGlow: 'rgba(139,92,246,0.18)',
        label: 'Nacht',
        timeRange: '22 – 05',
        Icon: Moon,
    },
};

export interface DockCommandDeckAction {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    onClick: () => void;
}

interface DockCommandDeckProps {
    isStandardMode: boolean;
    isPinned: boolean;
    orbStateLabel: string;
    scopeLabel: string;
    workspaceName: string;
    contextLabel: string;
    contextTitle: string;
    contextSubtitle: string;
    contextDescription: string;
    contextSignalA: string;
    contextSignalB: string;
    contextAccent: string;
    contextActionLabel: string;
    nextMoveLabel: string;
    nextMoveHint: string;
    sceneId: RitualSceneId;
    sceneLabel: string;
    sceneDescription: string;
    autoSceneEnabled: boolean;
    onOpenContext: () => void;
    onNextMove: () => void;
    onTogglePinned: () => void;
    onToggleAutoScene: () => void;
    onCycleScene: () => void;
    onSelectScene?: (id: RitualSceneId) => void;
    trackName: string | null;
    trackCount: number;
    isPlaying: boolean;
    onToggleAudio: () => void;
    onNextTrack: () => void;
    onOpenAudio: () => void;
    actions: DockCommandDeckAction[];
}

export const DockCommandDeck: React.FC<DockCommandDeckProps> = ({
    isStandardMode,
    isPinned,
    orbStateLabel,
    scopeLabel,
    workspaceName,
    contextLabel,
    contextTitle,
    contextSubtitle,
    contextDescription,
    contextSignalA,
    contextSignalB,
    contextAccent,
    contextActionLabel,
    nextMoveLabel,
    nextMoveHint,
    sceneId,
    sceneLabel,
    sceneDescription,
    autoSceneEnabled,
    onOpenContext,
    onNextMove,
    onTogglePinned,
    onToggleAutoScene,
    onCycleScene,
    onSelectScene,
    trackName,
    trackCount,
    isPlaying,
    onToggleAudio,
    onNextTrack,
    onOpenAudio,
    actions,
}) => {
    const assistantRuntime = useAssistantRuntime(45_000);
    const scenePalette = SCENE_PALETTE[sceneId];
    const shellCard = isStandardMode
        ? 'border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)]'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(7,18,14,0.96),rgba(4,10,8,0.98))] shadow-[0_30px_100px_rgba(0,0,0,0.52)]';

    const microCard = isStandardMode
        ? 'border-gray-200 bg-gray-50'
        : 'border-white/10 bg-white/[0.04]';

    const primaryText = isStandardMode ? 'text-gray-800' : 'text-white/88';
    const secondaryText = isStandardMode ? 'text-gray-500' : 'text-white/42';
    const accentText = isStandardMode ? 'text-[#0078D4]' : 'text-emerald-200';

    return (
        <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`max-h-[calc(100vh-7rem)] w-[min(760px,calc(100vw-4rem))] overflow-y-auto rounded-[32px] border p-4 backdrop-blur-2xl ${shellCard}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${isStandardMode ? 'border-[#0078D4]/20 bg-[#0078D4]/8 text-[#0078D4]' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200/80'}`}>
                        <PanelTopOpen size={12} />
                        Control Center
                    </div>
                    <div className={`mt-4 text-xl font-light tracking-[0.08em] ${primaryText}`}>
                        {workspaceName}
                    </div>
                    <div className={`mt-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                        {scopeLabel} / {orbStateLabel}
                    </div>
                </div>

                <button
                    onClick={onTogglePinned}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-gray-600 hover:border-[#0078D4]/40 hover:text-[#0078D4]' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-emerald-400/25 hover:text-emerald-200'}`}
                >
                    {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {isPinned ? 'Lösen' : 'Anheften'}
                </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_244px]">
                <div
                    className={`relative overflow-hidden rounded-[28px] border p-4 ${microCard}`}
                    style={!isStandardMode ? {
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px ${contextAccent}10`,
                    } : undefined}
                >
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-28"
                        style={{
                            background: `radial-gradient(circle at top right, ${contextAccent}32 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative">
                        <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                            <Sparkles size={12} />
                            Live-Kontext
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <div className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${microCard} ${secondaryText}`}>
                                {contextLabel}
                            </div>
                            <div className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${microCard} ${accentText}`}>
                                {scopeLabel}
                            </div>
                        </div>

                        <div className={`mt-3 text-xl ${primaryText}`}>
                            {contextTitle}
                        </div>
                        <div className={`mt-2 text-sm ${secondaryText}`}>
                            {contextSubtitle}
                        </div>
                        <p className={`mt-3 max-w-[52ch] text-sm leading-relaxed ${secondaryText}`}>
                            {contextDescription}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <div className={`rounded-full border px-3 py-2 text-[11px] ${microCard} ${primaryText}`}>
                                {contextSignalA}
                            </div>
                            <div className={`rounded-full border px-3 py-2 text-[11px] ${microCard} ${primaryText}`}>
                                {contextSignalB}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <button
                                onClick={onNextMove}
                                className={`rounded-[22px] border px-4 py-4 text-left transition-colors ${isStandardMode ? 'border-[#0078D4]/18 bg-[#0078D4]/8 hover:border-[#0078D4]/38' : 'border-emerald-400/18 bg-emerald-500/[0.08] hover:border-emerald-400/28 hover:bg-emerald-500/[0.12]'}`}
                            >
                                <div className={`text-[10px] uppercase tracking-[0.2em] ${accentText}`}>
                                    Nächster Schritt
                                </div>
                                <div className={`mt-2 text-sm ${primaryText}`}>{nextMoveLabel}</div>
                                <div className={`mt-1 text-[11px] leading-relaxed ${secondaryText}`}>{nextMoveHint}</div>
                            </button>
                            <button
                                onClick={onOpenContext}
                                className={`rounded-[22px] border px-4 py-3 text-sm transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]' : 'border-white/10 bg-white/[0.05] text-white/76 hover:border-emerald-400/25 hover:text-emerald-200'}`}
                            >
                                {contextActionLabel}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Scene + Audio column ── */}
                <div className="flex flex-col gap-3">

                    {/* Scene picker */}
                    <div
                        className={`relative overflow-hidden rounded-[28px] border p-3.5 ${isStandardMode ? 'border-gray-200 bg-gray-50' : ''}`}
                        style={!isStandardMode ? {
                            background: 'rgba(7,18,14,0.65)',
                            borderColor: scenePalette.border,
                            boxShadow: `0 0 40px ${scenePalette.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                        } : undefined}
                    >
                        {/* Active scene ambient wash */}
                        {!isStandardMode && (
                            <div
                                className="pointer-events-none absolute inset-0 rounded-[28px] transition-all duration-[2000ms]"
                                style={{ background: scenePalette.gradient }}
                            />
                        )}

                        <div className="relative">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                                    <Clock3 size={12} />
                                    Szene
                                </div>
                                <button
                                    onClick={onToggleAutoScene}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] transition-all ${autoSceneEnabled
                                        ? isStandardMode
                                            ? 'border-[#0078D4]/30 bg-[#0078D4]/10 text-[#0078D4]'
                                            : 'text-white/80'
                                        : isStandardMode
                                            ? 'border-gray-200 text-gray-400 hover:text-[#0078D4]'
                                            : 'border-white/10 text-white/35 hover:text-white/65'
                                        }`}
                                    style={!isStandardMode && autoSceneEnabled ? { borderColor: scenePalette.border, background: scenePalette.badgeBg } : undefined}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${autoSceneEnabled ? 'bg-current animate-pulse' : 'bg-white/20'}`} />
                                    Auto
                                </button>
                            </div>

                            {/* 4-scene grid */}
                            <div className="grid grid-cols-2 gap-2">
                                {RITUAL_SCENE_ORDER.map((sid) => {
                                    const sp = SCENE_PALETTE[sid];
                                    const isActive = sid === sceneId;
                                    return (
                                        <button
                                            key={sid}
                                            type="button"
                                            onClick={() => onSelectScene ? onSelectScene(sid) : onCycleScene()}
                                            className={`group relative overflow-hidden rounded-[18px] border p-3 text-left transition-all duration-200 ${isStandardMode
                                                ? isActive ? 'border-[#0078D4]/40 bg-[#0078D4]/8' : 'border-gray-200 bg-white hover:border-[#0078D4]/25'
                                                : isActive ? '' : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07]'
                                            }`}
                                            style={!isStandardMode ? {
                                                borderColor: isActive ? sp.cardBorder : 'rgba(255,255,255,0.07)',
                                                background: isActive ? sp.cardBg : 'rgba(255,255,255,0.03)',
                                                boxShadow: isActive ? `0 0 20px ${sp.cardGlow}` : undefined,
                                            } : undefined}
                                        >
                                            {isActive && !isStandardMode && (
                                                <div className="pointer-events-none absolute inset-0 rounded-[18px]"
                                                    style={{ background: `radial-gradient(circle at 30% 40%, ${sp.cardGlow} 0%, transparent 70%)` }} />
                                            )}
                                            <div className="relative flex items-start justify-between gap-1">
                                                <div>
                                                    <sp.Icon size={13} className={isActive && !isStandardMode ? sp.badge : isStandardMode ? 'text-gray-500' : 'text-white/40'} />
                                                    <div className={`mt-1.5 text-[11px] font-medium ${isActive && !isStandardMode ? sp.badge : isStandardMode ? 'text-gray-700' : 'text-white/65'}`}>
                                                        {sp.label}
                                                    </div>
                                                    <div className={`mt-0.5 text-[10px] tabular-nums ${isStandardMode ? 'text-gray-400' : 'text-white/28'}`}>
                                                        {sp.timeRange}
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isStandardMode ? 'bg-[#0078D4]' : 'bg-current animate-pulse'} ${!isStandardMode ? sp.badge : ''}`} />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Audio card */}
                    <div className={`rounded-[24px] border p-3.5 ${microCard}`}>
                        <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                            <Music2 size={12} />
                            Audio
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className={`truncate text-sm ${primaryText}`}>
                                    {trackName || 'Mora Ambient'}
                                </div>
                                <div className={`mt-0.5 text-[11px] ${secondaryText}`}>
                                    {trackCount > 0 ? `${trackCount} Tracks` : 'Prozeduraler Pad'}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={onToggleAudio}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                >
                                    {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                                </button>
                                {trackCount > 0 && (
                                    <button
                                        onClick={onNextTrack}
                                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                    >
                                        <SkipForward size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mora runtime */}
                    <div className={`rounded-[24px] border p-3.5 ${microCard}`}>
                        <div className={`flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                            <span>Mora-Laufzeit</span>
                            <span className={accentText}>{assistantRuntime.badge}</span>
                        </div>
                        <div className={`mt-2.5 text-sm ${primaryText}`}>{assistantRuntime.title}</div>
                        <div className={`mt-0.5 text-[11px] ${secondaryText}`}>{assistantRuntime.subtitle}</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className={`group rounded-[22px] border p-3.5 text-left transition-all ${microCard} ${isStandardMode ? 'hover:border-[#0078D4]/35 hover:bg-white' : 'hover:border-emerald-400/20 hover:bg-emerald-500/[0.08]'}`}
                    >
                        <action.icon size={16} className={accentText} />
                        <div className={`mt-3 text-sm ${primaryText}`}>{action.label}</div>
                        <div className={`mt-1 text-[11px] leading-relaxed ${secondaryText}`}>{action.description}</div>
                    </button>
                ))}
            </div>
        </motion.div>
    );
};
