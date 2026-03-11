'use client';

/**
 * AgencyActionOverlay - Extracted from AgencyCursor
 *
 * Provides the execution control UI (MORA Stoppen button)
 * and the current action reason display.
 * The visual cursor component has been migrated to CursorAgent.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { abortExecution, subscribe } from '@/lib/agency/actionRegistry';
import type { AgencyAction } from '@/lib/agency/actionRegistry';

export function AgencyActionOverlay() {
    const [currentAction, setCurrentAction] = useState<AgencyAction | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribe((state) => {
            setIsExecuting(state.isExecuting);
            setCurrentAction(state.currentAction);
            
            if (!state.isExecuting) {
                window.dispatchEvent(new CustomEvent('agency:stop'));
            }
        });

        return unsubscribe;
    }, []);

    const handleAbort = () => {
        abortExecution();
        window.dispatchEvent(new CustomEvent('agency:stop'));
    };

    return (
        <>
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

export default AgencyActionOverlay;
