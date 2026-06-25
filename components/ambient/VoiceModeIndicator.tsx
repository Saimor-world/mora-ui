"use client";

/**
 * VoiceModeIndicator — subtle canvas-edge pulse while voice overlay is active.
 * Renders inside AmbientRoomOverlay so it stays above panes (z-881).
 */

import React from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';

export type VoiceIndicatorState =
    | 'idle'
    | 'listening'
    | 'thinking'
    | 'responding'
    | 'executing'
    | 'done'
    | 'error';

interface VoiceModeIndicatorProps {
    state: VoiceIndicatorState;
}

const STATE_LABEL: Record<VoiceIndicatorState, string> = {
    idle:       'Voice bereit',
    listening:  'Hört zu …',
    thinking:   'Môra denkt …',
    responding: 'Antwort bereit',
    executing:  'Führt aus …',
    done:       'Erledigt',
    error:      'Fehler',
};

const STATE_COLOR: Record<VoiceIndicatorState, string> = {
    idle:       'emerald',
    listening:  'emerald',
    thinking:   'blue',
    responding: 'amber',
    executing:  'blue',
    done:       'emerald',
    error:      'red',
};

export const VoiceModeIndicator: React.FC<VoiceModeIndicatorProps> = ({ state }) => {
    const color = STATE_COLOR[state];
    const isActive = state === 'listening' || state === 'thinking' || state === 'executing';

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none fixed top-5 left-1/2 z-[881] -translate-x-1/2"
            data-testid="voice-mode-indicator"
        >
            <div
                className={`flex items-center gap-2.5 rounded-full border px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${
                    color === 'emerald' ? 'border-emerald-400/25 bg-emerald-500/10'
                    : color === 'blue'    ? 'border-blue-400/25 bg-blue-500/10'
                    : color === 'amber'   ? 'border-amber-400/25 bg-amber-500/10'
                    :                       'border-red-400/25 bg-red-500/10'
                }`}
            >
                <span className="relative flex h-2.5 w-2.5">
                    {isActive && (
                        <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                                color === 'emerald' ? 'bg-emerald-400'
                                : color === 'blue'  ? 'bg-blue-400'
                                : color === 'amber' ? 'bg-amber-400'
                                :                     'bg-red-400'
                            }`}
                        />
                    )}
                    <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                            color === 'emerald' ? 'bg-emerald-400'
                            : color === 'blue'  ? 'bg-blue-400'
                            : color === 'amber' ? 'bg-amber-400'
                            :                     'bg-red-400'
                        }`}
                    />
                </span>
                <Mic className={`h-3.5 w-3.5 ${
                    color === 'emerald' ? 'text-emerald-300/80'
                    : color === 'blue'  ? 'text-blue-300/80'
                    : color === 'amber' ? 'text-amber-300/80'
                    :                     'text-red-300/80'
                }`} />
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">
                    {STATE_LABEL[state]}
                </span>
            </div>
        </motion.div>
    );
};
