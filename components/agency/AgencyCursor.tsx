'use client';

/**
 * AgencyCursor - Guided Agency Day 1
 * 
 * Visual cursor that MORA controls.
 * Separate from user's mouse cursor.
 * 
 * Features:
 * - Animated movement to target elements
 * - Visual indicator of MORA's focus
 * - Abort button always visible during execution
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { abortExecution, subscribe } from '@/lib/agency/actionRegistry';
import type { AgencyAction } from '@/lib/agency/actionRegistry';

interface CursorPosition {
    x: number;
    y: number;
}

export function AgencyCursor() {
    const [position, setPosition] = useState<CursorPosition>({ x: -100, y: -100 });
    const [isVisible, setIsVisible] = useState(false);
    const [currentAction, setCurrentAction] = useState<AgencyAction | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Handle move_cursor events
    const handleMoveCursor = useCallback((event: CustomEvent<{ targetId: string }>) => {
        const { targetId } = event.detail;

        // Find target element
        const element = document.getElementById(targetId) ||
            document.querySelector(`[data-agency-id="${targetId}"]`);

        if (element) {
            const rect = element.getBoundingClientRect();
            const targetX = rect.left + rect.width / 2;
            const targetY = rect.top + rect.height / 2;

            setPosition({
                x: targetX,
                y: targetY
            });
            setIsVisible(true);

            // Dispatch event for CursorTrailEffect
            window.dispatchEvent(new CustomEvent('agency:cursor_move', {
                detail: { x: targetX, y: targetY }
            }));
        } else {
            console.warn(`[AgencyCursor] Target not found: ${targetId}`);
        }
    }, []);

    // Subscribe to action registry state
    useEffect(() => {
        const unsubscribe = subscribe((state) => {
            setIsExecuting(state.isExecuting);
            setCurrentAction(state.currentAction);

            if (!state.isExecuting) {
                // Hide cursor after execution
                setTimeout(() => setIsVisible(false), 1000);
            }
        });

        return unsubscribe;
    }, []);

    // Listen for cursor move events
    useEffect(() => {
        window.addEventListener('agency:move_cursor', handleMoveCursor as EventListener);
        return () => {
            window.removeEventListener('agency:move_cursor', handleMoveCursor as EventListener);
        };
    }, [handleMoveCursor]);

    const handleAbort = () => {
        abortExecution();
        setIsVisible(false);
    };

    return (
        <>
            {/* MORA Cursor */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: position.x - 16,
                            y: position.y - 16
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 20
                        }}
                        className="fixed z-[9999] pointer-events-none"
                        style={{ left: 0, top: 0 }}
                    >
                        {/* Cursor ring */}
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                            <div className="absolute inset-1 rounded-full bg-emerald-500/50 backdrop-blur-sm border border-emerald-400/50" />
                            <div className="absolute inset-2 rounded-full bg-emerald-400" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Abort Button - Always visible during execution */}
            <AnimatePresence>
                {isExecuting && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998]"
                    >
                        <button
                            onClick={handleAbort}
                            className="
                px-6 py-3 
                bg-red-500/90 hover:bg-red-600 
                text-white font-medium
                rounded-full shadow-lg
                backdrop-blur-sm
                border border-red-400/50
                flex items-center gap-2
                transition-colors
              "
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            MORA Stoppen
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Current Action Reason Display */}
            <AnimatePresence>
                {currentAction && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="
              fixed bottom-8 left-1/2 -translate-x-1/2 z-[9997]
              px-4 py-2
              bg-black/80 backdrop-blur-md
              border border-white/10
              rounded-lg shadow-xl
              text-white/90 text-sm
              max-w-md text-center
            "
                    >
                        <span className="text-emerald-400">MORA:</span>{' '}
                        {currentAction.reason}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AgencyCursor;
