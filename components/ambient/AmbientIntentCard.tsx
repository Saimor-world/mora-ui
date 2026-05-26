"use client";

/**
 * AmbientIntentCard — shows what Môra understood and what she will do.
 *
 * Visible during `responding` state.
 * "Ausführen" → onExecute()
 * "Verstanden" → onDismiss()   (no action, loop back to idle)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain } from 'lucide-react';
import type { AmbientToolCall } from '@/lib/hooks/useAmbientMora';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AmbientIntentCardProps {
    /** Short sentence: what Môra understood */
    intent: string;
    /** Parsed tool calls — used to render the action line */
    toolCalls: AmbientToolCall[];
    /** Called when user clicks Ausführen */
    onExecute: () => void;
    /** Called when user clicks Verstanden (no action) */
    onDismiss: () => void;
    /** Disable buttons during execution */
    disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AmbientIntentCard: React.FC<AmbientIntentCardProps> = ({
    intent,
    toolCalls,
    onExecute,
    onDismiss,
    disabled = false,
}) => {
    const hasAction = toolCalls.length > 0;
    const actionLabel = hasAction ? describeAction(toolCalls[0]) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
            style={{
                background:    'rgba(109,40,217,0.14)',
                border:        '1px solid rgba(139,92,246,0.28)',
                backdropFilter: 'blur(14px)',
            }}
        >
            {/* Intent row */}
            <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                     style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <Brain className="w-3.5 h-3.5 text-violet-300" />
                </div>
                <div>
                    <div className="text-[10px] tracking-widest uppercase text-violet-300/50 mb-0.5">
                        Was ich verstanden habe
                    </div>
                    <div className="text-sm text-white/80 leading-relaxed">
                        {intent || '—'}
                    </div>
                </div>
            </div>

            {/* Action row */}
            {hasAction && actionLabel && (
                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        <Zap className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div>
                        <div className="text-[10px] tracking-widest uppercase text-emerald-300/50 mb-0.5">
                            Aktion
                        </div>
                        <div className="text-sm text-white/70">
                            {actionLabel}
                        </div>
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
                {hasAction && (
                    <button
                        data-testid="intent-execute"
                        onClick={onExecute}
                        disabled={disabled}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40"
                        style={{
                            background: 'linear-gradient(135deg, rgba(109,40,217,0.65) 0%, rgba(79,20,180,0.55) 100%)',
                            border:     '1px solid rgba(167,139,250,0.35)',
                            color:      '#e9d5ff',
                        }}
                    >
                        Ausführen
                    </button>
                )}
                <button
                    data-testid="intent-dismiss"
                    onClick={onDismiss}
                    disabled={disabled}
                    className="flex-1 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                    Verstanden
                </button>
            </div>
        </motion.div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function describeAction(call: AmbientToolCall): string {
    switch (call.tool) {
        case 'createNode':
            return `Node erstellen → „${call.input.title}"`;
        case 'openPane':
            return `${call.input.type} öffnen`;
        case 'navigateToDepartment':
            return `Department aufrufen`;
        case 'searchGlobal':
            return `Suche: „${call.input.query}"`;
        default:
            return 'Aktion ausführen';
    }
}
