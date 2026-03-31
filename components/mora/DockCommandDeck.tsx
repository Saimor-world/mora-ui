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
    contextDescription: string;
    contextSignalA: string;
    contextSignalB: string;
    contextActionLabel: string;
    contextAccent: string;
    sceneLabel: string;
    sceneDescription: string;
    autoSceneEnabled: boolean;
    onOpenContext: () => void;
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
    contextDescription,
    contextSignalA,
    contextSignalB,
    contextActionLabel,
    contextAccent,
    sceneLabel,
    sceneDescription,
    autoSceneEnabled,
    onOpenContext,
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
            className={`w-[min(1040px,calc(100vw-3rem))] rounded-[32px] border p-5 backdrop-blur-2xl ${shellCard}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${isStandardMode ? 'border-[#0078D4]/20 bg-[#0078D4]/8 text-[#0078D4]' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200/80'}`}>
                        <PanelTopOpen size={12} />
                        Command Deck
                    </div>
                    <div className={`mt-4 text-xl font-light tracking-[0.08em] ${primaryText}`}>
                        {workspaceName}
                    </div>
                    <div className={`mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] ${secondaryText}`}>
                        <span>{scopeLabel}</span>
                        <span>{orbStateLabel}</span>
                        <span>{sceneLabel}</span>
                    </div>
                </div>

                <button
                    onClick={onTogglePinned}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-gray-600 hover:border-[#0078D4]/40 hover:text-[#0078D4]' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-emerald-400/25 hover:text-emerald-200'}`}
                >
                    {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {isPinned ? 'Auto' : 'Pin'}
                </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div
                    className={`relative overflow-hidden rounded-[26px] border p-4 ${microCard}`}
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
                            Live Context
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className={`text-[11px] uppercase tracking-[0.24em] ${secondaryText}`}>
                                    {contextLabel}
                                </div>
                                <div className={`mt-2 text-lg ${primaryText}`}>
                                    {contextTitle}
                                </div>
                                <p className={`mt-3 max-w-[44ch] text-sm leading-relaxed ${secondaryText}`}>
                                    {contextDescription}
                                </p>
                            </div>
                            <button
                                onClick={onOpenContext}
                                className={`shrink-0 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${isStandardMode ? 'border-[#0078D4]/25 bg-white text-[#0078D4] hover:border-[#0078D4]/45' : 'border-white/10 bg-white/[0.05] text-white/76 hover:border-emerald-400/25 hover:text-emerald-200'}`}
                            >
                                {contextActionLabel}
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className={`rounded-2xl border px-3 py-3 ${microCard}`}>
                                <div className={`text-[9px] uppercase tracking-[0.18em] ${secondaryText}`}>Signal A</div>
                                <div className={`mt-1 text-sm ${primaryText}`}>{contextSignalA}</div>
                            </div>
                            <div className={`rounded-2xl border px-3 py-3 ${microCard}`}>
                                <div className={`text-[9px] uppercase tracking-[0.18em] ${secondaryText}`}>Signal B</div>
                                <div className={`mt-1 text-sm ${primaryText}`}>{contextSignalB}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className={`rounded-[26px] border p-4 ${microCard}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                                    <Sparkles size={12} />
                                    Ritual Scene
                                </div>
                                <div className={`mt-2 text-base ${primaryText}`}>{sceneLabel}</div>
                                <p className={`mt-2 text-sm leading-relaxed ${secondaryText}`}>
                                    {sceneDescription}
                                </p>
                            </div>
                            <button
                                onClick={onToggleAutoScene}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${autoSceneEnabled
                                    ? isStandardMode
                                        ? 'border-[#0078D4]/25 bg-[#0078D4]/8 text-[#0078D4]'
                                        : 'border-cyan-400/22 bg-cyan-500/10 text-cyan-200'
                                    : isStandardMode
                                        ? 'border-gray-200 bg-white text-gray-500 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
                                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-cyan-400/25 hover:text-cyan-200'
                                    }`}
                            >
                                <Clock3 size={12} />
                                {autoSceneEnabled ? 'Auto Time' : 'Manual'}
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={onCycleScene}
                                className={`rounded-2xl border px-3 py-2 text-sm transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]' : 'border-white/10 bg-white/[0.04] text-white/72 hover:border-emerald-400/25 hover:text-emerald-200'}`}
                            >
                                Szene wechseln
                            </button>
                            <div className={`rounded-2xl border px-3 py-2 text-sm ${microCard} ${accentText}`}>
                                {autoSceneEnabled ? 'Zeitgetrieben' : 'Manuell fixiert'}
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-[26px] border p-4 ${microCard}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${secondaryText}`}>
                                    <Music2 size={12} />
                                    Now Playing
                                </div>
                                <button onClick={onOpenAudio} className={`mt-2 max-w-full truncate text-left text-base ${primaryText}`}>
                                    {trackName || 'Audio konfigurieren'}
                                </button>
                                <div className={`mt-2 text-sm ${secondaryText}`}>
                                    {trackCount > 0 ? `${trackCount} lokale Tracks` : 'Noch keine Library'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onToggleAudio}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                >
                                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                                </button>
                                <button
                                    onClick={onNextTrack}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isStandardMode ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40' : 'border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:text-white'}`}
                                >
                                    <SkipForward size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className={`group rounded-[22px] border p-4 text-left transition-all ${microCard} ${isStandardMode ? 'hover:border-[#0078D4]/35 hover:bg-white' : 'hover:border-emerald-400/20 hover:bg-emerald-500/[0.08]'}`}
                    >
                        <action.icon size={16} className={accentText} />
                        <div className={`mt-4 text-sm ${primaryText}`}>{action.label}</div>
                        <div className={`mt-1 text-[11px] leading-relaxed ${secondaryText}`}>{action.description}</div>
                    </button>
                ))}
            </div>
        </motion.div>
    );
};
