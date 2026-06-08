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
    type LucideIcon,
} from 'lucide-react';
import { useAssistantRuntime } from '@/lib/hooks/useAssistantRuntime';
import type { RitualSceneId } from '@/lib/os/ritualMode';

const SCENE_PALETTE: Record<RitualSceneId, {
    gradient: string;
    border: string;
    badge: string;
    badgeBg: string;
    glow: string;
}> = {
    flow: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.14), transparent 50%)',
        border: 'rgba(34,211,238,0.28)',
        badge: 'text-cyan-200',
        badgeBg: 'rgba(34,211,238,0.10)',
        glow: 'rgba(34,211,238,0.06)',
    },
    build: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.14), transparent 50%)',
        border: 'rgba(59,130,246,0.28)',
        badge: 'text-blue-200',
        badgeBg: 'rgba(59,130,246,0.10)',
        glow: 'rgba(59,130,246,0.06)',
    },
    lounge: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(251,146,60,0.18), transparent 55%), radial-gradient(circle at 90% 20%, rgba(244,114,182,0.14), transparent 50%)',
        border: 'rgba(244,114,182,0.28)',
        badge: 'text-rose-200',
        badgeBg: 'rgba(244,114,182,0.10)',
        glow: 'rgba(244,114,182,0.06)',
    },
    night: {
        gradient: 'radial-gradient(circle at 10% 50%, rgba(99,102,241,0.20), transparent 55%), radial-gradient(circle at 90% 20%, rgba(139,92,246,0.16), transparent 50%)',
        border: 'rgba(139,92,246,0.28)',
        badge: 'text-violet-200',
        badgeBg: 'rgba(139,92,246,0.10)',
        glow: 'rgba(139,92,246,0.06)',
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

                <div
                    className={`relative overflow-hidden rounded-[28px] border p-3.5 ${isStandardMode ? 'border-gray-200 bg-gray-50' : ''}`}
                    style={!isStandardMode ? {
                        background: 'rgba(7,18,14,0.6)',
                        borderColor: scenePalette.border,
                        boxShadow: `0 0 32px ${scenePalette.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    } : undefined}
                >
                    {/* Scene color wash */}
                    {!isStandardMode && (
                        <div
                            className="pointer-events-none absolute inset-0 rounded-[28px]"
                            style={{ background: scenePalette.gradient }}
                        />
                    )}

                    <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                                <Clock3 size={12} />
                                Szene
                            </div>
                            <div className={`mt-2 flex items-center gap-2`}>
                                {!isStandardMode && (
                                    <span
                                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] font-medium ${scenePalette.badge}`}
                                        style={{ background: scenePalette.badgeBg, border: `1px solid ${scenePalette.border}` }}
                                    >
                                        {sceneId}
                                    </span>
                                )}
                                <span className={`text-base ${primaryText}`}>{sceneLabel}</span>
                            </div>
                            <p className={`mt-2 text-sm leading-relaxed ${secondaryText}`}>
                                {sceneDescription}
                            </p>
                        </div>
                        <button
                            onClick={onToggleAutoScene}
                            className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${autoSceneEnabled
                                ? isStandardMode
                                    ? 'border-[#0078D4]/25 bg-[#0078D4]/8 text-[#0078D4]'
                                    : `border-[${scenePalette.border}] text-white/70`
                                : isStandardMode
                                    ? 'border-gray-200 bg-white text-gray-500 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
                                    : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70'
                                }`}
                            style={!isStandardMode && autoSceneEnabled ? { borderColor: scenePalette.border, background: scenePalette.badgeBg } : undefined}
                        >
                            <Clock3 size={12} />
                            {autoSceneEnabled ? 'Auto' : 'Manuell'}
                        </button>
                    </div>

                    <div className="relative mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={onCycleScene}
                            className={`rounded-2xl border px-3 py-2 text-sm transition-all ${isStandardMode
                                ? 'border-gray-200 bg-white text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
                                : 'border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/[0.10] hover:text-white'
                                }`}
                            style={!isStandardMode ? { borderColor: scenePalette.border } : undefined}
                        >
                            Szene wechseln
                        </button>
                        <button
                            onClick={onOpenAudio}
                            className={`rounded-2xl border px-3 py-2 text-sm transition-all ${isStandardMode
                                ? 'border-gray-200 bg-white text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
                                : 'border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08] hover:text-white'
                                }`}
                        >
                            Audio
                        </button>
                    </div>

                    <div className={`mt-4 rounded-[24px] border p-3.5 ${microCard}`}>
                        <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                            <Music2 size={12} />
                            Audio
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className={`truncate text-base ${primaryText}`}>
                                    {trackName || 'Mora Ambient'}
                                </div>
                                <div className={`mt-1 text-sm ${secondaryText}`}>
                                    {trackCount > 0 ? `${trackCount} Tracks in deiner Library` : 'Eingebauter prozeduraler Pad'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onToggleAudio}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                >
                                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                                </button>
                                {trackCount > 0 && (
                                    <button
                                        onClick={onNextTrack}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                    >
                                        <SkipForward size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`mt-4 rounded-[24px] border p-3.5 ${microCard}`}>
                        <div className={`flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                            <span>Mora-Laufzeit</span>
                            <span className={accentText}>{assistantRuntime.badge}</span>
                        </div>
                        <div className={`mt-3 text-sm ${primaryText}`}>
                            {assistantRuntime.title}
                        </div>
                        <div className={`mt-1 text-[11px] ${secondaryText}`}>
                            {assistantRuntime.subtitle}
                        </div>
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
