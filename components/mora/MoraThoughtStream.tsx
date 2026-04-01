"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { coreGet } from "@/lib/api/coreClient";
import { useMoraStore } from "@/lib/store/moraState";
import { Brain, Sparkles } from "lucide-react";

interface Thought {
    ts: string;
    thought: string;
    type: string;
    signal_source?: string;
}

/**
 * MoraThoughtStream - Real-time AI Activity Feed
 *
 * Shows ACTUAL backend activity only. No mock data.
 * Hidden when no real thoughts are available.
 */
export const MoraThoughtStream: React.FC = () => {
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeThought, setActiveThought] = useState<Thought | null>(null);
    const [hasRealData, setHasRealData] = useState(false);
    const lastFetchedRef = useRef<string | null>(null);
    const { coreError } = useMoraStore();

    // Polling backend for newest thoughts with exponential backoff
    useEffect(() => {
        if (coreError) return;

        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let interval = 30000; // Start at 30s (less aggressive)
        const maxInterval = 180000; // Max 3 minutes

        const fetchThoughts = async () => {
            try {
                const res = await coreGet("/v3/agency/thoughts?limit=5", { isOptional: true });
                if (res?.thoughts && res.thoughts.length > 0) {
                    const latestTS = res.thoughts[0].ts;

                    if (latestTS !== lastFetchedRef.current) {
                        lastFetchedRef.current = latestTS;
                        const newThoughts = [...res.thoughts].reverse();
                        setThoughts(newThoughts);
                        setCurrentIndex(0);
                        setHasRealData(true);
                    }
                    // Success - reset backoff
                    interval = 30000;
                } else {
                    // No data - hide the component
                    setHasRealData(false);
                }
            } catch (error) {
                // Apply backoff on error, hide component
                interval = Math.min(interval * 1.5, maxInterval);
                setHasRealData(false);
            }
            if (isMounted) {
                timeoutId = setTimeout(fetchThoughts, interval);
            }
        };

        timeoutId = setTimeout(fetchThoughts, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [coreError]);

    // 1. Cycle through fetched thoughts
    useEffect(() => {
        if (thoughts.length === 0) {
            setCurrentIndex(0);
            setActiveThought(null);
            return;
        }

        // Reset the carousel when a new batch arrives.
        setCurrentIndex(0);
        setActiveThought(thoughts[0] ?? null);

        // Only setup interval if there are multiple thoughts to cycle
        if (thoughts.length <= 1) return;

        const cycleInterval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % thoughts.length);
        }, 12000); // Show each thought for 12 seconds

        return () => clearInterval(cycleInterval);
    }, [thoughts]);

    // 2. Sync active thought when index changes
    useEffect(() => {
        if (thoughts[currentIndex]) {
            setActiveThought(thoughts[currentIndex]);
        }
    }, [currentIndex, thoughts]);

    // Only show if we have REAL data from backend
    if (!activeThought || coreError || !hasRealData) return null;

    return (
        <div className="fixed bottom-28 left-6 z-40 pointer-events-none max-w-xs">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeThought.ts}
                    initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="flex flex-col gap-2"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase">
                            <Brain size={12} className="text-emerald-500 animate-pulse" />
                            <span>System Activity</span>
                        </div>
                        <div className="h-[1px] w-12 bg-emerald-500/20" />
                    </div>

                    <div className="relative pl-4 border-l border-emerald-500/10">
                        <div className="text-[14px] leading-relaxed text-emerald-50/80 font-light italic">
                            {activeThought.thought}
                        </div>

                        {/* Animated progress bar for thought duration */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 12, ease: "linear" }}
                            className="h-[1px] w-full bg-gradient-to-r from-emerald-500/40 via-emerald-500/10 to-transparent mt-3 origin-left"
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
